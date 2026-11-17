import { MATH_API_ENDPOINTS } from '../../services/api/mathApi';
import type {
  MathOperationType,
  RecognitionResult,
  SolutionStep,
  StepValidation,
  Stroke,
  StructuredProblem,
} from '../types/canvas';
import type { StudentProfile, UnifiedMathematicalRepresentation } from '../types/umr';

export class MathApiError extends Error {
  public readonly status: number;
  public readonly isBackendUnavailable: boolean;

  constructor(message: string, status = 0, isBackendUnavailable = false) {
    super(message);
    this.name = 'MathApiError';
    this.status = status;
    this.isBackendUnavailable = isBackendUnavailable;
  }
}

async function fetchMathJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new MathApiError(
      'Unable to reach the Mathematics solver backend. Ensure the FastAPI service is running.',
      0,
      true
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let detail = '';
    if (isJson) {
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === 'object') {
        detail = String((payload as { detail?: unknown; message?: unknown }).detail || (payload as { message?: unknown }).message || '');
      }
    } else {
      const text = await response.text().catch(() => '');
      detail = text.slice(0, 180).trim();
    }

    const isUnavailable =
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      (response.status === 500 && !isJson);

    const message = isUnavailable
      ? 'Mathematics solver backend is unavailable. Ensure the FastAPI service is running on port 8000.'
      : detail || `Mathematics API request failed with status ${response.status}.`;

    throw new MathApiError(message, response.status, isUnavailable);
  }

  if (!isJson) {
    throw new MathApiError(
      'Unexpected non-JSON response from Mathematics API proxy.',
      response.status,
      true
    );
  }

  return (await response.json()) as T;
}

export interface MathHealthResponse {
  status: string;
  version?: string;
  services?: Record<string, string>;
}

export interface VoiceNormalizeResponse {
  raw: string;
  normalized: string;
  latex: string;
  is_equation?: boolean;
  is_word_problem?: boolean;
  confidence?: number;
}

export interface OrchestrateProcessPayload {
  raw_content: string;
  input_type: 'handwriting' | 'typed' | 'voice' | 'isl';
  strokes?: Stroke[];
  image_b64?: string;
  recognized_latex?: string;
  instruction?: string;
  profile?: StudentProfile;
}

export interface VerifyStepResponse {
  validation: StepValidation;
}

export interface SolveResponse {
  steps: SolutionStep[];
  problem_id: string;
  topic: string;
}

export interface FSRSConceptState {
  concept_id?: string;
  is_correct?: boolean;
  rating?: number;
  stability: number;
  difficulty: number;
  retrievability: number;
  next_interval_days: number;
  streak: number;
  mastery_pct: number;
  status: 'learning' | 'review_needed' | 'mastered' | string;
}

export interface LearningReviewRequest {
  concept_id: string;
  is_correct: boolean;
  elapsed_days?: number;
  current_state?: Partial<FSRSConceptState>;
}

export type AttemptClassification =
  | 'correct_expected'
  | 'correct_alternate'
  | 'valid_no_progress'
  | 'not_equivalent'
  | 'unreadable';

export type MisconceptionId =
  | 'MC-001'
  | 'MC-002'
  | 'MC-003'
  | 'MC-004'
  | 'MC-005'
  | 'MC-006'
  | 'MC-007'
  | 'MC-008'
  | 'MC-009'
  | 'MC-010';

export interface PracticeAttemptResult {
  classification: AttemptClassification;
  misconception_id: MisconceptionId | null;
  divergence_step: number | null;
  feedback: string;
  hint_level: number;
  hint_text: string;
  show_step_allowed: boolean;
  is_final_answer?: boolean;
  /** Optional diagnostic tag indicating whether result came from /practice/attempt or /verify-step fallback */
  evaluation_source?: 'practice_attempt_api' | 'sympy_verify_step_fallback';
}

export interface PracticeAttemptRequest {
  problem: StructuredProblem;
  attempt_ast: Record<string, unknown>;
  current_step: number;
  grade: number;
}

export interface PracticeAttemptResponse {
  result: PracticeAttemptResult;
  next_hint?: string | null;
}

export interface PracticeHintRequest {
  problem: StructuredProblem;
  current_step: number;
  grade?: number;
  hint_level?: number;
  student_attempt?: Record<string, unknown> | null;
}

export interface PracticeHintResponse {
  hint: string;
  level: number;
  show_step_allowed?: boolean;
}

export interface PracticeSummaryPayload {
  steps_attempted: number;
  hints_used: number;
  misconceptions_found: string[];
  completed: boolean;
}

export interface SavedPracticeProblem {
  id: string;
  problem_data: StructuredProblem;
  solution_steps: unknown[];
  practice_summary: PracticeSummaryPayload;
  topic: string;
  grade: number;
  created_at: string;
}

export interface SaveHistoryRequest {
  problem_data: StructuredProblem;
  solution_steps: unknown[];
  practice_summary: PracticeSummaryPayload;
  topic: string;
  grade: number;
}

export interface MathAnalyticsResponse {
  total_sessions: number;
  total_problems_solved: number;
  average_hints_used: number;
  top_misconceptions: unknown[];
  topics_practiced: Record<string, number>;
  note?: string;
}

