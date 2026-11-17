export interface Point {
  x: number;
  y: number;
}

export interface Vertex extends Point {
  label: string;
}

export interface Measurement {
  label: string;
  value: number;
  unit: string;
  type: 'length' | 'angle' | 'radius' | 'diameter' | 'height';
}

export type DiagramType =
  | 'triangle'
  | 'rectangle'
  | 'circle'
  | 'parallelogram'
  | 'trapezium'
  | 'coordinate_plane'
  | 'bar_chart'
  | 'data_table'
  | 'cuboid'
  | 'cylinder'
  | 'cone';

export interface DiagramData {
  type: DiagramType;
  vertices?: Vertex[];
  measurements?: Measurement[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  cx?: number;
  cy?: number;
  top_width?: number;
  bottom_width?: number;
  skew?: number;
  points?: Array<{ label: string; x: number; y: number }>;
  lines?: Array<{ point1: string; point2: string }>;
  values?: number[];
  labels?: string[];
  headers?: string[];
  rows?: string[][];
  depth?: number;
}

export interface DiagramProps {
  data: DiagramData;
  width?: number;
  height?: number;
  mode?: 'notebook' | 'textbook';
  highlightedElements?: string[];
}

