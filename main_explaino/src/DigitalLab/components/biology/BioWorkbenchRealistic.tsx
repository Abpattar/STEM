import React, { useState, useRef, useEffect } from 'react';
import { soundManager } from '../../audio/SoundManager';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { Microscope, Flower2, LogIn } from 'lucide-react';

interface BioWorkbenchRealisticProps {
  onSelectStation: (station: 'microscopy' | 'dissection') => void;
}

export const BioWorkbenchRealistic: React.FC<BioWorkbenchRealisticProps> = ({ onSelectStation }) => {
  const { settings } = useAccessibility();
  const [hoveredStation, setHoveredStation] = useState<'microscopy' | 'dissection' | null>(null);
  const [zoomingStation, setZoomingStation] = useState<'microscopy' | 'dissection' | null>(null);
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

  const handleStationClick = (station: 'microscopy' | 'dissection') => {
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
        station === 'microscopy'
          ? 'scale(1.85) translate(18%, -4%)'
          : 'scale(1.85) translate(-18%, -4%)';
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
      data-testid="biology-workbench-table"
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 flex items-center justify-center cursor-default pt-14"
    >
      <img
        ref={imageRef}
        src="/science-assets/bio_workbench_realistic.jpg"
        alt="Photorealistic Futuristic Biology Laboratory Workbench Table"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform will-change-transform scale-[1.02]"
      />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/60" />

      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center px-4 w-full max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-purple-500/40 text-purple-400 text-[11px] font-mono tracking-widest uppercase mb-1 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span>Interactive Biology Workbench</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] uppercase font-mono">
          THE SCIENCE KINGDOM • BIOLOGY
        </h2>
        <p className="text-purple-200/90 text-xs sm:text-sm drop-shadow font-mono tracking-wide">
          Select either apparatus on the laboratory table to step up and begin
        </p>
      </div>

      <div className={`absolute inset-0 z-10 ${zoomingStation ? 'pointer-events-none opacity-0 transition-opacity duration-300' : ''}`}>
        {/* Station 1: Compound Microscope */}
        <div
          data-testid="bio-station-microscopy"
          style={{ left: '5%', top: '24%', width: '43%', height: '62%' }}
          onMouseEnter={() => {
            soundManager.playClick();
            setHoveredStation('microscopy');
          }}
          onMouseLeave={() => setHoveredStation(null)}
          onClick={() => handleStationClick('microscopy')}
          className="absolute cursor-pointer rounded-2xl group transition-all duration-300 flex flex-col items-center justify-between p-4"
        >
          <div
            className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
              hoveredStation === 'microscopy'
                ? 'border-purple-400 bg-purple-950/25 shadow-[0_0_50px_rgba(168,85,247,0.7)] scale-[1.01]'
                : 'border-transparent hover:border-purple-500/30'
            }`}
          />
          <div
            className={`relative z-20 border border-purple-500/70 bg-slate-950/90 px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 shadow-2xl backdrop-blur-md ${
              hoveredStation === 'microscopy'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-90 -translate-y-1'
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-500/50">
              <Microscope className="w-5 h-5 text-purple-400 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="font-mono font-black text-xs sm:text-sm text-purple-300 uppercase block tracking-wider">
                STATION 1: COMPOUND MICROSCOPE
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono">
                Cellular Optics • Onion Peel • Cheek Cell • Leaf Stomata
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`relative z-20 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 shadow-2xl transition-all duration-300 ${
              hoveredStation === 'microscopy'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
          >
            <LogIn className="w-4 h-4" /> Step Up to Microscope
          </button>
        </div>

        {/* Station 2: Flower Dissection */}
        <div
          data-testid="bio-station-dissection"
          style={{ left: '52%', top: '24%', width: '43%', height: '62%' }}
          onMouseEnter={() => {
            soundManager.playClick();
            setHoveredStation('dissection');
          }}
          onMouseLeave={() => setHoveredStation(null)}
          onClick={() => handleStationClick('dissection')}
          className="absolute cursor-pointer rounded-2xl group transition-all duration-300 flex flex-col items-center justify-between p-4"
        >
          <div
            className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
              hoveredStation === 'dissection'
                ? 'border-rose-400 bg-rose-950/25 shadow-[0_0_50px_rgba(244,63,94,0.7)] scale-[1.01]'
                : 'border-transparent hover:border-rose-500/30'
            }`}
          />
          <div
            className={`relative z-20 border border-rose-500/70 bg-slate-950/90 px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 shadow-2xl backdrop-blur-md ${
              hoveredStation === 'dissection'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-90 -translate-y-1'
            }`}
          >
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50">
              <Flower2 className="w-5 h-5 text-rose-400 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="font-mono font-black text-xs sm:text-sm text-rose-300 uppercase block tracking-wider">
                STATION 2: HIBISCUS FLOWER DISSECTION
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono">
                Calyx, Staminal Tube &amp; Ovary • Scalpel &amp; Pin Practical
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`relative z-20 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 shadow-2xl transition-all duration-300 ${
              hoveredStation === 'dissection'
                ? 'scale-105 opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
          >
            <LogIn className="w-4 h-4" /> Step Up to Dissection
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/85 border border-slate-700/60 text-xs font-mono backdrop-blur-md shadow-2xl">
          <button
            type="button"
            onClick={() => handleStationClick('microscopy')}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Station 1: Compound Microscope</span>
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => handleStationClick('dissection')}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>Station 2: Hibiscus Flower Dissection</span>
          </button>
        </div>
      </div>
    </div>
  );
};

