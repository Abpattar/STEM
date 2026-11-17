import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  FlaskConical,
} from 'lucide-react';
import { ScienceLabWorkspace } from './ScienceLabWorkspace';
import { soundManager } from './audio/SoundManager';
import { useStudentLearning } from '../context/StudentLearningContext';

export interface DigitalLabViewProps {
  onBack?: () => void;
  className?: string;
}

export const DigitalLabView: React.FC<DigitalLabViewProps> = ({
  onBack,
  className = '',
}) => {
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const { state: learningState, navigateToModule } = useStudentLearning();

  const handleResetWorkspace = () => {
    soundManager.stopAll();
    setWorkspaceKey((prev) => prev + 1);
  };

  const handleBackToWheel = () => {
    soundManager.stopAll();
    // Preserve activeSubject, activeConceptId, activeConceptTitle for handoff to EXO
    navigateToModule('nilo', {
      activity: 'dashboard',
    });
    onBack?.();
  };

  return (
    <div
      data-testid="digital-lab-view"
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none text-[#1E1926] font-sans flex flex-col ${className}`}
      style={{
        background: `
          radial-gradient(circle at 10% 25%, rgba(254, 230, 242, 0.75) 0%, transparent 45%),
          radial-gradient(circle at 90% 18%, rgba(228, 242, 255, 0.75) 0%, transparent 45%),
          radial-gradient(circle at 50% 85%, rgba(243, 232, 255, 0.85) 0%, transparent 50%),
          linear-gradient(135deg, #FAF8FE 0%, #F8F5FB 50%, #FAF8FE 100%)
        `,
      }}
    >
      {/* 1. NILO MASTER TOP HEADER / CONTROL BAR */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#EBE6F0]/80 bg-white/80 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              data-testid="digital-lab-back-wheel"
              onClick={handleBackToWheel}
              className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-100/50 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              title="Return to NILO Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Wheel</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#06B6D4] flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-[#1E1926]">
                  Science Kingdom Digital Lab
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 hidden sm:inline-block">
                  Native 3D Lab
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Physics Workshop • Chemistry Reactions • Quartz Optics • Biology
              </p>
            </div>
          </div>
        </div>

        {/* Right Toolbar: Live Shared Learning Context Pill & Reset */}
        <div className="flex items-center gap-2">
          {learningState.activeSubject && (
            <div
              data-testid="digital-lab-context-pill"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/70 text-[11px] font-semibold text-purple-900"
              title={`Shared Learning Context (${learningState.activeConceptId ?? 'unmapped concept'})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{learningState.activeSubject}</span>
              {learningState.activeConceptTitle && (
                <>
                  <span className="text-purple-300">•</span>
                  <span className="max-w-[180px] truncate">{learningState.activeConceptTitle}</span>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            data-testid="digital-lab-reset-workspace"
            onClick={handleResetWorkspace}
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-transparent hover:border-emerald-100"
            title="Reset Science Kingdom to Corridor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Lab</span>
          </button>
        </div>
      </header>

      {/* 2. NATIVE SCIENCE KINGDOM WORKSPACE (Zero iframes, single React 19 root) */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-slate-950">
        <ScienceLabWorkspace key={workspaceKey} />
      </div>
    </div>
  );
};
