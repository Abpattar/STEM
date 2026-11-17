import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { AttemptInput } from './AttemptInput';
import { FeedbackDisplay } from './FeedbackDisplay';
import { HintLadder } from './HintLadder';
import { MisconceptionBanner } from './MisconceptionBanner';
import '../styles/globals.css';
import '../styles/practice.css';

interface PracticeModeProps {
  problem: any;
  solutionSteps: any[];
  grade: number;
  onSave?: (problem: any, steps: any[], summary: any) => void;
  onClose?: () => void;
}

export function PracticeMode({ problem, solutionSteps, grade, onSave, onClose }: PracticeModeProps) {
  const { post } = useApi();
  const [session, setSession] = useState<{
    currentStep: number;
    attempts: any[];
    hintsUsed: number;
    misconceptionsFound: string[];
    isComplete: boolean;
  }>({
    currentStep: 0,
    attempts: [],
    hintsUsed: 0,
    misconceptionsFound: [],
    isComplete: false
  });
  const [hintLevel, setHintLevel] = useState(1);
  const [showStep, setShowStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentStepData = solutionSteps[session.currentStep];
  const isLastStep = session.currentStep >= solutionSteps.length - 1;

  const handleAttempt = useCallback(async (attemptAst: any) => {
    setLoading(true);
    try {
      const response = await post<{ result: any; next_hint?: string }>('/api/practice/attempt', {
        problem: {
          expressions: [{
            ast_json: currentStepData.equation_ast,
            latex: currentStepData.display_math
          }],
          unknowns: [],
          given_values: {},
          constraints: [],
          requested_operation: 'solve',
          topic: 'linear_equations',
          units: {},
          grade_hint: 7,
          source: 'typed'
        },
        attempt_ast: attemptAst,
        current_step: session.currentStep,
        grade: grade || 7
      });
      
      const result = response.result;
      const updatedAttempts = [...session.attempts, {
        step: session.currentStep,
        attempt: attemptAst,
        result,
        timestamp: new Date().toISOString()
      }];
      
      setSession(prev => ({
        ...prev,
        attempts: updatedAttempts,
        hintsUsed: result.hint_level > 1 ? prev.hintsUsed + 1 : prev.hintsUsed,
        misconceptionsFound: result.misconception_id ? [...prev.misconceptionsFound, result.misconception_id] : prev.misconceptionsFound
      }));
      
      setHintLevel(1);
      setShowStep(false);
      
      if (result.classification === 'correct_expected' || result.classification === 'correct_alternate') {
        const nextStep = session.currentStep + 1;
        if (nextStep >= solutionSteps.length) {
          setSession(prev => ({ ...prev, isComplete: true }));
        } else {
          setSession(prev => ({ ...prev, currentStep: nextStep }));
        }
      }
    } catch (error) {
      console.error('Practice attempt failed:', error);
    } finally {
      setLoading(false);
    }
  }, [session.currentStep, session.attempts]);

  const handleHint = useCallback(() => {
    if (hintLevel < 4) {
      setHintLevel(prev => prev + 1);
    }
  }, [hintLevel]);

  const handleShowStep = useCallback(() => {
    setShowStep(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (onSave) {
      const summary = {
        steps_attempted: session.attempts.length,
        hints_used: session.hintsUsed,
        misconceptions_found: session.misconceptionsFound,
        completed: session.isComplete
      };
      await onSave(problem, solutionSteps, summary);
    }
  }, [problem, solutionSteps, session, onSave]);

  const handleSkip = useCallback(() => {
    if (isLastStep) {
      setSession(prev => ({ ...prev, isComplete: true }));
    } else {
      setSession(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
    setHintLevel(1);
    setShowStep(false);
  }, [isLastStep]);

  return (
    <div className="practice-mode">
      <div className="practice-header">
        <h2>Practice Mode</h2>
        <div className="step-indicator">
          Step {session.currentStep + 1} of {solutionSteps.length}
        </div>
        <button className="skip-btn" onClick={handleSkip} disabled={loading}>
          Skip Practice
        </button>
      </div>

      <div className="practice-content">
        <div className="previous-step">
          {session.currentStep > 0 && (
            <div className="step-preview">
              <h4>Previous Step</h4>
              <div className="step-math" dangerouslySetInnerHTML={{ __html: solutionSteps[session.currentStep - 1].display_math }} />
            </div>
          )}
        </div>

        <div className="attempt-area">
          <div className="current-step">
            <h4>Current Step</h4>
            <div className="step-math" dangerouslySetInnerHTML={{ __html: currentStepData.display_math }} />
            <p className="step-explanation">{currentStepData.explanation}</p>
          </div>

          <AttemptInput
            onSubmit={handleAttempt}
            disabled={loading || showStep || session.isComplete}
            placeholder="Enter your next step..."
          />

          <div className="feedback-area">
            {session.attempts.length > 0 && session.attempts.map((attempt, idx) => (
              <FeedbackDisplay key={idx} result={attempt.result} />
            ))}
          </div>

          <HintLadder
            currentLevel={hintLevel}
            onNext={handleHint}
            onShowStep={handleShowStep}
            disabled={loading}
          />

          {showStep && (
            <div className="revealed-step">
              <h4>Step {session.currentStep + 1} (Revealed)</h4>
              <div className="step-math" dangerouslySetInnerHTML={{ __html: currentStepData.display_math }} />
              <p className="step-explanation">{currentStepData.explanation}</p>
            </div>
          )}

          {session.misconceptionsFound.length > 0 && (
            <MisconceptionBanner misconceptions={session.misconceptionsFound} />
          )}
        </div>

        {!session.isComplete && !loading && (
          <div className="practice-actions">
            <button className="save-btn" onClick={handleSave}>
              Save to History
            </button>
          </div>
        )}

        {session.isComplete && (
          <div className="practice-complete">
            <h3>Practice Complete!</h3>
            <p>You've completed all steps.</p>
            <button className="save-btn" onClick={handleSave}>
              Save to History
            </button>
            <button className="close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PracticeMode;