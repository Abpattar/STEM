import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  ExternalLink,
  Mic,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export interface VoiceAgentProps {
  initialTopic?: string;
  onClose?: () => void;
  onNavigateToTopic?: (topic: string) => void;
  className?: string;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  initialTopic = 'Photosynthesis',
  onClose,
  onNavigateToTopic,
  className = '',
}) => {
  const voiceAgentUrl = import.meta.env.VITE_VOICE_AGENT_URL || 'http://localhost:3000';
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [iframeKey]);

  const handleRefresh = () => {
    setIsLoaded(false);
    setHasError(false);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      className={`relative w-full ${
        isExpanded ? 'max-w-[95vw] h-[92vh]' : 'max-w-5xl h-[82vh]'
      } bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-purple-200/80 flex flex-col overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* 1. HEADER BAR */}
      <header className="h-14 px-5 border-b border-purple-100/80 bg-white/80 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6366F1] via-[#7C5CFF] to-[#EC4899] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Mic className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-[#1E1926]">
                EXO Voice Agent
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#7C5CFF] border border-purple-200/60 hidden sm:inline-block">
                Apu-g/voiceagent
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Conversational Voice • Socratic Dialogue • Multilingual Speech
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer"
            title="Reload Voice Agent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer hidden sm:flex"
            title={isExpanded ? 'Restore window size' : 'Expand window'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <a
            href={voiceAgentUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all cursor-pointer"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer ml-1"
              title="Close Voice Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. IFRAME WORKSPACE */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-50">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-10 space-y-3">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Connecting to EXO Voice Agent ({voiceAgentUrl})...
            </p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              Voice Agent Service Offline
            </h2>
            <p className="text-xs text-slate-600 max-w-md mt-1">
              Could not connect to the Voice Agent at <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">{voiceAgentUrl}</code>.
              Ensure the Voice Agent Next.js service is running (`npm run dev:voice`).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-all cursor-pointer"
              >
                Retry Connection
              </button>
              <a
                href={voiceAgentUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-all"
              >
                Open Directly
              </a>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={voiceAgentUrl}
          title="EXO Voice Agent"
          className="w-full h-full border-none"
          allow="microphone; speech-recognition; camera; clipboard-read; clipboard-write; autoplay; display-capture"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
};
