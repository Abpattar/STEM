import React from 'react';
import { LabType } from '../../types/laboratory';
import { Volume2, VolumeX, ArrowLeft, BookOpen, Atom, FlaskConical, Microscope, Home, Bot } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface LabHUDProps {
  currentLab: LabType;
  onNavigate: (lab: LabType) => void;
  onOpenManual: () => void;
  onAskSenku: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const LabHUD: React.FC<LabHUDProps> = ({
  currentLab,
  onNavigate,
  onOpenManual,
  onAskSenku,
  isMuted,
  onToggleMute,
}) => {
  const handleToggleAudio = () => {
    onToggleMute();
    if (isMuted) {
      soundManager.playClick();
    }
  };

  const getLabDetails = () => {
    switch (currentLab) {
      case 'physics':
        return {
          title: 'Physics Lab',
          subtitle: 'Mechanics, Optics, Circuits & Astronomy',
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/30',
          icon: <Atom className="w-4 h-4 text-cyan-400" />,
        };
      case 'chemistry':
        return {
          title: 'Chemistry Lab',
          subtitle: '3D Workbench, Reactions & Acid-Base Titration',
          color: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          icon: <FlaskConical className="w-4 h-4 text-emerald-400" />,
        };
      case 'biology':
        return {
          title: 'Biology Lab',
          subtitle: 'Compound Microscope & Flower Dissection',
          color: 'text-purple-400',
          borderColor: 'border-purple-500/30',
          icon: <Microscope className="w-4 h-4 text-purple-400" />,
        };
      default:
        return {
          title: 'Science Kingdom',
          subtitle: 'Main Laboratory Corridor',
          color: 'text-cyan-400',
          borderColor: 'border-cyan-500/30',
          icon: <Home className="w-4 h-4 text-cyan-400" />,
        };
    }
  };

  const details = getLabDetails();

  return (
    <div
      data-testid="science-lab-hud"
      className="absolute top-0 left-0 right-0 z-30 px-3 sm:px-5 py-2.5 flex items-center justify-between pointer-events-none"
    >
      {/* Left: Corridor Return & Active Wing Indicator */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {currentLab !== 'corridor' && (
          <button
            type="button"
            data-testid="hud-back-corridor"
            onClick={() => {
              soundManager.playDoorSlide();
              onNavigate('corridor');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 hover:text-white transition-all shadow-lg backdrop-blur-md text-xs font-mono font-bold cursor-pointer"
            title="Return to Science Kingdom Corridor"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Corridor</span>
          </button>
        )}

        <div
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border ${details.borderColor} backdrop-blur-md shadow-xl`}
        >
          {details.icon}
          <div className="leading-tight">
            <h2 className={`font-black text-xs sm:text-sm tracking-wider uppercase font-mono ${details.color}`}>
              {details.title}
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block font-mono">
              {details.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Controls & Tools */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Quick Wing Switcher */}
        {currentLab !== 'corridor' && (
          <div className="hidden md:flex items-center bg-slate-900/90 rounded-xl p-1 gap-1 border border-slate-700/80 backdrop-blur-md shadow-lg">
            {(['physics', 'chemistry', 'biology'] as const).map((wing) => {
              const active = currentLab === wing;
              const activeClass =
                wing === 'physics'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : wing === 'chemistry'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'bg-purple-500 text-slate-950 font-black shadow-md';
              return (
                <button
                  key={wing}
                  type="button"
                  data-testid={`hud-switch-${wing}`}
                  onClick={() => {
                    soundManager.playClick();
                    onNavigate(wing);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer capitalize ${
                    active ? activeClass : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {wing}
                </button>
              );
            })}
          </div>
        )}

        {/* Ask Mecha Senku AI Button */}
        <button
          type="button"
          data-testid="hud-ask-senku"
          onClick={() => {
            soundManager.playClick();
            onAskSenku();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/60 hover:border-cyan-400 text-slate-200 hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md cursor-pointer"
          title="Ask Mecha Senku AI Tutor"
        >
          <img
            src="/science-assets/mecha_senku.png"
            alt="Mecha Senku"
            className="w-5 h-5 rounded-full border border-cyan-400 object-cover bg-slate-950"
          />
          <span className="text-xs font-mono font-bold tracking-wide text-cyan-300">
            Mecha Senku
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-cyan-950/80 text-cyan-300 border border-cyan-600/50">
            <Bot className="w-2.5 h-2.5" /> AI
          </span>
        </button>

        {/* Lab Manual / Theory Button */}
        <button
          type="button"
          data-testid="hud-open-manual"
          onClick={() => {
            soundManager.playClick();
            onOpenManual();
          }}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all backdrop-blur-md cursor-pointer"
          title="Scientific Manual & Formulas"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Mute / Unmute Audio Button */}
        <button
          type="button"
          data-testid="hud-toggle-audio"
          onClick={handleToggleAudio}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
          title={isMuted ? 'Unmute Lab Sound Effects' : 'Mute Lab Sound Effects'}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
};

