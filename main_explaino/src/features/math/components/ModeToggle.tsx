import { useCallback } from 'react';
import './ModeToggle.css';

type DisplayMode = 'notebook' | 'textbook';

interface ModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onChange, disabled = false }: ModeToggleProps) {
  const handleChange = useCallback((newMode: DisplayMode) => {
    onChange(newMode);
  }, [onChange]);

  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Display mode">
      <button
        className={`mode-toggle-btn ${mode === 'notebook' ? 'active' : ''}`}
        onClick={() => handleChange('notebook')}
        disabled={disabled}
        role="radio"
        aria-checked={mode === 'notebook'}
        aria-label="Notebook mode - handwritten style"
      >
        <svg className="mode-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
        <span>Notebook</span>
      </button>
      <button
        className={`mode-toggle-btn ${mode === 'textbook' ? 'active' : ''}`}
        onClick={() => handleChange('textbook')}
        disabled={disabled}
        role="radio"
        aria-checked={mode === 'textbook'}
        aria-label="Textbook mode - typeset style"
      >
        <svg className="mode-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Textbook</span>
      </button>
    </div>
  );
}