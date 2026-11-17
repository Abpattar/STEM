import React, { useState, useCallback, useEffect } from 'react';
import {
  clearPracticeHistory,
  deletePracticeHistoryItem,
  listPracticeHistory,
  MathApiError,
  recognizeTypedExpression,
  requestPracticeHint,
  savePracticeHistory,
  submitPracticeAttempt,
  verifyMathStep,
  type PracticeAttemptResult,
  type SavedPracticeProblem,
} from '../../services/mathService';
import { renderMath, renderMathInline } from '../../utils/katexRender';
import { soundEffects } from '../../utils/soundEffects';
import { useStudentLearning } from '../../../context/StudentLearningContext';
import type { SolutionStep, StructuredProblem } from '../../types/canvas';
import type { UnifiedMathematicalRepresentation } from '../../types/umr';
import { AttemptInput } from './AttemptInput';
import { FeedbackDisplay } from './FeedbackDisplay';
import { HintLadder } from './HintLadder';
import { MisconceptionBanner } from './MisconceptionBanner';
import type { PracticeAttemptRecord, PracticeHintEntry } from './types';

export interface PracticeConceptPreset {
  id: string;
  label: string;
  expression: string;
  topic: string;
  conceptId: string;
  conceptTitle: string;
  grade: number;
}

const CONCEPT_PRACTICE_PRESETS: PracticeConceptPreset[] = [
  {
    id: 'linear-two-step',
    label: 'Two-Step Linear: 2x + 4 = 10',
    expression: '2x + 4 = 10',
    topic: 'linear_equations',
    conceptId: 'prealg.eq.two_step',
    conceptTitle: 'Solving Linear Equations',
    grade: 7,
  },
  {
    id: 'linear-one-step',
    label: 'One-Step Linear: x + 3 = 7',
    expression: 'x + 3 = 7',
    topic: 'linear_equations',
    conceptId: 'prealg.eq.one_step',
    conceptTitle: 'One-Step Inverse Operations',
    grade: 6,
  },
  {
    id: 'quadratic-factor',
    label: 'Quadratic Factoring: x² - 5x + 6 = 0',
    expression: 'x^2 - 5x + 6 = 0',
    topic: 'quadratic_equations',
    conceptId: 'alg.quad.solve_factor',
    conceptTitle: 'Quadratic Equations',
    grade: 9,
  },
];

export interface PracticeModeProps {
  umr: UnifiedMathematicalRepresentation | null;
  solutionSteps: SolutionStep[];
  grade: number;
  isActive: boolean;
  onLoadPresetProblem: (expression: string) => Promise<void>;
  onOpenFullSolution: () => void;
  onReturnToCanvas: () => void;
}

