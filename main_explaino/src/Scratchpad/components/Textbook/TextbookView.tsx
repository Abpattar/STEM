import { useEffect, useMemo, useState } from 'react';
import { renderMath, renderMathInline } from '../../utils/katexRender';
import type { SolutionStep } from '../../types/canvas';
import type { UnifiedMathematicalRepresentation } from '../../types/umr';
import { soundEffects } from '../../utils/soundEffects';
import { useStudentLearning } from '../../../context/StudentLearningContext';

type ChapterKey = 'linear' | 'quadratic' | 'geometry';

interface ChapterDefinition {
  key: ChapterKey;
  conceptId: string;
  number: string;
  shortTitle: string;
  title: string;
  curriculum: string;
  definitionProse: string;
  standardFormLatex: string;
  formulaLatex: string;
  discriminantLatex: string;
  coreLaw: string;
  proofTitle: string;
  proofSteps: Array<{ label: string; latex: string }>;
  outcomes: string[];
  pitfalls: string[];
  selfCheck: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const CHAPTERS: Record<ChapterKey, ChapterDefinition> = {
  linear: {
    key: 'linear',
    conceptId: 'prealg.eq.two_step',
    number: 'Chapter 3',
    shortTitle: 'Linear Equations',
    title: 'Linear Equations & Algebraic Equivalence',
    curriculum: 'Standard Curriculum • Grade 7–8 Foundational Algebra',
    definitionProse:
      'A linear equation of degree 1 in a single variable x expresses a balanced equality whose graph is a straight line:',
    standardFormLatex: 'ax + b = c \\quad (a \\neq 0)',
    formulaLatex: 'x = \\frac{c - b}{a}',
    discriminantLatex: 'a \\neq 0 \\implies \\text{Unique root in } \\mathbb{R}',
    coreLaw:
      'Properties of Equality: If A = B, then A ± C = B ± C and A · C = B · C for all C ≠ 0.',
    proofTitle: 'Formal Derivation of the Linear Root Formula',
    proofSteps: [
      { label: 'Start from standard form', latex: 'ax + b = c' },
      { label: 'Subtract b from both sides (Additive Inverse)', latex: 'ax = c - b' },
      { label: 'Divide both sides by a ≠ 0 (Multiplicative Inverse)', latex: 'x = \\frac{c - b}{a}' },
    ],
    outcomes: [
      'Maintain balanced equality across consecutive algebraic transformations.',
      'Isolate the unknown variable using inverse arithmetic operations.',
      'Substitute solutions into the original equation to verify correctness.',
    ],
    pitfalls: [
      'Unequal Operations: Performing an operation on only one side of the equality sign.',
      'Negative Sign Distribution: Forgetting to reverse signs when multiplying or dividing by negative coefficients.',
    ],
    selfCheck: {
      question: 'In solving 3x + 5 = 20, what is the first inverse operation to isolate 3x?',
      options: ['Divide both sides by 3 first', 'Subtract 5 from both sides', 'Add 5 to both sides'],
      correctIndex: 1,
      explanation: 'Subtracting 5 from both sides eliminates the constant term first, yielding 3x = 15, then dividing by 3 gives x = 5.',
    },
  },
  quadratic: {
    key: 'quadratic',
    conceptId: 'alg.quad.solve_factor',
    number: 'Chapter 4',
    shortTitle: 'Quadratic Equations',
    title: 'Quadratic Equations & Analytic Roots',
    curriculum: 'Standard Curriculum • Grade 9–10 Polynomial Algebra',
    definitionProse:
      'A quadratic equation of degree 2 in the variable x is formally defined by a non-zero leading coefficient a:',
    standardFormLatex: 'ax^2 + bx + c = 0 \\quad (a \\neq 0)',
    formulaLatex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    discriminantLatex: '\\Delta = b^2 - 4ac',
    coreLaw:
      'Square Root & Zero-Product Properties: If X² = k (k ≥ 0) then X = ±√k. If A · B = 0 then A = 0 or B = 0.',
    proofTitle: 'Theorem Derivation by Completing the Square',
    proofSteps: [
      { label: 'Divide by a ≠ 0', latex: 'x^2 + \\frac{b}{a}x + \\frac{c}{a} = 0' },
      { label: 'Complete the square', latex: '\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2}' },
      { label: 'Extract both square root branches', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    ],
    outcomes: [
      'Identify coefficients (a, b, c) in standard quadratic equations.',
      'Factor trinomials and apply the Zero-Product Property to locate roots.',
      'Extract roots accounting for both positive and negative branches (±√k).',
      'Evaluate the discriminant Δ to categorize real vs complex roots.',
    ],
    pitfalls: [
      'Sign Error: Forgetting the negative root when extracting square roots (e.g. x² = 4 gives x = ±2, not just 2).',
      'Variable Division: Dividing through by x, which unintentionally eliminates the root x = 0.',
      'Incomplete Radicals: Forgetting parentheses when substituting negative numbers into (-b) or b².',
    ],
    selfCheck: {
      question: 'When the discriminant Δ = b² - 4ac is strictly negative (Δ < 0), how many real roots exist?',
      options: ['Two distinct real roots', 'One repeated real root', 'Zero real roots (two complex conjugate roots)'],
      correctIndex: 2,
      explanation: 'When Δ < 0, √Δ is imaginary, so the parabola does not intersect the real x-axis.',
    },
  },
  geometry: {
    key: 'geometry',
    conceptId: 'geo.tri.pythagoras',
    number: 'Chapter 6',
    shortTitle: 'Geometry & Mensuration',
    title: 'Geometry & Analytic Mensuration',
    curriculum: 'Standard Curriculum • Grade 8–9 Euclidean Geometry',
    definitionProse:
      'In a right-angled Euclidean triangle with perpendicular legs a, b and hypotenuse c opposite the 90° angle:',
    standardFormLatex: 'a^2 + b^2 = c^2 \\quad \\text{(Pythagorean Theorem)}',
    formulaLatex: 'A = \\frac{1}{2}bh = \\sqrt{s(s-a)(s-b)(s-c)}',
    discriminantLatex: 'P = a + b + c, \\quad s = \\frac{P}{2}',
    coreLaw:
      'Euclidean Triangle Inequality: The sum of any two side lengths must strictly exceed the remaining side (a + b > c).',
    proofTitle: 'Geometric Square-Area Dissection Proof',
    proofSteps: [
      { label: 'Outer square of side (a + b)', latex: '(a + b)^2 = a^2 + 2ab + b^2' },
      { label: 'Area as four right triangles + inner c² square', latex: '4 \\cdot \\left(\\frac{1}{2}ab\\right) + c^2 = 2ab + c^2' },
      { label: 'Subtract 2ab from both equivalent areas', latex: 'a^2 + b^2 = c^2' },
    ],
    outcomes: [
      'Apply the Pythagorean Theorem to find hypotenuse and leg lengths in right triangles.',
      'Calculate 2D surface area and perimeter using standard geometric formulations.',
      'Verify triangle existence conditions via the Triangle Inequality Theorem.',
    ],
    pitfalls: [
      'Hypotenuse Identification: Confusing the hypotenuse (opposite the 90° angle) with either leg.',
      'Unit Consistency: Mixing centimeters and meters without preliminary dimensional conversion.',
    ],
    selfCheck: {
      question: 'A right triangle has legs a = 6 and b = 8. What is the length of hypotenuse c?',
      options: ['10', '14', '48'],
      correctIndex: 0,
      explanation: 'c = √(6² + 8²) = √(36 + 64) = √100 = 10.',
    },
  },
};

const CURATED_EXAMPLES = [
  { label: 'Linear Balance: 2x + 7 = 19', value: '2x + 7 = 19', grade: 'Gr 7', chapter: 'linear' as ChapterKey },
  { label: 'Quadratic Standard: x² - 5x + 6 = 0', value: 'x^2 - 5x + 6 = 0', grade: 'Gr 9', chapter: 'quadratic' as ChapterKey },
  { label: 'Quadratic with Radical: x² + 3 + √15 = 7', value: 'x^2 + 3 + \\sqrt{15} = 7', grade: 'Gr 9', chapter: 'quadratic' as ChapterKey },
  { label: 'Right Triangle: Legs 3 and 4, find c', value: 'right triangle legs 3 and 4, find c', grade: 'Gr 8', chapter: 'geometry' as ChapterKey },
];

function inferChapterFromTopic(topic?: string): ChapterKey {
  const t = (topic || '').toLowerCase();
  if (t.includes('quad')) return 'quadratic';
  if (t.includes('geom') || t.includes('mensuration') || t.includes('triangle') || t.includes('pythag')) {
    return 'geometry';
  }
  return 'linear';
}

export interface TextbookViewProps {
  umr: UnifiedMathematicalRepresentation | null;
  steps: SolutionStep[];
  onSolveProblem: (expr: string) => void;
  onSwitchToNotebook: () => void;
  isLoading: boolean;
}

export function TextbookView({
  umr,
  steps,
  onSolveProblem,
  onSwitchToNotebook,
  isLoading,
}: TextbookViewProps) {
  const { setActiveConcept, setCurrentActivity } = useStudentLearning();

  const inferredChapter = inferChapterFromTopic(umr?.understanding?.topic);
  const [selectedChapter, setSelectedChapter] = useState<ChapterKey>(inferredChapter);
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [selfCheckAnswer, setSelfCheckAnswer] = useState<number | null>(null);

  // Auto-align chapter when a newly solved problem changes topic
  useEffect(() => {
    if (umr?.understanding?.topic) {
      setSelectedChapter(inferChapterFromTopic(umr.understanding.topic));
      setSelfCheckAnswer(null);
    }
  }, [umr?.problem_id, umr?.understanding?.topic]);

  const chapterInfo = useMemo(() => CHAPTERS[selectedChapter], [selectedChapter]);

  // Sync textbook chapter exploration into StudentLearningContext
  useEffect(() => {
    setActiveConcept({
      conceptId: chapterInfo.conceptId,
      conceptTitle: chapterInfo.title,
      subject: 'Mathematics',
    });
    setCurrentActivity('textbook-reading');
  }, [chapterInfo.conceptId, chapterInfo.title, setActiveConcept, setCurrentActivity]);

  const handleSelectChapter = (key: ChapterKey) => {
    setSelectedChapter(key);
    setSelfCheckAnswer(null);
    soundEffects.playClick(500, 0.04);
  };

  const handleExampleSelect = (val: string, chapter: ChapterKey) => {
    setSelectedExample(val);
    setSelectedChapter(chapter);
    soundEffects.playClick(600, 0.06);
    onSolveProblem(val);
  };

  return (
    <div className="textbook-view" role="region" aria-label="Academic Textbook Chapter View" data-testid="textbook-view">
      {/* Chapter Navigation Bar */}
      <div className="textbook-chapter-nav" role="tablist" aria-label="Textbook chapters">
        {(Object.values(CHAPTERS) as ChapterDefinition[]).map((ch) => (
          <button
            key={ch.key}
            type="button"
            role="tab"
            aria-selected={selectedChapter === ch.key}
            className={`textbook-chapter-nav-btn ${selectedChapter === ch.key ? 'active' : ''}`}
            onClick={() => handleSelectChapter(ch.key)}
            data-testid={`textbook-chapter-${ch.key}`}
          >
            <span className="chapter-nav-num">{ch.number}</span>
            <span className="chapter-nav-title">{ch.shortTitle}</span>
          </button>
        ))}

        <button
          type="button"
          className="textbook-back-notebook-pill"
          onClick={onSwitchToNotebook}
          data-testid="textbook-return-notebook-top"
        >
          ← Return to Notebook (Work Preserved)
        </button>
      </div>

      {/* Chapter Academic Header */}
      <header className="textbook-header">
        <div className="textbook-badge-row">
          <span className="textbook-chapter-badge">{chapterInfo.number}</span>
          <span className="textbook-curriculum-badge">{chapterInfo.curriculum}</span>
        </div>
        <h2 className="textbook-chapter-title" data-testid="textbook-chapter-title">
          {chapterInfo.title}
        </h2>

        <div className="textbook-outcomes">
          <div className="textbook-outcomes-title">Syllabus Learning Competencies</div>
          <ul className="textbook-outcomes-list">
            {chapterInfo.outcomes.map((item, idx) => (
              <li key={idx} className="textbook-outcome-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Main Textbook Dual-Pane Academic Grid */}
      <div className="textbook-grid">
        {/* Left Column: Academic Theory, Axioms, Proof & Curated Examples */}
        <div className="textbook-theory-col">
          {/* Card 1: Formal Definition & Standard Form */}
          <div className="textbook-card theorem-card">
            <div className="textbook-card-header">
              <span className="textbook-card-icon" aria-hidden="true">
                📘
              </span>
              <h3 className="textbook-card-title">Definition &amp; Standard Form</h3>
            </div>
            <div className="textbook-card-body">
              <p className="textbook-prose">{chapterInfo.definitionProse}</p>
              <div
                className="textbook-math-block"
                dangerouslySetInnerHTML={{ __html: renderMath(chapterInfo.standardFormLatex) }}
              />
              <div className="textbook-sub-theory">
                <span className="textbook-label">Analytic Formula:</span>
                <div
                  className="textbook-math-block sub"
                  dangerouslySetInnerHTML={{ __html: renderMath(chapterInfo.formulaLatex) }}
                />
              </div>
              <div className="textbook-sub-theory">
                <span className="textbook-label">Key Invariant:</span>
                <div
                  className="textbook-math-block"
                  dangerouslySetInnerHTML={{ __html: renderMath(chapterInfo.discriminantLatex) }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Axiomatic Law & Formal Proof */}
          <div className="textbook-card law-card">
            <div className="textbook-card-header">
              <span className="textbook-card-icon" aria-hidden="true">
                ⚖️
              </span>
              <h3 className="textbook-card-title">Fundamental Axioms &amp; Formal Proof</h3>
            </div>
            <div className="textbook-card-body">
              <p className="textbook-law-text">{chapterInfo.coreLaw}</p>
              <div className="textbook-axiom-box">
                <strong>{chapterInfo.proofTitle}:</strong>
                <ol className="textbook-proof-steps">
                  {chapterInfo.proofSteps.map((ps, idx) => (
                    <li key={idx}>
                      <span className="proof-step-label">{ps.label}:</span>
                      <div
                        className="proof-step-math"
                        dangerouslySetInnerHTML={{ __html: renderMathInline(ps.latex) }}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Card 3: Common Pitfalls */}
          <div className="textbook-card warning-card">
            <div className="textbook-card-header">
              <span className="textbook-card-icon" aria-hidden="true">
                ⚠️
              </span>
              <h3 className="textbook-card-title">Common Student Misconceptions</h3>
            </div>
            <div className="textbook-card-body">
              <ul className="textbook-pitfalls-list">
                {chapterInfo.pitfalls.map((p, idx) => (
                  <li key={idx} className="textbook-pitfall-item">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Curated Textbook Problems */}
          <div className="textbook-card examples-picker-card">
            <div className="textbook-card-header">
              <span className="textbook-card-icon" aria-hidden="true">
                📚
              </span>
              <h3 className="textbook-card-title">Curated Chapter Examples</h3>
            </div>
            <div className="textbook-card-body">
              <div className="curated-examples-list">
                {CURATED_EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`curated-example-btn ${selectedExample === ex.value ? 'selected' : ''}`}
                    onClick={() => handleExampleSelect(ex.value, ex.chapter)}
                    disabled={isLoading}
                    data-testid={`textbook-example-${idx}`}
                  >
                    <span className="curated-badge">{ex.grade}</span>
                    <span className="curated-text">{ex.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Worked Example Derivation + Self-Check */}
        <div className="textbook-derivation-col">
          <div className="textbook-card worked-example-card">
            <div className="worked-example-header">
              <div className="worked-example-tag">WORKED EXAMPLE</div>
              <h3 className="worked-example-heading">Rigorous Step-by-Step Derivation</h3>
            </div>

            <div className="problem-statement-box">
              <span className="problem-label">Active Problem Statement:</span>
              <p className="problem-statement-text">
                {umr?.input?.recognized_latex
                  ? 'Derive the verified solution for your current workspace expression:'
                  : 'Select any curated example on the left or solve an equation in Notebook mode to inspect its derivation here.'}
              </p>
              {umr?.input?.recognized_latex && (
                <div
                  className="problem-statement-equation"
                  data-testid="textbook-active-equation"
                  dangerouslySetInnerHTML={{
                    __html: renderMath(umr.input.recognized_latex),
                  }}
                />
              )}
            </div>

            {steps.length > 0 ? (
              <div className="derivation-table-container">
                <table className="derivation-table" data-testid="textbook-derivation-table">
                  <thead>
                    <tr>
                      <th style={{ width: '14%' }}>Step</th>
                      <th style={{ width: '43%' }}>Mathematical Transformation</th>
                      <th style={{ width: '43%' }}>Axiomatic Justification &amp; Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s, idx) => (
                      <tr
                        key={idx}
                        className={`derivation-row ${s.is_final_answer ? 'final-row' : ''}`}
                      >
                        <td className="step-num-cell">
                          <span className="step-badge">Step {s.step_number}</span>
                        </td>
                        <td className="step-math-cell">
                          <div
                            className="step-katex"
                            dangerouslySetInnerHTML={{ __html: renderMath(s.display_math) }}
                          />
                        </td>
                        <td className="step-reason-cell">
                          <div className="step-operation-name">
                            <strong>{(s.operation || 'step').replace(/_/g, ' ').toUpperCase()}</strong>
                          </div>
                          <div className="step-explanation-text">
                            {s.explanation || 'Apply inverse algebraic operation to maintain equivalence.'}
                          </div>
                          {s.hint && (
                            <div className="step-hint-badge">
                              <em>{s.hint}</em>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-derivation" data-testid="textbook-empty-derivation">
                <p>No solved problem currently loaded in the workspace.</p>
                <button
                  type="button"
                  className="start-example-btn"
                  onClick={() => handleExampleSelect('x^2 - 5x + 6 = 0', 'quadratic')}
                  disabled={isLoading}
                  data-testid="textbook-load-default-example"
                >
                  {isLoading ? 'Solving...' : 'Load Standard Chapter Example (x² - 5x + 6 = 0)'}
                </button>
              </div>
            )}

            {umr?.solution?.final_answer_text && (
              <div className="final-conclusion-card" data-testid="textbook-final-conclusion">
                <div className="conclusion-title">
                  <span className="check-icon">✓</span>
                  <strong>Final Analytical Solution:</strong>
                </div>
                <div
                  className="conclusion-math"
                  dangerouslySetInnerHTML={{ __html: renderMath(umr.solution.final_answer_text) }}
                />
                <div className="conclusion-note">
                  {umr.solution.verified
                    ? 'Algebraically verified by the backend SymPy CAS solver.'
                    : 'Derived by the backend solver; verify boundary conditions manually.'}
                </div>
              </div>
            )}

            {/* Chapter Self-Check Question */}
            <div className="verification-card" data-testid="textbook-self-check">
              <div className="verification-header">
                <span className="verification-icon" aria-hidden="true">
                  🔍
                </span>
                <strong>Chapter Concept Self-Check:</strong>
              </div>
              <div className="verification-body">
                <p className="self-check-question">{chapterInfo.selfCheck.question}</p>
                <div className="self-check-options">
                  {chapterInfo.selfCheck.options.map((opt, idx) => {
                    const isPicked = selfCheckAnswer === idx;
                    const isRight = idx === chapterInfo.selfCheck.correctIndex;
                    const stateClass =
                      selfCheckAnswer === null
                        ? ''
                        : isPicked
                          ? isRight
                            ? 'correct'
                            : 'incorrect'
                          : isRight
                            ? 'correct-hint'
                            : '';
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`self-check-option-btn ${stateClass}`}
                        onClick={() => {
                          setSelfCheckAnswer(idx);
                          if (isRight) {
                            soundEffects.playSuccessChime();
                          } else {
                            soundEffects.playClick(320, 0.08);
                          }
                        }}
                        data-testid={`self-check-option-${idx}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {selfCheckAnswer !== null && (
                  <p className="self-check-explanation" role="status" data-testid="self-check-feedback">
                    <strong>
                      {selfCheckAnswer === chapterInfo.selfCheck.correctIndex
                        ? '✓ Correct! '
                        : 'Not quite. '}
                    </strong>
                    {chapterInfo.selfCheck.explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Honest Accessibility Readout Strip */}
            {umr?.accessibility && (
              <div className="textbook-accessibility-strip">
                {umr.accessibility.speech?.expression_speech && (
                  <div className="acc-item">
                    <span className="acc-label">
                      Spoken Math Readout (ClearSpeak-style heuristic):
                    </span>
                    <span className="acc-val">"{umr.accessibility.speech.expression_speech}"</span>
                  </div>
                )}
                {umr.accessibility.braille?.expression_braille && (
                  <div className="acc-item">
                    <span className="acc-label">
                      {umr.accessibility.braille.standard.toUpperCase()} Braille (Rule-based Converter):
                    </span>
                    <span className="acc-val braille">
                      {umr.accessibility.braille.expression_braille}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="textbook-footer-actions">
              <button
                type="button"
                className="switch-notebook-btn"
                onClick={onSwitchToNotebook}
                data-testid="textbook-switch-notebook-btn"
              >
                ← Return to Interactive Notebook Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

