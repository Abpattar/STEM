import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  FlaskConical,
  Globe,
  GraduationCap,
  Keyboard,
  Library,
  Lightbulb,
  Menu,
  Mic,
  MicOff,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { TUTOR_API_ENDPOINTS } from '../services/api/tutorApi';
import { useStudentLearning } from '../context/StudentLearningContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { ExoOrb } from '../components/ExoOrb';
import { parseSSE } from './utils/sse';
import { preferredMaleVoice, clearSpeechSettings } from './utils/voiceSelection';
import {
  explorerFor,
  speechLanguageNames,
  speechLanguages,
} from './utils/learningLanes';
import {
  buildContextualGreeting,
  buildIncomingLearningContext,
  recommendedNiloModuleForConcept,
  resolveCatalogConceptFromNilo,
} from './utils/exoContextBridge';
import { LearningHub } from './components/LearningHub/LearningHub';
import { StudyRoomWidget } from './components/StudyRooms/StudyRoomWidget';
import { RoadmapVisual } from './components/Roadmap/RoadmapVisual';
import { ConversationJourney } from './components/Roadmap/ConversationJourney';
import { LearningCurveDashboard } from './components/Progress/LearningCurveDashboard';
import { StudentDashboard } from './components/Progress/StudentDashboard';
import { TextbookExplorer } from './components/Textbooks/TextbookExplorer';
import type {
  Book,
  Concept,
  LessonDetail,
  Message,
  Roadmap,
  SharedLearningContextPayload,
  Source,
  SpeechLanguage,
  Turn,
  Visual,
} from './types/exo';
import './styles/exoWorkspace.css';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export interface ExoWorkspaceProps {
  initialTopic?: string;
  initialInteractionMode?: 'voice' | 'text';
  onNavigateToTopic?: (topic: string) => void;
  onNavigateToModule?: (target: 'scratchpad' | 'digitallab') => void;
}

type WorkspaceView = 'conversation' | 'roadmap' | 'lesson' | 'dashboard' | 'textbooks';
type VoiceState = 'idle' | 'ready' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

interface AchievementState {
  covered: number;
  points: number;
  topics: Array<{
    conceptId: string;
    covered: boolean;
    quizCount: number;
    reviewedCount: number;
  }>;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = window.sessionStorage.getItem('exo-session');
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `exo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem('exo-session', sid);
  }
  return sid;
}

function loadSavedMessages(sid: string): Message[] | null {
  if (typeof window === 'undefined' || !sid) return null;
  try {
    const raw = window.sessionStorage.getItem(`exo-messages:${sid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore malformed cache
  }
  return null;
}

function saveMessages(sid: string, msgs: Message[]) {
  if (typeof window === 'undefined' || !sid) return;
  try {
    const clean = msgs.filter((m) => m.text.trim().length > 0).slice(-60);
    window.sessionStorage.setItem(`exo-messages:${sid}`, JSON.stringify(clean));
  } catch {
    // ignore storage quota errors
  }
}

