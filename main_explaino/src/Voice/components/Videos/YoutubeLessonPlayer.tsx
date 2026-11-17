import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, AlertCircle, RotateCcw } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  channel?: string;
  watchUrl: string;
}

type Player = { destroy: () => void };
type YTGlobal = {
  Player: new (
    target: HTMLIFrameElement,
    options: {
      events: {
        onReady?: () => void;
        onError?: (event: { data: number }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => Player;
};

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const validId = /^[a-zA-Z0-9_-]{11}$/;

const errorMessages: Record<number, string> = {
  2: 'This video cannot be embedded with the supplied ID.',
  5: "YouTube couldn't load this video in the HTML5 player.",
  100: 'This YouTube video was removed, made private or cannot be found.',
  101: 'The creator disabled playback on external websites.',
  150: 'The creator disabled playback on external websites.',
  153: 'YouTube did not receive the required player identification (HTTP referrer).',
};

interface YoutubeLessonPlayerProps {
  video: Video;
  onBlocked?: () => void;
  onTryNext?: () => void;
}

export const YoutubeLessonPlayer: React.FC<YoutubeLessonPlayerProps> = ({
  video,
  onBlocked,
  onTryNext,
}) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [retry, setRetry] = useState(0);
  const [networkWarning, setNetworkWarning] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!validId.test(video.id)) return;
    let cancelled = false;
    let player: Player | undefined;
    let attempts = 0;

    const warningTimer = setTimeout(() => {
      if (!cancelled) setNetworkWarning(true);
    }, 9500);

    const tagId = 'exo-youtube-iframe-api';
    if (!document.getElementById(tagId)) {
      const script = document.createElement('script');
      script.id = tagId;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    const tick = setInterval(() => {
      if (cancelled) return;
      const frame = ref.current;
      if (frame && window.YT?.Player) {
        clearInterval(tick);
        try {
          player = new window.YT.Player(frame, {
            events: {
              onReady: () => {
                if (!cancelled) {
                  clearTimeout(warningTimer);
                  setNetworkWarning(false);
                }
              },
              onError: (event) => {
                if (!cancelled) {
                  clearTimeout(warningTimer);
                  setError(event.data);
                  onBlocked?.();
                }
              },
              onStateChange: (event) => {
                if (!cancelled) {
                  setPlaying(event.data === 1);
                  if (event.data === 1) {
                    clearTimeout(warningTimer);
                    setNetworkWarning(false);
                  }
                }
              },
            },
          });
        } catch {
          // IFrame can still work as standard YouTube media embed
        }
      }
      if (++attempts > 60) clearInterval(tick);
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearTimeout(warningTimer);
      try {
        player?.destroy();
      } catch {
        // already removed
      }
    };
  }, [video.id, retry, onBlocked]);

  if (!validId.test(video.id)) {
    return <p role="alert">Invalid YouTube video ID.</p>;
  }

  const src =
    'https://www.youtube.com/embed/' +
    video.id +
    '?rel=0&playsinline=1&enablejsapi=1' +
    (origin ? '&origin=' + encodeURIComponent(origin) : '');

  return (
    <div className="youtube-player" data-testid="youtube-player">
      <div className="video-frame">
        <iframe
          key={video.id + '-' + retry}
          ref={ref}
          title={'YouTube lesson: ' + video.title}
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="eager"
          onError={() => {
            setNetworkWarning(true);
            onBlocked?.();
          }}
        />
      </div>
      {networkWarning && error === null && (
        <div role="alert" className="video-playback-error">
          <AlertCircle size={17} />
          <span>
            Embedded playback is taking longer than expected. Open the same lesson
            on YouTube, or retry below.{' '}
            {onTryNext && (
              <button
                type="button"
                onClick={onTryNext}
                className="try-next-video"
              >
                Try another video
              </button>
            )}
          </span>
        </div>
      )}
      {error !== null && (
        <div role="alert" className="video-playback-error">
          <AlertCircle size={17} />
          <span>
            {errorMessages[error] || 'This YouTube embed could not play.'}{' '}
            {onTryNext && (
              <button
                type="button"
                onClick={onTryNext}
                className="try-next-video"
              >
                Try another video
              </button>
            )}{' '}
            Or watch directly on YouTube.
          </span>
        </div>
      )}
      <div className="video-player-actions">
        <a
          href={'https://www.youtube.com/watch?v=' + video.id}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube <ExternalLink size={13} />
        </a>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPlaying(false);
            setNetworkWarning(false);
            setRetry((n) => n + 1);
          }}
        >
          <RotateCcw size={13} /> Retry player
        </button>
        {playing && <small>Playing · not counted as mastery</small>}
      </div>
    </div>
  );
};

