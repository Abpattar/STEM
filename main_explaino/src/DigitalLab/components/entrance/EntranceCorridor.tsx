import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { LabType } from '../../types/laboratory';
import { soundManager } from '../../audio/SoundManager';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { Atom, FlaskConical, Microscope, Sparkles, ArrowRight } from 'lucide-react';

interface EntranceCorridorProps {
  onEnterLab: (lab: LabType) => void;
}

export const EntranceCorridor: React.FC<EntranceCorridorProps> = ({ onEnterLab }) => {
  const { settings } = useAccessibility();
  const [hoveredDoor, setHoveredDoor] = useState<'physics' | 'chemistry' | 'biology' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bgEl = bgRef.current;
    return () => {
      if (bgEl) {
        gsap.killTweensOf(bgEl);
      }
    };
  }, []);

  // Mouse parallax effect for futuristic depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTransitioning || settings.reduceMotion || !bgRef.current) return;
    const { clientX, clientY, currentTarget } = e;
    const rect = currentTarget.getBoundingClientRect();
    const xPct = (clientX - rect.left) / rect.width - 0.5;
    const yPct = (clientY - rect.top) / rect.height - 0.5;

    gsap.to(bgRef.current, {
      x: -xPct * 16,
      y: -yPct * 12,
      duration: 0.7,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleDoorClick = (lab: 'physics' | 'chemistry' | 'biology') => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    soundManager.playDoorSlide();

    if (settings.reduceMotion || !bgRef.current) {
      onEnterLab(lab);
      return;
    }

    let originX = '50%';
    if (lab === 'physics') originX = '20%';
    if (lab === 'chemistry') originX = '50%';
    if (lab === 'biology') originX = '80%';

    gsap.to(bgRef.current, {
      scale: 2.3,
      transformOrigin: `${originX} 55%`,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.in',
      onComplete: () => {
        onEnterLab(lab);
      },
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      data-testid="science-corridor"
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none flex items-center justify-center pt-14"
    >
      {/* Background High-Res Futuristic Science Kingdom Blast Doors */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full scale-105 will-change-transform"
      >
        <img
          src="/science-assets/futuristic_doors.jpg"
          alt="Futuristic Science Kingdom Blast Doors"
          className="w-full h-full object-cover object-center brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/75" />

        {/* Dynamic Atmospheric Ambient Glow matching the hovered Futuristic Door */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            hoveredDoor === 'physics' ? 'opacity-30 bg-cyan-600/20' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            hoveredDoor === 'chemistry' ? 'opacity-30 bg-emerald-600/20' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            hoveredDoor === 'biology' ? 'opacity-30 bg-purple-600/20' : 'opacity-0'
          }`}
        />
      </div>

      {/* Main Futuristic Title Header */}
      <div
        className={`absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 text-center z-20 transition-all duration-500 pointer-events-none w-full max-w-2xl px-4 ${
          isTransitioning ? 'opacity-0 -translate-y-6' : 'opacity-100'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Kingdom of Science • High-Tech Digital Wing</span>
        </div>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
          CHOOSE YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400">SECTOR</span>
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto mt-1.5 font-mono drop-shadow-md">
          Hover over any airlock blast door to scan systems, or click to enter the laboratory!
        </p>
      </div>

      {/* Interactive Blast Door Click Hotspots */}
      <div
        className={`relative z-10 w-full h-full max-w-7xl mx-auto grid grid-cols-3 gap-2 sm:gap-6 px-4 sm:px-10 pt-36 pb-16 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* DOOR 1: PHYSICS LAB (LEFT — BLUE NEON) */}
        <button
          type="button"
          data-testid="door-physics"
          onMouseEnter={() => {
            setHoveredDoor('physics');
            soundManager.playClick();
          }}
          onMouseLeave={() => setHoveredDoor(null)}
          onClick={() => handleDoorClick('physics')}
          className="group relative h-full flex flex-col items-center justify-end pb-8 cursor-pointer focus:outline-none text-left"
        >
          <div
            className={`absolute inset-x-2 inset-y-4 rounded-2xl border-2 transition-all duration-300 ${
              hoveredDoor === 'physics'
                ? 'border-cyan-400 bg-cyan-950/35 shadow-[0_0_50px_rgba(6,182,212,0.5)] backdrop-blur-[1px]'
                : 'border-cyan-500/20 hover:border-cyan-400/50 bg-transparent'
            }`}
          />
          <div
            className={`relative z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 backdrop-blur-md text-center w-[92%] max-w-xs transition-all duration-300 transform ${
              hoveredDoor === 'physics' ? 'translate-y-0 scale-105 shadow-[0_0_25px_rgba(6,182,212,0.4)]' : 'translate-y-3 opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center mx-auto mb-2.5 text-cyan-400">
              <Atom className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase font-mono">
              PHYSICS LAB
            </h3>
            <p className="text-xs text-cyan-200 mt-1 line-clamp-2 font-sans">
              Classical Mechanics, Optics Bench, DC Circuits, Pendulum, 3D Solar Orrery &amp; Cosmic Gravity.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-950 bg-cyan-400 px-3.5 py-1.5 rounded-full shadow-lg">
              <span>Enter Physics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {/* DOOR 2: CHEMISTRY LAB (CENTER — GREEN NEON) */}
        <button
          type="button"
          data-testid="door-chemistry"
          onMouseEnter={() => {
            setHoveredDoor('chemistry');
            soundManager.playClick();
          }}
          onMouseLeave={() => setHoveredDoor(null)}
          onClick={() => handleDoorClick('chemistry')}
          className="group relative h-full flex flex-col items-center justify-end pb-8 cursor-pointer focus:outline-none text-left"
        >
          <div
            className={`absolute inset-x-2 inset-y-4 rounded-2xl border-2 transition-all duration-300 ${
              hoveredDoor === 'chemistry'
                ? 'border-emerald-400 bg-emerald-950/35 shadow-[0_0_50px_rgba(16,185,129,0.5)] backdrop-blur-[1px]'
                : 'border-emerald-500/20 hover:border-emerald-400/50 bg-transparent'
            }`}
          />
          <div
            className={`relative z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 backdrop-blur-md text-center w-[92%] max-w-xs transition-all duration-300 transform ${
              hoveredDoor === 'chemistry' ? 'translate-y-0 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'translate-y-3 opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-400/60 flex items-center justify-center mx-auto mb-2.5 text-emerald-400">
              <FlaskConical className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase font-mono">
              CHEMISTRY LAB
            </h3>
            <p className="text-xs text-emerald-200 mt-1 line-clamp-2 font-sans">
              3D Workbench, Interactive Pipette Reactions, Precipitation, Acid-Base Titration &amp; Indicators.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-950 bg-emerald-400 px-3.5 py-1.5 rounded-full shadow-lg">
              <span>Enter Chemistry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {/* DOOR 3: BIOLOGY LAB (RIGHT — PURPLE NEON) */}
        <button
          type="button"
          data-testid="door-biology"
          onMouseEnter={() => {
            setHoveredDoor('biology');
            soundManager.playClick();
          }}
          onMouseLeave={() => setHoveredDoor(null)}
          onClick={() => handleDoorClick('biology')}
          className="group relative h-full flex flex-col items-center justify-end pb-8 cursor-pointer focus:outline-none text-left"
        >
          <div
            className={`absolute inset-x-2 inset-y-4 rounded-2xl border-2 transition-all duration-300 ${
              hoveredDoor === 'biology'
                ? 'border-purple-400 bg-purple-950/35 shadow-[0_0_50px_rgba(168,85,247,0.5)] backdrop-blur-[1px]'
                : 'border-purple-500/20 hover:border-purple-400/50 bg-transparent'
            }`}
          />
          <div
            className={`relative z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-purple-500/40 backdrop-blur-md text-center w-[92%] max-w-xs transition-all duration-300 transform ${
              hoveredDoor === 'biology' ? 'translate-y-0 scale-105 shadow-[0_0_25px_rgba(168,85,247,0.4)]' : 'translate-y-3 opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-400/60 flex items-center justify-center mx-auto mb-2.5 text-purple-400">
              <Microscope className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase font-mono">
              BIOLOGY LAB
            </h3>
            <p className="text-xs text-purple-200 mt-1 line-clamp-2 font-sans">
              Quartz Compound Microscope, Live Organelle Inspection &amp; 3-Stage Botanical Flower Dissection.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-950 bg-purple-400 px-3.5 py-1.5 rounded-full shadow-lg">
              <span>Enter Biology</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

