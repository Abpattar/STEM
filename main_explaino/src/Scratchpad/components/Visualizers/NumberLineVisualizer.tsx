import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEffects } from '../../utils/soundEffects';

export interface NumberLineVisualizerProps {
  initialA?: number;
  initialB?: number;
  onSonify?: (frequency: number) => void;
}

export const NumberLineVisualizer: React.FC<NumberLineVisualizerProps> = ({
  initialA = 2,
  initialB = 3,
  onSonify,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [a, setA] = useState<number>(initialA);
  const [b, setB] = useState<number>(initialB);
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    setA(initialA);
    setB(initialB);
  }, [initialA, initialB]);

  const effectiveDelta = operation === 'add' ? b : -b;
  const result = a + effectiveDelta;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const minVal = -10;
    const maxVal = 10;
    const totalUnits = maxVal - minVal;
    const paddingX = 36;
    const usableW = W - 2 * paddingX;
    const stepX = usableW / totalUnits;
    const axisY = H / 2 + 25;

    const toX = (val: number) => paddingX + (val - minVal) * stepX;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingX - 15, axisY);
    ctx.lineTo(W - paddingX + 15, axisY);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(W - paddingX + 20, axisY);
    ctx.lineTo(W - paddingX + 10, axisY - 5);
    ctx.lineTo(W - paddingX + 10, axisY + 5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(paddingX - 20, axisY);
    ctx.lineTo(paddingX - 10, axisY - 5);
    ctx.lineTo(paddingX - 10, axisY + 5);
    ctx.fill();

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

    const x0 = toX(0);
    const xA = toX(a);
    const arrow1Y = axisY - 35;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, arrow1Y);
    ctx.lineTo(xA, arrow1Y);
    ctx.stroke();

    if (a !== 0) {
      ctx.fillStyle = '#38bdf8';
      const dirA = a > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(xA, arrow1Y);
      ctx.lineTo(xA - dirA * 8, arrow1Y - 4);
      ctx.lineTo(xA - dirA * 8, arrow1Y + 4);
      ctx.fill();
    }
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`a = ${a}`, (x0 + xA) / 2, arrow1Y - 8);

    const xSum = toX(result);
    const arrow2Y = axisY - 68;
    const deltaColor = effectiveDelta >= 0 ? '#4ade80' : '#f87171';

    ctx.strokeStyle = deltaColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xA, arrow2Y);
    ctx.lineTo(xSum, arrow2Y);
    ctx.stroke();

    if (effectiveDelta !== 0) {
      ctx.fillStyle = deltaColor;
      const dirB = effectiveDelta > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(xSum, arrow2Y);
      ctx.lineTo(xSum - dirB * 8, arrow2Y - 4);
      ctx.lineTo(xSum - dirB * 8, arrow2Y + 4);
      ctx.fill();
    }
    ctx.fillStyle = deltaColor;
    ctx.fillText(
      `move ${effectiveDelta > 0 ? `+${effectiveDelta}` : effectiveDelta}`,
      (xA + xSum) / 2,
      arrow2Y - 8
    );

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

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(xSum, axisY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [a, effectiveDelta, result]);

  useEffect(() => {
    draw();
  }, [draw]);

  const opSymbol = operation === 'add' ? '+' : '−';
  const directionNote =
    effectiveDelta > 0
      ? `Move ${effectiveDelta} unit${effectiveDelta === 1 ? '' : 's'} right from ${a} to ${result}.`
      : effectiveDelta < 0
        ? `Move ${Math.abs(effectiveDelta)} unit${Math.abs(effectiveDelta) === 1 ? '' : 's'} left from ${a} to ${result}.`
        : `Zero displacement: stay at ${a}.`;

  return (
    <div
      className="balance-visualizer-container"
      role="region"
      aria-label="Number Line Operations"
      data-testid="number-line-visualizer"
    >
      <div className="visualizer-header">
        <h4>Rational Number Line Operations</h4>
        <span className="current-equation" data-testid="numberline-equation">
          ({a}) {opSymbol} ({b}) = {result}
        </span>
      </div>

      <div className="dark-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={580}
          height={220}
          className="dark-viz-canvas"
          aria-label={`Number line showing ${a} ${opSymbol} ${b} equals ${result}`}
        />
      </div>

      <div className="viz-toolbar-row">
        <div className="inline-slider-group">
          <label htmlFor="nilo-nl-a" style={{ color: '#0284c7' }}>
            Start (a): {a}
          </label>
          <input
            id="nilo-nl-a"
            type="range"
            min={-5}
            max={5}
            step={1}
            value={a}
            onChange={(e) => {
              const val = Number(e.target.value);
              setA(val);
              soundEffects.playClick(350 + val * 20, 0.03);
              onSonify?.(440 + val * 25);
            }}
          />
        </div>

        <div className="nl-op-toggle" role="group" aria-label="Choose addition or subtraction">
          <button
            type="button"
            className={`step-btn ${operation === 'add' ? 'active' : ''}`}
            onClick={() => {
              setOperation('add');
              soundEffects.playClick(480, 0.03);
            }}
          >
            Add (+)
          </button>
          <button
            type="button"
            className={`step-btn ${operation === 'subtract' ? 'active' : ''}`}
            onClick={() => {
              setOperation('subtract');
              soundEffects.playClick(420, 0.03);
            }}
          >
            Subtract (−)
          </button>
        </div>

        <div className="inline-slider-group">
          <label
            htmlFor="nilo-nl-b"
            style={{ color: effectiveDelta >= 0 ? '#16a34a' : '#dc2626' }}
          >
            Value (b): {b}
          </label>
          <input
            id="nilo-nl-b"
            type="range"
            min={-5}
            max={5}
            step={1}
            value={b}
            onChange={(e) => {
              const val = Number(e.target.value);
              setB(val);
              soundEffects.playClick(450 + val * 20, 0.03);
              onSonify?.(520 + val * 25);
            }}
          />
        </div>
      </div>

      <div className="viz-explanation">
        <p data-testid="numberline-direction">
          <strong>Directional Movement:</strong> {directionNote}
        </p>
      </div>
    </div>
  );
};

