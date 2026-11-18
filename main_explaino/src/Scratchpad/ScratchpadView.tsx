import React, { useState, useCallback } from 'react';
import { ArrowLeft, Calculator, HelpCircle, ExternalLink, X } from 'lucide-react';
import { MathNotebookWorkspace } from './MathNotebookWorkspace';
import { useStudentLearning } from '../context/StudentLearningContext';

export interface ScratchpadViewProps {
  onBack?: () => void;
  className?: string;
}

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({
  onBack,
  className = '',
}) => {
  const { navigateToModule } = useStudentLearning();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isHelpVideoOpen, setIsHelpVideoOpen] = useState(false);

  const handleBack = useCallback(() => {
    navigateToModule('nilo', { activity: null });
    onBack?.();
  }, [navigateToModule, onBack]);

  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden text-[#1E1926] font-sans flex flex-col ${className}`}
      style={{
        background: `
          radial-gradient(circle at 10% 25%, rgba(254, 230, 242, 0.75) 0%, transparent 45%),
          radial-gradient(circle at 90% 18%, rgba(228, 242, 255, 0.75) 0%, transparent 45%),
          radial-gradient(circle at 50% 85%, rgba(243, 232, 255, 0.85) 0%, transparent 50%),
          linear-gradient(135deg, #FAF8FE 0%, #F8F5FB 50%, #FAF8FE 100%)
        `,
      }}
    >
      {/* 1. NILO TOP HEADER / CONTROL BAR */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#EBE6F0]/80 bg-white/75 backdrop-blur-md shrink-0 z-20 select-none">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-100/50 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Wheel</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#7C5CFF] flex items-center justify-center text-white shadow-sm shadow-purple-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-[#1E1926]">
                  Math Scratchpad
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#7C5CFF] border border-purple-200/60 hidden sm:inline-block">
                  MathNoteBook Native
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Handwriting Canvas • SymPy Solver • Math Voice Normalizer
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="math-help-video-btn"
            onClick={() => setIsHelpVideoOpen(true)}
            className="p-2 rounded-xl text-[#7C5CFF] bg-purple-50/90 border border-purple-200/80 hover:bg-purple-100 hover:text-[#5B3FD6] transition-all cursor-pointer"
            title="Watch Math Scratchpad Help Video"
            aria-label="Watch Math Scratchpad Help Video"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              backendStatus === 'online'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : backendStatus === 'offline'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            data-testid="math-backend-status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-emerald-500'
                  : backendStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-slate-400 animate-pulse'
              }`}
            />
            {backendStatus === 'online'
              ? 'Solver Connected'
              : backendStatus === 'offline'
                ? 'Solver Offline'
                : 'Checking Solver...'}
          </span>
        </div>
      </header>

      {/* 2. NATIVE MATHNOTEBOOK WORKSPACE (NO IFRAME / SINGLE REACT ROOT) */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <MathNotebookWorkspace onBackendStatusChange={setBackendStatus} />
      </div>

      {/* 3. MATH SCRATCHPAD HELP VIDEO MODAL */}
      {isHelpVideoOpen && (
        <div
          data-testid="math-help-video-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setIsHelpVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-purple-400/45 shadow-[0_0_50px_rgba(124,92,255,0.3)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>Math Scratchpad Help Video</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/math-help-video.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-200 bg-purple-950/70 border border-purple-500/40 hover:bg-purple-900/70 transition-colors"
                >
                  <span>Open Video</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsHelpVideoOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close help video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-black aspect-video w-full">
              <video
                src="/math-help-video.mp4"
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
