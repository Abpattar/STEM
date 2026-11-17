import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { renderMathInline } from '../../utils/katexRender';

export interface TypedInputProps {
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
  placeholder = 'Type an equation or word problem (e.g., 2x + 4 = 10 or x^2 + 5x + 6 = 0)...',
  disabled = false,
  rows = 2,
  ariaLabel = 'Equation or word problem input',
}: TypedInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onChange(localValue);
        onSubmit?.();
      }
    },
    [localValue, onChange, onSubmit]
  );

  const previewHtml = useMemo(() => {
    const trimmed = localValue.trim();
    if (!trimmed || trimmed.length > 140) return '';
    // Render live KaTeX preview when the input resembles a mathematical expression
    if (!/[0-9=+\-*/^\\()]/.test(trimmed)) return '';
    return renderMathInline(trimmed);
  }, [localValue]);

  return (
    <div className="typed-input-container">
      <label htmlFor="nilo-math-typed-input" className="sr-only">
        {ariaLabel}
      </label>
      <textarea
        id="nilo-math-typed-input"
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
      <div className="typed-input-footer">
        <div className="typed-input-hint">
          Press <strong>Enter</strong> to solve, <strong>Shift+Enter</strong> for a new line
        </div>
        {previewHtml && (
          <div className="typed-input-preview" aria-label="Rendered mathematical preview">
            <span className="preview-label">Preview:</span>
            <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </div>
    </div>
  );
}