function loadSavedLanguage(sid: string): SpeechLanguage {
  if (typeof window === 'undefined' || !sid) return 'en-IN';
  try {
    const saved = window.sessionStorage.getItem(`exo-lang:${sid}`) as SpeechLanguage | null;
    if (saved && speechLanguages.includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'en-IN';
}

function trimForSarvamTts(text: string): string {
  const clean = text.replace(/[#*_`]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 480) return clean;
  const slice = clean.slice(0, 480);
  const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  return lastBreak > 120 ? slice.slice(0, lastBreak + 1) : slice;
}

export const ExoWorkspace: React.FC<ExoWorkspaceProps> = ({
  initialTopic,
  initialInteractionMode = 'voice',
  onNavigateToModule,
}) => {
  const {
    state: learningState,
    navigateToModule,
    setActiveConcept,
    setSessionId: setSharedSessionId,
  } = useStudentLearning();
  const { settings: a11ySettings, setSoundCues } = useAccessibility();

  // Snapshot incoming NILO cross-module context BEFORE marking activeModule='exo'
  const [incomingContext] = useState<SharedLearningContextPayload | null>(() =>
    buildIncomingLearningContext(learningState)
  );
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const contextualStarter = useMemo(
    () => buildContextualGreeting(incomingContext),
    [incomingContext]
  );

  // Voice-First by default; Text Mode shares the exact same session & messages
  const [interactionMode, setInteractionMode] = useState<'voice' | 'text'>(
    initialInteractionMode
  );
  const [liveTranscript, setLiveTranscript] = useState('');
  const [sarvamAvailable, setSarvamAvailable] = useState(false);
  const [voiceEngineLabel, setVoiceEngineLabel] = useState<'Sarvam AI' | 'Browser'>('Browser');

  const [catalog, setCatalog] = useState<Concept[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [grade, setGrade] = useState(10);
  const [subject, setSubject] = useState('Science');
  const [chapter, setChapter] = useState('Life Processes');
  const [conceptId, setConceptId] = useState('photosynthesis');
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');

  const [view, setView] = useState<WorkspaceView>('conversation');
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [lessonId, setLessonId] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  const [visual, setVisual] = useState<Visual | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    const restored = loadSavedMessages(sessionId);
    if (restored && restored.length > 0) {
      return restored;
    }
    return [{ id: 0, role: 'exo', text: contextualStarter.greeting }];
  });

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sound, setSound] = useState<boolean>(a11ySettings.soundCues);
  const [handsFree, setHandsFree] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Checking services');
  const [sidebar, setSidebar] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [languageCode, setLanguageCode] = useState<SpeechLanguage>(() =>
    loadSavedLanguage(sessionId)
  );
  const [achievement, setAchievement] = useState<AchievementState>({
    covered: 0,
    points: 0,
    topics: [],
  });
  const [backendContextAck, setBackendContextAck] =
    useState<SharedLearningContextPayload | null>(null);

  // Refs for bulletproof voice & audio cleanup
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sarvamSttOkRef = useRef<boolean>(false);
  const sarvamTtsOkRef = useRef<boolean>(false);

  const history = useRef<Message[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const finalTranscript = useRef('');
  const sendRef = useRef<(v?: string) => void>(() => {});
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const abortChat = useRef<AbortController | null>(null);
  const speechRateRef = useRef<number>(a11ySettings.speechRate);
  const handsFreeRef = useRef<boolean>(handsFree);
  const soundRef = useRef<boolean>(sound);

  useEffect(() => {
    speechRateRef.current = a11ySettings.speechRate;
  }, [a11ySettings.speechRate]);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      try {
        window.sessionStorage.setItem(`exo-lang:${sessionId}`, languageCode);
      } catch {
        // ignore
      }
    }
  }, [languageCode, sessionId]);

  useEffect(() => {
    history.current = messages;
    saveMessages(sessionId, messages);
    scrollRef.current?.scrollIntoView({
      behavior: a11ySettings.reduceMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, busy, sessionId, a11ySettings.reduceMotion]);

  // Register EXO module + sessionId in shared NILO StudentLearningContext
  // NEVER populate studentId from sessionId!
  useEffect(() => {
    if (sessionId) {
      setSharedSessionId(sessionId);
    }
    navigateToModule('exo', { activity: 'socratic-voice-tutor' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Escape key immediately stops listening or speaking
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (listening || speaking)) {
        stopAudioPlayback();
        stopAllListening(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [listening, speaking]);

  // Initial catalog, health check (including Sarvam detection), and full unmount cleanup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.getVoices();
    }

    let alive = true;

    fetch(TUTOR_API_ENDPOINTS.catalog())
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const loadedConcepts: Concept[] = d.concepts || [];
        setCatalog(loadedConcepts);
        setBooks(d.books || []);

        const matched = resolveCatalogConceptFromNilo(loadedConcepts, incomingContext);
        if (matched) {
          setGrade(matched.grade ?? 10);
          setSubject(matched.subject ?? 'Science');
          setChapter(matched.chapter);
          setConceptId(matched.id);
        } else if (initialTopic) {
          const topicLower = initialTopic.toLowerCase();
          const byTopic = loadedConcepts.find(
            (c) =>
              c.id.toLowerCase() === topicLower ||
              c.title.toLowerCase().includes(topicLower) ||
              topicLower.includes(c.title.toLowerCase()) ||
              c.chapter.toLowerCase().includes(topicLower)
          );
          if (byTopic) {
            setGrade(byTopic.grade ?? 10);
            setSubject(byTopic.subject ?? 'Science');
            setChapter(byTopic.chapter);
            setConceptId(byTopic.id);
          }
        }
      })
      .catch(() => {
        if (alive) setError('Could not load the curriculum');
      });

    fetch(TUTOR_API_ENDPOINTS.health())
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const hasSarvam = Boolean(d.sarvam);
        sarvamSttOkRef.current = hasSarvam;
        sarvamTtsOkRef.current = hasSarvam;
        setSarvamAvailable(hasSarvam);
        setVoiceEngineLabel(hasSarvam ? 'Sarvam AI' : 'Browser');
        setStatus(
          d.mongodb === 'connected' ? 'Learning session connected' : 'Practice session'
        );
      })
      .catch(() => {
        if (alive) {
          sarvamSttOkRef.current = false;
          sarvamTtsOkRef.current = false;
          setSarvamAvailable(false);
          setVoiceEngineLabel('Browser');
          setStatus('Offline practice');
        }
      });

    return () => {
      alive = false;
      stopAudioPlayback();
      stopAllListening(true);
      abortChat.current?.abort();
    };
  }, [incomingContext, initialTopic]);

  // Achievements polling
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    fetch(
      TUTOR_API_ENDPOINTS.achievements() +
        '?sessionId=' +
        encodeURIComponent(sessionId),
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((j) => {
        if (alive) {
          setAchievement({
            covered: j.covered || 0,
            points: j.points || 0,
            topics: j.topics || [],
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sessionId, view]);

  const filtered = useMemo(
    () =>
      catalog.filter(
        (c) => (c.grade ?? 10) === grade && (c.subject ?? 'Science') === subject
      ),
    [catalog, grade, subject]
  );

  const chapters = useMemo(
    () => [...new Set(filtered.map((c) => c.chapter))],
    [filtered]
  );

  const selected = catalog.find((c) => c.id === conceptId);
  const related = filtered.filter((c) => c.chapter === chapter && c.id !== conceptId);
  const studentMessages = messages.filter(
    (m) => m.role === 'student' && (!m.conceptId || m.conceptId === conceptId)
  );
  const lesson = lessonDetail?.concept || catalog.find((c) => c.id === lessonId);
  const selectedBook = books.find((b) => b.grade === grade && b.subject === subject);
  const moduleJump = useMemo(
    () => recommendedNiloModuleForConcept(selected, subject),
    [selected, subject]
  );

  const voiceState: VoiceState = listening
    ? 'listening'
    : transcribing
    ? 'transcribing'
    : busy
    ? 'thinking'
    : speaking
    ? 'speaking'
    : 'idle';

  const voiceStateCaption: Record<VoiceState, string> = {
    idle: 'Ready — press Start speaking or type below',
    ready: 'Ready — press Start speaking to ask your next question',
    listening: 'Listening… tap Stop & send when finished',
    transcribing: 'Transcribing your voice…',
    thinking: 'EXO is thinking…',
    speaking: 'EXO is speaking… tap Interrupt to talk',
  };

  /* ──────────────────────────────────────────────────────────────
     UNIFIED AUDIO PLAYBACK (Sarvam AI TTS -> Browser Speech Fallback)
     ────────────────────────────────────────────────────────────── */
  function stopAudioPlayback() {
    generationRef.current++;
    if (ttsWatchdogRef.current) {
      clearTimeout(ttsWatchdogRef.current);
      ttsWatchdogRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.onended = null;
      audioElRef.current.onerror = null;
      try {
        audioElRef.current.pause();
      } catch {
        // ignore
      }
      audioElRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    setSpeaking(false);
  }

  function speakWithBrowser(text: string, gen: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeaking(false);
      return;
    }
    const clean = text.replace(/[#*_`]/g, '').trim();
    if (!clean) {
      setSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = languageCode;
      const male = preferredMaleVoice(window.speechSynthesis.getVoices(), languageCode);
      if (male) {
        try {
          u.voice = male;
        } catch {
          // ignore
        }
      }
      const baseSettings = clearSpeechSettings();
      u.rate = speechRateRef.current || baseSettings.rate;
      u.pitch = baseSettings.pitch;
      u.volume = baseSettings.volume;

      const finish = () => {
        if (gen !== generationRef.current) return;
        if (ttsWatchdogRef.current) {
          clearTimeout(ttsWatchdogRef.current);
          ttsWatchdogRef.current = null;
        }
        setSpeaking(false);
        if (handsFreeRef.current && !busyRef.current) {
          void beginListening();
        }
      };

      u.onstart = () => {
        if (gen === generationRef.current) setSpeaking(true);
      };
      u.onend = finish;
      u.onerror = finish;

      // Safety watchdog: on some Linux/Chrome setups speechSynthesis never fires onend
      const maxWait = Math.min(20000, Math.max(4500, clean.length * 105));
      ttsWatchdogRef.current = setTimeout(finish, maxWait);

      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }

  async function speakReply(text: string) {
    if (!soundRef.current || !text.trim()) return;
    stopAudioPlayback();
    const gen = generationRef.current;

    // 1. Try Sarvam AI TTS first when configured on the server
    if (sarvamTtsOkRef.current && sessionId) {
      try {
        setSpeaking(true);
        const resp = await fetch(TUTOR_API_ENDPOINTS.speechSpeak(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimForSarvamTts(text),
            sessionId,
            language: languageCode,
          }),
        });
        if (gen !== generationRef.current) return;

        if (resp.ok) {
          const blob = await resp.blob();
          if (gen !== generationRef.current) return;
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          audioElRef.current = audio;

          const finishAudio = () => {
            if (gen !== generationRef.current) return;
            stopAudioPlayback();
            if (handsFreeRef.current && !busyRef.current) {
              void beginListening();
            }
          };

          audio.onended = finishAudio;
          audio.onerror = () => {
            if (gen !== generationRef.current) return;
            stopAudioPlayback();
            setVoiceEngineLabel('Browser');
            speakWithBrowser(text, generationRef.current);
          };

          setVoiceEngineLabel('Sarvam AI');
          await audio.play();
          return;
        }

        // Sarvam unconfigured (503) or budget reached (429/402) -> switch cleanly to browser fallback
        if (resp.status === 503 || resp.status === 429 || resp.status === 402) {
          sarvamTtsOkRef.current = false;
        }
      } catch {
        // Fall through to browser speechSynthesis
      }
    }

    if (gen !== generationRef.current) return;
    setVoiceEngineLabel('Browser');
    speakWithBrowser(text, gen);
  }

  /* ──────────────────────────────────────────────────────────────
     UNIFIED VOICE INPUT (Sarvam AI STT -> Browser SpeechRecognition Fallback)
     ────────────────────────────────────────────────────────────── */
  function stopMediaRecorder(discard: boolean) {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const mr = mediaRecRef.current;
    if (mr) {
      if (discard) {
        mr.onstop = null;
      }
      if (mr.state !== 'inactive') {
        try {
          mr.stop();
        } catch {
          // already stopped
        }
      }
      mediaRecRef.current = null;
    }
    if (discard && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }

  function stopBrowserRecognizer(discard: boolean) {
    const r = rec.current;
    rec.current = null;
    if (r) {
      if (discard) {
        r.onend = null;
        r.onerror = null;
      }
      try {
        r.stop();
      } catch {
        // already stopped
      }
    }
  }

  function stopAllListening(discard = false) {
    stopMediaRecorder(discard);
    stopBrowserRecognizer(discard);
    setListening(false);
    if (discard) {
      setLiveTranscript('');
      setTranscribing(false);
    }
  }

  function startBrowserRecognition() {
    if (typeof window === 'undefined') return;
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      setListening(false);
      setError(
        'Browser speech recognition is unavailable here. Type your question below!'
      );
      return;
    }

    const r = new Speech();
    rec.current = r;
    finalTranscript.current = '';
    setLiveTranscript('');
    r.lang = languageCode;
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (e) => {
      let words = '';
      let allFinal = true;
      for (let i = 0; i < e.results.length; i++) {
        words += e.results[i][0].transcript + ' ';
        if (!e.results[i].isFinal) allFinal = false;
      }
      const trimmed = words.trim();
      setDraft(trimmed);
      setLiveTranscript(trimmed);
      if (allFinal) finalTranscript.current = trimmed;
    };

    r.onerror = (e) => {
      rec.current = null;
      setListening(false);
      setLiveTranscript('');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError(
          'Microphone permission was denied. Allow microphone access or type below.'
        );
      } else if (e.error === 'audio-capture') {
        setError('No microphone was detected. Connect a microphone or type below.');
      } else if (e.error === 'network') {
        setError('Browser speech service had a network error. Please type below or retry.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError('Speech recognition error: ' + e.error);
      }
    };

    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      setListening(false);
      const last = finalTranscript.current.trim();
      finalTranscript.current = '';
      setLiveTranscript('');
      if (last) {
        sendRef.current(last);
      }
    };

    try {
      setVoiceEngineLabel('Browser');
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
      setListening(false);
      setError('Could not start microphone capture. Please type below.');
    }
  }

  async function beginListening() {
    if (busyRef.current || transcribing) return;
    stopAudioPlayback();
    setError('');

    // Use Sarvam AI STT via MediaRecorder when Sarvam is available on the server
    const canRecordMedia =
      sarvamSttOkRef.current &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';

    if (canRecordMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const mime = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
        const mr = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };

        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
          setListening(false);

          const blob = new Blob(chunks, { type: mime || 'audio/webm' });
          if (blob.size < 500) {
            setError('Recording was too short. Hold/speak a bit longer or type below.');
            return;
          }

          setTranscribing(true);
          try {
            const form = new FormData();
            form.set('audio', blob, 'student.webm');
            form.set('sessionId', sessionId);
            form.set('language', languageCode);

            const resp = await fetch(TUTOR_API_ENDPOINTS.speechTranscribe(), {
              method: 'POST',
              body: form,
            });
            const data = await resp.json().catch(() => ({}));

            if (resp.ok && typeof data.transcript === 'string' && data.transcript.trim()) {
              setTranscribing(false);
              setVoiceEngineLabel('Sarvam AI');
              sendRef.current(data.transcript.trim());
              return;
            }

            // Sarvam unavailable or quota exceeded -> cleanly disable Sarvam STT & fall back to browser
            if (resp.status === 503 || resp.status === 429 || resp.status === 402) {
              sarvamSttOkRef.current = false;
              setVoiceEngineLabel('Browser');
            }
            setTranscribing(false);
            setError(
              data.error ||
                'Could not understand that clip. Try speaking again or type below.'
            );
          } catch {
            setTranscribing(false);
            sarvamSttOkRef.current = false;
            setVoiceEngineLabel('Browser');
            setError('Sarvam voice service unavailable — switched to Browser Voice. Tap Start speaking again or type below.');
          }
        };

        mediaRecRef.current = mr;
        mr.start();
        setVoiceEngineLabel('Sarvam AI');
        setListening(true);

        // Auto-stop after 15 seconds so clips stay fast and within server limit
        recordTimerRef.current = setTimeout(() => {
          if (mediaRecRef.current === mr && mr.state !== 'inactive') {
            mr.stop();
          }
        }, 15000);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Microphone permission was denied. Allow microphone access or type below.');
          return;
        }
        if (err instanceof DOMException && err.name === 'NotFoundError') {
          setError('No microphone was detected. Connect a microphone or type below.');
          return;
        }
        // Any other MediaRecorder failure -> seamlessly fall back to browser SpeechRecognition!
      }
    }

    // Automatic Browser SpeechRecognition fallback
    startBrowserRecognition();
  }

  function handlePrimaryVoiceAction() {
    if (listening) {
      // Stop and submit what was spoken!
      stopAllListening(false);
      return;
    }
    if (speaking) {
      // Interrupt EXO and immediately start listening
      stopAudioPlayback();
      void beginListening();
      return;
    }
    if (busyRef.current) {
      abortChat.current?.abort();
      busyRef.current = false;
      setBusy(false);
      void beginListening();
      return;
    }
    void beginListening();
  }

  function handleToggleSound() {
    const next = !sound;
    setSound(next);
    soundRef.current = next;
    setSoundCues(next);
    if (!next) stopAudioPlayback();
  }

  function changeTopic(c: Concept) {
    stopAudioPlayback();
    stopAllListening(true);
    setGrade(c.grade ?? 10);
    setSubject(c.subject ?? 'Science');
    setChapter(c.chapter);
    setConceptId(c.id);
    setView('conversation');
    setSidebar(false);
    setSources([]);
    setSessionEnded(false);
    setActiveConcept({
      conceptId: c.id,
      conceptTitle: c.title,
      subject: c.subject ?? 'Science',
    });
    setMessages([
      {
        id: Date.now(),
        role: 'exo',
        text: `Let's explore ${c.title.toLowerCase()}. Tell me what you'd like to understand, or explain what you already know.`,
      },
    ]);
  }

  function choose(c: Concept) {
    changeTopic(c);
  }

  function changeShelf(g: number, s: string) {
    setGrade(g);
    setSubject(s);
    const next = catalog.find(
      (c) => (c.grade ?? 10) === g && (c.subject ?? 'Science') === s
    );
    if (next) changeTopic(next);
  }

  async function send(value?: string) {
    const message = (value ?? draft).trim();
    if (!message || busyRef.current) return;
    if (
      /^(stop speaking|stop talking|end (the )?conversation|end (the )?session|goodbye exo|that's all)[.! ]*$/i.test(
        message
      )
    ) {
      stopAudioPlayback();
      stopAllListening(true);
      setSessionEnded(true);
      setDraft('');
      return;
    }

    stopAllListening(true);
    stopAudioPlayback();
    setDraft('');
    setLiveTranscript('');
    setError('');
    setSessionEnded(false);
    busyRef.current = true;
    setBusy(true);

    const previous: Turn[] = history.current
      .slice(-16)
      .map((m) => ({ role: m.role, text: m.text }));
    const studentMsgId = Date.now();
    const exoMsgId = studentMsgId + 1;
    const controller = new AbortController();
    abortChat.current = controller;

    setMessages((m) => [
      ...m,
      { id: studentMsgId, role: 'student', text: message, conceptId },
      { id: exoMsgId, role: 'exo', text: '' },
    ]);

    let answer = '';
    let streamProvider = 'groq';
    let lastRender = 0;
    let left = '';

    try {
      const resp = await fetch(TUTOR_API_ENDPOINTS.chatStream(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chapter,
          conceptId,
          mode,
          history: previous,
          sessionId,
          languageCode,
          ...(incomingContext ? { learningContext: incomingContext } : {}),
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw Error("EXO couldn't begin streaming a response.");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let ended = false;

      while (!ended) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        left = parseSSE(
          left + decoder.decode(chunk, { stream: true }),
          ({ event, data }) => {
            if (controller.signal.aborted || typeof data !== 'object' || !data) return;
            const d = data as {
              text?: string;
              provider?: string;
              concept?: Concept;
              sources?: Source[];
              message?: string;
              learningContext?: SharedLearningContextPayload | null;
            };
            if (event === 'token' && typeof d.text === 'string') {
              answer += d.text;
              if (Date.now() - lastRender > 50) {
                const snapshot = answer;
                setMessages((m) =>
                  m.map((x) => (x.id === exoMsgId ? { ...x, text: snapshot } : x))
                );
                lastRender = Date.now();
              }
            }
            if (event === 'metadata') {
              if (Array.isArray(d.sources)) setSources(d.sources);
              if (d.learningContext) setBackendContextAck(d.learningContext);
            }
            if (event === 'done') {
              ended = true;
              streamProvider = d.provider || streamProvider;
              if (d.concept && d.concept.id !== conceptId) {
                const nextConcept = d.concept;
                setMessages((m) =>
                  m.map((x) =>
                    x.id === studentMsgId ? { ...x, conceptId: nextConcept.id } : x
                  )
                );
                setConceptId(nextConcept.id);
                setChapter(nextConcept.chapter);
                setGrade(nextConcept.grade ?? 10);
                setSubject(nextConcept.subject ?? 'Science');
              }
              if (Array.isArray(d.sources)) setSources(d.sources);
            }
            if (event === 'warning') {
              setStatus(d.message || 'Using curated learning notes');
            }
          }
        );
      }

      const finalAnswer = answer.trim() || "I'm here. Could you say that again?";
      setMessages((m) =>
        m.map((x) =>
          x.id === exoMsgId
            ? { ...x, text: finalAnswer, provider: streamProvider }
            : x
        )
      );

      // Speak the reply aloud via Sarvam AI (with automatic browser fallback)
      if (soundRef.current && finalAnswer) {
        void speakReply(finalAnswer);
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const messageText =
          answer || 'The connection was interrupted. Could you repeat your question?';
        setMessages((m) =>
          m.map((x) =>
            x.id === exoMsgId
              ? { ...x, text: messageText, provider: 'offline' }
              : x
          )
        );
        setError(e instanceof Error ? e.message : 'Connection interrupted');
      }
    } finally {
      if (abortChat.current === controller) abortChat.current = null;
      busyRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });

  async function createLearningPath() {
    if (busyRef.current || analysisBusy) return;
    stopAudioPlayback();
    stopAllListening(true);
    setError('');
    setAnalysisBusy(true);
    try {
      const turns = history.current
        .filter((m) => m.role === 'student')
        .slice(-24)
        .map((m) => m.text);
      const resp = await fetch(TUTOR_API_ENDPOINTS.roadmap(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, turns, sessionId }),
      });
      const d = await resp.json();
      if (!resp.ok) throw Error(d.error || 'Unable to create roadmap');
      setRoadmap(d);
      if (d.analysis?.conceptId && d.analysis.conceptId !== conceptId) {
        const detected = catalog.find((c) => c.id === d.analysis.conceptId);
        if (detected) {
          setConceptId(detected.id);
          setChapter(detected.chapter);
          setSubject(detected.subject ?? 'Science');
          setGrade(detected.grade ?? 10);
        }
      }
      setView('roadmap');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build a learning path');
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function openLesson(id: string) {
    stopAllListening(true);
    stopAudioPlayback();
    setLessonId(id);
    setView('lesson');
    setSidebar(false);
    setVisual(null);
    setVisualLoading(true);
    setLessonLoading(true);
    setLessonDetail(null);

    const [lessonResult, visualResult] = await Promise.allSettled([
      fetch(
        TUTOR_API_ENDPOINTS.lesson() + '?conceptId=' + encodeURIComponent(id)
      ).then((r) => {
        if (!r.ok) throw Error('Lesson unavailable');
        return r.json();
      }),
      fetch(
        TUTOR_API_ENDPOINTS.visual() + '?conceptId=' + encodeURIComponent(id)
      ).then((r) => {
        if (!r.ok) throw Error('Visual unavailable');
        return r.json();
      }),
    ]);

    if (lessonResult.status === 'fulfilled') {
      setLessonDetail(lessonResult.value);
    } else {
      setError('Could not load the textbook lesson');
    }
    if (visualResult.status === 'fulfilled') {
      setVisual(visualResult.value);
    }
    setVisualLoading(false);
    setLessonLoading(false);
  }

  function practiceConcept(id: string) {
    const c = catalog.find((x) => x.id === id);
    if (!c) return;
    stopAudioPlayback();
    stopAllListening(true);
    setConceptId(c.id);
    setGrade(c.grade ?? 10);
    setSubject(c.subject ?? 'Science');
    setChapter(c.chapter);
    setMode('quiz');
    setView('conversation');
    setSidebar(false);
    setActiveConcept({
      conceptId: c.id,
      conceptTitle: c.title,
      subject: c.subject ?? 'Science',
    });
    setMessages([
      {
        id: Date.now(),
        role: 'exo',
        text: `Let's practice ${c.title.toLowerCase()}. ${c.question}`,
      },
    ]);
    setSessionEnded(false);
  }

  function handleNavigateToModule(target: 'scratchpad' | 'digitallab') {
    stopAudioPlayback();
    stopAllListening(true);

    setActiveConcept({
      conceptId: selected?.id ?? incomingContext?.activeConceptId ?? null,
      conceptTitle:
        selected?.title ?? incomingContext?.activeConceptTitle ?? null,
      subject:
        selected?.subject ??
        (target === 'scratchpad' ? 'Mathematics' : subject || 'Science'),
    });

    onNavigateToModule?.(target);
  }

  const steps = roadmap?.lessons || [];

  return (
    <div
      className={`nilo-exo-workspace ${
        a11ySettings.reduceMotion ? 'exo-reduce-motion' : ''
      }`}
      data-testid="nilo-exo-workspace"
      data-interaction-mode={interactionMode}
      data-voice-state={voiceState}
      data-voice-engine={voiceEngineLabel}
      data-sarvam-available={sarvamAvailable ? 'true' : 'false'}
      data-session-id={sessionId}
      data-backend-context-received={
        backendContextAck ? JSON.stringify(backendContextAck) : ''
      }
    >
      <div className="exo-shell">
        <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
          <div className="logo">
            <div className="logo-icon">
              <BrainCircuit size={22} />
            </div>
            <div>
              <strong>
                exo<span>.</span>
              </strong>
              <small>NILO AI VOICE TUTOR</small>
            </div>
            <button
              className="close"
              onClick={() => setSidebar(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="side-scroll">
            <div className="eyebrow">LEARN WITH EXO</div>
            <button
              className={`nav nav-btn ${view === 'conversation' ? 'active' : ''}`}
              data-testid="exo-nav-conversation"
              onClick={() => {
                setView('conversation');
                setSidebar(false);
              }}
            >
              <Mic size={17} /> Talk to EXO
            </button>
            <button
              className={`nav nav-btn ${view === 'dashboard' ? 'active' : ''}`}
              data-testid="exo-nav-dashboard"
              onClick={() => {
                setView('dashboard');
                setSidebar(false);
              }}
            >
              <TrendingUp size={17} /> My progress dashboard
            </button>
            <button
              className={`nav nav-btn ${
                view === 'roadmap' || view === 'lesson' ? 'active' : ''
              }`}
              data-testid="exo-nav-roadmap"
              onClick={() => {
                if (roadmap) setView('roadmap');
                else createLearningPath();
                setSidebar(false);
              }}
            >
              <Compass size={17} /> My learning path
            </button>
            <button
              className={`nav nav-btn ${view === 'textbooks' ? 'active' : ''}`}
              data-testid="exo-nav-textbooks"
              onClick={() => {
                setView('textbooks');
                setSidebar(false);
              }}
            >
              <Library size={17} /> NCERT Textbooks
            </button>

            <div className="line" />
            <div className="eyebrow">CHOOSE YOUR TEXTBOOK</div>
            <div className="shelf-control">
              <div className="shelf-tabs">
                {[9, 10].map((g) => (
                  <button
                    key={g}
                    className={grade === g ? 'selected' : ''}
                    onClick={() => changeShelf(g, subject)}
                  >
                    Class {g}
                  </button>
                ))}
              </div>
              <div className="shelf-tabs">
                {['Science', 'Mathematics'].map((sub) => (
                  <button
                    key={sub}
                    className={subject === sub ? 'selected' : ''}
                    onClick={() => changeShelf(grade, sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="subject">
              <BookOpen size={18} />
              <div>
                <b>
                  NCERT {subject} · Class {grade}
                </b>
                <small>
                  {filtered.length} topics · {selectedBook?.indexedChunks || 0}{' '}
                  indexed passages
                </small>
                {selectedBook?.previewOnly && <small>Contents preview only</small>}
              </div>
            </div>

            {chapters.map((ch, i) => (
              <div key={ch}>
                <button
                  className={`chapter ${chapter === ch ? 'chosen' : ''}`}
                  onClick={() => {
                    const c = filtered.find((x) => x.chapter === ch);
                    if (c) choose(c);
                  }}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {ch}
                  <ChevronRight size={14} />
                </button>
                {filtered
                  .filter((x) => x.chapter === ch)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={`topic ${c.id === conceptId ? 'picked' : ''}`}
                      onClick={() => choose(c)}
                    >
                      <span className="dot" />
                      {c.title}
                      {achievement.topics.some(
                        (t) => t.conceptId === c.id && t.covered
                      ) && <CheckCircle2 size={14} aria-label="Topic covered" />}
                    </button>
                  ))}
              </div>
            ))}
          </div>

          <div className="sidebar-foot">
            <div
              className="achievements-pulse"
              data-testid="achievement-summary"
            >
              <b>{achievement.covered} topics covered</b>
              <span>{achievement.points} quiz points earned</span>
            </div>
            <div>
              <span className="online" />
              {status}
            </div>
            <div className="user">
              <span>
                {(learningState.studentDisplayName || 'S').slice(0, 1).toUpperCase()}
              </span>
              <div>
                <b>{learningState.studentDisplayName || 'Student workspace'}</b>
                <small>NILO unified study session</small>
              </div>
            </div>
          </div>
        </aside>

        <main className="exo-main">
          <header className="top">
            <div>
              <button
                className="mobile-menu"
                onClick={() => setSidebar(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              EXO <ChevronRight size={14} />
              <b>
                {view === 'conversation'
                  ? interactionMode === 'voice'
                    ? 'Voice Tutor'
                    : 'Text Mode'
                  : view === 'dashboard'
                  ? 'My learning dashboard'
                  : view === 'roadmap'
                  ? 'My learning roadmap'
                  : view === 'textbooks'
                  ? 'NCERT Textbook Explorer'
                  : 'Learning studio'}
              </b>
            </div>

            <div className="exo-top-controls">
              <label className="exo-lang-pill" title="Voice and tutor language">
                <Globe size={13} />
                <select
                  aria-label="EXO voice language"
                  data-testid="exo-header-language"
                  value={languageCode}
                  onChange={(e) =>
                    setLanguageCode(e.target.value as SpeechLanguage)
                  }
                >
                  {speechLanguages.map((code) => (
                    <option key={code} value={code}>
                      {speechLanguageNames[code]}
                    </option>
                  ))}
                </select>
              </label>

              {view === 'conversation' && (
                <div
                  className="exo-mode-switch"
                  role="tablist"
                  aria-label="EXO interaction mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={interactionMode === 'voice'}
                    data-testid="exo-mode-voice"
                    className={interactionMode === 'voice' ? 'active' : ''}
                    onClick={() => setInteractionMode('voice')}
                  >
                    <Mic size={13} /> Voice
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={interactionMode === 'text'}
                    data-testid="exo-mode-text"
                    className={interactionMode === 'text' ? 'active' : ''}
                    onClick={() => setInteractionMode('text')}
                  >
                    <Keyboard size={13} /> Text
                  </button>
                </div>
              )}

              <span className="beta" data-testid="exo-voice-engine-badge">
                ✦ {voiceEngineLabel} Voice
              </span>
            </div>
          </header>

          {view === 'conversation' ? (
            <div className="layout">
              <section className="conversation">
                {incomingContext && (
                  <div
                    className="nilo-context-banner"
                    data-testid="exo-context-banner"
                    data-source-module={incomingContext.previousModule || ''}
                    data-active-subject={incomingContext.activeSubject || ''}
                    data-active-concept-id={incomingContext.activeConceptId ?? ''}
                  >
                    <div className="nilo-context-banner-info">
                      <span className="nilo-context-banner-label">
                        CONNECTED FROM{' '}
                        {incomingContext.previousModule === 'science'
                          ? 'SCIENCE KINGDOM LAB'
                          : incomingContext.previousModule === 'math'
                          ? 'MATHNOTEBOOK SCRATCHPAD'
                          : 'NILO PLATFORM'}
                      </span>
                      <strong>
                        {incomingContext.activeConceptTitle ||
                          incomingContext.activeSubject ||
                          'Recent NILO activity'}
                      </strong>
                      <small>
                        {[
                          incomingContext.activeSubject,
                          incomingContext.currentActivity,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    {onNavigateToModule &&
                      (incomingContext.previousModule === 'science' ||
                        incomingContext.previousModule === 'math') && (
                        <div className="nilo-context-banner-actions">
                          <button
                            className="nilo-context-banner-btn"
                            data-testid="exo-return-module-btn"
                            onClick={() =>
                              handleNavigateToModule(
                                incomingContext.previousModule === 'math'
                                  ? 'scratchpad'
                                  : 'digitallab'
                              )
                            }
                          >
                            {incomingContext.previousModule === 'math' ? (
                              <>
                                <PenTool size={12} /> Return to Scratchpad
                              </>
                            ) : (
                              <>
                                <FlaskConical size={12} /> Return to Lab
                              </>
                            )}
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {interactionMode === 'voice' ? (
                  /* ── SIMPLE, BULLETPROOF VOICE-FIRST STAGE ── */
                  <div className="exo-voice-stage" data-testid="exo-voice-stage">
                    <div className="exo-voice-stage-header">
                      <span className="exo-voice-stage-eyebrow">
                        EXO · AI VOICE TUTOR · {subject.toUpperCase()}
                      </span>
                      <h1 className="exo-voice-stage-greeting">
                        {messages.length <= 1
                          ? "Hey! I'm EXO. What would you like to understand today?"
                          : selected?.title || 'Voice Learning Session'}
                      </h1>
                    </div>

                    <div className="exo-voice-orb-arena">
                      <div
                        className="exo-voice-ring"
                        data-testid="exo-voice-orb-trigger"
                        data-voice-state={voiceState}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          listening
                            ? 'Stop and send voice message'
                            : speaking
                            ? 'Interrupt EXO and talk'
                            : 'Tap EXO orb to start speaking'
                        }
                        onClick={handlePrimaryVoiceAction}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePrimaryVoiceAction();
                          }
                        }}
                      >
                        <ExoOrb
                          size="md"
                          interactive={true}
                          showPedestal={false}
                          showSpeechBubble={false}
                          subLabel=""
                          isListening={listening || speaking || busy || transcribing}
                          initialMood={
                            busy || transcribing
                              ? 'thinking'
                              : speaking
                              ? 'happy'
                              : listening
                              ? 'excited'
                              : 'idle'
                          }
                          className="!my-0"
                        />
                      </div>
                    </div>

                    <div
                      className={`exo-audio-bars ${
                        listening
                          ? 'active-listening'
                          : speaking
                          ? 'active-speaking'
                          : busy || transcribing
                          ? 'active-thinking'
                          : ''
                      }`}
                      data-testid="exo-audio-bars"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 13 }).map((_, idx) => (
                        <span key={idx} />
                      ))}
                    </div>

                    <div
                      className={`exo-state-pill state-${voiceState}`}
                      data-testid="exo-voice-state-pill"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="online" />
                      {voiceStateCaption[voiceState]}
                    </div>

                    {(listening || liveTranscript) && (
                      <div
                        className="exo-live-transcript"
                        data-testid="exo-live-transcript"
                        aria-live="polite"
                      >
                        <AudioLines size={16} />
                        <span>
                          {liveTranscript ||
                            (sarvamAvailable
                              ? 'Recording with Sarvam AI… tap Stop & send when done'
                              : 'Listening… speak naturally')}
                        </span>
                      </div>
                    )}

                    <div className="exo-voice-primary-controls">
                      <button
                        type="button"
                        className={`exo-voice-cta ${
                          listening || speaking ? 'is-active' : ''
                        }`}
                        data-testid="exo-voice-start-btn"
                        disabled={transcribing}
                        onClick={handlePrimaryVoiceAction}
                        aria-label={
                          listening
                            ? 'Stop & send'
                            : speaking
                            ? 'Interrupt & talk'
                            : 'Start speaking'
                        }
                      >
                        {listening ? <Square size={15} /> : <Mic size={17} />}
                        {listening
                          ? 'Stop & send'
                          : transcribing
                          ? 'Transcribing…'
                          : speaking
                          ? 'Interrupt & talk'
                          : 'Start speaking'}
                      </button>

                      {listening && (
                        <button
                          type="button"
                          className="exo-voice-secondary-btn"
                          data-testid="exo-voice-cancel-btn"
                          onClick={() => stopAllListening(true)}
                          aria-label="Cancel recording"
                        >
                          <X size={14} /> Cancel
                        </button>
                      )}

                      {speaking && (
                        <button
                          type="button"
                          className="exo-voice-secondary-btn"
                          data-testid="exo-voice-interrupt-btn"
                          onClick={stopAudioPlayback}
                          aria-label="Mute current reply"
                        >
                          <MicOff size={14} /> Stop audio
                        </button>
                      )}
                    </div>

                    <div className="exo-voice-meta-row">
                      <label className="auto-voice">
                        <input
                          type="checkbox"
                          data-testid="exo-handsfree-checkbox"
                          checked={handsFree}
                          onChange={(e) => setHandsFree(e.target.checked)}
                        />{' '}
                        Auto-listen after EXO replies
                      </label>
                      <button
                        type="button"
                        className="exo-voice-secondary-btn"
                        data-testid="exo-sound-btn"
                        aria-label="Toggle EXO spoken audio"
                        onClick={handleToggleSound}
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        {sound ? 'Audio on' : 'Audio muted'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="hero" data-testid="exo-text-stage">
                    <div className="eyebrow">
                      EXO TEXT MODE · {subject.toUpperCase()} TUTOR
                    </div>
                    <h1>
                      Type or speak. <span>Same EXO tutor.</span>
                    </h1>
                    <p>
                      Everything you type here stays in the same EXO voice
                      session, roadmap, and learning context.
                    </p>
                  </div>
                )}

                {/* ── LIVE CONVERSATION TRANSCRIPT ── */}
                <div className="messages" data-testid="exo-messages">
                  <div className="day">
                    {interactionMode === 'voice'
                      ? 'CONVERSATION TRANSCRIPT'
                      : 'EXO CONVERSATION'}
                  </div>
                  {messages
                    .filter((m) => m.text)
                    .map((m) => (
                      <div
                        className={`message ${
                          m.role === 'student' ? 'from-student' : ''
                        }`}
                        key={m.id}
                        data-role={m.role}
                      >
                        <div
                          className={`avatar ${
                            m.role === 'exo' ? 'exo' : 'student'
                          }`}
                        >
                          {m.role === 'exo' ? <Sparkles size={15} /> : 'S'}
                        </div>
                        <div>
                          <div className="msg-name">
                            {m.role === 'exo' ? 'EXO' : 'You'}
                          </div>
                          <div className="bubble">{m.text}</div>
                          {m.provider && (
                            <div className="provider">
                              Response ·{' '}
                              {m.provider === 'offline-study-notes'
                                ? 'offline learning notes'
                                : m.provider}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {busy && (
                    <div className="message">
                      <div className="avatar exo">
                        <Sparkles size={15} />
                      </div>
                      <div className="bubble">
                        Thinking through the clearest explanation…
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>

                {messages.length < 3 && (
                  <div className="suggestions">
                    {contextualStarter.suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)}>
                        {s}
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>
                )}

                {/* ── SIMPLE INPUT BAR (Works anytime alongside voice!) ── */}
                <div className="compose">
                  {error && (
                    <div className="error" data-testid="exo-error-banner" role="alert">
                      {error}
                      <button
                        onClick={() => setError('')}
                        aria-label="Dismiss error"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className={`entry ${listening ? 'recording' : ''}`}>
                    <button
                      className={`mic ${listening ? 'live' : ''}`}
                      data-testid="exo-mic-btn"
                      onClick={handlePrimaryVoiceAction}
                      aria-label={
                        listening ? 'Stop and send microphone' : 'Start microphone'
                      }
                    >
                      {listening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <input
                      data-testid="exo-input"
                      value={draft}
                      disabled={busy || transcribing}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') send();
                      }}
                      placeholder={
                        listening
                          ? 'Listening…'
                          : 'Ask EXO anything or type your answer…'
                      }
                      aria-label="Message to EXO"
                    />
                    {interactionMode === 'text' && (
                      <button
                        className="sound"
                        data-testid="exo-sound-btn"
                        aria-label="Toggle speech"
                        onClick={handleToggleSound}
                      >
                        {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
                      </button>
                    )}
                    <button
                      className="send"
                      data-testid="exo-send-btn"
                      onClick={() => send()}
                      disabled={!draft.trim() || busy || transcribing}
                      aria-label="Send"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                  <div className="compose-note">
                    <span>
                      <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {sarvamAvailable
                        ? 'Sarvam AI voice active (auto browser fallback)'
                        : 'Browser voice active'}
                    </span>
                    <span>Press Esc to stop voice</span>
                  </div>
                </div>

                <div className="mentor-journey-bar">
                  <div>
                    <span className="tiny-label">NEXT STEP</span>
                    <b>
                      {sessionEnded
                        ? 'Conversation complete — your next steps are ready'
                        : studentMessages.length >= 2
                        ? 'Ready for a tailored path'
                        : 'Talk with EXO, then learn'}
                    </b>
                    <small>
                      {sessionEnded
                        ? "Press Let's learn to review evidence and choose a lesson."
                        : studentMessages.length < 2
                        ? 'Answer a couple of questions to build a personalized roadmap.'
                        : 'Review what you demonstrated and continue learning.'}
                    </small>
                  </div>
                  <button
                    data-testid="exo-lets-learn-btn"
                    onClick={createLearningPath}
                    disabled={busy || analysisBusy}
                  >
                    <Compass size={16} />
                    {analysisBusy ? 'Analyzing…' : "Let's learn"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </section>

              <aside className="insights">
                <div className="insights-title">
                  <Lightbulb size={19} />
                  <b>Session compass</b>
                  <span>● LIVE</span>
                </div>
                <div className="insights-content">
                  <div className="panel">
                    <div className="eyebrow">CURRENT FOCUS</div>
                    <div className="focus">
                      <div className="focus-icon">
                        <BookOpen size={23} />
                      </div>
                      <div>
                        <small>
                          {subject.toUpperCase()} · CLASS {grade}
                        </small>
                        <h3>{selected?.title || 'Photosynthesis'}</h3>
                        <p>{selected?.chapter || 'Life Processes'}</p>
                      </div>
                    </div>
                    <div className="toggle">
                      <button
                        className={mode === 'learn' ? 'selected' : ''}
                        onClick={() => setMode('learn')}
                      >
                        Mentor mode
                      </button>
                      <button
                        className={mode === 'quiz' ? 'selected' : ''}
                        onClick={() => setMode('quiz')}
                      >
                        Quiz mode
                      </button>
                    </div>
                  </div>

                  {onNavigateToModule && (
                    <div className="panel">
                      <div className="eyebrow">HANDS-ON NILO MODULE</div>
                      <div className="nilo-module-jump">
                        <p>{moduleJump.description}</p>
                        <button
                          className="nilo-module-jump-btn"
                          data-testid="exo-module-jump-btn"
                          data-target-module={moduleJump.target}
                          onClick={() =>
                            handleNavigateToModule(moduleJump.target)
                          }
                        >
                          {moduleJump.target === 'scratchpad' ? (
                            <PenTool size={14} />
                          ) : (
                            <FlaskConical size={14} />
                          )}
                          {moduleJump.label}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="panel">
                    <div className="eyebrow">WE&apos;RE EXPLORING</div>
                    {selected?.essentials.map((x) => (
                      <div className="check" key={x}>
                        <span>
                          <CircleHelp size={12} />
                        </span>
                        {x}
                      </div>
                    ))}
                  </div>

                  <div className="panel">
                    <div className="eyebrow">OTHER TOPICS TO EXPLORE</div>
                    {related.slice(0, 3).map((c) => (
                      <button
                        className="related"
                        key={c.id}
                        onClick={() => choose(c)}
                      >
                        <BookOpen size={15} />
                        {c.title}
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>

                  <div className="panel">
                    <div className="eyebrow">SOURCE CONTENT</div>
                    <p className="resource-small">
                      Original teaching notes + retrieved passages from uploaded
                      NCERT PDFs.
                    </p>
                    {sources.filter((x) => x.kind === 'textbook').length > 0 && (
                      <div className="source-list">
                        {sources
                          .filter((x) => x.kind === 'textbook')
                          .map((x) => (
                            <div key={x.id} className="source-cite">
                              <BookOpen size={13} />
                              <span>
                                {x.title} · PDF page {x.page}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    <button
                      className="related"
                      onClick={() => setView('textbooks')}
                    >
                      <Library size={14} />
                      Search indexed NCERT passages
                      <ChevronRight size={14} />
                    </button>
                    <a
                      href="https://ncert.nic.in/textbook.php"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit NCERT books <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="journey-page">
              <div className="journey-heading">
                <button
                  className="back-link"
                  onClick={() =>
                    setView(view === 'lesson' ? 'roadmap' : 'conversation')
                  }
                >
                  <ArrowLeft size={17} />
                  {view === 'lesson'
                    ? 'Back to roadmap'
                    : 'Back to EXO voice tutor'}
                </button>
                <span className="journey-tag">
                  <Sparkles size={13} /> PERSONALIZED {subject.toUpperCase()}{' '}
                  STUDIO
                </span>
              </div>

              {view === 'dashboard' && (
                <StudentDashboard
                  sessionId={sessionId}
                  roadmap={roadmap}
                  onTalk={() => setView('conversation')}
                  onRoadmap={() => {
                    if (roadmap) setView('roadmap');
                    else createLearningPath();
                  }}
                  onLesson={openLesson}
                />
              )}

              {view === 'textbooks' && (
                <TextbookExplorer
                  grade={grade}
                  subject={subject}
                  initialQuery={selected?.title || ''}
                />
              )}

              {view === 'roadmap' && roadmap ? (
                <>
                  <div className="journey-intro">
                    <div>
                      <div className="eyebrow">
                        YOUR NEXT CHAPTER STARTS HERE
                      </div>
                      <h1>
                        {roadmap.analysis.studentTurns ? (
                          <>
                            A path built around <em>your understanding.</em>
                          </>
                        ) : (
                          <>
                            A starting path for <em>your questions.</em>
                          </>
                        )}
                      </h1>
                      <p>
                        {roadmap.analysis.studentTurns
                          ? 'We separated demonstrated ideas from concepts still needing verification.'
                          : 'There are no assessed explanations yet. These lessons are suggestions, not a knowledge score.'}{' '}
                        Choose any lesson to get started.
                      </p>
                    </div>
                    <button
                      className="recheck"
                      onClick={createLearningPath}
                      disabled={analysisBusy}
                    >
                      <RefreshCw size={16} />
                      {analysisBusy ? 'Analyzing' : 'Re-check answers'}
                    </button>
                  </div>

                  <div className="overview-stats">
                    <div>
                      <b>{roadmap.lessons.length}</b>
                      <span>Guided lessons</span>
                    </div>
                    <div>
                      <b>
                        {
                          roadmap.analysis.evidence.filter(
                            (e) => e.status === 'correct'
                          ).length
                        }
                      </b>
                      <span>Ideas mentioned</span>
                    </div>
                    <div>
                      <b>
                        {
                          roadmap.analysis.evidence.filter(
                            (e) => e.status === 'misconception'
                          ).length
                        }
                      </b>
                      <span>Possible misconceptions</span>
                    </div>
                    <div>
                      <b>{roadmap.analysis.confidence}</b>
                      <span>Evidence confidence</span>
                    </div>
                  </div>

                  <section
                    className="journey-card roadmap-analysis"
                    data-testid="roadmap-analysis"
                  >
                    <div className="section-title">
                      <div>
                        <span className="tiny-label">
                          FIRST · CONVERSATION ANALYSIS
                        </span>
                        <h2>What EXO could actually learn from this session</h2>
                      </div>
                      <span className="soft-pill">
                        {roadmap.analysis.confidence} evidence confidence
                      </span>
                    </div>
                    <p className="analysis-focus">
                      <b>Current topic:</b> {roadmap.analysis.conceptTitle}
                    </p>
                    <p className="analysis-focus-reason">
                      {roadmap.topicDetection?.reason ||
                        'Based on the topic selected for learning.'}
                    </p>
                    <div className="analysis-observations">
                      <div>
                        <b>
                          {roadmap.topicDetection?.relevantTurns?.length ??
                            roadmap.analysis.studentTurns}
                        </b>
                        <span>Relevant student turns</span>
                      </div>
                      <div>
                        <b>{roadmap.analysis.studentTurns}</b>
                        <span>Explanation turns assessed</span>
                      </div>
                      <div>
                        <b>
                          {
                            roadmap.analysis.evidence.filter(
                              (e) => e.status === 'correct'
                            ).length
                          }
                        </b>
                        <span>Supported ideas</span>
                      </div>
                      <div>
                        <b>
                          {
                            roadmap.analysis.evidence.filter(
                              (e) => e.status === 'misconception'
                            ).length
                          }
                        </b>
                        <span>Ideas to revisit</span>
                      </div>
                    </div>
                    {roadmap.analysis.studentTurns === 0 ? (
                      <p className="analysis-no-evidence" role="status">
                        You asked questions but have not yet explained this
                        topic in your own words. This is a starter roadmap, not
                        a mastery judgement.
                      </p>
                    ) : (
                      <p className="analysis-no-evidence">
                        EXO found {roadmap.analysis.studentTurns} explanation
                        turn(s) to check. Supported ideas are provisional;
                        anything not mentioned remains unverified.
                      </p>
                    )}
                    {roadmap.analysis.evidence.find((e) => e.quote) && (
                      <blockquote className="analysis-student-quote">
                        <b>From your own explanation:</b> “
                        {roadmap.analysis.evidence.find((e) => e.quote)?.quote}”
                      </blockquote>
                    )}
                    <p className="analysis-summary-next">
                      <b>Recommended next:</b> {roadmap.analysis.rationale}
                    </p>
                  </section>

                  <section className="journey-card">
                    <div className="section-title">
                      <div>
                        <span className="tiny-label">
                          01 / PERSONAL ROADMAP
                        </span>
                        <h2>Your next learning steps</h2>
                      </div>
                      <span className="soft-pill">
                        <Compass size={15} />
                        {roadmap.analysis.studentTurns
                          ? 'Adapted to your explanations'
                          : 'Starter recommendations — not yet assessed'}
                      </span>
                    </div>
                    <div className="roadmap-track">
                      {steps.map((s, i) => (
                        <div className="roadmap-step" key={s.id}>
                          <div className="step-top">
                            <span
                              className={`step-number ${
                                i === 0 ? 'current' : ''
                              }`}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {i < steps.length - 1 && (
                              <span className="step-connector" />
                            )}
                          </div>
                          <div
                            className={`lesson-card ${
                              i === 0 ? 'featured' : ''
                            }`}
                          >
                            <span className="small-index">
                              STEP {i + 1} · {s.minutes} MIN
                            </span>
                            <h3>{s.title}</h3>
                            <p>{s.objective}</p>
                            <span className="activity-label">
                              {s.activity === 'apply'
                                ? 'Apply your understanding'
                                : s.activity === 'explain'
                                ? 'Start with foundations'
                                : 'Practice and connect ideas'}
                            </span>
                            <button onClick={() => openLesson(s.conceptId)}>
                              {i === 0 ? 'Start lesson' : 'View lesson'}{' '}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <ConversationJourney steps={roadmap.journey || []} />
                  <LearningCurveDashboard
                    sessionId={sessionId}
                    current={roadmap.analysis}
                  />
                  <RoadmapVisual
                    conceptId={roadmap.analysis.conceptId}
                    title={roadmap.analysis.conceptTitle}
                    evidence={roadmap.analysis.evidence}
                    concept={catalog.find(
                      (c) => c.id === roadmap.analysis.conceptId
                    )}
                  />

                  <section
                    className="journey-card future-preview"
                    data-testid="roadmap-future"
                  >
                    <span className="tiny-label">YOUR NEXT DISCOVERY</span>
                    <h2>Why does this chapter matter outside school?</h2>
                    <p>{explorerFor(roadmap.analysis.conceptId).scenario}</p>
                    <div className="future-tags">
                      {explorerFor(roadmap.analysis.conceptId).fields.map(
                        (x) => (
                          <span key={x}>{x}</span>
                        )
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openLesson(roadmap.analysis.conceptId)}
                      >
                        Explore the real-life mission <ArrowRight size={15} />
                      </button>
                      {onNavigateToModule && (
                        <button
                          onClick={() =>
                            handleNavigateToModule(moduleJump.target)
                          }
                        >
                          {moduleJump.label} <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </section>

                  <StudyRoomWidget
                    conceptId={roadmap.analysis.conceptId}
                    concept={catalog.find(
                      (c) => c.id === roadmap.analysis.conceptId
                    )}
                  />

                  <section className="journey-card evidence-card">
                    <div className="section-title">
                      <div>
                        <span className="tiny-label">
                          02 / YOUR LEARNING EVIDENCE
                        </span>
                        <h2>What EXO understood</h2>
                      </div>
                      <span className="soft-pill">
                        {roadmap.reviewProvider} · {roadmap.analysisTimeMs} ms
                      </span>
                    </div>
                    <p className="explain-notice">
                      {roadmap.analysis.rationale} Evidence matching is
                      preliminary, not a reliable grade. Incorrect and
                      unverified are different states.
                    </p>
                    <div className="evidence-list">
                      {roadmap.analysis.evidence.map((e) => (
                        <div className="evidence-row" key={e.objective}>
                          <span className={`evidence-status ${e.status}`}>
                            {e.status === 'correct' ? (
                              <CheckCircle2 size={17} />
                            ) : e.status === 'misconception' ? (
                              <Lightbulb size={17} />
                            ) : (
                              <CircleHelp size={17} />
                            )}
                          </span>
                          <div>
                            <b>{e.objective}</b>
                            <span className="status-text">
                              {e.status === 'correct'
                                ? 'Mentioned correctly — verify later'
                                : e.status === 'misconception'
                                ? 'Possible misconception'
                                : 'Not checked yet'}
                            </span>
                            <p>{e.note}</p>
                            {e.quote && <blockquote>“{e.quote}”</blockquote>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="engine-note">
                      <BrainCircuit size={17} /> Analysis method:{' '}
                      {roadmap.analysis.analysisMethod}.{' '}
                      {roadmap.analysis.studentTurns} explanation turns
                      reviewed.
                    </div>
                  </section>
                </>
              ) : null}

              {view === 'lesson' && lesson ? (
                <>
                  <div className="journey-intro">
                    <div>
                      <div className="eyebrow">EXO GUIDED LESSON</div>
                      <h1>{lesson.title}</h1>
                      <p>
                        {lesson.chapter} · Class {lesson.grade ?? 10}{' '}
                        {lesson.subject ?? 'Science'}
                      </p>
                    </div>
                    <button
                      className="recheck"
                      onClick={() => practiceConcept(lesson.id)}
                    >
                      <AudioLines size={16} /> Practice with EXO
                    </button>
                  </div>

                  <LearningHub
                    concept={lesson}
                    detail={lessonDetail}
                    sessionId={sessionId}
                    onPractice={() => practiceConcept(lesson.id)}
                    learningFocus={
                      roadmap?.analysis.conceptId === lesson.id
                        ? roadmap.analysis.evidence.find(
                            (e) => e.status !== 'correct'
                          )?.objective
                        : undefined
                    }
                  />

                  <StudyRoomWidget conceptId={lesson.id} concept={lesson} />

                  <div className="lesson-workspace">
                    <div className="lesson-main">
                      {lessonLoading && (
                        <div className="journey-card">
                          Loading a source-grounded lesson…
                        </div>
                      )}
                      <div className="lesson-highlight">
                        <span>01 · THE BIG IDEA</span>
                        <h2>Understand it simply.</h2>
                        <p>{lesson.summary}</p>
                        {lessonDetail?.warning && (
                          <p className="lesson-source-warning">
                            {lessonDetail.warning}
                          </p>
                        )}
                      </div>

                      <div className="journey-card concept-visual">
                        <span className="tiny-label">VISUAL EXPLANATION</span>
                        {visualLoading ? (
                          <div className="visual-wait">
                            <RefreshCw size={18} /> Preparing your concept
                            diagram…
                          </div>
                        ) : visual ? (
                          <>
                            <h2>{visual.title}</h2>
                            <p>{visual.caption}</p>
                            <div className="visual-canvas">
                              <svg
                                viewBox="0 0 800 215"
                                role="img"
                                aria-label={visual.title}
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <defs>
                                  <marker
                                    id="concept-arrow"
                                    markerWidth="8"
                                    markerHeight="8"
                                    refX="6"
                                    refY="4"
                                    orient="auto"
                                  >
                                    <path d="M0 0 L8 4 L0 8 z" fill="#7889b8" />
                                  </marker>
                                </defs>
                                {visual.links.slice(0, 3).map((link, i) => (
                                  <g key={`link-${i}`}>
                                    <path
                                      d={`M${174 + i * 205} 93 L${
                                        222 + i * 205
                                      } 93`}
                                      stroke="#7889b8"
                                      strokeWidth="2"
                                      markerEnd="url(#concept-arrow)"
                                      fill="none"
                                    />
                                    <text
                                      x={200 + i * 205}
                                      y="126"
                                      fontSize="10"
                                      textAnchor="middle"
                                      fill="#7b8aa3"
                                    >
                                      {link.slice(0, 16)}
                                    </text>
                                  </g>
                                ))}
                                {visual.nodes.slice(0, 4).map((n, i) => (
                                  <g
                                    key={n.label}
                                    transform={`translate(${
                                      16 + i * 205
                                    },42)`}
                                  >
                                    <rect
                                      width="165"
                                      height="96"
                                      rx="15"
                                      fill={i === 0 ? '#edf1ff' : '#f5f7fc'}
                                      stroke="#d7def5"
                                    />
                                    <text
                                      x="82"
                                      y="40"
                                      textAnchor="middle"
                                      fill="#3e5185"
                                      fontSize="15"
                                      fontWeight="700"
                                    >
                                      {n.label.slice(0, 20)}
                                    </text>
                                    <text
                                      x="82"
                                      y="65"
                                      textAnchor="middle"
                                      fill="#72839d"
                                      fontSize="11"
                                    >
                                      {n.detail.slice(0, 23)}
                                    </text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                          </>
                        ) : (
                          <p>
                            Visual unavailable. The text lesson remains
                            accessible.
                          </p>
                        )}
                      </div>

                      <div className="journey-card">
                        <span className="tiny-label">
                          02 · KEY BUILDING BLOCKS
                        </span>
                        <h2>What to remember</h2>
                        {lesson.essentials.map((x, i) => (
                          <div key={x} className="lesson-point">
                            <span>{i + 1}</span>
                            {x}
                          </div>
                        ))}
                      </div>

                      {lessonDetail?.workedExample && (
                        <div className="journey-card worked-math">
                          <span className="tiny-label">
                            STEP-BY-STEP MATHEMATICS
                          </span>
                          <h2>Let&apos;s solve an example</h2>
                          <p className="math-problem">
                            {lessonDetail.workedExample.problem}
                          </p>
                          <ol>
                            {lessonDetail.workedExample.working.map(
                              (step, i) => (
                                <li key={i}>{step}</li>
                              )
                            )}
                          </ol>
                          <div className="math-result">
                            <b>{lessonDetail.workedExample.answer}</b>
                            <small>{lessonDetail.workedExample.check}</small>
                          </div>
                        </div>
                      )}

                      <div className="journey-card">
                        <span className="tiny-label">03 · A COMMON MIX-UP</span>
                        <h2>Check this misconception</h2>
                        <p>{lesson.misconception}</p>
                      </div>

                      <div className="journey-card">
                        <span className="tiny-label">04 · TRY EXPLAINING</span>
                        <h2>{lesson.question}</h2>
                        <p>
                          Use EXO to explain your reasoning aloud. Your next
                          roadmap will use the new evidence.
                        </p>
                        <button
                          className="primary-lesson-btn"
                          onClick={() => practiceConcept(lesson.id)}
                        >
                          Explain to EXO <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    <aside className="lesson-aside">
                      <div className="journey-card">
                        <GraduationCap size={26} />
                        <h3>Master it in small steps</h3>
                        <p>
                          Understand the idea, check a misconception, then
                          explain it back. No memorization-only shortcut.
                        </p>
                      </div>

                      {onNavigateToModule && (
                        <div className="journey-card">
                          <b>Practice hands-on in NILO</b>
                          <p>{moduleJump.description}</p>
                          <button
                            className="nilo-module-jump-btn"
                            onClick={() =>
                              handleNavigateToModule(moduleJump.target)
                            }
                          >
                            {moduleJump.label} <ArrowRight size={13} />
                          </button>
                        </div>
                      )}

                      {lessonDetail?.prerequisites &&
                        lessonDetail.prerequisites.length > 0 && (
                          <div className="journey-card">
                            <b>Before you start</b>
                            <p>{lessonDetail.prerequisites.join(' · ')}</p>
                          </div>
                        )}

                      <div className="journey-card">
                        <b>Book references</b>
                        <p>
                          {lessonDetail?.resource
                            ? 'Original lesson notes with an external NCERT chapter reference.'
                            : 'Uploaded NCERT PDFs are searched privately. Page references use PDF numbering.'}
                        </p>
                        {lessonDetail?.citations?.map((c) => (
                          <div
                            key={`${c.title}-${c.page}`}
                            className="source-cite"
                          >
                            {c.title} · PDF page {c.page}
                          </div>
                        ))}
                        {lessonDetail?.resource && (
                          <a
                            href={lessonDetail.resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open official chapter PDF{' '}
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <a
                          href="https://ncert.nic.in/textbook.php?jemh1=0-14"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          NCERT textbook index <ExternalLink size={13} />
                        </a>
                      </div>
                    </aside>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
