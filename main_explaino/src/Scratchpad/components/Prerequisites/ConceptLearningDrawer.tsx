import React, { useState, useEffect, useMemo } from 'react';
import type { PrerequisiteConcept } from '../../types/umr';
import {
  submitLearningReview,
  MathApiError,
  type FSRSConceptState,
} from '../../services/mathService';
import { useStudentLearning } from '../../../context/StudentLearningContext';
import { soundEffects } from '../../utils/soundEffects';

/**
 * Canonical concept catalog mirrored from scratchpad_notebook/backend/src/orchestrator/adapters/mathua_adapter.py.
 * Used as an interactive prerequisite dependency explorer when no problem is currently solved yet,
 * and for enriching prerequisite descriptions returned by the backend.
 */
interface ConceptChainCatalogEntry {
  primaryId: string;
  primaryLabel: string;
  domain: string;
  prerequisites: PrerequisiteConcept[];
}

const CANONICAL_CHAINS: ConceptChainCatalogEntry[] = [
  {
    primaryId: 'alg.quad.solve_factor',
    primaryLabel: 'Quadratic Equations & Factorisation',
    domain: 'algebra',
    prerequisites: [
      {
        id: 'prealg.expr.variables',
        label: 'Variables and Coefficients',
        domain: 'prealgebra',
        description:
          'Understanding letters that represent unknown numbers (e.g., x) and the numbers multiplied by them (e.g., 5 in 5x).',
        mastered: false,
      },
      {
        id: 'alg.poly.foil',
        label: 'Multiplying Binomials (FOIL)',
        domain: 'algebra',
        description:
          'Multiplying two binomial expressions: First, Outer, Inner, Last (e.g. (x+2)(x+3) = x² + 5x + 6).',
        mastered: false,
      },
      {
        id: 'alg.factor.trinomial',
        label: 'Factoring Quadratic Trinomials',
        domain: 'algebra',
        description:
          "Finding two numbers that multiply to the constant term 'c' and add up to the linear coefficient 'b'.",
        mastered: false,
      },
      {
        id: 'alg.quad.zero_product',
        label: 'Zero-Product Property',
        domain: 'algebra',
        description:
          'If the product of two factors is zero (A · B = 0), then at least one factor must be zero (A = 0 or B = 0).',
        mastered: false,
      },
      {
        id: 'prealg.eq.two_step',
        label: 'Solving Linear Equations',
        domain: 'prealgebra',
        description:
          'Using inverse operations to isolate a variable on one side of an equation.',
        mastered: false,
      },
    ],
  },
  {
    primaryId: 'prealg.eq.two_step',
    primaryLabel: 'Solving Two-Step Linear Equations',
    domain: 'prealgebra',
    prerequisites: [
      {
        id: 'prealg.expr.variables',
        label: 'Variables and Coefficients',
        domain: 'prealgebra',
        description:
          'Understanding letters that represent unknown numbers (e.g., x) and the numbers multiplied by them.',
        mastered: false,
      },
      {
        id: 'prealg.eq.one_step',
        label: 'One-Step Inverse Operations',
        domain: 'prealgebra',
        description:
          'Adding, subtracting, multiplying, or dividing on both sides to balance the equation.',
        mastered: false,
      },
    ],
  },
  {
    primaryId: 'alg.sys.sub',
    primaryLabel: 'Systems of Linear Equations (Substitution)',
    domain: 'algebra',
    prerequisites: [
      {
        id: 'prealg.expr.variables',
        label: 'Variables and Coefficients',
        domain: 'prealgebra',
        description:
          'Understanding letters that represent unknown numbers and their coefficients.',
        mastered: false,
      },
      {
        id: 'prealg.eq.two_step',
        label: 'Solving Linear Equations',
        domain: 'prealgebra',
        description:
          'Using inverse operations to isolate a variable on one side of an equation.',
        mastered: false,
      },
    ],
  },
];

export interface ConceptLearningDrawerProps {
  prerequisites: PrerequisiteConcept[];
  primaryConceptId?: string;
  problemLatex?: string;
  onReturnToSolution?: () => void;
  onReturnToCanvas?: () => void;
  onStartPractice?: () => void;
  isActive?: boolean;
}

