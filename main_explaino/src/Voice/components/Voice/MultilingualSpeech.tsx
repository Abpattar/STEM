import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { TUTOR_API_ENDPOINTS } from '../../../services/api/tutorApi';
import { speechLanguages, speechLanguageNames } from '../../utils/learningLanes';
import type { SpeechLanguage } from '../../types/exo';

interface MultilingualSpeechProps {
  sessionId: string;
  language: SpeechLanguage;
  onLanguage: (x: SpeechLanguage) => void;
  onTranscribed: (text: string) => void;
  lastReply: string;
}

export const MultilingualSpeech: React.FC<MultilingualSpeechProps> = ({
  sessionId,
  language,
  onLanguage,
  onTranscribed,
  lastReply,
}) => {
  const recording = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');

  // Full audio & microphone cleanup when EXO closes or unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recording.current && recording.current.state === 'recording') {
        try {
          recording.current.onstop = null;
          recording.current.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  async function capture() {
    if (active) {
      recording.current?.stop();
      return;
    }
    if (!sessionId || pending) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is unavailable; use browser microphone or type.');
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) || '';
      const rec = new MediaRecorder(media, type ? { mimeType: type } : undefined);
      const parts: Blob[] = [];
      recording.current = rec;
      streamRef.current = media;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) parts.push(e.data);
      };
      rec.onstop = async () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        media.getTracks().forEach((track) => track.stop());
        recording.current = null;
        streamRef.current = null;
        setActive(false);
        const blob = new Blob(parts, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) return;
        setPending(true);
        try {
          const form = new FormData();
          form.set('audio', blob, 'student.webm');
          form.set('sessionId', sessionId);
          form.set('language', language);
          const resp = await fetch(TUTOR_API_ENDPOINTS.speechTranscribe(), {
            method: 'POST',
            body: form,
          });
          const result = await resp.json();
          if (!resp.ok) throw Error(result.error || 'Speech recognition unavailable');
          onTranscribed(result.transcript);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : 'Use browser speech recognition instead.'
          );
        } finally {
          setPending(false);
        }
      };
      rec.start();
      setActive(true);
      timeoutRef.current = setTimeout(() => {
        if (rec.state === 'recording') rec.stop();
      }, 11000);
    } catch {
      setError('Microphone permission unavailable. Try browser speech.');
    }
  }

  async function play() {
    if (!lastReply || speaking || !sessionId) return;
    setSpeaking(true);
    setError('');
    try {
      const resp = await fetch(TUTOR_API_ENDPOINTS.speechSpeak(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          language,
          text: lastReply.slice(0, 460),
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: 'Speech unavailable' }));
        throw Error(errBody.error || 'Speech unavailable');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        audioRef.current = null;
        setSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        audioRef.current = null;
        setSpeaking(false);
        setError('Playback failed');
      };
      await audio.play();
    } catch (e) {
      setSpeaking(false);
      setError(e instanceof Error ? e.message : 'Try browser speech output.');
    }
  }

  return (
    <div className="multilingual-panel" data-testid="multilingual-speech">
      <label>
        Voice language
        <select
          aria-label="Voice language"
          value={language}
          onChange={(e) => onLanguage(e.target.value as SpeechLanguage)}
        >
          {speechLanguages.map((x) => (
            <option key={x} value={x}>
              {speechLanguageNames[x]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={capture}
        disabled={pending}
        aria-label={
          active ? 'Stop Sarvam recording' : 'Sarvam multilingual recognition'
        }
      >
        {active ? <MicOff size={15} /> : <Mic size={15} />}{' '}
        {pending
          ? 'Recognizing…'
          : active
          ? 'Stop recording'
          : 'Sarvam speech input'}
      </button>
      <button type="button" onClick={play} disabled={!lastReply || speaking}>
        <Volume2 size={15} /> {speaking ? 'Speaking…' : 'Play reply with Sarvam'}
      </button>
      <small>
        Optional, metered server speech. Max 11s recording / 460 chars playback. Browser
        microphone remains free.
      </small>
      {error && (
        <span role="alert" className="speech-warning">
          {error}
        </span>
      )}
    </div>
  );
};

