import React, { useMemo, useState } from 'react';
import { generateDiagramSvg } from './diagrams/DiagramDisplay';
import type { DiagramData, DiagramType } from './diagrams/types';

export interface GeometryDiagramVisualizerProps {
  svgCode?: string;
  topic?: string;
  description?: string;
  diagramData?: DiagramData;
  onDiagramChange?: (diagramType: DiagramType, usingBackendSvg: boolean) => void;
}

interface DiagramPreset {
  id: DiagramType;
  label: string;
  domain: string;
  theorem: string;
  explanation: string;
  data: DiagramData;
}

const DIAGRAM_PRESETS: DiagramPreset[] = [
  {
    id: 'triangle',
    label: 'Triangle',
    domain: 'Plane Geometry',
    theorem: 'A + B + C = 180°',
    explanation:
      'The sum of all interior angles in any triangle always adds up to 180°. Side lengths satisfy the triangle inequality.',
    data: {
      type: 'triangle',
      vertices: [
        { label: 'A', x: 75, y: 230 },
        { label: 'B', x: 325, y: 230 },
        { label: 'C', x: 185, y: 60 },
      ],
      measurements: [{ label: 'Base AB', value: 10, unit: 'cm', type: 'length' }],
    },
  },
  {
    id: 'circle',
    label: 'Circle',
    domain: 'Plane Geometry',
    theorem: 'A = πr², C = 2πr',
    explanation:
      'Every point on a circle lies at a fixed radius r from center O. Circumference scales linearly with r while area scales with r².',
    data: {
      type: 'circle',
      cx: 200,
      cy: 140,
      radius: 85,
      measurements: [{ label: 'r', value: 5, unit: 'cm', type: 'radius' }],
    },
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    domain: 'Plane Geometry',
    theorem: 'A = l × w, P = 2(l + w)',
    explanation:
      'Opposite sides of a rectangle are parallel and equal in length, and all four interior angles are right angles (90°).',
    data: {
      type: 'rectangle',
      x: 85,
      y: 70,
      width: 230,
      height: 130,
      measurements: [
        { label: 'length', value: 12, unit: 'cm', type: 'length' },
        { label: 'width', value: 7, unit: 'cm', type: 'length' },
      ],
    },
  },
  {
    id: 'parallelogram',
    label: 'Parallelogram',
    domain: 'Plane Geometry',
    theorem: 'A = base × height',
    explanation:
      'Opposite sides and opposite angles of a parallelogram are equal. Area equals base multiplied by perpendicular height.',
    data: {
      type: 'parallelogram',
      x: 80,
      y: 85,
      width: 190,
      height: 110,
      skew: 45,
    },
  },
  {
    id: 'trapezium',
    label: 'Trapezium',
    domain: 'Plane Geometry',
    theorem: 'A = ½(a + b)h',
    explanation:
      'A trapezium has one pair of parallel sides (a and b). Its area is the average of the parallel sides multiplied by height h.',
    data: {
      type: 'trapezium',
      x: 85,
      y: 85,
      top_width: 110,
      bottom_width: 230,
      height: 110,
    },
  },
  {
    id: 'coordinate_plane',
    label: 'Coordinate Plane',
    domain: 'Coordinate Geometry',
    theorem: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)',
    explanation:
      'Points on the Cartesian plane are located by ordered pairs (x, y), enabling algebraic computation of distance and slope.',
    data: {
      type: 'coordinate_plane',
      points: [
        { label: 'A', x: -2, y: 1 },
        { label: 'B', x: 3, y: 4 },
        { label: 'C', x: 3, y: 1 },
      ],
      lines: [
        { point1: 'A', point2: 'B' },
        { point1: 'B', point2: 'C' },
        { point1: 'A', point2: 'C' },
      ],
    },
  },
  {
    id: 'cuboid',
    label: 'Cuboid (3D)',
    domain: '3D Solid Geometry',
    theorem: 'V = l × w × h',
    explanation:
      'A rectangular cuboid has 6 rectangular faces, 12 edges, and 8 vertices. Total surface area is 2(lw + wh + hl).',
    data: { type: 'cuboid', x: 185, y: 165, width: 110, height: 80, depth: 60 },
  },
  {
    id: 'cylinder',
    label: 'Cylinder (3D)',
    domain: '3D Solid Geometry',
    theorem: 'V = πr²h',
    explanation:
      'A right circular cylinder consists of two congruent circular bases connected by a curved lateral surface of area 2πrh.',
    data: { type: 'cylinder', cx: 200, cy: 70, radius: 55, height: 125 },
  },
  {
    id: 'cone',
    label: 'Cone (3D)',
    domain: '3D Solid Geometry',
    theorem: 'V = ⅓πr²h',
    explanation:
      'A circular cone tapers smoothly from a circular base of radius r to an apex at height h, holding one-third the volume of a matching cylinder.',
    data: { type: 'cone', cx: 200, cy: 60, radius: 60, height: 145 },
  },
  {
    id: 'bar_chart',
    label: 'Bar Chart',
    domain: 'Data Representation',
    theorem: 'Categorical Data Distribution',
    explanation:
      'Bar charts compare discrete categorical quantities using bar heights proportional to each category value.',
    data: {
      type: 'bar_chart',
      labels: ['Math', 'Phys', 'Chem', 'Bio'],
      values: [85, 72, 90, 78],
    },
  },
  {
    id: 'data_table',
    label: 'Data Table',
    domain: 'Data Interpretation',
    theorem: 'Tabular Function Mapping',
    explanation:
      'Data tables pair input values x with corresponding output values f(x) to identify patterns and linear/quadratic rates of change.',
    data: {
      type: 'data_table',
      headers: ['x', 'y = 2x + 1'],
      rows: [
        ['0', '1'],
        ['1', '3'],
        ['2', '5'],
        ['3', '7'],
      ],
    },
  },
];