export const ConceptLearningDrawer: React.FC<ConceptLearningDrawerProps> = ({
  prerequisites,
  primaryConceptId,
  problemLatex,
  onReturnToSolution,
  onReturnToCanvas,
  onStartPractice,
  isActive = true,
}) => {
  const { setActiveConcept, setCurrentActivity } = useStudentLearning();

  const hasSolvedPrereqs = prerequisites && prerequisites.length > 0;
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(CANONICAL_CHAINS[0].primaryId);

  const activeChain = useMemo(() => {
    if (hasSolvedPrereqs) {
      return {
        source: 'solved-problem' as const,
        primaryId: primaryConceptId || 'prealg.eq.two_step',
        primaryLabel: problemLatex
          ? `Current Problem (${problemLatex})`
          : primaryConceptId || 'Current Mathematical Concept',
        items: prerequisites,
      };
    }
    const found =
      CANONICAL_CHAINS.find((c) => c.primaryId === selectedCatalogId) || CANONICAL_CHAINS[0];
    return {
      source: 'catalog-explorer' as const,
      primaryId: found.primaryId,
      primaryLabel: found.primaryLabel,
      items: found.prerequisites,
    };
  }, [hasSolvedPrereqs, prerequisites, primaryConceptId, problemLatex, selectedCatalogId]);

  const [expandedId, setExpandedId] = useState<string | null>(
    activeChain.items.length > 0 ? activeChain.items[0].id : null
  );
  const [exploredIds, setExploredIds] = useState<Set<string>>(new Set());
  const [fsrsStates, setFsrsStates] = useState<Record<string, FSRSConceptState>>({});
  const [loadingConcept, setLoadingConcept] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Reset expanded card when the prerequisite chain changes
  useEffect(() => {
    if (activeChain.items.length > 0) {
      setExpandedId((prev) =>
        prev && activeChain.items.some((item) => item.id === prev)
          ? prev
          : activeChain.items[0].id
      );
    } else {
      setExpandedId(null);
    }
  }, [activeChain.items]);

  // Register prerequisite view in shared StudentLearningContext without falsely claiming mastery
  useEffect(() => {
    if (!isActive) return;
    const selectedConcept = activeChain.items.find((c) => c.id === expandedId);
    setActiveConcept({
      conceptId: selectedConcept ? selectedConcept.id : activeChain.primaryId,
      conceptTitle: selectedConcept ? selectedConcept.label : activeChain.primaryLabel,
      subject: 'Mathematics',
    });
    setCurrentActivity(selectedConcept ? 'exploring-prerequisite' : 'prerequisite-graph');
  }, [isActive, expandedId, activeChain, setActiveConcept, setCurrentActivity]);

  const handleSelectConceptNode = (concept: PrerequisiteConcept) => {
    const nextId = expandedId === concept.id ? null : concept.id;
    setExpandedId(nextId);
    // Track exploration separately from mastery — opening a prerequisite NEVER marks it mastered
    setExploredIds((prev) => {
      const next = new Set(prev);
      next.add(concept.id);
      return next;
    });
    setActiveConcept({
      conceptId: concept.id,
      conceptTitle: concept.label,
      subject: 'Mathematics',
    });
    setCurrentActivity('exploring-prerequisite');
    soundEffects.playClick(460, 0.04);
  };

  const handlePracticeConcept = async (concept: PrerequisiteConcept, isCorrect: boolean) => {
    setLoadingConcept(concept.id);
    setReviewError(null);
    soundEffects.playClick(520, 0.05);

    try {
      const currentState = fsrsStates[concept.id];
      const data = await submitLearningReview({
        concept_id: concept.id,
        is_correct: isCorrect,
        elapsed_days: 1.0,
        current_state: currentState,
      });

      setFsrsStates((prev) => ({
        ...prev,
        [concept.id]: data,
      }));
      setActiveConcept({
        conceptId: concept.id,
        conceptTitle: concept.label,
        subject: 'Mathematics',
      });
      setCurrentActivity(isCorrect ? 'prerequisite-review-good' : 'prerequisite-review-again');

      if (isCorrect) {
        soundEffects.playSuccessChime();
      } else {
        soundEffects.playClick(300, 0.1);
      }
    } catch (err) {
      if (err instanceof MathApiError) {
        setReviewError(err.message);
      } else {
        setReviewError('Failed to update FSRS-6 spaced repetition review.');
      }
    } finally {
      setLoadingConcept(null);
    }
  };

  const reviewedMasteredCount = activeChain.items.filter(
    (c) => fsrsStates[c.id]?.status === 'mastered'
  ).length;

  return (
    <div
      className="concept-learning-drawer"
      role="region"
      aria-label="Prerequisite Concepts & Dependency Graph"
      data-testid="concept-learning-drawer"
    >
      <div className="drawer-header">
        <div className="header-title-row">
          <span className="badge-icon" aria-hidden="true">
            🧭
          </span>
          <div style={{ flex: 1 }}>
            <h4 className="drawer-title">
              Concept Dependency Graph &amp; Prerequisites{' '}
              {activeChain.primaryId ? `(${activeChain.primaryId})` : ''}
            </h4>
            <p className="drawer-subtitle">
              {activeChain.source === 'solved-problem'
                ? 'Explore the foundational concepts required for your current problem. Opening a concept only explores it; use FSRS-6 review buttons to log recall checks.'
                : 'No equation solved yet — browse canonical Mathua prerequisite chains below or solve an equation on the Canvas to load its exact dependencies.'}
            </p>
          </div>
        </div>

        {/* Topic explorer switcher when no problem is solved */}
        {activeChain.source === 'catalog-explorer' && (
          <div className="prereq-catalog-switcher" role="group" aria-label="Browse concept chains">
            {CANONICAL_CHAINS.map((chain) => (
              <button
                key={chain.primaryId}
                type="button"
                className={`prereq-catalog-btn ${selectedCatalogId === chain.primaryId ? 'active' : ''}`}
                onClick={() => setSelectedCatalogId(chain.primaryId)}
                data-testid={`prereq-chain-${chain.primaryId}`}
              >
                {chain.primaryLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Dependency Graph Strip */}
      <div className="concept-dag-strip" role="navigation" aria-label="Concept dependency chain">
        {activeChain.items.map((concept, idx) => {
          const fsrs = fsrsStates[concept.id];
          const isSelected = expandedId === concept.id;
          const isExplored = exploredIds.has(concept.id);
          const statusClass = fsrs
            ? `status-${fsrs.status}`
            : isExplored
              ? 'status-explored'
              : 'status-unreviewed';

          return (
            <React.Fragment key={concept.id}>
              <button
                type="button"
                className={`dag-node-btn ${isSelected ? 'selected' : ''} ${statusClass}`}
                onClick={() => handleSelectConceptNode(concept)}
                data-testid={`dag-node-${concept.id}`}
                aria-current={isSelected ? 'step' : undefined}
              >
                <span className="dag-node-order">{idx + 1}</span>
                <span className="dag-node-label">{concept.label}</span>
                <span className="dag-node-meta">
                  {fsrs
                    ? `${fsrs.status} (${fsrs.mastery_pct}%)`
                    : isExplored
                      ? 'Explored'
                      : 'Foundation'}
                </span>
              </button>
              <span className="dag-arrow" aria-hidden="true">
                →
              </span>
            </React.Fragment>
          );
        })}

        <div className="dag-target-node" data-testid="dag-target-concept">
          <span className="dag-target-tag">TARGET</span>
          <span className="dag-target-label">{activeChain.primaryLabel}</span>
          <code className="dag-target-id">{activeChain.primaryId}</code>
        </div>
      </div>

      <div className="prereq-status-summary">
        <span>
          Explored: <strong>{exploredIds.size}</strong> / {activeChain.items.length}
        </span>
        <span>
          FSRS-6 Mastered (session): <strong>{reviewedMasteredCount}</strong> /{' '}
          {activeChain.items.length}
        </span>
        <span className="prereq-session-note">
          Session FSRS-6 metrics computed via <code>/api/math/learning/review</code> (not saved to a
          remote student DB yet).
        </span>
      </div>

      {reviewError && (
        <div className="screen-notice error" role="alert" data-testid="prereq-review-error">
          <span>{reviewError}</span>
          <button
            type="button"
            className="screen-notice-close"
            onClick={() => setReviewError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Expandable Concept Cards */}
      <div className="concept-cards-list">
        {activeChain.items.map((concept, index) => {
          const isExpanded = expandedId === concept.id;
          const fsrs = fsrsStates[concept.id];
          const isExplored = exploredIds.has(concept.id);

          return (
            <div
              key={concept.id}
              className={`concept-card ${isExpanded ? 'expanded' : ''}`}
              data-testid={`concept-card-${concept.id}`}
            >
              <button
                type="button"
                className="concept-card-header"
                onClick={() => handleSelectConceptNode(concept)}
                aria-expanded={isExpanded}
                aria-controls={`desc-${concept.id}`}
              >
                <div className="concept-num-title">
                  <span className="step-badge">{index + 1}</span>
                  <span className="concept-name">{concept.label}</span>
                  <span className="concept-domain">{concept.domain}</span>
                  {fsrs ? (
                    <span
                      className={`fsrs-status-pill ${fsrs.status}`}
                      data-testid={`fsrs-status-${concept.id}`}
                    >
                      {fsrs.status.toUpperCase()} ({fsrs.mastery_pct}%)
                    </span>
                  ) : isExplored ? (
                    <span className="fsrs-status-pill explored">EXPLORED</span>
                  ) : (
                    <span className="fsrs-status-pill unassessed">NOT REVIEWED</span>
                  )}
                </div>
                <span className="toggle-icon" aria-hidden="true">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {isExpanded && (
                <div id={`desc-${concept.id}`} className="concept-card-body">
                  <p className="concept-desc">
                    {concept.description ||
                      'Core mathematical prerequisite necessary for understanding this method.'}
                  </p>

                  {/* FSRS-6 Spaced Repetition Status Widget */}
                  <div className="fsrs-metrics-box" data-testid={`fsrs-box-${concept.id}`}>
                    <div className="fsrs-metrics-header">
                      <span className="fsrs-metrics-title">
                        FSRS-6 Spaced Repetition Review (Mathua Engine)
                      </span>
                      <span className="fsrs-streak-badge" data-testid={`fsrs-streak-${concept.id}`}>
                        Streak: {fsrs ? fsrs.streak : 0}
                      </span>
                    </div>

                    <div className="fsrs-metrics-grid">
                      <div className="fsrs-metric-cell">
                        <span className="fsrs-metric-label">STABILITY (S)</span>
                        <strong className="fsrs-metric-val stability">
                          {fsrs ? `${fsrs.stability}d` : 'Initial'}
                        </strong>
                      </div>
                      <div className="fsrs-metric-cell">
                        <span className="fsrs-metric-label">DIFFICULTY (D)</span>
                        <strong className="fsrs-metric-val difficulty">
                          {fsrs ? fsrs.difficulty : '—'}
                        </strong>
                      </div>
                      <div className="fsrs-metric-cell">
                        <span className="fsrs-metric-label">RECALL PROB (R)</span>
                        <strong className="fsrs-metric-val recall">
                          {fsrs ? `${Math.round(fsrs.retrievability * 100)}%` : '—'}
                        </strong>
                      </div>
                      <div className="fsrs-metric-cell">
                        <span className="fsrs-metric-label">NEXT REVIEW</span>
                        <strong className="fsrs-metric-val interval">
                          {fsrs ? `${fsrs.next_interval_days}d` : 'Unscheduled'}
                        </strong>
                      </div>
                    </div>

                    <div className="fsrs-actions-row">
                      <button
                        type="button"
                        className="fsrs-btn again"
                        onClick={() => void handlePracticeConcept(concept, false)}
                        disabled={loadingConcept === concept.id}
                        data-testid={`fsrs-again-${concept.id}`}
                      >
                        Needs Review (Again)
                      </button>
                      <button
                        type="button"
                        className="fsrs-btn good"
                        onClick={() => void handlePracticeConcept(concept, true)}
                        disabled={loadingConcept === concept.id}
                        data-testid={`fsrs-good-${concept.id}`}
                      >
                        {loadingConcept === concept.id
                          ? 'Updating...'
                          : '✓ Log Recall Check (Good)'}
                      </button>
                    </div>
                  </div>

                  <div className="concept-footer">
                    <span className="concept-id-tag">Canonical Concept ID: {concept.id}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Footer back to Problem / Practice */}
      <div className="prereq-footer-actions">
        {onReturnToCanvas && (
          <button type="button" className="control-btn secondary" onClick={onReturnToCanvas}>
            ← Return to Canvas
          </button>
        )}
        {onStartPractice && (
          <button type="button" className="control-btn secondary" onClick={onStartPractice}>
            Practice These Steps →
          </button>
        )}
        {onReturnToSolution && (
          <button
            type="button"
            className="control-btn primary"
            onClick={onReturnToSolution}
            data-testid="prereq-proceed-solution"
          >
            Proceed to Verified Solution →
          </button>
        )}
      </div>
    </div>
  );
};

