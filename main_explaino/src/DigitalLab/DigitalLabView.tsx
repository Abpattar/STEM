import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  ExternalLink,
  FlaskConical,
  AlertCircle
} from 'lucide-react';

export interface DigitalLabViewProps {
  onBack?: () => void;
  className?: string;
}

export const DigitalLabView: React.FC<DigitalLabViewProps> = ({
  onBack,
  className = '',
}) => {
  const labUrl = import.meta.env.VITE_DIGITAL_LAB_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/digitallab/index.html' : 'http://localhost:5175');
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#06B6D4] flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-[#1E1926]">
                  Science Kingdom Digital Lab
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 hidden sm:inline-block">
                  Senku Science 3D
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Physics Workshop • Chemistry Reactions • Quartz Optics • Biology
              </p>
            </div>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-transparent hover:border-emerald-100"
            title="Reload Science Kingdom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <a
            href={labUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer border border-transparent hover:border-emerald-100"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pop Out</span>
          </a>
        </div>
      </header>

      {/* 2. MAIN IFRAME LAB WORKSPACE */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-900">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs z-10 space-y-3 text-white">
            <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-emerald-300">
              Entering Kingdom of Science Laboratory ({labUrl})...
            </p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-6 text-center text-white">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white">
              Science Kingdom Lab Service Offline
            </h2>
            <p className="text-xs text-slate-300 max-w-md mt-1">
              Could not connect to the Digital Lab at <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">{labUrl}</code>.
              Make sure the Science Kingdom server is running (`npm run dev:lab`).
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-all cursor-pointer"
              >
                Retry Connection
              </button>
              <a
                href={labUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold text-xs hover:bg-slate-700 transition-all"
              >
                Open Directly
              </a>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={labUrl}
          title="Science Kingdom Digital Lab"
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; camera; microphone; clipboard-read; clipboard-write; display-capture; gyroscope; web-share"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
};
