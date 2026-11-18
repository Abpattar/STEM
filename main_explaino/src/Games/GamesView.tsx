import React, { useState } from 'react';
import { Gamepad2, Box, HelpCircle, ExternalLink, X } from 'lucide-react';
import { ArcadeCabinet3D } from '../components/ArcadeCabinet3D';
import { ArcadePage } from '../components/ArcadePage';

export interface GamesViewProps {
  onBack?: () => void;
  className?: string;
}

export const GamesView: React.FC<GamesViewProps> = ({
  onBack,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'arcade_page' | '3d_cabinet'>('arcade_page');
  const [isHelpVideoOpen, setIsHelpVideoOpen] = useState(false);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#0A0B1A] text-white font-sans ${className}`}>
      {/* ── Top Header Bar with Menu Center / Back to Wheel & Game Mode Switcher ── */}
      <header className="h-12 px-4 bg-black/75 border-b border-purple-900/40 flex items-center justify-between shrink-0 z-50 backdrop-blur-md">
        <button
          onClick={onBack}
          className="px-3 py-1 rounded-full bg-[#FAF2F6] hover:bg-[#F4E3ED] border border-[#8E2856]/20 text-[#8E2856] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          title="Return to Nilo Home Wheel"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-[#8E2856] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-2 h-2 fill-white">
              <path d="M12 2C10.5 5 8 7 5 7C7 9.5 7 12 5 14.5C8 14.5 10.5 16.5 12 19.5C13.5 16.5 16 14.5 19 14.5C17 12 17 9.5 19 7C16 7 13.5 5 12 2Z" />
            </svg>
          </div>
          <span>Menu center</span>
        </button>

        {/* Right Controls: View Switcher + Help Video (in 3D Cabinet view) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/10 border border-white/10">
            <button
              onClick={() => setViewMode('arcade_page')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'arcade_page'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Arcade Catalog</span>
            </button>

            <button
              onClick={() => setViewMode('3d_cabinet')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === '3d_cabinet'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Cabinet</span>
            </button>
          </div>

          {viewMode === '3d_cabinet' && (
            <button
              type="button"
              data-testid="games-cabinet-help-video-btn"
              onClick={() => setIsHelpVideoOpen(true)}
              className="p-2 rounded-xl bg-white/10 border border-purple-400/40 hover:bg-purple-600/40 text-purple-200 hover:text-white transition-all cursor-pointer"
              title="Watch Games Help Video"
              aria-label="Watch Games Help Video"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── Active Game Stage ── */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === '3d_cabinet' ? (
          <ArcadeCabinet3D
            onEnterArcade={() => setViewMode('arcade_page')}
            onClose={onBack}
          />
        ) : (
          <ArcadePage
            onBackToHome={onBack || (() => {})}
            onView3DModel={() => setViewMode('3d_cabinet')}
            userName="Abhinav"
          />
        )}
      </div>

      {/* Games Help Video Modal (for 3D Cabinet view) */}
      {isHelpVideoOpen && (
        <div
          data-testid="games-cabinet-help-video-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setIsHelpVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-purple-400/45 shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>Arcade Games Help Video</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/game-help-video.mp4"
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
                src="/game-help-video.mp4"
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
