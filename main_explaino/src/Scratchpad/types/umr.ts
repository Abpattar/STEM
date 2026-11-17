export type LearningStyle = 'visual' | 'text' | 'interactive' | 'auditory' | 'balanced';
export type BrailleStandard = 'nemeth' | 'ueb';
export type SpeechDialect = 'clearspeak' | 'simplespeak';

export interface StudentPreferences {
  learning_style: LearningStyle;
  steps_per_screen: number;
  explanation_depth: 'brief' | 'standard' | 'detailed';
  show_prerequisites_first: boolean;
  speech_enabled: boolean;
  speech_rate: number;
  speech_dialect: SpeechDialect;
  braille_enabled: boolean;
  braille_standard: BrailleStandard;
  sign_language_enabled: boolean;
  sign_language_dialect: string;
  interactive_visuals_enabled: boolean;
  sonification_enabled: boolean;
  reduced_distraction: boolean;
  break_reminders: boolean;
  animation_enabled: boolean;
}

export interface StudentProfile {
  student_id: string;
  grade: number;
  preferences: StudentPreferences;
}

export interface PrerequisiteConcept {
  id: string;
  label: string;
  domain: string;
  description?: string;
  mastered: boolean;
}

export interface LearningPayload {
  primary_concept_id?: string;
  prerequisites: PrerequisiteConcept[];
  mastery_status: string;
  recommended_sequence: string[];
}

export interface VisualisationPayload {
  type: string | null;
  component_id: string | null;
  initial_params: Record<string, unknown>;
  description?: string;
}

export interface SpeechPayload {
  expression_speech: string;
  steps_speech: string[];
  dialect: string;
}

export interface BraillePayload {
  standard: BrailleStandard;
  expression_braille: string;
  steps_braille: string[];
}

export interface SonificationPoint {
  x: number;
  y: number;
  frequency_hz: number;
  duration_ms: number;
  braille?: string;
  aria_label?: string;
}

export interface SonificationData {
  chart_type: string;
  title: string;
  points: SonificationPoint[];
  min_point?: SonificationPoint;
  max_point?: SonificationPoint;
  keyboard_shortcuts?: Record<string, string>;
}

export interface SignSequenceItem {
  display: string;
  sign: string;
  type: string;
  description: string;
  has_3d_template: boolean;
}

export interface StepGestureLayer {
  title: string;
  description: string;
  tokens: SignSequenceItem[];
  spatial_direction?: string;
  action_sign?: string;
  concept_signs?: string[];
  rationale_text?: string;
}

export interface StepGestureData {
  step_number: number;
  latex: string;
  operation: string;
  explanation: string;
  sign_sequence: SignSequenceItem[];
  layers: {
    layer_1_state: StepGestureLayer;
    layer_2_action: StepGestureLayer;
    layer_3_pedagogy: StepGestureLayer;
  };
}

export interface SignLanguageData {
  is_supported: boolean;
  dialect: string;
  sign_sequence?: SignSequenceItem[];
  supported_tokens: string[];
  operator_glosses?: string[];
  unsupported_tokens: string[];
  has_warnings: boolean;
  disclaimer: string;
  skeleton_playback_ready: boolean;
  step_gestures?: StepGestureData[];
}

export interface AccessibilityPayload {
  speech?: SpeechPayload | null;
  braille?: BraillePayload | null;
  sonification?: SonificationData | null;
  sign_language?: SignLanguageData | null;
}

export interface SolutionStepPayload {
  step_number: number;
  latex: string;
  operation: string;
  verified: boolean;
  explanation: string;
  what?: string;
  why?: string;
  rule?: string;
  hint?: string;
  visual_cue?: string;
  is_final_answer: boolean;
  step_gestures?: StepGestureData;
}

export interface SolutionPayload {
  status: 'solved' | 'pending' | 'unsupported' | 'error';
  verified: boolean;
  steps: SolutionStepPayload[];
  final_answer_text?: string;
  error_message?: string;
}

export interface UnifiedMathematicalRepresentation {
  problem_id: string;
  input: {
    type: string;
    raw_content?: string;
    strokes?: unknown[];
    image_b64?: string;
    recognized_latex?: string;
    confidence: number;
    instruction?: string;
    provider: string;
  };
  understanding: {
    topic: string;
    problem_type: string;
    ast: Record<string, unknown>;
    unknowns: string[];
    mathml?: string;
    is_ambiguous: boolean;
    clarification_question?: string;
    clarification_options?: string[];
  };
  learning: LearningPayload;
  solution: SolutionPayload;
  visualisation: VisualisationPayload;
  accessibility: AccessibilityPayload;
  metadata: Record<string, unknown>;
}

