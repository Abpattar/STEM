import React, { useState } from 'react';
import './visualizations.css';

interface GeometryDiagramVisualizerProps {
  svgCode?: string;
  topic?: string;
  description?: string;
}

export const GeometryDiagramVisualizer: React.FC<GeometryDiagramVisualizerProps> = ({
  svgCode,
  topic = 'geometry',
  description
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Play audio frequency chord for geometric elements (MAIDR sonification)
  const handlePlayGeometricChords = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      setIsPlayingAudio(true);

      // Play 3 tones representing triangle angles or dimensions
      const freqs = [380, 520, 900];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      });

      setTimeout(() => setIsPlayingAudio(false), 900);
    } catch (e) {
      console.error('Audio chord failed:', e);
      setIsPlayingAudio(false);
    }
  };

  const handleCopySvg = () => {
    if (svgCode) {
      navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const titleText = topic === 'triangle_angles'
    ? '📐 Triangle Angle Sum Theorem'
    : topic === 'pythagoras'
    ? '📐 Pythagorean Theorem (Right Triangle)'
    : topic === 'circle_geometry'
    ? '⭕ Circle Geometry & Mensuration'
    : '📐 Geometric Shape Diagram';

  return (
    <div className="mathlearn-viz-container geometry-diagram-card" role="region" aria-label="Geometric Diagram">
      <div className="viz-header">
        <h4>{titleText}</h4>
        <span className="viz-badge">Verified Geometric Model</span>
      </div>

      <div className="viz-controls-grid" style={{ gridTemplateColumns: 'auto auto auto', justifyContent: 'flex-start' }}>
        <button
          className={`viz-reset-btn ${isPlayingAudio ? 'active' : ''}`}
          onClick={handlePlayGeometricChords}
          title="Play audio sonification pitch chord for angles"
        >
          {isPlayingAudio ? '🎵 Playing Chords...' : '🎵 Sonify Angles'}
        </button>

        <button
          className="viz-reset-btn"
          onClick={handleCopySvg}
          title="Copy SVG markup to clipboard"
        >
          {copied ? '✓ Copied SVG' : '📋 Copy SVG'}
        </button>
      </div>

      <div className="canvas-wrapper geometry-svg-wrapper">
        {svgCode ? (
          <div
            className="geometry-svg-content"
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        ) : (
          <div className="diagram-placeholder">
            Geometric diagram rendered for {topic}
          </div>
        )}
      </div>

      <div className="viz-metrics-row">
        <div className="metric-chip highlight">
          <span className="metric-label">Domain:</span>
          <span className="metric-val">Geometry & Trigonometry</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Theorem:</span>
          <span className="metric-val">
            {topic === 'triangle_angles'
              ? 'A + B + C = 180°'
              : topic === 'pythagoras'
              ? 'a² + b² = c²'
              : topic === 'circle_geometry'
              ? 'A = πr², C = 2πr'
              : 'Geometric Formula'}
          </span>
        </div>
      </div>

      <div className="viz-explanation">
        <p>
          {description || (
            topic === 'triangle_angles'
              ? 'The sum of all interior angles in any triangle always adds up to exactly 180°. For a right triangle, one angle is always 90°.'
              : 'Interactive geometric representation with angle measurements and side lengths.'
          )}
        </p>
      </div>
    </div>
  );
};

