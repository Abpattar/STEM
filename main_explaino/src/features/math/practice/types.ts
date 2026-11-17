export interface AttemptResult {
  classification: 'correct_expected' | 'correct_alternate' | 'valid_no_progress' | 'not_equivalent' | 'unreadable';
  misconception_id: 'MC-001' | 'MC-002' | 'MC-003' | 'MC-004' | 'MC-005' | 'MC-006' | 'MC-007' | 'MC-008' | 'MC-009' | 'MC-010' | null;
  divergence_step: number | null;
  feedback: string;
  hint_level: number;
  hint_text: string;
  show_step_allowed: boolean;
}

export interface MisconceptionEntry {
  id: 'MC-001' | 'MC-002' | 'MC-003' | 'MC-004' | 'MC-005' | 'MC-006' | 'MC-007' | 'MC-008' | 'MC-009' | 'MC-010';
  name: string;
  detector_expr: string;
  explanation: string;
  hint: string;
  grade_range: [number, number];
}

export interface SavedProblem {
  id: string;
  problem_data: any;
  solution_steps: any[];
  practice_summary: {
    steps_attempted: number;
    hints_used: number;
    misconceptions_found: string[];
    completed: boolean;
  };
  topic: string;
  grade: number;
  created_at: string;
}

export interface PracticeAttemptRequest {
  problem: any;
  attempt_ast: any;
  current_step: number;
  grade: number;
}

export interface PracticeAttemptResponse {
  result: AttemptResult;
  next_hint?: string;
}

export interface HintResponse {
  hint: string;
  level: number;
}

export interface PracticeSession {
  problem: any;
  current_step: number;
  grade: number;
  attempts: Array<{
    step: number;
    attempt: any;
    result: any;
    timestamp: string;
  }>;
  hints_used: number;
  misconceptions_found: string[];
}

export interface AnalyticsEvent {
  event_type: 'recognition_failure' | 'clarification_shown' | 'verification_failed' | 'hint_used' | 'misconception_detected' | 'practice_step_completed' | 'user_reported_issue' | 'latency';
  topic: string;
  grade: number;
  latency_ms: number;
  hint_level: number;
  misconception_id?: string;
  timestamp: string;
}