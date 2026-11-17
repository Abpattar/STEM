import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

export interface PythagoreanVisualizerProps {
  initialA?: number;
  initialB?: number;
  onSonify?: (frequency: number) => void;
}

export const PythagoreanVisualizer: React.FC<PythagoreanVisualizerProps> = ({
  initialA = 3,
  initialB = 4,
  onSonify,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [a, setA] = useState<number>(initialA);
  const [b, setB] = useState<number>(initialB);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  useEffect(() => {
    setA(initialA);
    setB(initialB);
  }, [initialA, initialB]);

  const a2 = a * a;
  const b2 = b * b;
  const c2 = a2 + b2;
  const c = Math.sqrt(c2);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const s = Math.min((W - 80) / (a + 2 * b), (H - 80) / (2 * a + b));
    const ox = (W - (a + 2 * b) * s) / 2 + b * s;
    const oy = (H - (2 * a + b) * s) / 2 + (a + b) * s;

    const Q = { x: ox + a * s, y: oy };
    const R = { x: ox, y: oy - b * s };
    const n = { x: b * s, y: -a * s };

    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.fillRect(ox, oy, a * s, a * s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.strokeRect(ox, oy, a * s, a * s);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillRect(ox - b * s, oy - b * s, b * s, b * s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(ox - b * s, oy - b * s, b * s, b * s);

    ctx.beginPath();
    ctx.moveTo(Q.x, Q.y);
    ctx.lineTo(R.x, R.y);
    ctx.lineTo(R.x + n.x, R.y + n.y);
    ctx.lineTo(Q.x + n.x, Q.y + n.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#059669';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(Q.x, Q.y);
    ctx.lineTo(R.x, R.y);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.stroke();

    const rSize = Math.min(12, s * 0.4);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox + rSize, oy);
    ctx.lineTo(ox + rSize, oy - rSize);
    ctx.lineTo(ox, oy - rSize);
    ctx.stroke();

    if (showGrid && s >= 6) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 1; i < a; i++) {
        ctx.beginPath();
        ctx.moveTo(ox + i * s, oy);
        ctx.lineTo(ox + i * s, oy + a * s);
        ctx.moveTo(ox, oy + i * s);
        ctx.lineTo(ox + a * s, oy + i * s);
        ctx.stroke();
      }
      for (let i = 1; i < b; i++) {
        ctx.beginPath();
        ctx.moveTo(ox - b * s + i * s, oy - b * s);
        ctx.lineTo(ox - b * s + i * s, oy);
        ctx.moveTo(ox - b * s, oy - b * s + i * s);
        ctx.lineTo(ox, oy - b * s + i * s);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`a² = ${a2}`, ox + (a * s) / 2, oy + (a * s) / 2 + 5);
    ctx.fillText(`b² = ${b2}`, ox - (b * s) / 2, oy - (b * s) / 2 + 5);

    const cMidX = (Q.x + R.x + n.x) / 2;
    const cMidY = (Q.y + R.y + n.y) / 2;
    ctx.fillText(`c² = ${c2}`, cMidX, cMidY + 5);
  }, [a, b, a2, b2, c2, showGrid]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleAChange = (val: number) => {
    setA(val);
    soundEffects.playClick(300 + val * 40, 0.04);
    onSonify?.(440 + val * 30);
  };

  const handleBChange = (val: number) => {
    setB(val);
    soundEffects.playClick(400 + val * 40, 0.04);
    onSonify?.(520 + val * 30);
  };

  return (
    <div
      className="balance-visualizer-container"
      role="region"
      aria-label="Pythagorean Theorem Visualizer"
      data-testid="pythagorean-visualizer"
    >
      <div className="visualizer-header">
        <h4>Pythagorean Theorem 3-Squares Area Proof</h4>
        <span className="current-equation" data-testid="pythagorean-summary">
          {a2} + {b2} = {c2} (c = {c.toFixed(2)})
        </span>
      </div>

      <div className="dark-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={580}
          height={260}
          className="dark-viz-canvas"
          aria-label={`Right triangle with legs a=${a}, b=${b}, hypotenuse c=${c.toFixed(2)} showing a squared plus b squared equals c squared`}
        />
      </div>

      <div className="viz-toolbar-row">
        <div className="inline-slider-group">
          <label htmlFor="nilo-pyth-a" style={{ color: '#2563eb' }}>
            Leg a: {a}
          </label>
          <input
            id="nilo-pyth-a"
            type="range"
            min={1}
            max={6}
            step={1}
            value={a}
            onChange={(e) => handleAChange(Number(e.target.value))}
          />
        </div>

        <div className="inline-slider-group">
          <label htmlFor="nilo-pyth-b" style={{ color: '#d97706' }}>
            Leg b: {b}
          </label>
          <input
            id="nilo-pyth-b"
            type="range"
            min={1}
            max={6}
            step={1}
            value={b}
            onChange={(e) => handleBChange(Number(e.target.value))}
          />
        </div>

        <button
          type="button"
          className="viz-reset-btn"
          onClick={() => {
            setShowGrid(!showGrid);
            soundEffects.playClick(580, 0.05);
          }}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid Units'}
        </button>
      </div>

      <div className="viz-explanation">
        <p>
          In every right triangle, the area of the square on the hypotenuse equals the sum of the
          squares on the two legs: <strong>a² + b² = c²</strong> ⇒{' '}
          <strong>
            {a}² + {b}² = {a2} + {b2} = {c2}
          </strong>{' '}
          (Hypotenuse c = <strong>{c.toFixed(2)}</strong>).
        </p>
      </div>
    </div>
  );
};

