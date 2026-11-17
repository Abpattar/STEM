import type {
  AttemptClassification,
  MisconceptionId,
  PracticeAttemptResult,
  PracticeSummaryPayload,
  SavedPracticeProblem,
} from '../../services/mathService';

export type {
  AttemptClassification,
  MisconceptionId,
  PracticeAttemptResult,
  PracticeSummaryPayload,
  SavedPracticeProblem,
};

export interface PracticeAttemptRecord {
  stepIndex: number;
  rawInput: string;
  attemptAst: Record<string, unknown>;
  result: PracticeAttemptResult;
  timestamp: string;
}

export interface PracticeHintEntry {
  level: number;
  label: string;
  text: string;
  source: 'backend_hint_api' | 'solver_step_metadata';
}

