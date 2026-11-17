import { useState, useCallback } from 'react';

interface AttemptInputProps {
  onSubmit: (ast: any) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AttemptInput({ onSubmit, disabled = false, placeholder = 'Enter your next step...' }: AttemptInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    // In a real implementation, this would parse the input into an AST
    // For now, we'll send a simple AST representation
    const ast = {
      type: 'equation',
      left: { type: 'symbol', name: 'x' },
      right: { type: 'number', value: parseFloat(input) || 0 }
    };
    
    onSubmit(ast);
    setInput('');
  }, [input, disabled, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="attempt-input-form">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="attempt-input"
        autoComplete="off"
      />
      <button type="submit" disabled={disabled || !input.trim()} className="submit-btn">
        Submit
      </button>
    </form>
  );
}

export default AttemptInput;