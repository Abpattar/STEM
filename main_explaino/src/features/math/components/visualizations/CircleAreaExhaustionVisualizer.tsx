import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

interface CircleAreaProps {
  radius?: number;
  onSonify?: (frequency: number) => void;
}

export const CircleAreaExhaustionVisualizer: React.FC<CircleAreaProps> = ({
  radius = 5,
  onSonify
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slices, setSlices] = useState<number>(16);
  const [progress, setProgress] = useState<number>(0.0); // 0 = circle, 1 = rectangle
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  const r = radius || 5;
  const area = Math.PI * r * r;
  const halfC = Math.PI * r;

  const draw = useCallback((t: number, n: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const R = Math.min(90, W / 5);
    const cx = W / 3.8;
    const cy = H / 2;

    // 1. Draw left reference circle (fading out as t -> 1)
    if (t < 0.98) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, 1 - t * 0.9);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // Sector lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const ang = (i * Math.PI * 2) / n;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw interlocking wedges assembling into rectangle
    const targetX = W * 0.65;
    const targetY = H / 2;
    const baseW = (Math.PI * R) / (n / 2);

    for (let i = 0; i < n; i++) {
      const isEven = i % 2 === 0;
      const origAng = (i * Math.PI * 2) / n + Math.PI / n;
      const col = Math.floor(i / 2);

      let destX: number, destY: number, destRot: number;
      if (isEven) {
        destX = targetX - (Math.PI * R) / 2 + col * baseW;
        destY = targetY + R / 2;
        destRot = -Math.PI / 2;
      } else {
        destX = targetX - (Math.PI * R) / 2 + col * baseW + baseW / 2;
        destY = targetY - R / 2;
        destRot = Math.PI / 2;
      }

      const curX = cx + (destX - cx) * t;
      const curY = cy + (destY - cy) * t;

      let diff = destRot - origAng;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const curRot = origAng + diff * t;

      ctx.save();
      ctx.translate(curX, curY);
      ctx.rotate(curRot);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      const halfAng = Math.PI / n;
      ctx.arc(0, 0, R, -halfAng, halfAng);
      ctx.closePath();

      ctx.fillStyle = isEven ? 'rgba(59, 130, 246, 0.75)' : 'rgba(236, 72, 153, 0.75)';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Dimension labels
    if (t > 0.8) {
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Height = r (${r})`, targetX + (Math.PI * R) / 2 + 35, targetY + 4);
      ctx.fillText(`Width = π · r (${halfC.toFixed(2)})`, targetX, targetY + R / 2 + 25);
      ctx.restore();
    }
  }, [r, halfC]);

  useEffect(() => {
    draw(progress, slices);
  }, [draw, progress, slices]);

  const handleAnimate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    soundEffects.playClick(520, 0.08);

    const start = performance.now();
    const duration = 1600; // ms
    const initialT = progress;
    const targetT = progress > 0.5 ? 0 : 1;

    const step = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(1, elapsed / duration);
      // Ease in-out cubic
      const eased = pct < 0.5 ? 4 * pct * pct * pct : 1 - Math.pow(-2 * pct + 2, 3) / 2;
      const cur = initialT + (targetT - initialT) * eased;
      setProgress(cur);

      if (pct < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setIsAnimating(false);
        soundEffects.playSuccessChime();
        if (onSonify) onSonify(targetT === 1 ? 659.25 : 440);
      }
    };
    animationFrameRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="balance-visualizer-container" role="region" aria-label="Circle Area Quadrature Proof">
      <div className="balance-header">
        <h4>Circle Area Exhaustion Proof (Limit of Wedges)</h4>
        <span className="balance-status equilibrium">
          A = π · r² = {area.toFixed(2)}
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={580}
          height={240}
          style={{ width: '100%', maxWidth: '580px', height: '240px', background: '#0f172a', borderRadius: '8px' }}
        />
      </div>

      <div className="balance-controls" style={{ marginTop: '12px' }}>
        <button
          className="step-btn"
          onClick={handleAnimate}
          disabled={isAnimating}
          style={{ background: '#3b82f6', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontWeight: 600 }}
        >
          {isAnimating ? '🔄 Morphing...' : (progress > 0.5 ? '⏪ Reassemble Circle' : '✨ Cut & Interlock Wedges')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <label style={{ fontSize: '13px', color: '#94a3b8' }}>Slices (N): {slices}</label>
          <input
            type="range"
            min={8}
            max={64}
            step={8}
            value={slices}
            onChange={(e) => {
              setSlices(Number(e.target.value));
              soundEffects.playClick(440 + Number(e.target.value) * 5, 0.03);
            }}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className="balance-math" style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
        <p>
          As N → ∞, the interlocking wedges converge to a rectangle of width <strong>π · r</strong> and height <strong>r</strong>.
          <br />
          Area = (π · r) · r = <strong>π · r²</strong>.
        </p>
      </div>
    </div>
  );
};
