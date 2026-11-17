import { useMemo } from 'react';
import type { DiagramProps, DiagramData, DiagramType } from './types';
import {
  TriangleGenerator,
  RectangleGenerator,
  CircleGenerator,
  ParallelogramGenerator,
  TrapeziumGenerator,
  CoordinatePlaneGenerator,
  BarChartGenerator,
  DataTableGenerator,
  CuboidGenerator,
  CylinderGenerator,
  ConeGenerator,
} from './generators';

const generators: Record<
  DiagramType,
  (
    data: DiagramData,
    width: number,
    height: number,
    mode: 'notebook' | 'textbook',
    highlighted: string[]
  ) => string
> = {
  triangle: TriangleGenerator,
  rectangle: RectangleGenerator,
  circle: CircleGenerator,
  parallelogram: ParallelogramGenerator,
  trapezium: TrapeziumGenerator,
  coordinate_plane: CoordinatePlaneGenerator,
  bar_chart: BarChartGenerator,
  data_table: DataTableGenerator,
  cuboid: CuboidGenerator,
  cylinder: CylinderGenerator,
  cone: ConeGenerator,
};

export function generateDiagramSvg(
  data: DiagramData,
  width = 400,
  height = 280,
  mode: 'notebook' | 'textbook' = 'notebook',
  highlightedElements: string[] = []
): string {
  const generator = generators[data.type];
  if (!generator) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#64748b">Diagram: ${data.type}</text>
    </svg>`;
  }
  return generator(data, width, height, mode, highlightedElements);
}

export function DiagramDisplay({
  data,
  width = 400,
  height = 280,
  mode = 'notebook',
  highlightedElements = [],
}: DiagramProps) {
  const svg = useMemo(
    () => generateDiagramSvg(data, width, height, mode, highlightedElements),
    [data, width, height, mode, highlightedElements]
  );

  return (
    <div className="diagram-display" style={{ maxWidth: `${width}px` }}>
      <div
        className="diagram-svg-container"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default DiagramDisplay;

