interface HintLadderProps {
  currentLevel: number;
  onNext: () => void;
  onShowStep: () => void;
  disabled?: boolean;
}

export function HintLadder({ currentLevel, onNext, onShowStep, disabled = false }: HintLadderProps) {
  const hints = [
    { level: 1, label: 'Nudge', text: 'Look at the operation you applied to the left side — did you do the same to the right?' },
    { level: 2, label: 'Targeted Hint', text: 'When you move a term across the equals sign, what happens to its sign?' },
    { level: 3, label: 'Show Step', text: 'Show the step with explanation' },
    { level: 4, label: 'Explain Simply', text: 'Explain more simply' }
  ];

  const currentHint = hints[currentLevel - 1] || hints[0];

  return (
    <div className="hint-ladder">
      <div className="hint-level-indicator">
        {hints.map((h, idx) => (
          <span
            key={h.level}
            className={`hint-level-badge ${idx + 1 <= hints.length ? 'completed' : ''} ${idx + 1 === hints.length ? 'current' : ''}`}
          >
            {h.level}
          </span>
        ))}
      </div>
      
      <div className="hint-current">
        <span className="hint-label">{currentHint.label}</span>
        <p className="hint-text">{currentHint.text}</p>
      </div>

      <div className="hint-actions">
        {hints.length > currentLevel && (
          <button
            onClick={onNext}
            disabled={disabled}
            className="hint-btn"
          >
            Next Hint
          </button>
        )}
        <button onClick={onShowStep} disabled={disabled || currentLevel < 3} className="hint-btn secondary">
          Show Step
        </button>
        <button onClick={onNext} disabled={disabled || currentLevel >= 4} className="hint-btn secondary">
          Explain More Simply
        </button>
      </div>
    </div>
  );
}

export default HintLadder;