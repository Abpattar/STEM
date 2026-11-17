import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

interface NumberLineVisualizerProps {
  initialA?: number;
  initialB?: number;
  onSonify?: (frequency: number) => void;
}

export const NumberLineVisualizer: React.FC<NumberLineVisualizerProps> = ({
  initialA = 2,
  initialB = 3,
  onSonify
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [a, setA] = useState<number>(initialA);
  const [b, setB] = useState<number>(initialB);
  const sum = a + b;

  useEffect(() => {
    setA(initialA);
    setB(initialB);
  }, [initialA, initialB]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Number line axis
    const minVal = -8;
    const maxVal = 8;
    const totalUnits = maxVal - minVal;
    const paddingX = 40;
    const usableW = W - 2 * paddingX;
    const stepX = usableW / totalUnits;
    const axisY = H / 2 + 25;

    // Convert value to canvas X
    const toX = (val: number) => paddingX + (val - minVal) * stepX;

    // 1. Draw horizontal axis
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingX - 15, axisY);
    ctx.lineTo(W - paddingX + 15, axisY);
    ctx.stroke();

    // Arrows on axis ends
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(W - paddingX + 20, axisY);
    ctx.lineTo(W - paddingX + 10, axisY - 5);
    ctx.lineTo(W - paddingX + 10, axisY + 5);
    ctx.fill();

    // Ticks and numbers
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let v = minVal; v <= maxVal; v++) {
      const x = toX(v);
      const isZero = v === 0;
      ctx.strokeStyle = isZero ? '#38bdf8' : '#475569';
      ctx.lineWidth = isZero ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, axisY - (isZero ? 8 : 5));
      ctx.lineTo(x, axisY + (isZero ? 8 : 5));
      ctx.stroke();

      ctx.fillStyle = isZero ? '#38bdf8' : '#94a3b8';
      ctx.fillText(v.toString(), x, axisY + 20);
    }

    // 2. Draw Vector A (from 0 to A)
    const x0 = toX(0);
    const xA = toX(a);
    const arrow1Y = axisY - 35;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, arrow1Y);
    ctx.lineTo(xA, arrow1Y);
    ctx.stroke();

    // Arrowhead A
    ctx.fillStyle = '#38bdf8';
    const dirA = a >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(xA, arrow1Y);
    ctx.lineTo(xA - dirA * 8, arrow1Y - 4);
    ctx.lineTo(xA - dirA * 8, arrow1Y + 4);
    ctx.fill();

    ctx.fillText(`a = ${a}`, (x0 + xA) / 2, arrow1Y - 8);

    // 3. Draw Vector B (from A to A + B)
    const xSum = toX(sum);
    const arrow2Y = axisY - 65;

    ctx.strokeStyle = b >= 0 ? '#4ade80' : '#f87171';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xA, arrow2Y);
    ctx.lineTo(xSum, arrow2Y);
    ctx.stroke();

    // Arrowhead B
    ctx.fillStyle = b >= 0 ? '#4ade80' : '#f87171';
    const dirB = b >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(xSum, arrow2Y);
    ctx.lineTo(xSum - dirB * 8, arrow2Y - 4);
    ctx.lineTo(xSum - dirB * 8, arrow2Y + 4);
    ctx.fill();

    ctx.fillText(`b = ${b > 0 ? '+' : ''}${b}`, (xA + xSum) / 2, arrow2Y - 8);

    // Dashed connectors
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xA, arrow1Y);
    ctx.lineTo(xA, arrow2Y);
    ctx.moveTo(xSum, arrow2Y);
    ctx.lineTo(xSum, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sum point circle on axis
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(xSum, axisY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [a, b, sum]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="balance-visualizer-container" role="region" aria-label="Number Line Operations">
      <div className="balance-header">
        <h4>Rational Number Line Operations</h4>
        <span className="balance-status equilibrium">
          ({a}) + ({b}) = {sum}
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={580}
          height={220}
          style={{ width: '100%', maxWidth: '580px', height: '220px', background: '#0f172a', borderRadius: '8px' }}
        />
      </div>

      <div className="balance-controls" style={{ marginTop: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>Start (a): {a}</label>
          <input
            type="range"
            min={-5}
            max={5}
            step={1}
            value={a}
            onChange={(e) => {
              const val = Number(e.target.value);
              setA(val);
              soundEffects.playClick(350 + val * 20, 0.03);
              if (onSonify) onSonify(440 + val * 25);
            }}
            style={{ width: '100px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: b >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>Add (b): {b}</label>
          <input
            type="range"
            min={-5}
            max={5}
            step={1}
            value={b}
            onChange={(e) => {
              const val = Number(e.target.value);
              setB(val);
              soundEffects.playClick(450 + val * 20, 0.03);
              if (onSonify) onSonify(520 + val * 25);
            }}
            style={{ width: '100px' }}
          />
        </div>
      </div>
    </div>
  );
};

