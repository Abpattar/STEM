import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  RotateCcw,
  Mic,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { ExoWorkspace } from './ExoWorkspace';

export interface VoiceAgentProps {
  initialTopic?: string;
  initialInteractionMode?: 'voice' | 'text';
  fullScreen?: boolean;
  backLabel?: string;
  onClose?: () => void;
  onNavigateToTopic?: (topic: string) => void;
  onNavigateToModule?: (target: 'scratchpad' | 'digitallab') => void;
  className?: string;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  initialTopic,
  initialInteractionMode = 'voice',
  fullScreen = false,
  backLabel = 'Back to Dashboard',
  onClose,
  onNavigateToTopic,
  onNavigateToModule,
  className = '',
}) => {
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRefresh = () => {
    setWorkspaceKey((prev) => prev + 1);
  };

  return (
    <div
      data-testid="nilo-voice-agent-modal"
      className={
        fullScreen
          ? `relative w-full h-full bg-[#fafcff] flex flex-col overflow-hidden ${className}`
          : `relative w-full ${
              isExpanded ? 'max-w-[96vw] h-[92vh]' : 'max-w-6xl h-[82vh]'
            } bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-purple-200/80 flex flex-col overflow-hidden transition-all duration-300 ${className}`
      }
    >
      {/* 1. HEADER BAR */}
      <header className="h-14 px-5 border-b border-purple-100/80 bg-white/90 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {fullScreen && onClose && (
            <>
              <button
                onClick={onClose}
                data-testid="exo-back-btn"
                className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-purple-100/50 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{backLabel}</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />
            </>
          )}

          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6366F1] via-[#7C5CFF] to-[#EC4899] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Mic className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-[#1E1926]">
                EXO
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#7C5CFF] border border-purple-200/60 hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                AI Voice Tutor
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Voice-First Socratic Tutor • 11 Languages • Roadmap &amp; Interactive Lessons
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer"
            title="Reset EXO Workspace"
            aria-label="Reset EXO Workspace"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!fullScreen && (
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer hidden sm:flex"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
              aria-label={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              data-testid="exo-close-btn"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer ml-1"
              title="Close EXO"
              aria-label="Close EXO"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. CANONICAL NATIVE EXO WORKSPACE (Zero Application Iframe) */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-[#fafcff]">
        <ExoWorkspace
          key={workspaceKey}
          initialTopic={initialTopic}
          initialInteractionMode={initialInteractionMode}
          onNavigateToTopic={onNavigateToTopic}
          onNavigateToModule={onNavigateToModule}
        />
      </div>
    </div>
  );
};
