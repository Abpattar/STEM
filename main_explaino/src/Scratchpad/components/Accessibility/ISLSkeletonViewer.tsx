import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SignSequenceItem } from '../../types/umr';

/**
 * 3D Landmark Skeleton Player for Indian Sign Language (ISL) mathematical tokens.
 *
 * LICENSING NOTICE (Section 13 Audit):
 * Derived from canonical scratchpad_notebook/frontend/src/components/ISLSkeletonViewer.tsx,
 * which adapts bone topology and preset landmark JSON (/models/sixth-sense/preset-references.json)
 * from Sixth-Sense (GNU GPL-3.0). Flagged in the licensing risk review for isolation or
 * clean-room / GPL-3.0 licensing decision before public distribution.
 *
 * CAPABILITY SCOPE:
 * Renders animated 2D projections of 3D hand landmark presets for digits, letters, and mapped
 * math operators. This is preset landmark sequence playback — NOT human video playback and
 * NOT continuous full-grammar ISL translation.
 */

interface LandmarkFrame {
  pose?: number[];
  left?: number[];
  right?: number[];
  face?: number[];
  leftRelToFace?: number[];
  rightRelToFace?: number[];
}

interface SignTake {
  meta: {
    left: boolean;
    right: boolean;
    face: boolean;
  };
  frames: LandmarkFrame[];
}

type PresetReferences = Record<string, SignTake[]>;

export interface ISLSkeletonViewerProps {
  signSequence: SignSequenceItem[];
  activeSign?: string;
  onSelectSign?: (sign: string) => void;
  onPlaybackStart?: (signOrSequence: string) => void;
}

const HAND_SCALE = 65;

const NEON = {
  left: '#FFC15E',
  right: '#4CEBD8',
  face: '#FF6FC8',
};

const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const MATH_ALIASES: Record<string, string[]> = {
  '+': ['PLUS', '+'],
  PLUS: ['+', 'PLUS'],
  '-': ['MINUS', '-'],
  MINUS: ['-', 'MINUS'],
  '*': ['TIMES', '*'],
  TIMES: ['*', 'TIMES'],
  '/': ['DIVIDE', '/'],
  DIVIDE: ['/', 'DIVIDE'],
  '=': ['EQUALS', '='],
  EQUALS: ['=', 'EQUALS'],
  '^2': ['SQUARED', '^2'],
  SQUARED: ['^2', 'SQUARED'],
  '^3': ['CUBED', '^3'],
  CUBED: ['^3', 'CUBED'],
  '^': ['POWER', '^'],
  POWER: ['^', 'POWER'],
  '√': ['SQRT', '√', '\\sqrt'],
  SQRT: ['√', 'SQRT', '\\sqrt'],
  '<=': ['LESS_EQUAL', '<=', '≤'],
  '>=': ['GREATER_EQUAL', '>=', '≥'],
  '<': ['LESS_THAN', '<'],
  '>': ['GREATER_THAN', '>'],
  '±': ['PLUS_MINUS', '±', '+-'],
  PLUS_MINUS: ['±', 'PLUS_MINUS', '+-'],
  'π': ['PI', 'π', '\\pi'],
  PI: ['π', 'PI', '\\pi'],
  '°': ['DEGREES', '°', 'DEG'],
  DEGREES: ['°', 'DEGREES', 'DEG'],
  '%': ['PERCENT', '%'],
  PERCENT: ['%', 'PERCENT'],
  '?': ['QUESTION', '?'],
  QUESTION: ['?', 'QUESTION'],
  OR: ['OR', 'or'],
  or: ['OR', 'or'],
};

// Module-level cache so the 5.7 MB preset file is only fetched once per page session
let cachedPresetsPromise: Promise<PresetReferences> | null = null;

function loadPresetReferences(): Promise<PresetReferences> {
  if (!cachedPresetsPromise) {
    cachedPresetsPromise = fetch('/models/sixth-sense/preset-references.json').then(async (res) => {
      if (!res.ok) {
        cachedPresetsPromise = null;
        throw new Error(`Failed to load ISL landmark presets (${res.status})`);
      }
      return (await res.json()) as PresetReferences;
    });
  }
  return cachedPresetsPromise;
}

