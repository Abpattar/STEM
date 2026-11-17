import { useEffect, useRef, useMemo, useState } from 'react';
import { renderMath } from '../../utils/katexRender';
import type { DisplayMode, SolutionStep } from '../../types/canvas';
import { ISLSkeletonViewer } from '../Accessibility/ISLSkeletonViewer';

export interface MathDisplayProps {
  steps: SolutionStep[];
  mode: DisplayMode;
  currentStep: number;
  onStepReveal: (stepNumber: number) => void;
  onShowAll: () => void;
  onHint: (stepNumber: number) => void;
  onRestart?: () => void;
  onBackToCanvas?: () => void;
  showISLGestures?: boolean;
  onISLPlaybackStart?: () => void;
  disabled?: boolean;
}

export function MathDisplay({
  steps,
  mode,
  currentStep,
  onStepReveal,
  onShowAll,
  onHint,
  onRestart,
  onBackToCanvas,
  showISLGestures = true,
  onISLPlaybackStart,
  disabled = false,
}: MathDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [revealedGestures, setRevealedGestures] = useState<Set<number>>(new Set());
  const [stepLayers, setStepLayers] = useState<
    Record<number, 'layer_1_state' | 'layer_2_action' | 'layer_3_pedagogy'>
  >({});

  useEffect(() => {
    setRevealedHints(new Set());
    setRevealedGestures(new Set());
  }, [steps]);

  useEffect(() => {
    if (containerRef.current && steps.length > 0) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep, steps.length]);

  const visibleSteps = useMemo(() => {
    return steps.filter((step) => step.step_number <= currentStep);
  }, [steps, currentStep]);

  const isFinalStep = currentStep >= steps.length;

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      onStepReveal(currentStep + 1);
    }
  };

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      onStepReveal(1);
    }
  };

  const handleHintToggle = (stepNumber: number) => {
    setRevealedHints((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
    onHint(stepNumber);
  };

  const handleGestureToggle = (stepNumber: number) => {
    const isOpening = !revealedGestures.has(stepNumber);
    setRevealedGestures((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
    if (isOpening) {
      onISLPlaybackStart?.();
    }
  };

  const handleSetLayer = (
    stepNumber: number,
    layer: 'layer_1_state' | 'layer_2_action' | 'layer_3_pedagogy'
  ) => {
    setStepLayers((prev) => ({ ...prev, [stepNumber]: layer }));
  };

  const getStepLayerData = (
    step: SolutionStep,
    layerKey: 'layer_1_state' | 'layer_2_action' | 'layer_3_pedagogy'
  ) => {
    if (step.step_gestures?.layers?.[layerKey]) {
      return step.step_gestures.layers[layerKey];
    }
    if (layerKey === 'layer_1_state') {
      const tokens = (step.display_math || '')
        .replace(/[\s\\]/g, '')
        .split('')
        .map((ch) => ({
          display: ch,
          sign: ch.toUpperCase(),
          type: 'token',
          description: `Sign token ${ch}`,
          has_3d_template: true,
        }));
      return {
        title: 'Layer 1: Mathematical State',
        description: '3D landmark gestures for mathematical tokens in this step.',
        tokens,
      };
    }
    if (layerKey === 'layer_2_action') {
      return {
        title: 'Layer 2: Transformation Action',
        description: `Operation: ${step.operation || 'simplify'}`,
        spatial_direction: 'Apply balanced transformation symmetrically on both sides.',
        tokens: [
          {
            display: '=',
            sign: 'EQUALS',
            type: 'operator',
            description: 'Action gesture',
            has_3d_template: true,
          },
        ],
      };
    }
    return {
      title: 'Layer 3: Conceptual Pedagogy',
      description: 'Mathematical equivalence principle in ISL.',
      rationale_text: step.explanation,
      tokens: [
        {
          display: '=',
          sign: 'EQUALS',
          type: 'operator',
          description: 'Equivalence',
          has_3d_template: true,
        },
      ],
    };
  };

  if (steps.length === 0) {
    return (
      <div className="math-display empty" role="status" aria-live="polite">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <p>
            No solution yet. Draw on the canvas, speak a math expression, or type an equation below and click{' '}
            <strong>Solve</strong>.
          </p>
          {onBackToCanvas && (
            <button type="button" className="control-btn secondary" onClick={onBackToCanvas}>
              Go to Canvas
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`math-display ${mode}-mode`}
      role="region"
      aria-label="Step-by-step solution"
      aria-live="polite"
    >
      <div className="solution-container">
        {visibleSteps.map((step, index) => (
          <div
            key={step.step_number}
            className={`solution-step ${step.is_final_answer ? 'final-answer' : ''}`}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="step-header">
              <span className="step-number">Step {step.step_number}</span>
              {step.operation && (
                <span className="step-operation-badge">
                  {step.operation.replace(/_/g, ' ')}
                </span>
              )}
              {step.validation && (
                <span
                  className={`step-validation-badge ${step.validation.is_valid ? 'valid' : 'invalid'}`}
                  title={step.validation.details || step.validation.method}
                >
                  {step.validation.is_valid ? '✓ Verified' : '⚠ Unverified'}
                </span>
              )}
              {step.is_final_answer && (
                <span className="final-answer-badge" aria-label="Final answer">
                  Final Answer
                </span>
              )}
            </div>

            <div
              className="step-math"
              dangerouslySetInnerHTML={{ __html: renderMath(step.display_math) }}
            />

            <div className="step-explanation">{step.explanation}</div>

            {(step.hint || showISLGestures) && (
              <div className="step-actions-row">
                {step.hint && (
                  <button
                    type="button"
                    className="step-hint-btn"
                    onClick={() => handleHintToggle(step.step_number)}
                    disabled={disabled}
                    aria-label={`Toggle hint for step ${step.step_number}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="hint-icon"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    <span>{revealedHints.has(step.step_number) ? 'Hide Hint' : 'Show Hint'}</span>
                  </button>
                )}

                {showISLGestures && (
                  <button
                    type="button"
                    className={`step-gesture-btn ${revealedGestures.has(step.step_number) ? 'active' : ''}`}
                    onClick={() => handleGestureToggle(step.step_number)}
                    disabled={disabled}
                    aria-label={`Toggle 3D ISL gestures for step ${step.step_number}`}
                    data-testid={`step-isl-toggle-${step.step_number}`}
                  >
                    <span>
                      🤟 {revealedGestures.has(step.step_number) ? 'Hide ISL Gestures' : 'Step Gestures (3D)'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {step.hint && revealedHints.has(step.step_number) && (
              <div className="step-hint" role="status" aria-live="polite">
                {step.hint}
              </div>
            )}

            {showISLGestures &&
              revealedGestures.has(step.step_number) &&
              (() => {
                const currentLayerKey = stepLayers[step.step_number] || 'layer_1_state';
                const layerData = getStepLayerData(step, currentLayerKey);
                return (
                  <div
                    className="step-gestures-panel"
                    role="region"
                    aria-label={`3D ISL Gestures for Step ${step.step_number}`}
                    data-testid={`step-isl-panel-${step.step_number}`}
                  >
                    <div className="step-gestures-header">
                      <span className="panel-title">
                        🤟 Step {step.step_number} Multi-Layer ISL Gestures
                      </span>
                      <div className="layer-tabs">
                        <button
                          type="button"
                          className={`layer-tab ${currentLayerKey === 'layer_1_state' ? 'active' : ''}`}
                          onClick={() => handleSetLayer(step.step_number, 'layer_1_state')}
                        >
                          1. Equation State
                        </button>
                        <button
                          type="button"
                          className={`layer-tab ${currentLayerKey === 'layer_2_action' ? 'active' : ''}`}
                          onClick={() => handleSetLayer(step.step_number, 'layer_2_action')}
                        >
                          2. Action Sign
                        </button>
                        <button
                          type="button"
                          className={`layer-tab ${currentLayerKey === 'layer_3_pedagogy' ? 'active' : ''}`}
                          onClick={() => handleSetLayer(step.step_number, 'layer_3_pedagogy')}
                        >
                          3. Pedagogy
                        </button>
                      </div>
                    </div>

                    <div className="layer-details-banner">
                      <div className="banner-title">
                        <strong>{layerData.title}:</strong> {layerData.description}
                      </div>
                      {layerData.spatial_direction && (
                        <div className="spatial-direction-note">
                          <strong>Spatial Sign Cue:</strong> {layerData.spatial_direction}
                        </div>
                      )}
                      {layerData.rationale_text && (
                        <div className="pedagogy-rationale-note">
                          <strong>Educational Principle:</strong> {layerData.rationale_text}
                        </div>
                      )}
                    </div>

                    <ISLSkeletonViewer
                      signSequence={layerData.tokens || []}
                      onPlaybackStart={onISLPlaybackStart}
                    />
                  </div>
                );
              })()}

            {step.is_final_answer && step.final_answer_text && (
              <div
                className="final-answer-text"
                role="alert"
                dangerouslySetInnerHTML={{ __html: renderMath(step.final_answer_text) }}
              />
            )}
          </div>
        ))}

        {!isFinalStep && steps.length > 0 && (
          <div className="step-controls">
            <button
              type="button"
              className="control-btn primary"
              onClick={handleNextStep}
              disabled={disabled}
              aria-label="Reveal next step"
            >
              Next Step ({currentStep + 1}/{steps.length})
            </button>
            <button
              type="button"
              className="control-btn secondary"
              onClick={onShowAll}
              disabled={disabled}
              aria-label="Show all steps"
            >
              Show All Steps
            </button>
            {onBackToCanvas && (
              <button
                type="button"
                className="control-btn secondary"
                onClick={onBackToCanvas}
                disabled={disabled}
                aria-label="Back to canvas"
              >
                Canvas
              </button>
            )}
          </div>
        )}

        {isFinalStep && steps.length > 0 && (
          <div className="step-controls">
            <button
              type="button"
              className="control-btn secondary"
              onClick={handleRestart}
              disabled={disabled}
              aria-label="Restart steps from beginning"
            >
              Replay Steps
            </button>
            {onBackToCanvas && (
              <button
                type="button"
                className="control-btn secondary"
                onClick={onBackToCanvas}
                disabled={disabled}
                aria-label="Back to canvas"
              >
                Back to Canvas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

