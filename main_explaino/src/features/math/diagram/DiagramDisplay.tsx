import { useMemo } from 'react';
import { DiagramProps, DiagramData } from './types';
import { TriangleGenerator } from './generators/triangle';
import { RectangleGenerator } from './generators/rectangle';
import { CircleGenerator } from './generators/circle';
import { ParallelogramGenerator } from './generators/parallelogram';
import { TrapeziumGenerator } from './generators/trapezium';
import { CoordinatePlaneGenerator } from './generators/coordinatePlane';
import { BarChartGenerator } from './generators/barChart';
import { DataTableGenerator } from './generators/dataTable';
import { CuboidGenerator } from './generators/cuboid';
import { CylinderGenerator } from './generators/cylinder';
import { ConeGenerator } from './generators/cone';
import './DiagramDisplay.css';

const generators: Record<string, (data: DiagramData, width: number, height: number, mode: 'notebook' | 'textbook', highlighted: string[]) => string> = {
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

export function DiagramDisplay({ 
  data, 
  width = 400, 
  height = 300, 
  mode = 'notebook',
  highlightedElements = []
}: DiagramProps) {
  const svg = useMemo(() => {
    const generator = generators[data.type];
    if (!generator) {
      return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#666">Diagram: ${data.type}</text>
      </svg>`;
    }
    return generator(data, width, height, mode, highlightedElements);
  }, [data, width, height, mode, highlightedElements]);

  return (
    <div className="diagram-display" style={{ width, height }}>
      <div 
        className="diagram-svg-container" 
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default DiagramDisplay;