export const ISLSkeletonViewer: React.FC<ISLSkeletonViewerProps> = ({
  signSequence,
  activeSign: propActiveSign,
  onSelectSign,
  onPlaybackStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [references, setReferences] = useState<PresetReferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSign, setCurrentSign] = useState<string>(propActiveSign || '');
  const [speed, setSpeed] = useState<number>(1.0);

  const animationTimerRef = useRef<number | null>(null);
  const sequenceCancelRef = useRef<boolean>(false);

  const stopPlayback = useCallback(() => {
    sequenceCancelRef.current = true;
    if (animationTimerRef.current !== null) {
      window.clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const getTake = useCallback(
    (signStr: string): SignTake | null => {
      if (!references || !signStr) return null;
      if (references[signStr]?.length) return references[signStr][0];
      const upper = signStr.toUpperCase();
      if (references[upper]?.length) return references[upper][0];

      const item = signSequence.find((s) => s.sign === signStr || s.display === signStr);
      if (item) {
        if (references[item.sign]?.length) return references[item.sign][0];
        if (references[item.display]?.length) return references[item.display][0];
        const itemUpper = item.sign.toUpperCase();
        if (references[itemUpper]?.length) return references[itemUpper][0];
      }

      const aliasCandidates = MATH_ALIASES[signStr] || MATH_ALIASES[upper];
      if (aliasCandidates) {
        for (const alias of aliasCandidates) {
          if (references[alias]?.length) return references[alias][0];
        }
      }
      return null;
    },
    [references, signSequence]
  );

  // Load preset-references.json on mount
  useEffect(() => {
    let isMounted = true;
    setLoadError(null);
    loadPresetReferences()
      .then((data) => {
        if (!isMounted) return;
        setReferences(data);
        setIsLoading(false);
        const first3D = signSequence.find(
          (s) =>
            s.has_3d_template &&
            (data[s.sign] || data[s.sign.toUpperCase()] || data[s.display])
        );
        if (first3D && !currentSign) {
          setCurrentSign(first3D.sign);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load ISL landmark presets.');
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (propActiveSign) {
      setCurrentSign(propActiveSign);
    }
  }, [propActiveSign]);

  useEffect(() => {
    if (signSequence && signSequence.length > 0) {
      const match = signSequence.some((s) => s.sign === currentSign || s.display === currentSign);
      if (!match) {
        const first3D = signSequence.find((s) => s.has_3d_template && getTake(s.sign) !== null);
        const defaultSign = first3D?.sign || signSequence[0]?.sign || '';
        if (defaultSign) {
          setCurrentSign(defaultSign);
        }
      }
    }
  }, [signSequence, currentSign, getTake]);

  const drawFrame = useCallback(
    (frame: LandmarkFrame, meta: { left: boolean; right: boolean; face: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      ctx.fillStyle = '#0B1615';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(76, 235, 216, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.moveTo(0, H * 0.65);
      ctx.lineTo(W, H * 0.65);
      ctx.stroke();

      const both = meta.left && meta.right;
      const cy = H * 0.65;
      const faceAnchor = { x: W * 0.5, y: H * 0.25 };
      const defaultLeft = both ? { x: W * 0.32, y: cy } : { x: W * 0.5, y: cy };
      const defaultRight = both ? { x: W * 0.68, y: cy } : { x: W * 0.5, y: cy };

      const leftAnchor =
        meta.face && frame.leftRelToFace
          ? {
              x: faceAnchor.x + frame.leftRelToFace[0] * HAND_SCALE,
              y: faceAnchor.y + frame.leftRelToFace[1] * HAND_SCALE,
            }
          : defaultLeft;

      const rightAnchor =
        meta.face && frame.rightRelToFace
          ? {
              x: faceAnchor.x + frame.rightRelToFace[0] * HAND_SCALE,
              y: faceAnchor.y + frame.rightRelToFace[1] * HAND_SCALE,
            }
          : defaultRight;

      const drawHand = (
        handVec: number[] | undefined,
        anchor: { x: number; y: number },
        color: string
      ) => {
        if (!handVec || handVec.length < 63) return;
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 21; i++) {
          pts.push({
            x: anchor.x + handVec[i * 3] * HAND_SCALE,
            y: anchor.y + handVec[i * 3 + 1] * HAND_SCALE,
          });
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        HAND_BONES.forEach(([a, b]) => {
          if (pts[a] && pts[b]) {
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        });

        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        pts.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      };

      if (meta.left && frame.left) drawHand(frame.left, leftAnchor, NEON.left);
      if (meta.right && frame.right) drawHand(frame.right, rightAnchor, NEON.right);
    },
    []
  );

  // Render resting frame whenever current sign changes
  useEffect(() => {
    const take = getTake(currentSign);
    if (!take || !take.frames || take.frames.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0B1615';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(
            loadError || 'Select a 3D sign token to preview landmark skeleton',
            canvas.width / 2,
            canvas.height / 2
          );
        }
      }
      return;
    }
    drawFrame(take.frames[0], take.meta);
  }, [getTake, currentSign, drawFrame, loadError]);

  const playCurrentSign = useCallback(() => {
    const take = getTake(currentSign);
    if (!take || !take.frames || take.frames.length === 0) return;

    stopPlayback();
    sequenceCancelRef.current = false;
    onPlaybackStart?.(currentSign);

    const frames = take.frames;
    setIsPlaying(true);
    let frameIdx = 0;
    const intervalMs = Math.max(25, Math.floor(60 / speed));

    animationTimerRef.current = window.setInterval(() => {
      if (sequenceCancelRef.current || frameIdx >= frames.length) {
        if (animationTimerRef.current !== null) {
          window.clearInterval(animationTimerRef.current);
          animationTimerRef.current = null;
        }
        setIsPlaying(false);
        drawFrame(frames[frames.length - 1], take.meta);
        return;
      }

      drawFrame(frames[frameIdx], take.meta);
      frameIdx++;
    }, intervalMs);
  }, [getTake, currentSign, speed, drawFrame, stopPlayback, onPlaybackStart]);

  const playFullSequence = async () => {
    if (!references || isPlaying) return;
    stopPlayback();
    sequenceCancelRef.current = false;
    setIsPlaying(true);
    onPlaybackStart?.('sequence');

    const playableSigns = signSequence
      .filter((item) => item.has_3d_template && getTake(item.sign) !== null)
      .map((item) => item.sign);

    for (const sign of playableSigns) {
      if (sequenceCancelRef.current) break;
      setCurrentSign(sign);
      onSelectSign?.(sign);
      const take = getTake(sign);
      if (!take || !take.frames || take.frames.length === 0) continue;
      const frames = take.frames;

      await new Promise<void>((resolve) => {
        let idx = 0;
        const intervalMs = Math.max(25, Math.floor(60 / speed));
        const timer = window.setInterval(() => {
          if (sequenceCancelRef.current || idx >= frames.length) {
            window.clearInterval(timer);
            animationTimerRef.current = null;
            resolve();
            return;
          }
          drawFrame(frames[idx], take.meta);
          idx++;
        }, intervalMs);
        animationTimerRef.current = timer;
      });

      if (sequenceCancelRef.current) break;
      await new Promise((r) => setTimeout(r, 180));
    }

    setIsPlaying(false);
  };

  const handleSelectToken = (sign: string) => {
    stopPlayback();
    setCurrentSign(sign);
    onSelectSign?.(sign);
  };

  const currentItem = signSequence.find(
    (s) => s.sign === currentSign || s.display === currentSign
  );
  const currentHasTake = getTake(currentSign) !== null;

  return (
    <div className="isl-skeleton-viewer" data-testid="isl-skeleton-viewer">
      <div className="skeleton-toolbar">
        <div className="skeleton-sign-badge">
          <span className="sign-letter" data-testid="isl-current-sign">
            {currentSign || '—'}
          </span>
          <span className="sign-info">
            {currentItem?.description || 'Indian Sign Language 3D Landmark Preset'}
          </span>
        </div>

        <div className="skeleton-actions">
          {isPlaying ? (
            <button
              type="button"
              className="skeleton-btn stop"
              onClick={stopPlayback}
              data-testid="isl-stop-btn"
            >
              ⏹ Stop
            </button>
          ) : (
            <button
              type="button"
              className="skeleton-btn primary"
              onClick={playCurrentSign}
              disabled={!currentHasTake}
              title="Replay this sign's 3D landmark gesture"
              data-testid="isl-replay-btn"
            >
              ▶ Replay Gesture
            </button>
          )}

          <button
            type="button"
            className="skeleton-btn secondary"
            onClick={() => void playFullSequence()}
            disabled={isPlaying || !references || signSequence.length === 0}
            title="Play all mapped 3D signs in sequence"
            data-testid="isl-play-sequence-btn"
          >
            🔁 Play Sequence
          </button>

          <select
            className="skeleton-speed-select"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            aria-label="ISL playback speed"
            data-testid="isl-speed-select"
          >
            <option value="0.5">0.5x</option>
            <option value="1.0">1.0x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>
      </div>

      <div className="skeleton-stage">
        <canvas
          ref={canvasRef}
          width={360}
          height={240}
          className="skeleton-canvas"
          role="img"
          aria-label={`Indian Sign Language 3D landmark skeleton animation for ${currentSign || 'expression'}`}
          data-testid="isl-skeleton-canvas"
        />
        {isLoading && (
          <div className="skeleton-loading-overlay">Loading 3D Landmark Presets...</div>
        )}
      </div>

      {loadError && (
        <div className="isl-warning" role="alert">
          {loadError}
        </div>
      )}

      <div className="skeleton-sequence-strip">
        <span className="strip-label">Click a token to inspect its 3D landmark pose:</span>
        <div className="strip-chips">
          {signSequence.map((item, idx) => {
            const hasTake = getTake(item.sign) !== null;
            return (
              <button
                type="button"
                key={`${item.sign}-${idx}`}
                className={`strip-chip ${item.sign === currentSign || item.display === currentSign ? 'active' : ''} ${hasTake ? 'template' : 'gloss'}`}
                onClick={() => handleSelectToken(item.sign)}
                title={item.description}
                data-testid={`isl-token-${idx}`}
              >
                <span className="chip-char">{item.display || item.sign}</span>
                <span className="chip-tag">{hasTake ? '3D' : 'Gloss'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

