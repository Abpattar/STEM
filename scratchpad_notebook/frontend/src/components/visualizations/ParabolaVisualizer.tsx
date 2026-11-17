import React, { useState, useEffect, useRef } from 'react';
import './visualizations.css';

interface ParabolaVisualizerProps {
  initialA?: number;
  initialB?: number;
  initialC?: number;
  onSonificationPlay?: () => void;
}

export const ParabolaVisualizer: React.FC<ParabolaVisualizerProps> = ({
  initialA = 1,
  initialB = 5,
  initialC = 6,
  onSonificationPlay
}) => {
  const [a, setA] = useState<number>(initialA);
  const [b, setB] = useState<number>(initialB);
  const [c, setC] = useState<number>(initialC);

  useEffect(() => {
    setA(initialA);
    setB(initialB);
    setC(initialC);
  }, [initialA, initialB, initialC]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const discriminant = b * b - 4 * a * c;
  const vertexX = a !== 0 ? -b / (2 * a) : 0;
  const vertexY = a !== 0 ? c - (b * b) / (4 * a) : 0;

  let root1: number | null = null;
  let root2: number | null = null;
  if (a !== 0 && discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    root1 = (-b - sqrtD) / (2 * a);
    root2 = (-b + sqrtD) / (2 * a);
  }

  // Draw parabola on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center of coordinate system
    const originX = width / 2;
    const originY = height / 2;
    const scale = 25; // 25 pixels per math unit

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let x = originX % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('x', width - 15, originY - 8);
    ctx.fillText('y', originX + 8, 15);

    // Draw Parabola curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= width; px += 2) {
      const mathX = (px - originX) / scale;
      const mathY = a * mathX * mathX + b * mathX + c;
      const py = originY - mathY * scale;

      if (py >= -50 && py <= height + 50) {
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
    }
    ctx.stroke();

    // Draw Vertex
    const vx = originX + vertexX * scale;
    const vy = originY - vertexY * scale;
    if (vx >= 0 && vx <= width && vy >= 0 && vy <= height) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(vx, vy, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw Roots (x-intercepts)
    if (root1 !== null) {
      const rx1 = originX + root1 * scale;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(rx1, originY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (root2 !== null && root2 !== root1) {
      const rx2 = originX + root2 * scale;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(rx2, originY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [a, b, c, vertexX, vertexY, root1, root2]);

  return (
    <div className="parabola-visualizer-container" role="region" aria-label="Interactive Parabola Visualizer">
      <div className="visualizer-header">
        <h4>Interactive Parabola &amp; Roots (MathLearn Model)</h4>
        <div className="current-equation">
          y = {a !== 1 ? (a === -1 ? '-' : a) : ''}x² {b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}x {c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={500}
          height={300}
          className="parabola-canvas"
          aria-label={`Parabola curve y = ${a}x^2 + ${b}x + ${c}. Vertex at (${vertexX.toFixed(2)}, ${vertexY.toFixed(2)}).`}
        />
      </div>

      <div className="controls-row">
        <div className="slider-group">
          <label htmlFor="slider-a">a = {a}</label>
          <input
            id="slider-a"
            type="range"
            min="-4"
            max="4"
            step="0.5"
            value={a}
            onChange={(e) => setA(parseFloat(e.target.value) || 0.1)}
          />
        </div>
        <div className="slider-group">
          <label htmlFor="slider-b">b = {b}</label>
          <input
            id="slider-b"
            type="range"
            min="-10"
            max="10"
            step="1"
            value={b}
            onChange={(e) => setB(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-group">
          <label htmlFor="slider-c">c = {c}</label>
          <input
            id="slider-c"
            type="range"
            min="-10"
            max="10"
            step="1"
            value={c}
            onChange={(e) => setC(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="parabola-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Discriminant (Δ = b² - 4ac)</span>
          <span className={`stat-val ${discriminant > 0 ? 'pos' : discriminant === 0 ? 'zero' : 'neg'}`}>
            Δ = {discriminant.toFixed(1)} {discriminant > 0 ? '(2 Real Roots)' : discriminant === 0 ? '(1 Repeated Root)' : '(No Real Roots)'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Roots (x-intercepts)</span>
          <span className="stat-val roots-val">
            {root1 !== null ? `x₁ = ${root1.toFixed(2)}, x₂ = ${root2?.toFixed(2)}` : 'No real intercepts'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vertex</span>
          <span className="stat-val">({vertexX.toFixed(2)}, {vertexY.toFixed(2)})</span>
        </div>
      </div>

      {onSonificationPlay && (
        <button
          className="sonification-btn"
          onClick={onSonificationPlay}
          title="Play curve audio sonification (MAIDR)"
          aria-label="Play curve audio sonification"
        >
          🎵 Listen to Curve (Sonification)
        </button>
      )}
    </div>
  );
};