export async function checkMathBackendHealth(signal?: AbortSignal): Promise<MathHealthResponse> {
  return fetchMathJson<MathHealthResponse>(MATH_API_ENDPOINTS.health(), {
    method: 'GET',
    signal,
  });
}

export async function recognizeHandwriting(
  payload: { image_b64: string; strokes: Stroke[] },
  signal?: AbortSignal
): Promise<RecognitionResult> {
  return fetchMathJson<RecognitionResult>(MATH_API_ENDPOINTS.recognize(), {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function recognizeTypedExpression(
  text: string,
  signal?: AbortSignal
): Promise<RecognitionResult> {
  return fetchMathJson<RecognitionResult>(MATH_API_ENDPOINTS.recognizeTyped(), {
    method: 'POST',
    body: JSON.stringify({ text }),
    signal,
  });
}

export async function normalizeMathVoice(
  transcript: string,
  signal?: AbortSignal
): Promise<VoiceNormalizeResponse> {
  return fetchMathJson<VoiceNormalizeResponse>(MATH_API_ENDPOINTS.voiceNormalize(), {
    method: 'POST',
    body: JSON.stringify({ transcript }),
    signal,
  });
}

export async function orchestrateMathProblem(
  payload: OrchestrateProcessPayload,
  signal?: AbortSignal
): Promise<UnifiedMathematicalRepresentation> {
  return fetchMathJson<UnifiedMathematicalRepresentation>(
    MATH_API_ENDPOINTS.orchestrateProcess(),
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }
  );
}

export async function solveStructuredProblem(
  problem: StructuredProblem,
  grade = 7,
  signal?: AbortSignal
): Promise<SolveResponse> {
  return fetchMathJson<SolveResponse>(MATH_API_ENDPOINTS.solve(), {
    method: 'POST',
    body: JSON.stringify({ problem, grade }),
    signal,
  });
}

export async function verifyMathStep(
  payload: {
    before_ast: Record<string, unknown>;
    after_ast: Record<string, unknown>;
    operation: MathOperationType;
  },
  signal?: AbortSignal
): Promise<VerifyStepResponse> {
  return fetchMathJson<VerifyStepResponse>(MATH_API_ENDPOINTS.verifyStep(), {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function submitLearningReview(
  payload: LearningReviewRequest,
  signal?: AbortSignal
): Promise<FSRSConceptState> {
  return fetchMathJson<FSRSConceptState>(MATH_API_ENDPOINTS.learningReview(), {
    method: 'POST',
    body: JSON.stringify({
      concept_id: payload.concept_id,
      is_correct: payload.is_correct,
      elapsed_days: payload.elapsed_days ?? 1.0,
      current_state: payload.current_state,
    }),
    signal,
  });
}

export async function submitPracticeAttempt(
  payload: PracticeAttemptRequest,
  signal?: AbortSignal
): Promise<PracticeAttemptResponse> {
  return fetchMathJson<PracticeAttemptResponse>(MATH_API_ENDPOINTS.practiceAttempt(), {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function requestPracticeHint(
  payload: PracticeHintRequest,
  signal?: AbortSignal
): Promise<PracticeHintResponse> {
  const params = new URLSearchParams({
    current_step: String(Math.max(0, payload.current_step)),
    grade: String(Math.min(10, Math.max(1, payload.grade ?? 7))),
    hint_level: String(Math.min(4, Math.max(1, payload.hint_level ?? 1))),
  });
  return fetchMathJson<PracticeHintResponse>(
    `${MATH_API_ENDPOINTS.practiceHint()}?${params.toString()}`,
    {
      method: 'POST',
      body: JSON.stringify({
        problem: payload.problem,
        student_attempt: payload.student_attempt ?? null,
      }),
      signal,
    }
  );
}

export async function listPracticeHistory(signal?: AbortSignal): Promise<SavedPracticeProblem[]> {
  return fetchMathJson<SavedPracticeProblem[]>(MATH_API_ENDPOINTS.history(), {
    method: 'GET',
    signal,
  });
}

export async function savePracticeHistory(
  payload: SaveHistoryRequest,
  signal?: AbortSignal
): Promise<SavedPracticeProblem> {
  return fetchMathJson<SavedPracticeProblem>(MATH_API_ENDPOINTS.history(), {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function deletePracticeHistoryItem(
  problemId: string,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  return fetchMathJson<{ success: boolean }>(MATH_API_ENDPOINTS.historyById(problemId), {
    method: 'DELETE',
    signal,
  });
}

export async function clearPracticeHistory(
  signal?: AbortSignal
): Promise<{ deleted_count: number }> {
  return fetchMathJson<{ deleted_count: number }>(MATH_API_ENDPOINTS.history(), {
    method: 'DELETE',
    signal,
  });
}

export async function getMathAnalytics(signal?: AbortSignal): Promise<MathAnalyticsResponse> {
  return fetchMathJson<MathAnalyticsResponse>(MATH_API_ENDPOINTS.analytics(), {
    method: 'GET',
    signal,
  });
}

