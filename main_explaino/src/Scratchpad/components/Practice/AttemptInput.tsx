import React, { useState, useCallback, useMemo } from 'react';
import { renderMathInline } from '../../utils/katexRender';

export interface AttemptInputProps {
  onSubmit: (expressionText: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function AttemptInput({
  onSubmit,
  disabled = false,
  isSubmitting = false,
  placeholder = 'Enter your next algebraic step (e.g. 2x = 6 or x = 3)...',
}: AttemptInputProps) {
  const [input, setInput] = useState('');

  const previewHtml = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    return renderMathInline(trimmed);
  }, [input]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || disabled || isSubmitting) return;
      onSubmit(trimmed);
      setInput('');
    },
    [input, disabled, isSubmitting, onSubmit]
  );

  return (
    <div className="practice-attempt-input-wrap">
      <form onSubmit={handleSubmit} className="attempt-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="attempt-input"
          autoComplete="off"
          aria-label="Enter your mathematical practice step"
          data-testid="practice-attempt-input"
        />
        <button
          type="submit"
          disabled={disabled || isSubmitting || !input.trim()}
          className="submit-btn"
          data-testid="practice-submit-btn"
        >
          {isSubmitting ? 'Checking...' : 'Check Step'}
        </button>
      </form>
      {previewHtml && (
        <div className="attempt-katex-preview" aria-label="Rendered expression preview">
          <span className="attempt-preview-label">Preview:</span>
          <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}

export default AttemptInput;

