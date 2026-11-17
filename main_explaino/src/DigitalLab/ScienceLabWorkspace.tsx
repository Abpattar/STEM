import React, { useState, useEffect, useCallback } from 'react';
import './styles/scienceWorkspace.css';
import { LabType, DialogueStep } from './types/laboratory';
import { EntranceCorridor } from './components/entrance/EntranceCorridor';
import { LabHUD } from './components/common/LabHUD';
import { InfoModal } from './components/common/InfoModal';
import { SenkuGuide } from './components/guide/SenkuGuide';
import { SenkuAiModal } from './components/guide/SenkuAiModal';
import { PhysicsLab } from './components/physics/PhysicsLab';
import { ChemistryLab } from './components/chemistry/ChemistryLab';
import { BiologyLab } from './components/biology/BiologyLab';
import { getLabIntro } from './data/senkuDialogues';
import { getScienceConcept } from './data/scienceConcepts';
import { soundManager } from './audio/SoundManager';
import { useAccessibility } from '../context/AccessibilityContext';
import { useStudentLearning } from '../context/StudentLearningContext';

export const ScienceLabWorkspace: React.FC = () => {
  const { settings, setSoundCues } = useAccessibility();
  const { state: learningState, navigateToModule, updateLearningContext } = useStudentLearning();

  const [currentLab, setCurrentLab] = useState<LabType>('corridor');
  const [activeDialogues, setActiveDialogues] = useState<DialogueStep[]>([]);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [isSenkuAiOpen, setIsSenkuAiOpen] = useState<boolean>(false);
  const [hasVisitedLabs, setHasVisitedLabs] = useState<Set<LabType>>(() => new Set());
  const [isLocalMuted, setIsLocalMuted] = useState<boolean>(!settings.soundCues);

  // Sync lab sound mute state with NILO AccessibilityContext.soundCues
  useEffect(() => {
    setIsLocalMuted(!settings.soundCues);
  }, [settings.soundCues]);

  useEffect(() => {
    soundManager.setMuted(isLocalMuted);
  }, [isLocalMuted]);

  // Register Science Kingdom module entry in shared StudentLearningContext and clean up audio on unmount
  useEffect(() => {
    const corridorConcept = getScienceConcept('corridor');
    navigateToModule('science', {
      subject: corridorConcept.subject,
      conceptId: corridorConcept.conceptId,
      conceptTitle: corridorConcept.conceptTitle,
      activity: corridorConcept.activity,
      returnDestination: {
        module: 'nilo',
        view: 'dashboard',
        label: 'NILO Wheel',
      },
    });

    return () => {
      soundManager.stopAll();
    };
  }, [navigateToModule]);

  // Trigger Senku tutorial dialogue the first time a lab wing is entered
  useEffect(() => {
    if (!hasVisitedLabs.has(currentLab)) {
      const intro = getLabIntro(currentLab);
      setActiveDialogues(intro);
      setShowGuide(true);
      setHasVisitedLabs((prev) => new Set(prev).add(currentLab));
    }
  }, [currentLab, hasVisitedLabs]);

  const handleStationContextChange = useCallback(
    (conceptKey: string) => {
      const mapping = getScienceConcept(conceptKey);
      updateLearningContext({
        activeModule: 'science',
        activeSubject: mapping.subject,
        activeConceptId: mapping.conceptId,
        activeConceptTitle: mapping.conceptTitle,
        currentActivity: mapping.activity,
      });
    },
    [updateLearningContext]
  );

  const handleNavigate = useCallback(
    (lab: LabType) => {
      soundManager.stopAll();
      setCurrentLab(lab);
      if (lab === 'corridor') {
        handleStationContextChange('corridor');
      }
    },
    [handleStationContextChange]
  );

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isLocalMuted;
    setIsLocalMuted(nextMuted);
    soundManager.setMuted(nextMuted);
    setSoundCues(!nextMuted);
  }, [isLocalMuted, setSoundCues]);

  const handleSenkuQuestionAsked = useCallback(
    (question: string) => {
      updateLearningContext({
        currentActivity: `science-senku-ai:${currentLab}`,
      });
      void question;
    },
    [currentLab, updateLearningContext]
  );

  return (
    <div
      className="nilo-science-workspace"
      data-testid="nilo-science-workspace"
      data-current-lab={currentLab}
      data-learning-module={learningState.activeModule}
      data-learning-subject={learningState.activeSubject ?? ''}
      data-learning-concept-id={learningState.activeConceptId ?? ''}
      data-learning-concept-title={learningState.activeConceptTitle ?? ''}
      data-learning-activity={learningState.currentActivity ?? ''}
    >
      {/* Internal Science Kingdom HUD (positioned inside workspace below NILO header) */}
      <LabHUD
        currentLab={currentLab}
        onNavigate={handleNavigate}
        onOpenManual={() => setIsManualOpen(true)}
        onAskSenku={() => setIsSenkuAiOpen(true)}
        isMuted={isLocalMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Active Lab View */}
      <div className="w-full h-full relative">
        {currentLab === 'corridor' && (
          <EntranceCorridor onEnterLab={handleNavigate} />
        )}

        {currentLab === 'physics' && (
          <PhysicsLab
            onBackToCorridor={() => handleNavigate('corridor')}
            onStationContextChange={handleStationContextChange}
          />
        )}

        {currentLab === 'chemistry' && (
          <ChemistryLab onStationContextChange={handleStationContextChange} />
        )}

        {currentLab === 'biology' && (
          <BiologyLab onStationContextChange={handleStationContextChange} />
        )}
      </div>

      {/* Senku Guided Dialogue Overlay */}
      <SenkuGuide
        dialogues={activeDialogues}
        visible={showGuide}
        onComplete={() => setShowGuide(false)}
        onDismiss={() => setShowGuide(false)}
      />

      {/* Lab Manual & Formula Reference Modal */}
      <InfoModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* Server-Backed Mecha Senku AI Tutor Modal */}
      <SenkuAiModal
        isOpen={isSenkuAiOpen}
        onClose={() => setIsSenkuAiOpen(false)}
        contextLab={currentLab}
        onQuestionAsked={handleSenkuQuestionAsked}
      />
    </div>
  );
};