function buildStructuredProblem(
  latex: string,
  ast: Record<string, unknown>,
  topic: string,
  unknowns: string[],
  grade: number
): StructuredProblem {
  return {
    problem_type: latex.includes('=') ? 'equation' : 'expression',
    expressions: [{ ast_json: ast, latex }],
    unknowns: unknowns.length > 0 ? unknowns : ['x'],
    given_values: {},
    constraints: [],
    requested_operation: 'solve',
    topic: topic || 'linear_equations',
    units: {},
    grade_hint: grade || 7,
    source: 'typed',
  };
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  umr,
  solutionSteps,
  grade,
  isActive,
  onLoadPresetProblem,
  onOpenFullSolution,
  onReturnToCanvas,
}) => {
  const { setActiveConcept, setCurrentActivity } = useStudentLearning();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [attempts, setAttempts] = useState<PracticeAttemptRecord[]>([]);
  const [hints, setHints] = useState<PracticeHintEntry[]>([]);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [misconceptionsFound, setMisconceptionsFound] = useState<string[]>([]);
  const [stepRevealed, setStepRevealed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    message: string;
    tone: 'info' | 'warning' | 'error' | 'success';
  } | null>(null);
  const [hintNotice, setHintNotice] = useState<string | null>(null);

  // Practice History state (backed by /api/math/history)
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<SavedPracticeProblem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);

  const problemId = umr?.problem_id || '';
  const problemLatex = umr?.input?.recognized_latex || umr?.input?.raw_content || '';
  const problemTopic = umr?.understanding?.topic || 'linear_equations';
  const primaryConceptId = umr?.learning?.primary_concept_id || null;

  // Reset practice session whenever a new problem is loaded
  useEffect(() => {
    setCurrentStepIdx(0);
    setAttempts([]);
    setHints([]);
    setHintsUsedTotal(0);
    setMisconceptionsFound([]);
    setStepRevealed(false);
    setIsComplete(false);
    setStatusNotice(null);
    setHintNotice(null);
  }, [problemId, solutionSteps.length]);

  // Register practice mode activation in StudentLearningContext
  useEffect(() => {
    if (!isActive) return;
    if (primaryConceptId) {
      setActiveConcept({
        conceptId: primaryConceptId,
        conceptTitle: problemTopic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        subject: 'Mathematics',
      });
    }
    setCurrentActivity(isComplete ? 'practice-completed' : 'practice-started');
  }, [isActive, primaryConceptId, problemTopic, isComplete, setActiveConcept, setCurrentActivity]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryMessage(null);
    try {
      const items = await listPracticeHistory();
      setHistoryItems(items);
    } catch (err) {
      setHistoryMessage(
        err instanceof MathApiError ? err.message : 'Unable to load practice history.'
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      void loadHistory();
    }
  }, [showHistory, loadHistory]);

  const currentStepData = solutionSteps[currentStepIdx] || null;
  const previousStepData = currentStepIdx > 0 ? solutionSteps[currentStepIdx - 1] : null;
  const isLastStep = solutionSteps.length > 0 && currentStepIdx >= solutionSteps.length - 1;

  // Resolve target step AST from server parser (/api/math/recognize-typed)
  const resolveAstForExpression = useCallback(async (expr: string): Promise<Record<string, unknown> | null> => {
    const clean = expr
      .replace(/\\quad\\text\{or\}\\quad/g, ',')
      .replace(/\\left|\\right/g, '')
      .trim();
    if (!clean) return null;
    try {
      const rec = await recognizeTypedExpression(clean);
      const ast = rec.candidates?.[0]?.ast_json;
      if (ast && Object.keys(ast).length > 0) {
        return ast;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const handleSubmitAttempt = useCallback(
    async (expressionText: string) => {
      if (!currentStepData) return;

      setIsSubmitting(true);
      setStatusNotice(null);
      setCurrentActivity('practice-attempted');

      try {
        // 1. Parse both student attempt and expected step via backend parser (/api/math/recognize-typed)
        const [studentAst, expectedAstFromStep] = await Promise.all([
          resolveAstForExpression(expressionText),
          currentStepData.equation_ast && Object.keys(currentStepData.equation_ast).length > 0
            ? Promise.resolve(currentStepData.equation_ast)
            : resolveAstForExpression(currentStepData.display_math),
        ]);

        if (!studentAst) {
          const unreadableResult: PracticeAttemptResult = {
            classification: 'unreadable',
            misconception_id: null,
            divergence_step: null,
            feedback:
              'Could not parse that expression into a mathematical equation. Try writing something like "2x = 6" or "x = 3".',
            hint_level: 1,
            hint_text: 'Check for balanced parentheses and standard operators (+, -, *, /, =).',
            show_step_allowed: true,
          };
          setAttempts((prev) => [
            ...prev,
            {
              stepIndex: currentStepIdx,
              rawInput: expressionText,
              attemptAst: {},
              result: unreadableResult,
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }

        const expectedAst = expectedAstFromStep || umr?.understanding?.ast || {};
        const structuredProblem = buildStructuredProblem(
          currentStepData.display_math,
          expectedAst,
          problemTopic,
          umr?.understanding?.unknowns || ['x'],
          grade
        );

        let evaluatedResult: PracticeAttemptResult | null = null;

        // 2. Call canonical /api/math/practice/attempt endpoint first
        try {
          const apiRes = await submitPracticeAttempt({
            problem: structuredProblem,
            attempt_ast: studentAst,
            current_step: currentStepIdx,
            grade: grade || 7,
          });
          evaluatedResult = {
            ...apiRes.result,
            evaluation_source: 'practice_attempt_api',
          };
        } catch (attemptErr) {
          // Upstream scratchpad_notebook/backend/src/api/routes.py:733 has a Pydantic v2 AttemptResult
          // import class mismatch that returns HTTP 500 (text/plain "Internal Server Error").
          // Check status === 500 BEFORE isBackendUnavailable so we fall back cleanly to server-side
          // SymPy equivalence verification via /api/math/verify-step (never hardcoded frontend grading).
          if (
            attemptErr instanceof MathApiError &&
            attemptErr.status === 500 &&
            expectedAst &&
            Object.keys(expectedAst).length > 0
          ) {
            const verifyRes = await verifyMathStep({
              before_ast: expectedAst,
              after_ast: studentAst,
              operation: 'simplify',
            });

            const isValid = Boolean(verifyRes.validation?.is_valid);
            evaluatedResult = {
              classification: isValid ? 'correct_expected' : 'not_equivalent',
              misconception_id: null,
              divergence_step: null,
              feedback: isValid
                ? `Correct! SymPy verified algebraic equivalence (${verifyRes.validation.details || 'equivalent step'}).`
                : `Not algebraically equivalent (${verifyRes.validation.details || 'check both sides of the equation'}).`,
              hint_level: 1,
              hint_text: isValid
                ? 'Great work! Advance to the next step.'
                : currentStepData.hint ||
                  'Check that you applied the same inverse operation to both sides.',
              show_step_allowed: true,
              evaluation_source: 'sympy_verify_step_fallback',
            };

            setStatusNotice({
              tone: 'warning',
              message:
                'Upstream /api/math/practice/attempt returned HTTP 500 (backend Pydantic schema mismatch). Evaluated server-side via SymPy /api/math/verify-step fallback; automated misconception classification requires the upstream backend fix.',
            });
          } else {
            throw attemptErr;
          }
        }

        if (!evaluatedResult) return;

        setAttempts((prev) => [
          ...prev,
          {
            stepIndex: currentStepIdx,
            rawInput: expressionText,
            attemptAst: studentAst,
            result: evaluatedResult,
            timestamp: new Date().toISOString(),
          },
        ]);

        if (evaluatedResult.misconception_id) {
          setMisconceptionsFound((prev) =>
            prev.includes(evaluatedResult.misconception_id!)
              ? prev
              : [...prev, evaluatedResult.misconception_id!]
          );
          setCurrentActivity('misconception-identified');
        }

        if (
          evaluatedResult.classification === 'correct_expected' ||
          evaluatedResult.classification === 'correct_alternate'
        ) {
          soundEffects.playSuccessChime();
          const nextIdx = currentStepIdx + 1;
          if (nextIdx >= solutionSteps.length) {
            setIsComplete(true);
            setCurrentActivity('practice-completed');
          } else {
            setCurrentStepIdx(nextIdx);
            setHints([]);
            setStepRevealed(false);
            setHintNotice(null);
          }
        } else {
          soundEffects.playClick(300, 0.08);
        }
      } catch (err) {
        setStatusNotice({
          tone: 'error',
          message:
            err instanceof MathApiError
              ? err.message
              : 'Failed to evaluate practice attempt against the mathematics backend.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentStepData,
      currentStepIdx,
      grade,
      problemTopic,
      resolveAstForExpression,
      setCurrentActivity,
      solutionSteps.length,
      umr?.understanding?.ast,
      umr?.understanding?.unknowns,
    ]
  );

  // Progressive Hint Request calling real /api/math/practice/hint
  const handleRequestHint = useCallback(async () => {
    if (!currentStepData) return;
    const nextLevel = Math.min(4, hints.length + 1);
    setIsLoadingHint(true);
    setHintNotice(null);
    setCurrentActivity('hint-requested');
    soundEffects.playClick(480, 0.05);

    const levelLabels = ['Nudge', 'Targeted Hint', 'Step Guide', 'Simpler Explanation'];
    const label = levelLabels[nextLevel - 1] || `Hint ${nextLevel}`;

    try {
      const problemForHint = buildStructuredProblem(
        currentStepData.display_math,
        umr?.understanding?.ast || {},
        problemTopic,
        umr?.understanding?.unknowns || ['x'],
        grade
      );
      const lastAttemptAst = attempts.length > 0 ? attempts[attempts.length - 1].attemptAst : null;

      let hintText = '';
      let source: PracticeHintEntry['source'] = 'backend_hint_api';

      try {
        const res = await requestPracticeHint({
          problem: problemForHint,
          current_step: currentStepIdx,
          grade: grade || 7,
          hint_level: nextLevel,
          student_attempt: lastAttemptAst,
        });
        hintText =
          res.hint ||
          currentStepData.hint ||
          `Focus on the operation: ${currentStepData.operation.replace(/_/g, ' ') || 'inverse operation'}.`;
        source = res.hint ? 'backend_hint_api' : 'solver_step_metadata';
      } catch (hintErr) {
        if (hintErr instanceof MathApiError && hintErr.status !== 500 && hintErr.isBackendUnavailable) {
          throw hintErr;
        }
        // Upstream /api/math/practice/hint returns HTTP 500 due to routes.py:757 empty validation.method enum.
        // Fall back honestly to real solver step metadata without leaking the final answer at levels 1-2.
        source = 'solver_step_metadata';
        setHintNotice(
          'Upstream /api/math/practice/hint returned HTTP 500 (backend SolutionStep validation enum bug). Showing real solver step guidance instead.'
        );
        const opName = (currentStepData.operation || 'inverse operation').replace(/_/g, ' ');
        if (nextLevel === 1) {
          hintText = `Think about which operation (${opName}) moves you closer to isolating the variable on one side.`;
        } else if (nextLevel === 2) {
          hintText =
            currentStepData.hint ||
            `Apply the "${opName}" transformation symmetrically to both sides of the equation.`;
        } else if (nextLevel === 3) {
          hintText =
            currentStepData.explanation ||
            `Carry out "${opName}" carefully and simplify like terms. You can now click "Show Step".`;
        } else {
          hintText = `Step ${currentStepData.step_number} keeps the equation balanced by performing ${opName} equally on left and right sides.`;
        }
      }

      setHints((prev) => [...prev, { level: nextLevel, label, text: hintText, source }]);
      setHintsUsedTotal((prev) => prev + 1);
    } catch (err) {
      setStatusNotice({
        tone: 'error',
        message:
          err instanceof MathApiError ? err.message : 'Unable to fetch hint from backend.',
      });
    } finally {
      setIsLoadingHint(false);
    }
  }, [
    attempts,
    currentStepData,
    currentStepIdx,
    grade,
    hints.length,
    problemTopic,
    setCurrentActivity,
    umr?.understanding?.ast,
    umr?.understanding?.unknowns,
  ]);

  const handleRetrySession = useCallback(() => {
    setCurrentStepIdx(0);
    setAttempts([]);
    setHints([]);
    setHintsUsedTotal(0);
    setMisconceptionsFound([]);
    setStepRevealed(false);
    setIsComplete(false);
    setStatusNotice(null);
    setHintNotice(null);
    setCurrentActivity('practice-started');
    soundEffects.playClick(420, 0.05);
  }, [setCurrentActivity]);

  const handleSkipStep = useCallback(() => {
    if (isLastStep) {
      setIsComplete(true);
      setCurrentActivity('practice-completed');
    } else {
      setCurrentStepIdx((prev) => prev + 1);
    }
    setHints([]);
    setStepRevealed(false);
    setHintNotice(null);
  }, [isLastStep, setCurrentActivity]);

  const handleSaveToHistory = useCallback(async () => {
    if (!umr) return;
    setIsSavingHistory(true);
    setHistoryMessage(null);
    try {
      const problemPayload = buildStructuredProblem(
        problemLatex || 'x = 0',
        umr.understanding?.ast || {},
        problemTopic,
        umr.understanding?.unknowns || ['x'],
        grade
      );

      // Map steps into backend SolutionStep schema shape for POST /api/math/history
      const validSteps = solutionSteps.map((s) => ({
        step_number: s.step_number,
        operation: s.operation || 'simplify',
        equation_ast: s.equation_ast || {},
        display_math: s.display_math,
        explanation: s.explanation || '',
        validation: {
          is_valid: s.validation?.is_valid ?? true,
          method: 'equivalence_check',
          details: s.validation?.details || 'Verified by SymPy',
        },
        hint: s.hint || '',
        is_final_answer: Boolean(s.is_final_answer),
        final_answer_text: s.final_answer_text || '',
        diagram_focus: [],
        diagram_type: 'none',
      }));

      await savePracticeHistory({
        problem_data: problemPayload,
        solution_steps: validSteps,
        practice_summary: {
          steps_attempted: attempts.length,
          hints_used: hintsUsedTotal,
          misconceptions_found: misconceptionsFound,
          completed: isComplete,
        },
        topic: problemTopic,
        grade: grade || 7,
      });

      setHistoryMessage('Saved practice session to backend history (/api/math/history).');
      soundEffects.playSuccessChime();
      if (showHistory) {
        await loadHistory();
      }
    } catch (err) {
      setHistoryMessage(
        err instanceof MathApiError ? err.message : 'Failed to save practice history.'
      );
    } finally {
      setIsSavingHistory(false);
    }
  }, [
    attempts.length,
    grade,
    hintsUsedTotal,
    isComplete,
    loadHistory,
    misconceptionsFound,
    problemLatex,
    problemTopic,
    showHistory,
    solutionSteps,
    umr,
  ]);

  const handleDeleteHistoryItem = useCallback(
    async (id: string) => {
      try {
        await deletePracticeHistoryItem(id);
        setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        setHistoryMessage(
          err instanceof MathApiError ? err.message : 'Failed to delete saved problem.'
        );
      }
    },
    []
  );

  const handleClearHistory = useCallback(async () => {
    try {
      await clearPracticeHistory();
      setHistoryItems([]);
      setHistoryMessage('Cleared saved practice history.');
    } catch (err) {
      setHistoryMessage(
        err instanceof MathApiError ? err.message : 'Failed to clear practice history.'
      );
    }
  }, []);

  const handleSelectPreset = async (preset: PracticeConceptPreset) => {
    setLoadingPresetId(preset.id);
    setActiveConcept({
      conceptId: preset.conceptId,
      conceptTitle: preset.conceptTitle,
      subject: 'Mathematics',
    });
    setCurrentActivity('practice-started');
    try {
      await onLoadPresetProblem(preset.expression);
    } finally {
      setLoadingPresetId(null);
    }
  };

  const stepAttempts = attempts.filter((a) => a.stepIndex === currentStepIdx);

  return (
    <div className="practice-mode" role="region" aria-label="Guided Mathematics Practice Mode" data-testid="practice-mode">
      <div className="practice-header">
        <div>
          <h2>Guided Practice Mode</h2>
          <p className="practice-subtitle">
            Work through each transformation step yourself with server-side SymPy checks,
            progressive hints, and misconception feedback.
          </p>
        </div>

        <div className="practice-header-actions">
          {solutionSteps.length > 0 && (
            <span className="step-indicator" data-testid="practice-step-indicator">
              Step {Math.min(currentStepIdx + 1, solutionSteps.length)} of {solutionSteps.length}
            </span>
          )}
          <button
            type="button"
            className={`skip-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory((prev) => !prev)}
            data-testid="practice-history-toggle"
          >
            {showHistory ? 'Hide History' : 'Practice History'}
          </button>
          {solutionSteps.length > 0 && !isComplete && (
            <button
              type="button"
              className="skip-btn"
              onClick={handleSkipStep}
              disabled={isSubmitting}
              data-testid="practice-skip-btn"
            >
              Skip Step
            </button>
          )}
        </div>
      </div>

      {/* Concept-specific quick practice launcher */}
      <div className="practice-preset-bar" role="group" aria-label="Concept practice problems">
        <span className="practice-preset-label">Concept Practice:</span>
        {CONCEPT_PRACTICE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="practice-preset-btn"
            onClick={() => void handleSelectPreset(preset)}
            disabled={loadingPresetId !== null}
            data-testid={`practice-preset-${preset.id}`}
          >
            {loadingPresetId === preset.id ? 'Loading...' : preset.label}
          </button>
        ))}
      </div>

      {statusNotice && (
        <div
          className={`screen-notice ${statusNotice.tone}`}
          role="alert"
          data-testid="practice-status-notice"
        >
          <span>{statusNotice.message}</span>
          <button
            type="button"
            className="screen-notice-close"
            onClick={() => setStatusNotice(null)}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Practice History Drawer (/api/math/history) */}
      {showHistory && (
        <div className="practice-history-drawer" data-testid="practice-history-drawer">
          <div className="practice-history-header">
            <h4>Saved Practice History (/api/math/history)</h4>
            <div className="practice-history-actions">
              <button
                type="button"
                className="skip-btn"
                onClick={() => void loadHistory()}
                disabled={isLoadingHistory}
              >
                Refresh
              </button>
              {historyItems.length > 0 && (
                <button
                  type="button"
                  className="skip-btn danger"
                  onClick={() => void handleClearHistory()}
                  data-testid="practice-clear-history-btn"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {historyMessage && <p className="practice-history-msg">{historyMessage}</p>}

          {isLoadingHistory ? (
            <p className="practice-history-empty">Loading saved practice history...</p>
          ) : historyItems.length === 0 ? (
            <p className="practice-history-empty">
              No saved practice sessions yet. Complete or save a practice attempt to record it.
            </p>
          ) : (
            <ul className="practice-history-list">
              {historyItems.map((item) => {
                const latex = item.problem_data?.expressions?.[0]?.latex || item.topic;
                return (
                  <li key={item.id} className="practice-history-item" data-testid={`history-item-${item.id}`}>
                    <div>
                      <div
                        className="history-item-math"
                        dangerouslySetInnerHTML={{ __html: renderMathInline(latex) }}
                      />
                      <span className="history-item-meta">
                        Topic: {item.topic} • Attempts: {item.practice_summary?.steps_attempted ?? 0} •
                        Hints: {item.practice_summary?.hints_used ?? 0} •{' '}
                        {item.practice_summary?.completed ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="skip-btn danger"
                      onClick={() => void handleDeleteHistoryItem(item.id)}
                      aria-label={`Delete saved problem ${latex}`}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Main Practice Stage */}
      {solutionSteps.length === 0 ? (
        <div className="practice-empty-state" data-testid="practice-empty-state">
          <p>
            No active problem loaded for practice yet. Choose one of the{' '}
            <strong>Concept Practice</strong> equations above, or draw/type your own problem on the
            Canvas and click <strong>Solve</strong>.
          </p>
          <button type="button" className="control-btn secondary" onClick={onReturnToCanvas}>
            ← Go to Canvas
          </button>
        </div>
      ) : (
        <div className="practice-content">
          {/* Active Problem Card */}
          <div className="step-preview">
            <h4>Target Problem</h4>
            <div
              className="step-math"
              dangerouslySetInnerHTML={{ __html: renderMath(problemLatex || solutionSteps[0].display_math) }}
            />
            {previousStepData && (
              <div className="practice-prev-step">
                <span className="prev-step-label">Previous Step ({previousStepData.step_number}):</span>
                <span
                  dangerouslySetInnerHTML={{ __html: renderMathInline(previousStepData.display_math) }}
                />
              </div>
            )}
          </div>

          {!isComplete && currentStepData ? (
            <div className="attempt-area">
              <div className="current-step">
                <h4>
                  Your Turn — Step {currentStepData.step_number}
                  {currentStepData.operation && (
                    <span className="practice-op-pill">
                      Goal: {currentStepData.operation.replace(/_/g, ' ')}
                    </span>
                  )}
                </h4>
                <p className="step-explanation">
                  Enter the resulting equation or expression after completing Step{' '}
                  {currentStepData.step_number}.
                </p>
              </div>

              <AttemptInput
                onSubmit={(expr) => void handleSubmitAttempt(expr)}
                disabled={isComplete}
                isSubmitting={isSubmitting}
              />

              {/* Feedback for attempts on this step */}
              {stepAttempts.length > 0 && (
                <div className="feedback-area" data-testid="practice-feedback-list">
                  {stepAttempts.map((attempt, idx) => (
                    <FeedbackDisplay
                      key={`${attempt.timestamp}-${idx}`}
                      result={attempt.result}
                      rawInput={attempt.rawInput}
                    />
                  ))}
                </div>
              )}

              {/* Misconception Banner when backend identifies any MC-001..MC-010 */}
              {misconceptionsFound.length > 0 && (
                <MisconceptionBanner misconceptions={misconceptionsFound} />
              )}

              {/* Progressive Hint Ladder */}
              <HintLadder
                currentLevel={hints.length}
                hints={hints}
                isLoadingHint={isLoadingHint}
                hintNotice={hintNotice}
                onRequestHint={() => void handleRequestHint()}
                onShowStep={() => setStepRevealed(true)}
                canRevealStep={hints.length >= 2 || stepAttempts.length >= 1}
                stepRevealed={stepRevealed}
                disabled={isSubmitting}
              />

              {stepRevealed && (
                <div className="revealed-step" data-testid="practice-revealed-step">
                  <h4>Step {currentStepData.step_number} (Revealed)</h4>
                  <div
                    className="step-math"
                    dangerouslySetInnerHTML={{ __html: renderMath(currentStepData.display_math) }}
                  />
                  <p className="step-explanation">{currentStepData.explanation}</p>
                </div>
              )}

              <div className="practice-actions">
                <button
                  type="button"
                  className="restart-btn"
                  onClick={handleRetrySession}
                  data-testid="practice-retry-btn"
                >
                  Retry From Step 1
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={() => void handleSaveToHistory()}
                  disabled={isSavingHistory}
                  data-testid="practice-save-history-btn"
                >
                  {isSavingHistory ? 'Saving...' : 'Save to History'}
                </button>
                <button type="button" className="close-btn" onClick={onOpenFullSolution}>
                  View Full Solution
                </button>
              </div>
              {historyMessage && !showHistory && (
                <p className="practice-history-msg" data-testid="practice-save-feedback">
                  {historyMessage}
                </p>
              )}
            </div>
          ) : (
            <div className="practice-complete" data-testid="practice-complete-card">
              <h3>Practice Session Complete</h3>
              <p>
                Steps attempted: <strong>{attempts.length}</strong> • Hints used:{' '}
                <strong>{hintsUsedTotal}</strong> • Misconceptions flagged:{' '}
                <strong>{misconceptionsFound.length}</strong>
              </p>
              {misconceptionsFound.length > 0 && (
                <MisconceptionBanner misconceptions={misconceptionsFound} />
              )}
              <div className="practice-actions">
                <button
                  type="button"
                  className="save-btn"
                  onClick={() => void handleSaveToHistory()}
                  disabled={isSavingHistory}
                  data-testid="practice-complete-save-btn"
                >
                  {isSavingHistory ? 'Saving...' : 'Save to History'}
                </button>
                <button
                  type="button"
                  className="restart-btn"
                  onClick={handleRetrySession}
                  data-testid="practice-complete-retry-btn"
                >
                  Practice Again
                </button>
                <button type="button" className="close-btn" onClick={onOpenFullSolution}>
                  View Verified Solution
                </button>
              </div>
              {historyMessage && !showHistory && (
                <p className="practice-history-msg" data-testid="practice-save-feedback">
                  {historyMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeMode;

