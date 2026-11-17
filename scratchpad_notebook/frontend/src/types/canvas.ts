export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  tool: 'pen' | 'eraser';
  color: string;
  width: number;
  timestamp: number;
  shapeId?: string;
  shapeType?: string;
}

export interface CanvasState {
  strokes: Stroke[];
  historyIndex: number;
  currentTool: 'pen' | 'eraser' | 'select';
  penColor: string;
  penWidth: number;
  eraserWidth: number;
  isDrawing: boolean;
}

export interface CanvasActions {
  addStroke: (stroke: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setTool: (tool: 'pen' | 'eraser' | 'select') => void;
  setPenColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setEraserWidth: (width: number) => void;
}

export interface RecognitionCandidate {
  latex: string;
  ast_json: Record<string, unknown>;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  symbol_confidences: Array<{
    symbol: string;
    confidence: number;
    position: { x: number; y: number };
  }>;
}

export interface ClarificationOption {
  label: string;
  latex: string;
  ast_json: Record<string, unknown>;
}

export interface ClarificationRequest {
  id: string;
  question: string;
  options: ClarificationOption[];
  affected_region: { x: number; y: number; w: number; h: number };
  symbol_in_question: string;
}

export interface RecognitionResult {
  candidates: RecognitionCandidate[];
  needs_clarification: boolean;
  clarification?: ClarificationRequest;
}

export type DisplayMode = 'notebook' | 'textbook';

export interface SolutionStep {
  step_number: number;
  operation: string;
  equation_ast: Record<string, unknown>;
  display_math: string;
  explanation: string;
  validation: {
    is_valid: boolean;
    method: string;
    details: string;
  };
  hint: string;
  is_final_answer: boolean;
  final_answer_text: string;
  step_gestures?: any;
}

export interface StructuredProblem {
  problem_type: 'equation' | 'system' | 'expression' | 'word_problem' | 'inequality';
  expressions: Array<{
    ast_json: Record<string, unknown>;
    latex: string;
  }>;
  unknowns: string[];
  given_values: Record<string, { ast_json: Record<string, unknown>; latex: string }>;
  constraints: string[];
  requested_operation: 'solve' | 'simplify' | 'evaluate' | 'factor' | 'expand' | 'substitute';
  topic: string;
  units: Record<string, string>;
  grade_hint: number | null;
  source: 'handwriting' | 'typed' | 'mixed';
}

export interface TopicSupport {
  topic: string;
  level: 'full' | 'limited' | 'unsupported';
  supported_operations: string[];
  grade_range: [number, number];
  test_status: 'passed' | 'pending' | 'failed';
  limitations: string[];
}