import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Maximize2
} from 'lucide-react';

export interface ScratchpadViewProps {
  onBack?: () => void;
  className?: string;
}

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({
  onBack,
  className = '',
}) => {
  const scratchpadUrl = import.meta.env.VITE_SCRATCHPAD_URL || 'http://localhost:5174';
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset loaded state on refresh
    setIsLoaded(false);
    setHasError(false);
    const timeout = setTimeout(() => {
      // If after 8 seconds not loaded, show hint
      if (!isLoaded) {
        // do not mark as error immediately, but keep indicator
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [iframeKey]);

  const handleRefresh = () => {
    setIsLoaded(false);
    setHasError(false);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
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
      {/* 1. TOP HEADER / CONTROL BAR */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#EBE6F0]/80 bg-white/70 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
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
                  MathNoteBook AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Multimodal Canvas • SymPy Solver • OCR Handwriting Recognition
              </p>
            </div>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-transparent hover:border-purple-100"
            title="Reload Scratchpad"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <a
            href={scratchpadUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-transparent hover:border-purple-100"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pop Out</span>
          </a>
        </div>
      </header>

      {/* 2. MAIN IFRAME CANVAS WORKSPACE */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-white/50">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs z-10 space-y-3">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Loading Math Scratchpad Canvas ({scratchpadUrl})...
            </p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              MathNoteBook Service Not Detected
            </h2>
            <p className="text-xs text-slate-600 max-w-md mt-1">
              Could not connect to the Scratchpad frontend at <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">{scratchpadUrl}</code>.
              Ensure the Scratchpad services are running (`npm run dev:scratchpad`).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-all cursor-pointer"
              >
                Retry Connection
              </button>
              <a
                href={scratchpadUrl}
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
          src={scratchpadUrl}
          title="MathNoteBook Scratchpad"
          className="w-full h-full border-none"
          allow="camera; microphone; clipboard-read; clipboard-write; display-capture"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
};
