import type { DiagramType } from './diagrams/types';

export type VisualMode =
  | 'parabola'
  | 'balance'
  | 'circle'
  | 'pythagoras'
  | 'numberline'
  | 'tiles'
  | 'geometry';

export interface ConceptResolution {
  /**
   * Verified canonical concept ID from scratchpad_notebook/backend/src/orchestrator/adapters/mathua_adapter.py.
   * Strictly null when no semantically matching canonical ID exists in the source registry.
   */
  conceptId: string | null;
  /** Human-readable concept title for StudentLearningContext. */
  conceptTitle: string;
  /** Activity descriptor for StudentLearningContext. */
  activity: string;
  /**
   * Explicitly documented proposed registry ID when conceptId is null.
   * Never passed to StudentLearningContext.activeConceptId as if it were canonical.
   */
  proposedConceptId?: string;
}

export interface VisualizerMeta extends ConceptResolution {
  id: VisualMode;
  label: string;
  gradeTag: string;
}

export const VISUALIZER_CATALOG: VisualizerMeta[] = [
  {
    id: 'parabola',
    label: 'Parabola & Roots',
    gradeTag: 'Gr 9–10',
    conceptId: 'alg.quad.solve_factor',
    conceptTitle: 'Quadratic Equations',
    activity: 'visualizer-parabola',
  },
  {
    id: 'balance',
    label: 'Equation Balance',
    gradeTag: 'Gr 7–8',
    conceptId: 'prealg.eq.two_step',
    conceptTitle: 'Solving Linear Equations',
    activity: 'visualizer-equation-balance',
  },
  {
    id: 'circle',
    label: 'Circle Area Wedges',
    gradeTag: 'Gr 7–9',
    conceptId: null,
    proposedConceptId: 'geo.circle.area_exhaustion',
    conceptTitle: 'Circle Area Exhaustion',
    activity: 'visualizer-circle-area',
  },
  {
    id: 'pythagoras',
    label: 'Pythagoras 3-Squares',
    gradeTag: 'Gr 8–9',
    conceptId: 'geo.tri.pythagoras',
    conceptTitle: 'Pythagorean Theorem & Right Triangles',
    activity: 'visualizer-pythagorean',
  },
  {
    id: 'numberline',
    label: 'Number Line',
    gradeTag: 'Gr 6–7',
    conceptId: null,
    proposedConceptId: 'arith.int.number_line',
    conceptTitle: 'Integer Number Line Operations',
    activity: 'visualizer-number-line',
  },
  {
    id: 'tiles',
    label: 'Algebra Tiles',
    gradeTag: 'Gr 8–9',
    conceptId: 'alg.factor.trinomial',
    conceptTitle: 'Algebraic Expressions & Factoring',
    activity: 'visualizer-algebra-tiles',
  },
  {
    id: 'geometry',
    label: 'Geometry Diagrams',
    gradeTag: 'Gr 7–10',
    conceptId: null,
    proposedConceptId: 'geo.tri.properties',
    conceptTitle: 'Triangle Geometry',
    activity: 'visualizer-geometry-triangle',
  },
];

export const DIAGRAM_CONCEPT_MAP: Record<DiagramType, ConceptResolution> = {
  triangle: {
    conceptId: null,
    proposedConceptId: 'geo.tri.properties',
    conceptTitle: 'Triangle Geometry',
    activity: 'visualizer-geometry-triangle',
  },
  circle: {
    conceptId: null,
    proposedConceptId: 'geo.circle.properties',
    conceptTitle: 'Circle Geometry',
    activity: 'visualizer-geometry-circle',
  },
  rectangle: {
    conceptId: null,
    proposedConceptId: 'geo.quad.rectangle',
    conceptTitle: 'Rectangle Geometry',
    activity: 'visualizer-geometry-rectangle',
  },
  parallelogram: {
    conceptId: null,
    proposedConceptId: 'geo.quad.parallelogram',
    conceptTitle: 'Parallelogram Geometry',
    activity: 'visualizer-geometry-parallelogram',
  },
  trapezium: {
    conceptId: null,
    proposedConceptId: 'geo.quad.trapezium',
    conceptTitle: 'Trapezium Geometry',
    activity: 'visualizer-geometry-trapezium',
  },
  coordinate_plane: {
    conceptId: null,
    proposedConceptId: 'geo.coord.plane',
    conceptTitle: 'Coordinate Geometry',
    activity: 'visualizer-geometry-coordinate_plane',
  },
  cuboid: {
    conceptId: null,
    proposedConceptId: 'geo.solid.cuboid',
    conceptTitle: '3D Geometry — Cuboid',
    activity: 'visualizer-geometry-cuboid',
  },
  cylinder: {
    conceptId: null,
    proposedConceptId: 'geo.solid.cylinder',
    conceptTitle: '3D Geometry — Cylinder',
    activity: 'visualizer-geometry-cylinder',
  },
  cone: {
    conceptId: null,
    proposedConceptId: 'geo.solid.cone',
    conceptTitle: '3D Geometry — Cone',
    activity: 'visualizer-geometry-cone',
  },
  bar_chart: {
    conceptId: null,
    proposedConceptId: 'stat.data.bar_chart',
    conceptTitle: 'Data Representation — Bar Chart',
    activity: 'visualizer-geometry-bar_chart',
  },
  data_table: {
    conceptId: null,
    proposedConceptId: 'stat.data.table',
    conceptTitle: 'Data Interpretation — Data Table',
    activity: 'visualizer-geometry-data_table',
  },
};

export function getVisualizerMeta(mode: VisualMode): VisualizerMeta {
  return VISUALIZER_CATALOG.find((item) => item.id === mode) || VISUALIZER_CATALOG[0];
}

export function resolveGeometryDiagramConcept(
  diagramType: DiagramType,
  backendTopic?: string
): ConceptResolution {
  if (backendTopic) {
    if (backendTopic === 'pythagoras') {
      return {
        conceptId: 'geo.tri.pythagoras',
        conceptTitle: 'Pythagorean Theorem (Right Triangle)',
        activity: 'visualizer-geometry-pythagoras',
      };
    }
    if (backendTopic === 'triangle_angles') {
      return {
        conceptId: null,
        proposedConceptId: 'geo.tri.angle_sum',
        conceptTitle: 'Triangle Angle Sum Theorem',
        activity: 'visualizer-geometry-triangle-angles',
      };
    }
    if (backendTopic === 'circle_geometry') {
      return {
        conceptId: null,
        proposedConceptId: 'geo.circle.properties',
        conceptTitle: 'Circle Geometry & Mensuration',
        activity: 'visualizer-geometry-circle',
      };
    }
  }
  return DIAGRAM_CONCEPT_MAP[diagramType];
}
