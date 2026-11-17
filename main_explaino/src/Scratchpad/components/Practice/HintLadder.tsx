import type { PracticeHintEntry } from './types';

export interface HintLadderProps {
  currentLevel: number;
  maxLevel?: number;
  hints: PracticeHintEntry[];
  isLoadingHint?: boolean;
  hintNotice?: string | null;
  onRequestHint: () => void;
  onShowStep: () => void;
  canRevealStep: boolean;
  stepRevealed: boolean;
  disabled?: boolean;
}

const LEVEL_LABELS = ['Nudge', 'Targeted Hint', 'Step Guide', 'Simpler Explanation'];

export function HintLadder({
  currentLevel,
  maxLevel = 4,
  hints,
  isLoadingHint = false,
  hintNotice,
  onRequestHint,
  onShowStep,
  canRevealStep,
  stepRevealed,
  disabled = false,
}: HintLadderProps) {
  return (
    <div className="hint-ladder" role="region" aria-label="Progressive Hint Ladder" data-testid="practice-hint-ladder">
      <div className="hint-ladder-header">
        <span className="hint-ladder-title">Progressive Hints</span>
        <span className="hint-level-counter">
          Level {currentLevel} / {maxLevel}
        </span>
      </div>

      <div className="hint-level-indicator" aria-label="Hint progression levels">
        {LEVEL_LABELS.slice(0, maxLevel).map((label, idx) => {
          const lvl = idx + 1;
          const isReached = lvl <= currentLevel;
          const isCurrent = lvl === currentLevel;
          return (
            <span
              key={lvl}
              className={`hint-level-badge ${isReached ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {lvl}. {label}
            </span>
          );
        })}
      </div>

      {hintNotice && (
        <div className="hint-backend-note" role="note">
          {hintNotice}
        </div>
      )}

      {hints.length === 0 ? (
        <p className="hint-empty-prompt">
          Stuck on this step? Request a small nudge first — hints grow more specific without
          immediately revealing the answer.
        </p>
      ) : (
        <div className="hint-history-list" data-testid="practice-hints-list">
          {hints.map((entry) => (
            <div key={entry.level} className="hint-current" data-testid={`hint-item-${entry.level}`}>
              <div className="hint-item-meta">
                <span className="hint-label">
                  Level {entry.level} — {entry.label}
                </span>
                <span className="hint-source-tag">
                  {entry.source === 'backend_hint_api' ? 'Hint API' : 'Solver Step Hint'}
                </span>
              </div>
              <p className="hint-text">{entry.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="hint-actions">
        <button
          type="button"
          onClick={onRequestHint}
          disabled={disabled || isLoadingHint || currentLevel >= maxLevel}
          className="hint-btn primary"
          data-testid="practice-request-hint-btn"
        >
          {isLoadingHint
            ? 'Fetching Hint...'
            : currentLevel === 0
              ? 'Request Hint (Level 1)'
              : currentLevel < maxLevel
                ? `Next Hint (Level ${currentLevel + 1})`
                : 'All Hints Shown'}
        </button>

        <button
          type="button"
          onClick={onShowStep}
          disabled={disabled || !canRevealStep || stepRevealed}
          className="hint-btn secondary"
          data-testid="practice-reveal-step-btn"
          title={
            canRevealStep
              ? 'Reveal the expected mathematical step'
              : 'Request at least 2 hints or attempt the step before revealing'
          }
        >
          {stepRevealed ? 'Step Revealed' : 'Show Step'}
        </button>
      </div>
    </div>
  );
}

export default HintLadder;

