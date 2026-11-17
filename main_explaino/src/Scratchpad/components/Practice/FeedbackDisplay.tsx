import type { PracticeAttemptResult } from './types';

export interface FeedbackDisplayProps {
  result: PracticeAttemptResult;
  rawInput?: string;
}

const CLASSIFICATION_META: Record<
  PracticeAttemptResult['classification'],
  { label: string; icon: string; tone: 'correct' | 'alternate' | 'warning' | 'incorrect' }
> = {
  correct_expected: { label: 'Correct!', icon: '✓', tone: 'correct' },
  correct_alternate: { label: 'Valid alternative path', icon: '✓', tone: 'alternate' },
  valid_no_progress: { label: 'Valid, but no forward progress yet', icon: '↺', tone: 'warning' },
  not_equivalent: { label: 'Not algebraically equivalent', icon: '✗', tone: 'incorrect' },
  unreadable: { label: 'Could not verify / unreadable expression', icon: '?', tone: 'warning' },
};

export function FeedbackDisplay({ result, rawInput }: FeedbackDisplayProps) {
  const meta = CLASSIFICATION_META[result.classification] || CLASSIFICATION_META.not_equivalent;
  const isCorrect =
    result.classification === 'correct_expected' || result.classification === 'correct_alternate';

  return (
    <div
      className={`feedback-display ${meta.tone}`}
      role="status"
      aria-live="polite"
      data-testid="practice-feedback-display"
      data-classification={result.classification}
    >
      <div className="feedback-icon" role="img" aria-label={meta.label}>
        {meta.icon}
      </div>
      <div className="feedback-text">
        <div className="feedback-title-row">
          <span className="feedback-label">{meta.label}</span>
          {rawInput && <code className="feedback-input-echo">{rawInput}</code>}
          {result.evaluation_source === 'sympy_verify_step_fallback' && (
            <span
              className="feedback-source-badge"
              title="Evaluated server-side via SymPy /api/math/verify-step because upstream /api/math/practice/attempt returned HTTP 500"
            >
              SymPy /verify-step
            </span>
          )}
        </div>

        <p className="feedback-message">{result.feedback}</p>

        {!isCorrect && result.hint_text && (
          <div className="hint-indicator">
            Guidance (Level {result.hint_level}): {result.hint_text}
          </div>
        )}

        {result.misconception_id && (
          <div className="misconception-flag" data-testid="feedback-misconception-flag">
            Identified misconception: <strong>{result.misconception_id}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackDisplay;

