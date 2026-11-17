import { useState, useCallback, useEffect } from 'react';
import './TypedInput.css';

interface TypedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  ariaLabel?: string;
}

export function TypedInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type an equation or word problem (e.g., 2x + 4 = 10, or x + y = 30)...',
  disabled = false,
  rows = 2,
  ariaLabel = 'Equation or word problem input'
}: TypedInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onChange(localValue);
      if (onSubmit) {
        onSubmit();
      }
    }
  }, [localValue, onChange, onSubmit]);

  return (
    <div className="typed-input-container">
      <label htmlFor="typed-input" className="sr-only">
        {ariaLabel}
      </label>
      <textarea
        id="typed-input"
        className="typed-input"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-label={ariaLabel}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="typed-input-hint">
        Press <strong>Enter</strong> to solve, <strong>Shift+Enter</strong> for a new line
      </div>
    </div>
  );
}