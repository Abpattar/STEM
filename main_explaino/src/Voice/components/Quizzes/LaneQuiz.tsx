import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, ClipboardCheck } from 'lucide-react';
import { TUTOR_API_ENDPOINTS } from '../../../services/api/tutorApi';
import type { LearningLane, QuizPublicQuestion } from '../../types/exo';

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  points: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    correctIndex: number;
    explanation: string;
  }>;
  best: { passed: boolean; score: number; attempts: number };
}

interface LaneQuizProps {
  conceptId: string;
  lane: LearningLane;
  sessionId: string;
  learningFocus?: string;
  onResult?: (passed: boolean) => void;
}

export const LaneQuiz: React.FC<LaneQuizProps> = ({
  conceptId,
  lane,
  sessionId,
  learningFocus,
  onResult,
}) => {
  const [questions, setQuestions] = useState<QuizPublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [best, setBest] = useState<{
    passed: boolean;
    score: number;
    attempts: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const endpoint =
      TUTOR_API_ENDPOINTS.learningQuiz() +
      '?conceptId=' +
      encodeURIComponent(conceptId) +
      '&lane=' +
      lane +
      '&sessionId=' +
      encodeURIComponent(sessionId || 'none') +
      '&focus=' +
      encodeURIComponent(learningFocus || '');

    const load = async (attempt: number) => {
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error || 'Quiz service unavailable');
        if (
          !Array.isArray(payload.questions) ||
          payload.questions.length !== 3 ||
          payload.questions.some(
            (q: QuizPublicQuestion) =>
              !Array.isArray(q.options) || q.options.length !== 3
          )
        ) {
          throw Error('Incomplete quiz questions');
        }
        if (!live) return;
        setQuestions(payload.questions);
        setBest(payload.best || null);
        setResult(null);
        setAnswers({});
        setError('');
        setLoading(false);
      } catch (e) {
        if (!live || controller.signal.aborted) return;
        if (attempt < 1) {
          retryTimer = setTimeout(() => load(attempt + 1), 650);
          return;
        }
        setError(
          (e instanceof Error ? e.message : 'Connection failed') +
            '. Retry the quiz below.'
        );
        setLoading(false);
      }
    };

    setLoading(true);
    setError('');
    setQuestions([]);
    void load(0);

    return () => {
      live = false;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [conceptId, lane, sessionId, learningFocus, reload]);

  async function submit() {
    if (busy || !sessionId || questions.some((q) => answers[q.id] === undefined))
      return;
    setBusy(true);
    setError('');
    try {
      const resp = await fetch(TUTOR_API_ENDPOINTS.learningQuiz(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          lane,
          sessionId,
          focus: learningFocus || '',
          answers: questions.map((q) => answers[q.id]),
        }),
      });
      if (!resp.ok) {
        const failure = await resp
          .json()
          .catch(() => ({ error: 'Unable to grade quiz' }));
        throw Error(failure.error || 'Unable to grade quiz');
      }
      const body = (await resp.json()) as QuizResult;
      setResult(body);
      setBest(body.best);
      onResult?.(body.best.passed);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Answers could not be saved. Check your connection and retry.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lane-quiz" data-testid={'quiz-' + lane}>
      <div className="lane-quiz-heading">
        <h3>
          <ClipboardCheck size={18} /> Practice challenge
        </h3>
        <span>
          {best?.passed
            ? 'Passed · best ' + best.score + '/3'
            : '3 checks · pass with 2 correct'}
        </span>
      </div>
      {questions.map((q, i) => (
        <fieldset
          key={q.id}
          className="lane-question-item"
          disabled={Boolean(result) || busy}
        >
          <legend>
            {i + 1}. {q.prompt}
          </legend>
          {q.options.map((o, j) => (
            <label
              key={j}
              className={answers[q.id] === j ? 'chosen' : ''}
            >
              <input
                type="radio"
                name={q.id}
                checked={answers[q.id] === j}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
              />
              <span>{o}</span>
            </label>
          ))}
          {result && (
            <p
              className={
                result.results[i].correct ? 'quiz-correct' : 'quiz-review'
              }
            >
              {result.results[i].correct ? 'Correct. ' : 'Review this: '}
              {result.results[i].explanation}
            </p>
          )}
        </fieldset>
      ))}
      {loading && <p role="status">Preparing your topic quiz…</p>}
      {error && (
        <div role="alert" className="room-error">
          <p>{error}</p>
          {!questions.length && (
            <button
              type="button"
              data-testid="quiz-retry"
              onClick={() => setReload((n) => n + 1)}
            >
              <RotateCcw size={14} /> Retry quiz
            </button>
          )}
        </div>
      )}
      {result ? (
        <div className="quiz-final" role="status" data-testid="quiz-result-summary">
          <b>
            {result.score}/{result.total} correct · {result.points} points
          </b>
          <span>
            {result.passed
              ? 'Pathway quiz passed. Review this topic again to strengthen recall.'
              : 'Review the explanations and try again. A wrong answer is a learning opportunity.'}
          </span>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setResult(null);
            }}
          >
            <RotateCcw size={14} /> Try again
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="lane-quiz-submit"
          data-testid="quiz-submit-btn"
          disabled={
            !sessionId ||
            busy ||
            loading ||
            questions.length !== 3 ||
            questions.some((q) => answers[q.id] === undefined)
          }
          onClick={submit}
        >
          Check answers <CheckCircle2 size={16} />
        </button>
      )}
      <p className="lane-footnote">
        Questions are built from curated concept facts and scored on the server. The
        best result is saved; scores do not prove full mastery.
      </p>
    </div>
  );
};

