import { AttemptResult } from './types';

interface FeedbackDisplayProps {
  result: AttemptResult;
}

export function FeedbackDisplay({ result }: FeedbackDisplayProps) {
  const isCorrect = result.classification === 'correct_expected' || result.classification === 'correct_alternate';
  const isAlternate = result.classification === 'correct_alternate';

  return (
    <div className={`feedback-display ${isCorrect ? 'correct' : 'incorrect'} ${isAlternate ? 'alternate' : ''}`}>
      <div className="feedback-icon" role="img" aria-label={isCorrect ? 'Correct' : 'Incorrect'}>
        {isCorrect ? '✓' : '✗'}
      </div>
      <div className="feedback-text">
        <span className="feedback-label">
          {result.classification === 'correct_expected' && 'Correct!'}
          {result.classification === 'correct_alternate' && 'Valid alternative path'}
          {result.classification === 'valid_no_progress' && 'Valid but no progress'}
          {result.classification === 'not_equivalent' && 'Not equivalent'}
          {result.classification === 'unreadable' && 'Could not read'}
        </span>
        <p className="feedback-message">{result.feedback}</p>
      </div>
      {result.hint_level > 1 && (
        <div className="hint-indicator">
          Hint level {result.hint_level}: {result.hint_text}
        </div>
      )}
      {result.misconception_id && (
        <div className="misconception-flag">
          Misconception detected: {result.misconception_id}
        </div>
      )}
    </div>
  );
}

export default FeedbackDisplay;