import React, { useState } from 'react';
import type { PrerequisiteConcept } from '../types/umr';
import { soundEffects } from '../utils/soundEffects';
import './ConceptLearningDrawer.css';

interface ConceptLearningDrawerProps {
  prerequisites: PrerequisiteConcept[];
  primaryConceptId?: string;
}

interface FSRSConceptState {
  stability: number;
  difficulty: number;
  retrievability: number;
  streak: number;
  mastery_pct: number;
  status: string;
  next_interval_days: number;
}

export const ConceptLearningDrawer: React.FC<ConceptLearningDrawerProps> = ({
  prerequisites,
  primaryConceptId
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    prerequisites.length > 0 ? prerequisites[0].id : null
  );

  const [fsrsStates, setFsrsStates] = useState<Record<string, FSRSConceptState>>({});
  const [loadingConcept, setLoadingConcept] = useState<string | null>(null);

  if (!prerequisites || prerequisites.length === 0) {
    return null;
  }

  const handlePracticeConcept = async (conceptId: string, isCorrect: boolean) => {
    setLoadingConcept(conceptId);
    soundEffects.playClick(520, 0.05);

    try {
      const currentState = fsrsStates[conceptId];
      const res = await fetch('/api/learning/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: conceptId,
          is_correct: isCorrect,
          elapsed_days: 1.0,
          current_state: currentState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFsrsStates((prev) => ({
          ...prev,
          [conceptId]: data
        }));
        if (isCorrect) {
          soundEffects.playSuccessChime();
        } else {
          soundEffects.playClick(300, 0.1);
        }
      }
    } catch (e) {
      console.error('Failed to update FSRS-6 mastery:', e);
    } finally {
      setLoadingConcept(null);
    }
  };

  return (
    <div className="concept-learning-drawer" role="region" aria-label="Prerequisite Concepts Learning">
      <div className="drawer-header">
        <div className="header-title-row">
          <span className="badge-icon">💡</span>
          <div>
            <h4 className="drawer-title">
              Foundational Concepts Required {primaryConceptId ? `(${primaryConceptId})` : ''}
            </h4>
            <p className="drawer-subtitle">
              Master these core ideas to fully understand how this problem is solved (Powered by Mathua DAG & FSRS-6 Spaced Repetition):
            </p>
          </div>
        </div>
      </div>

      <div className="concept-cards-list">
        {prerequisites.map((concept, index) => {
          const isExpanded = expandedId === concept.id;
          const fsrs = fsrsStates[concept.id];

          return (
            <div
              key={concept.id}
              className={`concept-card ${isExpanded ? 'expanded' : ''}`}
            >
              <button
                className="concept-card-header"
                onClick={() => setExpandedId(isExpanded ? null : concept.id)}
                aria-expanded={isExpanded}
                aria-controls={`desc-${concept.id}`}
              >
                <div className="concept-num-title">
                  <span className="step-badge">{index + 1}</span>
                  <span className="concept-name">{concept.label}</span>
                  <span className="concept-domain">{concept.domain}</span>
                  {fsrs && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        background: fsrs.status === 'mastered' ? '#065f46' : '#1e3a8a',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    >
                      {fsrs.status.toUpperCase()} ({fsrs.mastery_pct}%)
                    </span>
                  )}
                </div>
                <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div id={`desc-${concept.id}`} className="concept-card-body">
                  <p className="concept-desc">
                    {concept.description || 'Core mathematical prerequisite necessary for understanding this algebraic method.'}
                  </p>

                  {/* FSRS-6 Spaced Repetition Status Widget */}
                  <div style={{ background: '#0f172a', borderRadius: '8px', padding: '10px 14px', marginTop: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                        FSRS-6 Memory Metrics (Mathua Spaced Repetition)
                      </span>
                      <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                        Streak: 🔥 {fsrs ? fsrs.streak : 0}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', fontSize: '12px' }}>
                      <div style={{ background: '#1e293b', padding: '6px', borderRadius: '6px' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>STABILITY (S)</span>
                        <strong style={{ color: '#4ade80' }}>{fsrs ? `${fsrs.stability}d` : 'Initial'}</strong>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px', borderRadius: '6px' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>DIFFICULTY (D)</span>
                        <strong style={{ color: '#f59e0b' }}>{fsrs ? fsrs.difficulty : '2.1'}</strong>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px', borderRadius: '6px' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>RECALL PROB (R)</span>
                        <strong style={{ color: '#38bdf8' }}>{fsrs ? `${Math.round(fsrs.retrievability * 100)}%` : '100%'}</strong>
                      </div>
                      <div style={{ background: '#1e293b', padding: '6px', borderRadius: '6px' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>NEXT REVIEW</span>
                        <strong style={{ color: '#a855f7' }}>{fsrs ? `${fsrs.next_interval_days}d` : '1d'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={() => handlePracticeConcept(concept.id, false)}
                        disabled={loadingConcept === concept.id}
                        style={{
                          background: '#334155',
                          color: '#f87171',
                          border: '1px solid #475569',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Needs Review
                      </button>
                      <button
                        onClick={() => handlePracticeConcept(concept.id, true)}
                        disabled={loadingConcept === concept.id}
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {loadingConcept === concept.id ? 'Updating...' : '✅ Mark Practiced (Good)'}
                      </button>
                    </div>
                  </div>

                  <div className="concept-footer" style={{ marginTop: '8px' }}>
                    <span className="concept-id-tag">Concept ID: {concept.id}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
