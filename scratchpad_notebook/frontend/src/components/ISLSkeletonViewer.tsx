import React, { useEffect, useRef, useState, useCallback } from 'react';
import './ISLSkeletonViewer.css';

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

interface ISLSkeletonViewerProps {
  signSequence: Array<{
    display: string;
    sign: string;
    type: string;
    description: string;
    has_3d_template: boolean;
  }>;
  activeSign?: string;
  onSelectSign?: (sign: string) => void;
}

const HAND_SCALE = 65;

const NEON = {
  left: '#FFC15E',   // neon amber
  right: '#4CEBD8',  // neon cyan
  face: '#FF6FC8'    // neon pink
};

const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

export const ISLSkeletonViewer: React.FC<ISLSkeletonViewerProps> = ({
  signSequence,
  activeSign: propActiveSign,
  onSelectSign
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [references, setReferences] = useState<PresetReferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSign, setCurrentSign] = useState<string>(propActiveSign || '');
  const [speed, setSpeed] = useState<number>(1.0);
  const animationTimerRef = useRef<number | null>(null);

  // Helper to resolve 3D take by sign, uppercase, or display
  const getTake = useCallback((signStr: string): SignTake | null => {
    if (!references || !signStr) return null;
    if (references[signStr] && references[signStr].length > 0) return references[signStr][0];
    const upper = signStr.toUpperCase();
    if (references[upper] && references[upper].length > 0) return references[upper][0];
    const item = signSequence.find(s => s.sign === signStr || s.display === signStr);
    if (item) {
      if (references[item.sign] && references[item.sign].length > 0) return references[item.sign][0];
      if (references[item.display] && references[item.display].length > 0) return references[item.display][0];
      const itemUpper = item.sign.toUpperCase();
      if (references[itemUpper] && references[itemUpper].length > 0) return references[itemUpper][0];
    }
    // Mathematical symbol aliases
    const mathAliases: Record<string, string[]> = {
      '+': ['PLUS', '+'],
      'PLUS': ['+', 'PLUS'],
      '-': ['MINUS', '-'],
      'MINUS': ['-', 'MINUS'],
      '*': ['TIMES', '*'],
      'TIMES': ['*', 'TIMES'],
      '/': ['DIVIDE', '/'],
      'DIVIDE': ['/', 'DIVIDE'],
      '=': ['EQUALS', '='],
      'EQUALS': ['=', 'EQUALS'],
      '^2': ['SQUARED', '^2'],
      'SQUARED': ['^2', 'SQUARED'],
      '^3': ['CUBED', '^3'],
      'CUBED': ['^3', 'CUBED'],
      '^': ['POWER', '^'],
      'POWER': ['^', 'POWER'],
      '√': ['SQRT', '√', '\\sqrt'],
      'SQRT': ['√', 'SQRT', '\\sqrt'],
      '<=': ['LESS_EQUAL', '<=', '≤'],
      '>=': ['GREATER_EQUAL', '>=', '≥'],
      '<': ['LESS_THAN', '<'],
      '>': ['GREATER_THAN', '>'],
      '±': ['PLUS_MINUS', '±', '+-'],
      'PLUS_MINUS': ['±', 'PLUS_MINUS', '+-'],
      'π': ['PI', 'π', '\\pi'],
      'PI': ['π', 'PI', '\\pi'],
      '°': ['DEGREES', '°', 'DEG'],
      'DEGREES': ['°', 'DEGREES', 'DEG'],
      '%': ['PERCENT', '%'],
      'PERCENT': ['%', 'PERCENT'],
      '?': ['QUESTION', '?'],
      'QUESTION': ['?', 'QUESTION'],
      'OR': ['OR', 'or'],
      'or': ['OR', 'or']
    };
    if (mathAliases[signStr]) {
      for (const alias of mathAliases[signStr]) {
        if (references[alias] && references[alias].length > 0) return references[alias][0];
      }
    }
    if (mathAliases[upper]) {
      for (const alias of mathAliases[upper]) {
        if (references[alias] && references[alias].length > 0) return references[alias][0];
      }
    }
    return null;
  }, [references, signSequence]);

  // Load preset-references.json
  useEffect(() => {
    let isMounted = true;
    const fetchReferences = async () => {
      try {
        const res = await fetch('/models/sixth-sense/preset-references.json');
        if (!res.ok) throw new Error('Failed to load ISL landmark references');
        const data: PresetReferences = await res.json();
        if (isMounted) {
          setReferences(data);
          setIsLoading(false);
          // Set first available 3D sign
          const first3D = signSequence.find(s => s.has_3d_template && (data[s.sign] || data[s.sign.toUpperCase()] || data[s.display]));
          if (first3D && !currentSign) {
            setCurrentSign(first3D.sign);
          }
        }
      } catch (e) {
        console.error('Error loading ISL presets:', e);
        if (isMounted) setIsLoading(false);
      }
    };
    fetchReferences();
    return () => { isMounted = false; };
  }, []);

  // Update currentSign when prop changes
  useEffect(() => {
    if (propActiveSign) {
      setCurrentSign(propActiveSign);
    }
  }, [propActiveSign]);

  // When signSequence changes, ensure currentSign belongs to it
  useEffect(() => {
    if (signSequence && signSequence.length > 0) {
      const match = signSequence.some(s => s.sign === currentSign || s.display === currentSign);
      if (!match) {
        const first3D = signSequence.find(s => s.has_3d_template && getTake(s.sign) !== null);
        const defaultSign = first3D?.sign || signSequence[0]?.sign || '';
        if (defaultSign) {
          setCurrentSign(defaultSign);
        }
      }
    }
  }, [signSequence, currentSign, getTake]);

  const drawFrame = useCallback((frame: LandmarkFrame, meta: { left: boolean; right: boolean; face: boolean }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Dark sleek background
    ctx.fillStyle = '#0B1615';
    ctx.fillRect(0, 0, W, H);

    // Grid guide lines (subtle)
    ctx.strokeStyle = 'rgba(76, 235, 216, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H * 0.65); ctx.lineTo(W, H * 0.65);
    ctx.stroke();

    const both = meta.left && meta.right;
    const cy = H * 0.65;
    const faceAnchor = { x: W * 0.5, y: H * 0.25 };
    const defaultLeft = both ? { x: W * 0.32, y: cy } : { x: W * 0.5, y: cy };
    const defaultRight = both ? { x: W * 0.68, y: cy } : { x: W * 0.5, y: cy };

    const leftAnchor = (meta.face && frame.leftRelToFace)
      ? { x: faceAnchor.x + frame.leftRelToFace[0] * HAND_SCALE, y: faceAnchor.y + frame.leftRelToFace[1] * HAND_SCALE }
      : defaultLeft;

    const rightAnchor = (meta.face && frame.rightRelToFace)
      ? { x: faceAnchor.x + frame.rightRelToFace[0] * HAND_SCALE, y: faceAnchor.y + frame.rightRelToFace[1] * HAND_SCALE }
      : defaultRight;

    // Helper to draw hand skeleton
    const drawHand = (handVec: number[] | undefined, anchor: { x: number; y: number }, color: string) => {
      if (!handVec || handVec.length < 63) return;
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 21; i++) {
        pts.push({
          x: anchor.x + handVec[i * 3] * HAND_SCALE,
          y: anchor.y + handVec[i * 3 + 1] * HAND_SCALE
        });
      }

      // Neon bones
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

      // Clear glow for joint dots
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    if (meta.left && frame.left) drawHand(frame.left, leftAnchor, NEON.left);
    if (meta.right && frame.right) drawHand(frame.right, rightAnchor, NEON.right);
  }, []);

  // Play animation for current sign
  const playCurrentSign = useCallback(() => {
    const take = getTake(currentSign);
    if (!take || !take.frames || take.frames.length === 0) {
      return;
    }

    if (animationTimerRef.current) {
      window.clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    const frames = take.frames;
    setIsPlaying(true);
    let frameIdx = 0;
    const intervalMs = Math.max(25, Math.floor(60 / speed));

    animationTimerRef.current = window.setInterval(() => {
      if (frameIdx >= frames.length) {
        if (animationTimerRef.current) {
          window.clearInterval(animationTimerRef.current);
          animationTimerRef.current = null;
        }
        setIsPlaying(false);
        // keep final resting frame
        drawFrame(frames[frames.length - 1], take.meta);
        return;
      }

      drawFrame(frames[frameIdx], take.meta);
      frameIdx++;
    }, intervalMs);
  }, [getTake, currentSign, speed, drawFrame]);

  // Initial render when sign changes
  useEffect(() => {
    const take = getTake(currentSign);
    if (!take || !take.frames || take.frames.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0B1615';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#64748b';
          ctx.font = '13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Select a 3D sign to view landmark skeleton', canvas.width / 2, canvas.height / 2);
        }
      }
      return;
    }

    drawFrame(take.frames[0], take.meta);
  }, [getTake, currentSign, drawFrame]);

  // Play full sequence through signs
  const playFullSequence = async () => {
    if (!references || isPlaying) return;
    setIsPlaying(true);

    const playableSigns = signSequence
      .filter(item => item.has_3d_template && getTake(item.sign) !== null)
      .map(item => item.sign);

    for (const sign of playableSigns) {
      setCurrentSign(sign);
      onSelectSign?.(sign);
      const take = getTake(sign);
      if (!take || !take.frames || take.frames.length === 0) continue;
      const frames = take.frames;

      await new Promise<void>((resolve) => {
        let idx = 0;
        const intervalMs = Math.max(25, Math.floor(60 / speed));
        const timer = window.setInterval(() => {
          if (idx >= frames.length) {
            window.clearInterval(timer);
            resolve();
            return;
          }
          drawFrame(frames[idx], take.meta);
          idx++;
        }, intervalMs);
      });

      // Brief pause between signs
      await new Promise(r => setTimeout(r, 200));
    }

    setIsPlaying(false);
  };

  const handleSelectToken = (sign: string) => {
    setCurrentSign(sign);
    onSelectSign?.(sign);
    if (animationTimerRef.current) {
      window.clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
      setIsPlaying(false);
    }
  };

  const currentItem = signSequence.find(s => s.sign === currentSign || s.display === currentSign);
  const currentHasTake = getTake(currentSign) !== null;

  return (
    <div className="isl-skeleton-viewer">
      <div className="skeleton-toolbar">
        <div className="skeleton-sign-badge">
          <span className="sign-letter">{currentSign || '—'}</span>
          <span className="sign-info">
            {currentItem?.description || 'Indian Sign Language 3D Template'}
          </span>
        </div>

        <div className="skeleton-actions">
          <button
            className="skeleton-btn primary"
            onClick={playCurrentSign}
            disabled={isPlaying || !currentHasTake}
            title="Replay this sign's 3D gesture"
          >
            {isPlaying ? '⏳ Playing...' : '▶ Replay Gesture'}
          </button>

          <button
            className="skeleton-btn secondary"
            onClick={playFullSequence}
            disabled={isPlaying || !references}
            title="Play all supported signs in sequence"
          >
            🔁 Play Sequence
          </button>

          <select
            className="skeleton-speed-select"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            aria-label="Playback Speed"
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
          aria-label={`Indian Sign Language 3D skeleton animation for ${currentSign}`}
        />
        {isLoading && (
          <div className="skeleton-loading-overlay">
            Loading 3D Landmark Presets...
          </div>
        )}
      </div>

      <div className="skeleton-sequence-strip">
        <span className="strip-label">Click a token to animate:</span>
        <div className="strip-chips">
          {signSequence.map((item, idx) => {
            const hasTake = getTake(item.sign) !== null;
            return (
              <button
                key={`${item.sign}-${idx}`}
                className={`strip-chip ${item.sign === currentSign || item.display === currentSign ? 'active' : ''} ${hasTake ? 'template' : 'gloss'}`}
                onClick={() => handleSelectToken(item.sign)}
                title={item.description}
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