export const GeometryDiagramVisualizer: React.FC<GeometryDiagramVisualizerProps> = ({
  svgCode,
  topic = 'geometry',
  description,
  diagramData,
  onDiagramChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DiagramType>('triangle');
  const [useBackendSvg, setUseBackendSvg] = useState<boolean>(Boolean(svgCode));

  React.useEffect(() => {
    onDiagramChange?.(selectedPreset, useBackendSvg && Boolean(svgCode));
  }, [selectedPreset, useBackendSvg, svgCode, onDiagramChange]);

  const activePreset = useMemo(
    () => DIAGRAM_PRESETS.find((p) => p.id === selectedPreset) || DIAGRAM_PRESETS[0],
    [selectedPreset]
  );

  const effectiveSvg = useMemo(() => {
    if (useBackendSvg && svgCode) {
      return svgCode;
    }
    const dataToRender = diagramData && useBackendSvg ? diagramData : activePreset.data;
    return generateDiagramSvg(dataToRender, 400, 270, 'notebook', []);
  }, [useBackendSvg, svgCode, diagramData, activePreset]);

  const handlePlayGeometricChords = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      setIsPlayingAudio(true);

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
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const handleCopySvg = () => {
    if (effectiveSvg && navigator.clipboard) {
      void navigator.clipboard.writeText(effectiveSvg).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const titleText =
    useBackendSvg && svgCode
      ? topic === 'triangle_angles'
        ? 'Triangle Angle Sum Theorem'
        : topic === 'pythagoras'
          ? 'Pythagorean Theorem (Right Triangle)'
          : topic === 'circle_geometry'
            ? 'Circle Geometry & Mensuration'
            : 'Geometric Shape Diagram'
      : `Geometric Diagram — ${activePreset.label}`;

  return (
    <div
      className="mathlearn-viz-container geometry-diagram-card"
      role="region"
      aria-label="Geometric Diagram"
      data-testid="geometry-diagram-visualizer"
    >
      <div className="viz-header">
        <h4>{titleText}</h4>
        <span className="viz-badge">Verified SVG Diagram Generator</span>
      </div>

      <div className="diagram-preset-bar" role="tablist" aria-label="Select geometry diagram type">
        {svgCode && (
          <button
            type="button"
            className={`diagram-preset-btn ${useBackendSvg ? 'active' : ''}`}
            onClick={() => {
              setUseBackendSvg(true);
              onDiagramChange?.(selectedPreset, true);
            }}
          >
            Solved Problem SVG
          </button>
        )}
        {DIAGRAM_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`diagram-preset-btn ${!useBackendSvg && selectedPreset === preset.id ? 'active' : ''}`}
            onClick={() => {
              setUseBackendSvg(false);
              setSelectedPreset(preset.id);
              onDiagramChange?.(preset.id, false);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="viz-toolbar-row">
        <button
          type="button"
          className={`viz-reset-btn ${isPlayingAudio ? 'active' : ''}`}
          onClick={handlePlayGeometricChords}
          title="Play audio sonification pitch chord for angles"
        >
          {isPlayingAudio ? 'Playing Chords...' : 'Sonify Angles'}
        </button>

        <button
          type="button"
          className="viz-reset-btn"
          onClick={handleCopySvg}
          title="Copy SVG markup to clipboard"
        >
          {copied ? 'Copied SVG' : 'Copy SVG'}
        </button>
      </div>

      <div className="canvas-wrapper geometry-svg-wrapper">
        <div
          className="geometry-svg-content"
          data-testid="geometry-svg-content"
          dangerouslySetInnerHTML={{ __html: effectiveSvg }}
        />
      </div>

      <div className="viz-metrics-row">
        <div className="metric-chip highlight">
          <span className="metric-label">Domain:</span>
          <span className="metric-val" data-testid="geometry-domain">
            {useBackendSvg && svgCode ? 'Geometry & Mensuration' : activePreset.domain}
          </span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Formula / Relation:</span>
          <span className="metric-val" data-testid="geometry-theorem">
            {useBackendSvg && svgCode
              ? topic === 'triangle_angles'
                ? 'A + B + C = 180°'
                : topic === 'pythagoras'
                  ? 'a² + b² = c²'
                  : topic === 'circle_geometry'
                    ? 'A = πr², C = 2πr'
                    : 'Geometric Formula'
              : activePreset.theorem}
          </span>
        </div>
      </div>

      <div className="viz-explanation">
        <p>{useBackendSvg && description ? description : activePreset.explanation}</p>
      </div>
    </div>
  );
};

