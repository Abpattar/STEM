import React, { useState, useEffect, useRef } from 'react';
import './visualizations.css';

interface AlgebraTilesVisualizerProps {
  initialP?: number;
  initialQ?: number;
  onSonify?: (frequency: number) => void;
}

export const AlgebraTilesVisualizer: React.FC<AlgebraTilesVisualizerProps> = ({
  initialP = 2,
  initialQ = 3,
  onSonify
}) => {
  const [p, setP] = useState<number>(initialP);
  const [q, setQ] = useState<number>(initialQ);

  useEffect(() => {
    setP(initialP);
    setQ(initialQ);
  }, [initialP, initialQ]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sound feedback on slider change
  const playTileSound = (freq: number) => {
    if (onSonify) {
      onSonify(freq);
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const handlePChange = (val: number) => {
    setP(val);
    playTileSound(260 + val * 20);
  };

  const handleQChange = (val: number) => {
    setQ(val);
    playTileSound(340 + val * 20);
  };

  const handleReset = () => {
    setP(2);
    setQ(3);
    playTileSound(440);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Canvas background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const X = Math.min(130, W * 0.35); // x edge length
    const u = Math.min(22, (W - X - 80) / 7); // unit width per integer
    const pw = Math.abs(p) * u;
    const qh = Math.abs(q) * u;

    const ox = Math.max(50, (W - X - (p > 0 ? pw : 0)) / 2);
    const oy = 35;

    // 1. x² Blue block (x * x)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.88)';
    ctx.fillRect(ox, oy, X, X);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.strokeRect(ox, oy, X, X);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x²', ox + X / 2, oy + X / 2);

    // 2. px Vertical bar (p * x)
    if (p !== 0) {
      const px = p > 0 ? ox + X : ox + X - pw;
      ctx.fillStyle = p > 0 ? 'rgba(249, 115, 22, 0.92)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fillRect(px, oy, pw, X);
      ctx.lineWidth = 2;
      ctx.strokeStyle = p > 0 ? '#ea580c' : '#dc2626';
      ctx.strokeRect(px, oy, pw, X);
      if (pw > 20) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText(`${p > 0 ? `+${p}` : p}x`, px + pw / 2, oy + X / 2);
      }
    }

    // 3. qx Horizontal bar (x * q)
    if (q !== 0) {
      const qy = q > 0 ? oy + X : oy + X - qh;
      ctx.fillStyle = q > 0 ? 'rgba(251, 146, 60, 0.9)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fillRect(ox, qy, X, qh);
      ctx.lineWidth = 2;
      ctx.strokeStyle = q > 0 ? '#ea580c' : '#dc2626';
      ctx.strokeRect(ox, qy, X, qh);
      if (qh > 18) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText(`${q > 0 ? `+${q}` : q}x`, ox + X / 2, qy + qh / 2);
      }
    }

    // 4. pq Corner block (p * q)
    if (p !== 0 && q !== 0) {
      const hx = p > 0 ? ox + X : ox + X - pw;
      const hy = q > 0 ? oy + X : oy + X - qh;
      const isPositive = p * q > 0;
      ctx.fillStyle = isPositive ? 'rgba(34, 197, 94, 0.88)' : 'rgba(239, 68, 68, 0.7)';
      ctx.fillRect(hx, hy, pw, qh);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPositive ? '#16a34a' : '#dc2626';
      ctx.strokeRect(hx, hy, pw, qh);
      if (pw > 20 && qh > 18) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`${p * q > 0 ? `+${p * q}` : p * q}`, hx + pw / 2, hy + qh / 2);
      }
    }

    // Dimension labels
    const effW = X + (p > 0 ? pw : 0);
    const effH = X + (q > 0 ? qh : 0);

    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const pStr = p === 0 ? 'x' : p > 0 ? `(x + ${p})` : `(x - ${Math.abs(p)})`;
    ctx.fillText(`Width: ${pStr}`, ox + effW / 2, oy + effH + 10);

    const qStr = q === 0 ? 'x' : q > 0 ? `(x + ${q})` : `(x - ${Math.abs(q)})`;
    ctx.save();
    ctx.translate(ox - 15, oy + effH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Height: ${qStr}`, 0, 0);
    ctx.restore();

  }, [p, q]);

  const sum = p + q;
  const prod = p * q;
  const polyStr = `x² ${sum >= 0 ? `+ ${sum}` : `- ${Math.abs(sum)}`}x ${prod >= 0 ? `+ ${prod}` : `- ${Math.abs(prod)}`}`;
  const factorStr = `(x ${p >= 0 ? `+ ${p}` : `- ${Math.abs(p)}`})(x ${q >= 0 ? `+ ${q}` : `- ${Math.abs(q)}`})`;

  return (
    <div className="mathlearn-viz-container" role="region" aria-label="Interactive Algebra Tiles Area Model">
      <div className="viz-header">
        <h4>🧩 Algebra Tiles Area Model (MathLearn-Primary)</h4>
        <span className="viz-badge">Visual Multiplication & Factoring</span>
      </div>

      <div className="viz-controls-grid">
        <div className="slider-group">
          <label htmlFor="pSlider">
            Factor Term <em>p</em>: <span className="val-pill">{p > 0 ? `+${p}` : p}</span>
          </label>
          <input
            id="pSlider"
            type="range"
            min="-5"
            max="5"
            step="1"
            value={p}
            onChange={(e) => handlePChange(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="slider-group">
          <label htmlFor="qSlider">
            Factor Term <em>q</em>: <span className="val-pill">{q > 0 ? `+${q}` : q}</span>
          </label>
          <input
            id="qSlider"
            type="range"
            min="-5"
            max="5"
            step="1"
            value={q}
            onChange={(e) => handleQChange(parseInt(e.target.value, 10))}
          />
        </div>

        <button className="viz-reset-btn" onClick={handleReset} title="Reset to standard (x+2)(x+3)">
          Reset Tiles
        </button>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={520}
          height={260}
          className="viz-canvas"
          role="img"
          aria-label={`Algebra tiles showing ${factorStr} = ${polyStr}`}
        />
      </div>

      <div className="viz-metrics-row">
        <div className="metric-chip highlight">
          <span className="metric-label">Factored Form:</span>
          <span className="metric-val">{factorStr}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Expanded Area:</span>
          <span className="metric-val">{polyStr}</span>
        </div>
      </div>

      <div className="viz-explanation">
        <p>
          <strong>Visual Principle:</strong> The total area of the rectangle equals its width times its height:{' '}
          <code>{factorStr} = {polyStr}</code>. The blue square represents <code>x²</code>, the orange bars represent <code>(p+q)x</code>, and the corner rectangle represents <code>p · q</code>.
        </p>
      </div>
    </div>
  );
};

