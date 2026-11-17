import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

export interface CircleAreaProps {
  radius?: number;
  onSonify?: (frequency: number) => void;
}

export const CircleAreaExhaustionVisualizer: React.FC<CircleAreaProps> = ({
  radius = 5,
  onSonify,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [slices, setSlices] = useState<number>(16);
  const [progress, setProgress] = useState<number>(0.0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  const r = radius > 0 ? radius : 5;
  const exactArea = Math.PI * r * r;
  const approxPolygonArea = 0.5 * slices * r * r * Math.sin((2 * Math.PI) / slices);
  const convergencePct = (approxPolygonArea / exactArea) * 100;
  const halfC = Math.PI * r;

  const draw = useCallback(
    (t: number, n: number) => {
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

      if (t < 0.98) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, 1 - t * 0.9);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
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

      const targetX = W * 0.65;
      const targetY = H / 2;
      const baseW = (Math.PI * R) / (n / 2);

      for (let i = 0; i < n; i++) {
        const isEven = i % 2 === 0;
        const origAng = (i * Math.PI * 2) / n + Math.PI / n;
        const col = Math.floor(i / 2);

        let destX: number;
        let destY: number;
        let destRot: number;
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

        ctx.fillStyle = isEven ? 'rgba(59, 130, 246, 0.78)' : 'rgba(236, 72, 153, 0.78)';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (t > 0.8) {
        ctx.save();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Height = r (${r})`, targetX + (Math.PI * R) / 2 + 35, targetY + 4);
        ctx.fillText(`Width = π · r (${halfC.toFixed(2)})`, targetX, targetY + R / 2 + 25);
        ctx.restore();
      }
    },
    [r, halfC]
  );

  useEffect(() => {
    draw(progress, slices);
  }, [draw, progress, slices]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleAnimate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    soundEffects.playClick(520, 0.08);

    const start = performance.now();
    const duration = 1200;
    const initialT = progress;
    const targetT = progress > 0.5 ? 0 : 1;

    const step = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(1, elapsed / duration);
      const eased = pct < 0.5 ? 4 * pct * pct * pct : 1 - Math.pow(-2 * pct + 2, 3) / 2;
      const cur = initialT + (targetT - initialT) * eased;
      setProgress(cur);

      if (pct < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        setIsAnimating(false);
        soundEffects.playSuccessChime();
        onSonify?.(targetT === 1 ? 659.25 : 440);
      }
    };
    animationFrameRef.current = requestAnimationFrame(step);
  };

  return (
    <div
      className="balance-visualizer-container"
      role="region"
      aria-label="Circle Area Quadrature Proof"
      data-testid="circle-area-visualizer"
    >
      <div className="visualizer-header">
        <h4>Circle Area Exhaustion Proof (Limit of Wedges)</h4>
        <span className="current-equation" data-testid="circle-exact-area">
          A = π · r² = {exactArea.toFixed(2)}
        </span>
      </div>

      <div className="dark-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={580}
          height={240}
          className="dark-viz-canvas"
          aria-label={`Circle area exhaustion with ${slices} wedges approximating ${approxPolygonArea.toFixed(2)} out of ${exactArea.toFixed(2)}`}
        />
      </div>

      <div className="viz-toolbar-row">
        <button
          type="button"
          className="viz-primary-btn"
          onClick={handleAnimate}
          disabled={isAnimating}
        >
          {isAnimating
            ? 'Morphing...'
            : progress > 0.5
              ? 'Reassemble Circle'
              : 'Cut & Interlock Wedges'}
        </button>

        <div className="inline-slider-group">
          <label htmlFor="nilo-circle-slices">Slices (N): {slices}</label>
          <input
            id="nilo-circle-slices"
            type="range"
            min={8}
            max={64}
            step={8}
            value={slices}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSlices(next);
              soundEffects.playClick(440 + next * 5, 0.03);
            }}
          />
        </div>
      </div>

      <div className="parabola-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Wedge Sections (N)</span>
          <span className="stat-val" data-testid="circle-slices-val">
            {slices} wedges ({(360 / slices).toFixed(1)}° each)
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Inscribed Polygon Area</span>
          <span className="stat-val roots-val" data-testid="circle-approx-area">
            {approxPolygonArea.toFixed(3)} ({convergencePct.toFixed(2)}% of πr²)
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Exact Circle Area (r = {r})</span>
          <span className="stat-val pos">{exactArea.toFixed(3)}</span>
        </div>
      </div>

      <div className="viz-explanation">
        <p>
          As <strong>N → ∞</strong>, the interlocking wedges converge to a rectangle of width{' '}
          <strong>π · r</strong> ({halfC.toFixed(2)}) and height <strong>r</strong> ({r}), so Area =
          (π · r) · r = <strong>π · r²</strong>.
        </p>
      </div>
    </div>
  );
};

