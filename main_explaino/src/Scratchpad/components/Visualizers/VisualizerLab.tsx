import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ParabolaVisualizer } from './ParabolaVisualizer';
import { EquationBalanceVisualizer } from './EquationBalanceVisualizer';
import { CircleAreaExhaustionVisualizer } from './CircleAreaExhaustionVisualizer';
import { PythagoreanVisualizer } from './PythagoreanVisualizer';
import { NumberLineVisualizer } from './NumberLineVisualizer';
import { AlgebraTilesVisualizer } from './AlgebraTilesVisualizer';
import { GeometryDiagramVisualizer } from './GeometryDiagramVisualizer';
import {
  VISUALIZER_CATALOG,
  getVisualizerMeta,
  resolveGeometryDiagramConcept,
  type VisualMode,
} from './visualizerConcepts';
import type { DiagramType } from './diagrams/types';
import { useStudentLearning } from '../../../context/StudentLearningContext';
import type { UnifiedMathematicalRepresentation } from '../../types/umr';
import {
  buildParabolaSonificationPoints,
  CurveSonificationPlayer,
} from '../../utils/sonificationEngine';
import '../../styles/visualizers.css';

export interface VisualizerLabProps {
  visualMode: VisualMode;
  onVisualModeChange: (mode: VisualMode) => void;
  umr: UnifiedMathematicalRepresentation | null;
  isActive: boolean;
}

