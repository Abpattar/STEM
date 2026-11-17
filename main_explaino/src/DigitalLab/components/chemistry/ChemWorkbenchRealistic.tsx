import React, { useState, useRef, useEffect } from 'react';
import { soundManager } from '../../audio/SoundManager';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { Beaker, Pipette, LogIn, Box } from 'lucide-react';

interface ChemWorkbenchRealisticProps {
  onSelectStation: (station: 'simulator' | 'titration') => void;
  onSwitchTo3D?: () => void;
}

export const ChemWorkbenchRealistic: React.FC<ChemWorkbenchRealisticProps> = ({
  onSelectStation,
  onSwitchTo3D,
}) => {
  const { settings } = useAccessibility();
  const [hoveredStation, setHoveredStation] = useState<'simulator' | 'titration' | null>(null);
  const [zoomingStation, setZoomingStation] = useState<'simulator' | 'titration' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomingStation || settings.reduceMotion) return;
    if (!containerRef.current || !imageRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    imageRef.current.style.transform = `scale(1.05) translate(${x * -16}px, ${y * -12}px)`;
  };

  const handleMouseLeave = () => {
    if (zoomingStation) return;
    if (imageRef.current) {
      imageRef.current.style.transform = 'scale(1.02) translate(0px, 0px)';
    }
    setHoveredStation(null);
  };

  const handleStationClick = (station: 'simulator' | 'titration') => {
    if (zoomingStation) return;
    setZoomingStation(station);
    soundManager.playDoorSlide();

    if (settings.reduceMotion) {
      onSelectStation(station);
      return;
    }

    if (imageRef.current) {
      imageRef.current.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
      imageRef.current.style.transform =
        station === 'simulator'
          ? 'scale(1.85) translate(18%, -4%)'
          : 'scale(1.85) translate(-18%, -6%)';
    }

    timerRef.current = window.setTimeout(() => {
      onSelectStation(station);
    }, 680);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-testid="chemistry-workbench-realistic"
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 flex items-center justify-center cursor-default pt-14"
    >
      <img
        ref={imageRef}
        src="/science-assets/chem_workbench_realistic.jpg"
        alt="Photorealistic Futuristic Chemistry Laboratory Workbench Table"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform will-change-transform scale-[1.02]"
      />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/60" />

      {/* Top Banner */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center px-4 w-full max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono tracking-widest uppercase mb-1 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Interactive Chemistry Workbench</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] uppercase font-mono">
          THE SCIENCE KINGDOM • CHEMISTRY
        </h2>
        <p className="text-emerald-200/90 text-xs sm:text-sm drop-shadow font-mono tracking-wide">
          Select either apparatus on the laboratory table to step up and begin
        </p>
      </div>

      {/* Two Apparatus Hotspots */}
      <div className={`absolute inset-0 z-10 ${zoomingStation ? 'pointer-events-none opacity-0 transition-opacity duration-300' : ''}`}>
        {/* Station 1: Reaction Simulator */}
        <div
          data-testid="chem-station-simulator"
          style={{ left: '5%', top: '24%', width: '43%', height: '62%' }}
          onMouseEnter={() => {
            soundManager.playClick();
            setHoveredStation('simulator');
          }}
          onMouseLeave={() => setHoveredStation(null)}
          onClick={() => handleStationClick('simulator')}
          className="absolute cursor-pointer rounded-2xl group transition-all duration-300 flex flex-col items-center justify-between p-4"
        >
          <div
            className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
              hoveredStation === 'simulator'
                ? 'border-emerald-400 bg-emerald-950/25 shadow-[0_0_50px_rgba(16,185,129,0.7)] scale-[1.01]'
                : 'border-transparent hover:border-emerald-500/30'
            }`}
          />
          <div
            className={`relative z-20 border border-emerald-500/70 bg-slate-950/90 px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 shadow-2xl backdrop-blur-md ${
              hoveredStation === 'simulator'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-90 -translate-y-1'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50">
              <Beaker className="w-5 h-5 text-emerald-400 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="font-mono font-black text-xs sm:text-sm text-emerald-300 uppercase block tracking-wider">
                STATION 1: REACTION SIMULATOR
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono">
                Free Mixing • Precipitation • Color &amp; Gas Reactions
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`relative z-20 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 shadow-2xl transition-all duration-300 ${
              hoveredStation === 'simulator'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
          >
            <LogIn className="w-4 h-4" /> Step Up to Apparatus
          </button>
        </div>

        {/* Station 2: Acid-Base Titration */}
        <div
          data-testid="chem-station-titration"
          style={{ left: '52%', top: '22%', width: '43%', height: '64%' }}
          onMouseEnter={() => {
            soundManager.playClick();
            setHoveredStation('titration');
          }}
          onMouseLeave={() => setHoveredStation(null)}
          onClick={() => handleStationClick('titration')}
          className="absolute cursor-pointer rounded-2xl group transition-all duration-300 flex flex-col items-center justify-between p-4"
        >
          <div
            className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
              hoveredStation === 'titration'
                ? 'border-cyan-400 bg-cyan-950/25 shadow-[0_0_50px_rgba(6,182,212,0.7)] scale-[1.01]'
                : 'border-transparent hover:border-cyan-500/30'
            }`}
          />
          <div
            className={`relative z-20 border border-cyan-500/70 bg-slate-950/90 px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 shadow-2xl backdrop-blur-md ${
              hoveredStation === 'titration'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-90 -translate-y-1'
            }`}
          >
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/50">
              <Pipette className="w-5 h-5 text-cyan-400 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="font-mono font-black text-xs sm:text-sm text-cyan-300 uppercase block tracking-wider">
                STATION 2: ACID-BASE TITRATION
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono">
                Burette Stopcock • Phenolphthalein Pink • pH Molarity
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`relative z-20 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 shadow-2xl transition-all duration-300 ${
              hoveredStation === 'titration'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
          >
            <LogIn className="w-4 h-4" /> Step Up to Apparatus
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar with 3D Workbench Switch */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/90 border border-slate-700/60 text-xs font-mono backdrop-blur-md shadow-2xl">
          <button
            type="button"
            onClick={() => handleStationClick('simulator')}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Reaction Simulator</span>
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => handleStationClick('titration')}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Acid-Base Titration</span>
          </button>
          {onSwitchTo3D && (
            <>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                data-testid="chem-switch-3d-btn"
                onClick={() => {
                  soundManager.playClick();
                  onSwitchTo3D();
                }}
                className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors font-bold cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D WebGL Workbench</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

