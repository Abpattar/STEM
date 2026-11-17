import { useCallback } from 'react';
import './InstructionInput.css';

interface InstructionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function InstructionInput({
  value,
  onChange,
  placeholder = 'e.g., "find x", "solve for y", "simplify"',
  disabled = false,
  ariaLabel = 'Instruction for what to find or do'
}: InstructionInputProps) {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <div className="instruction-input-container">
      <label htmlFor="instruction-input" className="sr-only">
        {ariaLabel}
      </label>
      <input
        id="instruction-input"
        type="text"
        className="instruction-input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}