function readNum(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: number
): number {
  const val = params?.[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

export const VisualizerLab: React.FC<VisualizerLabProps> = ({
  visualMode,
  onVisualModeChange,
  umr,
  isActive,
}) => {
  const { state: learningState, setActiveConcept, setCurrentActivity } = useStudentLearning();
  const [activeDiagramType, setActiveDiagramType] = useState<DiagramType>('triangle');
  const [usingBackendGeometrySvg, setUsingBackendGeometrySvg] = useState<boolean>(false);
  const sonificationPlayerRef = useRef<CurveSonificationPlayer | null>(null);
  const [isSonifying, setIsSonifying] = useState(false);

  // Ensure curve sonification stops cleanly when switching visualizers, leaving tab, or unmounting
  const stopSonification = useCallback(() => {
    sonificationPlayerRef.current?.stop();
    setIsSonifying(false);
  }, []);

  useEffect(() => {
    if (!isActive || visualMode !== 'parabola') {
      stopSonification();
    }
  }, [isActive, visualMode, stopSonification]);

  useEffect(() => {
    return () => {
      stopSonification();
    };
  }, [stopSonification]);

  const handleParabolaSonify = useCallback(
    (a: number, b: number, c: number) => {
      if (!sonificationPlayerRef.current) {
        sonificationPlayerRef.current = new CurveSonificationPlayer();
      }
      if (isSonifying) {
        stopSonification();
        return;
      }
      const points = buildParabolaSonificationPoints(a, b, c);
      setCurrentActivity('sonification-started');
      const started = sonificationPlayerRef.current.play(points, {
        speed: 1.0,
        volume: 0.15,
        onFinish: () => setIsSonifying(false),
      });
      setIsSonifying(started);
    },
    [isSonifying, stopSonification, setCurrentActivity]
  );

  const params = umr?.visualisation?.initial_params;
  const svgCode = typeof params?.svg_code === 'string' ? params.svg_code : undefined;
  const geomTopic =
    typeof params?.topic === 'string'
      ? params.topic
      : umr?.understanding?.topic || 'geometry';

  const handleDiagramChange = useCallback(
    (diagramType: DiagramType, usingBackendSvg: boolean) => {
      setActiveDiagramType(diagramType);
      setUsingBackendGeometrySvg(usingBackendSvg);
      if (isActive && visualMode === 'geometry') {
        const resolved = resolveGeometryDiagramConcept(
          diagramType,
          usingBackendSvg ? geomTopic : undefined
        );
        setActiveConcept({
          conceptId: resolved.conceptId,
          conceptTitle: resolved.conceptTitle,
          subject: 'Mathematics',
        });
        setCurrentActivity(resolved.activity);
      }
    },
    [isActive, visualMode, geomTopic, setActiveConcept, setCurrentActivity]
  );

  // Sync active visualizer (and selected geometry diagram) into shared StudentLearningContext
  useEffect(() => {
    if (!isActive) return;

    const resolved =
      visualMode === 'geometry'
        ? resolveGeometryDiagramConcept(
            activeDiagramType,
            usingBackendGeometrySvg ? geomTopic : undefined
          )
        : getVisualizerMeta(visualMode);

    setActiveConcept({
      conceptId: resolved.conceptId,
      conceptTitle: resolved.conceptTitle,
      subject: 'Mathematics',
    });
    setCurrentActivity(resolved.activity);
  }, [
    isActive,
    visualMode,
    activeDiagramType,
    usingBackendGeometrySvg,
    geomTopic,
    setActiveConcept,
    setCurrentActivity,
  ]);

  const problemKey = umr?.problem_id || 'default';

  return (
    <div
      className="visualizer-lab-shell"
      data-testid="visualizer-lab"
      data-context-concept-id={learningState.activeConceptId ?? ''}
      data-context-concept-title={learningState.activeConceptTitle ?? ''}
      data-context-activity={learningState.currentActivity ?? ''}
    >
      <div
        className="visualizer-selector-bar"
        role="tablist"
        aria-label="Interactive math visualizers"
      >
        {VISUALIZER_CATALOG.map((viz) => (
          <button
            type="button"
            key={viz.id}
            role="tab"
            aria-selected={visualMode === viz.id}
            className={`viz-selector-btn ${visualMode === viz.id ? 'active' : ''}`}
            onClick={() => onVisualModeChange(viz.id)}
            data-testid={`viz-tab-${viz.id}`}
          >
            <span>{viz.label}</span>
            <span className="viz-grade-pill">{viz.gradeTag}</span>
          </button>
        ))}
      </div>

      <div className="visualizer-active-stage">
        {visualMode === 'parabola' && (
          <ParabolaVisualizer
            key={`${problemKey}-parabola`}
            initialA={readNum(params, 'a', 1)}
            initialB={readNum(params, 'b', 5)}
            initialC={readNum(params, 'c', 6)}
            onSonificationPlay={handleParabolaSonify}
            isSonifying={isSonifying}
          />
        )}

        {visualMode === 'balance' && (
          <EquationBalanceVisualizer
            key={`${problemKey}-balance`}
            initialA={readNum(params, 'a', 2)}
            initialB={readNum(params, 'b', 3)}
            initialC={readNum(params, 'c', 7)}
          />
        )}

        {visualMode === 'circle' && (
          <CircleAreaExhaustionVisualizer
            key={`${problemKey}-circle`}
            radius={readNum(params, 'radius', 5)}
          />
        )}

        {visualMode === 'pythagoras' && (
          <PythagoreanVisualizer
            key={`${problemKey}-pythagoras`}
            initialA={readNum(params, 'a', 3)}
            initialB={readNum(params, 'b', 4)}
          />
        )}

        {visualMode === 'numberline' && (
          <NumberLineVisualizer
            key={`${problemKey}-numberline`}
            initialA={readNum(params, 'a', 2)}
            initialB={readNum(params, 'b', 3)}
          />
        )}

        {visualMode === 'tiles' && (
          <AlgebraTilesVisualizer
            key={`${problemKey}-tiles`}
            initialP={2}
            initialQ={3}
          />
        )}

        {visualMode === 'geometry' && (
          <GeometryDiagramVisualizer
            key={`${problemKey}-geometry`}
            svgCode={svgCode}
            topic={geomTopic}
            description={umr?.visualisation?.description}
            onDiagramChange={handleDiagramChange}
          />
        )}
      </div>
    </div>
  );
};
