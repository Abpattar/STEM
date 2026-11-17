import React, { useEffect, useState } from 'react';
import { recognizeTypedExpression, verifyMathStep, MathApiError } from '../../services/mathService';
import { renderMathInline } from '../../utils/katexRender';
import type { MathOperationType, StepValidation } from '../../types/canvas';

export interface StepVerifierPanelProps {
  initialBefore?: string;
  disabled?: boolean;
}

const OPERATIONS: Array<{ value: MathOperationType; label: string }> = [
  { value: 'simplify', label: 'Simplify / Equivalent Step' },
  { value: 'subtract_both_sides', label: 'Subtract from Both Sides' },
  { value: 'add_both_sides', label: 'Add to Both Sides' },
  { value: 'multiply_both_sides', label: 'Multiply Both Sides' },
  { value: 'divide_both_sides', label: 'Divide Both Sides' },
  { value: 'expand', label: 'Expand' },
  { value: 'factorise', label: 'Factorise' },
  { value: 'isolate_variable', label: 'Isolate Variable' },
];

export function StepVerifierPanel({
  initialBefore = '',
  disabled = false,
}: StepVerifierPanelProps) {
  const [beforeExpr, setBeforeExpr] = useState(initialBefore);
  const [afterExpr, setAfterExpr] = useState('');
  const [operation, setOperation] = useState<MathOperationType>('simplify');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    validation: StepValidation;
    beforeLatex: string;
    afterLatex: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBefore && !beforeExpr) {
      setBeforeExpr(initialBefore);
    }
  }, [initialBefore, beforeExpr]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = beforeExpr.trim();
    const a = afterExpr.trim();
    if (!b || !a) {
      setError('Enter both a current expression and your next transformation step.');
      return;
    }

    setError(null);
    setResult(null);
    setIsVerifying(true);

    try {
      const [beforeRec, afterRec] = await Promise.all([
        recognizeTypedExpression(b),
        recognizeTypedExpression(a),
      ]);

      const beforeCand = beforeRec.candidates?.[0];
      const afterCand = afterRec.candidates?.[0];

      if (!beforeCand?.ast_json || !afterCand?.ast_json) {
        setError('Could not parse one of the expressions into a valid mathematical AST.');
        return;
      }

      const verifyRes = await verifyMathStep({
        before_ast: beforeCand.ast_json,
        after_ast: afterCand.ast_json,
        operation,
      });

      setResult({
        validation: verifyRes.validation,
        beforeLatex: beforeCand.latex || b,
        afterLatex: afterCand.latex || a,
      });
    } catch (err) {
      if (err instanceof MathApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Step verification failed.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section className="step-verifier-panel" aria-label="Verify a mathematical step">
      <div className="step-verifier-header">
        <div>
          <h3 className="step-verifier-title">Step Equivalence Verifier</h3>
          <p className="step-verifier-subtitle">
            Check whether your algebraic transformation step is mathematically valid using SymPy.
          </p>
        </div>
      </div>

      <form className="step-verifier-form" onSubmit={handleVerify}>
        <div className="step-verifier-grid">
          <label className="step-verifier-field">
            <span>Before Step</span>
            <input
              type="text"
              value={beforeExpr}
              onChange={(e) => setBeforeExpr(e.target.value)}
              placeholder="e.g. 2x + 4 = 10"
              disabled={disabled || isVerifying}
              aria-label="Before step expression"
            />
          </label>

          <label className="step-verifier-field">
            <span>After Step (Your Work)</span>
            <input
              type="text"
              value={afterExpr}
              onChange={(e) => setAfterExpr(e.target.value)}
              placeholder="e.g. 2x = 6"
              disabled={disabled || isVerifying}
              aria-label="After step expression"
            />
          </label>

          <label className="step-verifier-field">
            <span>Operation</span>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as MathOperationType)}
              disabled={disabled || isVerifying}
              aria-label="Step transformation operation"
            >
              {OPERATIONS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="step-verifier-actions">
          <button
            type="submit"
            className="control-btn primary"
            disabled={disabled || isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Step'}
          </button>
        </div>
      </form>

      {error && (
        <div className="step-verifier-result invalid" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          className={`step-verifier-result ${result.validation.is_valid ? 'valid' : 'invalid'}`}
          role="status"
          aria-live="polite"
        >
          <div className="step-verifier-result-top">
            <span className="step-verifier-badge">
              {result.validation.is_valid ? '✓ Valid Transformation' : '✗ Invalid Transformation'}
            </span>
            <span className="step-verifier-method">{result.validation.method}</span>
          </div>
          <div className="step-verifier-equations">
            <span dangerouslySetInnerHTML={{ __html: renderMathInline(result.beforeLatex) }} />
            <span className="step-verifier-arrow">→</span>
            <span dangerouslySetInnerHTML={{ __html: renderMathInline(result.afterLatex) }} />
          </div>
          {result.validation.details && (
            <p className="step-verifier-details">{result.validation.details}</p>
          )}
        </div>
      )}
    </section>
  );
}

