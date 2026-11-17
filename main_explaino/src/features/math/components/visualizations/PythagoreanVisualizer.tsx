import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

interface PythagoreanVisualizerProps {
  initialA?: number;
  initialB?: number;
  onSonify?: (frequency: number) => void;
}

export const PythagoreanVisualizer: React.FC<PythagoreanVisualizerProps> = ({
  initialA = 3,
  initialB = 4,
  onSonify
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const n = { x: b * s, y: -a * s }; // Normal vector for hypotenuse square

    // 1. Square a² (Blue, Bottom-Right)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.fillRect(ox, oy, a * s, a * s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.strokeRect(ox, oy, a * s, a * s);

    // 2. Square b² (Amber/Orange, Top-Left)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillRect(ox - b * s, oy - b * s, b * s, b * s);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d97706';
    ctx.strokeRect(ox - b * s, oy - b * s, b * s, b * s);

    // 3. Square c² (Emerald Green, Hypotenuse)
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

    // 4. Central Right Triangle (White fill)
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

    // Right angle indicator
    const rSize = Math.min(12, s * 0.4);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox + rSize, oy);
    ctx.lineTo(ox + rSize, oy - rSize);
    ctx.lineTo(ox, oy - rSize);
    ctx.stroke();

    // Grid lines for unit counting
    if (showGrid && s >= 6) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      // a² grid
      for (let i = 1; i < a; i++) {
        ctx.beginPath();
        ctx.moveTo(ox + i * s, oy);
        ctx.lineTo(ox + i * s, oy + a * s);
        ctx.moveTo(ox, oy + i * s);
        ctx.lineTo(ox + a * s, oy + i * s);
        ctx.stroke();
      }
      // b² grid
      for (let i = 1; i < b; i++) {
        ctx.beginPath();
        ctx.moveTo(ox - b * s + i * s, oy - b * s);
        ctx.lineTo(ox - b * s + i * s, oy);
        ctx.moveTo(ox - b * s, oy - b * s + i * s);
        ctx.lineTo(ox, oy - b * s + i * s);
        ctx.stroke();
      }
    }

    // Area labels
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
    if (onSonify) onSonify(440 + val * 30);
  };

  const handleBChange = (val: number) => {
    setB(val);
    soundEffects.playClick(400 + val * 40, 0.04);
    if (onSonify) onSonify(520 + val * 30);
  };

  return (
    <div className="balance-visualizer-container" role="region" aria-label="Pythagorean Theorem Visualizer">
      <div className="balance-header">
        <h4>Pythagorean Theorem 3-Squares Area Proof</h4>
        <span className="balance-status equilibrium">
          {a2} + {b2} = {c2} ({c.toFixed(2)}²)
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={580}
          height={260}
          style={{ width: '100%', maxWidth: '580px', height: '260px', background: '#0f172a', borderRadius: '8px' }}
        />
      </div>

      <div className="balance-controls" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>Leg a: {a}</label>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={a}
            onChange={(e) => handleAChange(Number(e.target.value))}
            style={{ width: '90px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>Leg b: {b}</label>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={b}
            onChange={(e) => handleBChange(Number(e.target.value))}
            style={{ width: '90px' }}
          />
        </div>

        <button
          className="step-btn"
          onClick={() => {
            setShowGrid(!showGrid);
            soundEffects.playClick(580, 0.05);
          }}
          style={{ marginLeft: 'auto', background: '#334155', color: '#f8fafc', padding: '5px 12px', borderRadius: '6px' }}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid Units'}
        </button>
      </div>

      <div className="balance-math" style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
        <p>
          In every right triangle, the area of the square on the hypotenuse equals the sum of the squares on the two legs:
          <br />
          <strong>a² + b² = c²</strong> ⇒ <strong>{a}² + {b}² = {a2} + {b2} = {c2}</strong> (Hypotenuse c = <strong>{c.toFixed(2)}</strong>).
        </p>
      </div>
    </div>
  );
};

