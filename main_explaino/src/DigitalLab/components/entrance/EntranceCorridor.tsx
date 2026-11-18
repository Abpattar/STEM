import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { LabType } from '../../types/laboratory';
import { soundManager } from '../../audio/SoundManager';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { Atom, FlaskConical, Microscope, Sparkles, ArrowRight } from 'lucide-react';

interface EntranceCorridorProps {
  onEnterLab: (lab: LabType) => void;
}

// Natural dimensions of /science-assets/futuristic_doors.jpg (1376 x 768)
const DOOR_IMAGE_WIDTH = 1376;
const DOOR_IMAGE_HEIGHT = 768;
const DOOR_IMAGE_ASPECT = DOOR_IMAGE_WIDTH / DOOR_IMAGE_HEIGHT;

interface DoorSpec {
  id: 'physics' | 'chemistry' | 'biology';
  title: string;
  subtitle: string;
  cta: string;
  /** Exact percentage bounds of the glowing door frame inside futuristic_doors.jpg */
  left: string;
  top: string;
  width: string;
  height: string;
  originX: string;
  ambientClass: string;
  frameIdleClass: string;
  frameHoverClass: string;
  cardBorderClass: string;
  cardGlowClass: string;
  iconWrapClass: string;
  subtitleClass: string;
  ctaClass: string;
  icon: React.ReactNode;
}

const DOORS: DoorSpec[] = [
  {
    id: 'physics',
    title: 'PHYSICS LAB',
    subtitle: 'Mechanics, Optics, Circuits & 3D Solar Orrery',
    cta: 'Enter Physics',
    left: '7.25%',
    top: '29.0%',
    width: '20.7%',
    height: '45.0%',
    originX: '17.6%',
    ambientClass: 'bg-cyan-600/20',
    frameIdleClass: 'border-cyan-400/25 hover:border-cyan-400/70 bg-transparent',
    frameHoverClass:
      'border-cyan-400 bg-cyan-950/25 shadow-[0_0_40px_rgba(6,182,212,0.55),inset_0_0_24px_rgba(6,182,212,0.28)]',
    cardBorderClass: 'border-cyan-500/45',
    cardGlowClass: 'shadow-[0_0_24px_rgba(6,182,212,0.4)]',
    iconWrapClass: 'bg-cyan-950/80 border-cyan-400/60 text-cyan-400',
    subtitleClass: 'text-cyan-200',
    ctaClass: 'bg-cyan-400 text-slate-950',
    icon: <Atom className="w-4 h-4 sm:w-5 sm:h-5" />,
  },
  {
    id: 'chemistry',
    title: 'CHEMISTRY LAB',
    subtitle: '3D Workbench, Pipette Reactions & Titration',
    cta: 'Enter Chemistry',
    left: '39.5%',
    top: '29.0%',
    width: '20.9%',
    height: '45.0%',
    originX: '50.0%',
    ambientClass: 'bg-emerald-600/20',
    frameIdleClass: 'border-emerald-400/25 hover:border-emerald-400/70 bg-transparent',
    frameHoverClass:
      'border-emerald-400 bg-emerald-950/25 shadow-[0_0_40px_rgba(16,185,129,0.55),inset_0_0_24px_rgba(16,185,129,0.28)]',
    cardBorderClass: 'border-emerald-500/45',
    cardGlowClass: 'shadow-[0_0_24px_rgba(16,185,129,0.4)]',
    iconWrapClass: 'bg-emerald-950/80 border-emerald-400/60 text-emerald-400',
    subtitleClass: 'text-emerald-200',
    ctaClass: 'bg-emerald-400 text-slate-950',
    icon: <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />,
  },
  {
    id: 'biology',
    title: 'BIOLOGY LAB',
    subtitle: 'Compound Microscope & Flower Dissection',
    cta: 'Enter Biology',
    left: '72.25%',
    top: '29.0%',
    width: '20.2%',
    height: '45.0%',
    originX: '82.4%',
    ambientClass: 'bg-purple-600/20',
    frameIdleClass: 'border-purple-400/25 hover:border-purple-400/70 bg-transparent',
    frameHoverClass:
      'border-purple-400 bg-purple-950/25 shadow-[0_0_40px_rgba(168,85,247,0.55),inset_0_0_24px_rgba(168,85,247,0.28)]',
    cardBorderClass: 'border-purple-500/45',
    cardGlowClass: 'shadow-[0_0_24px_rgba(168,85,247,0.4)]',
    iconWrapClass: 'bg-purple-950/80 border-purple-400/60 text-purple-400',
    subtitleClass: 'text-purple-200',
    ctaClass: 'bg-purple-400 text-slate-950',
    icon: <Microscope className="w-4 h-4 sm:w-5 sm:h-5" />,
  },
];

export const EntranceCorridor: React.FC<EntranceCorridorProps> = ({ onEnterLab }) => {
  const { settings } = useAccessibility();
  const [hoveredDoor, setHoveredDoor] = useState<'physics' | 'chemistry' | 'biology' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Keep the background image and interactive door overlays inside one exact aspect-locked stage
  // so the clickable squares align pixel-for-pixel with the painted blast doors at any viewport size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateStageSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const bleed = 1.03;
      const containerAspect = rect.width / rect.height;
      let width: number;
      let height: number;

      if (containerAspect > DOOR_IMAGE_ASPECT) {
        width = rect.width * bleed;
        height = width / DOOR_IMAGE_ASPECT;
      } else {
        height = rect.height * bleed;
        width = height * DOOR_IMAGE_ASPECT;
      }

      setStageSize({ width: Math.ceil(width), height: Math.ceil(height) });
    };

    updateStageSize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateStageSize);
      observer.observe(container);
    }
    window.addEventListener('resize', updateStageSize);

    return () => {
      window.removeEventListener('resize', updateStageSize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const stageEl = stageRef.current;
    return () => {
      if (stageEl) {
        gsap.killTweensOf(stageEl);
      }
    };
  }, []);

  // Subtle mouse parallax moving BOTH the corridor image AND the aligned door squares together
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTransitioning || settings.reduceMotion || !stageRef.current) return;
    const { clientX, clientY, currentTarget } = e;
    const rect = currentTarget.getBoundingClientRect();
    const xPct = (clientX - rect.left) / rect.width - 0.5;
    const yPct = (clientY - rect.top) / rect.height - 0.5;

    gsap.to(stageRef.current, {
      x: -xPct * 12,
      y: -yPct * 8,
      duration: 0.65,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleDoorClick = (door: DoorSpec) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    soundManager.playDoorSlide();

    if (settings.reduceMotion || !stageRef.current) {
      onEnterLab(door.id);
      return;
    }

    gsap.to(stageRef.current, {
      scale: 2.3,
      transformOrigin: `${door.originX} 51.5%`,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.in',
      onComplete: () => {
        onEnterLab(door.id);
      },
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      data-testid="science-corridor"
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none flex items-center justify-center"
    >
      {/* Aspect-Locked Corridor Stage: Background + Aligned Door Squares share one coordinate space */}
      <div
        ref={stageRef}
        className="relative shrink-0 will-change-transform"
        style={
          stageSize
            ? { width: `${stageSize.width}px`, height: `${stageSize.height}px` }
            : { width: '100%', height: '100%' }
        }
      >
        <img
          src="/science-assets/futuristic_doors.jpg"
          alt="Futuristic Science Kingdom Blast Doors"
          className="w-full h-full object-cover object-center brightness-95 block"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/75 pointer-events-none" />

        {/* Dynamic Atmospheric Ambient Glow matching the hovered Futuristic Door */}
        {DOORS.map((door) => (
          <div
            key={`ambient-${door.id}`}
            className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
              hoveredDoor === door.id ? `opacity-30 ${door.ambientClass}` : 'opacity-0'
            }`}
          />
        ))}

        {/* Interactive Blast Door Squares — locked pixel-for-pixel to the 3 painted neon door frames */}
        {DOORS.map((door) => {
          const isHovered = hoveredDoor === door.id;
          return (
            <div
              key={door.id}
              style={{
                left: door.left,
                top: door.top,
                width: door.width,
                height: door.height,
              }}
              className={`absolute z-10 transition-opacity duration-300 ${
                isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              {/* Exact Door Frame Hitbox & Glowing Square */}
              <button
                type="button"
                data-testid={`door-${door.id}`}
                aria-label={`Enter ${door.title}`}
                onMouseEnter={() => {
                  setHoveredDoor(door.id);
                  soundManager.playClick();
                }}
                onMouseLeave={() => setHoveredDoor(null)}
                onClick={() => handleDoorClick(door)}
                className={`w-full h-full rounded-2xl border-2 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  isHovered ? door.frameHoverClass : door.frameIdleClass
                }`}
              />

              {/* Compact Label Card centered neatly beneath its aligned door frame */}
              <button
                type="button"
                onMouseEnter={() => {
                  setHoveredDoor(door.id);
                  soundManager.playClick();
                }}
                onMouseLeave={() => setHoveredDoor(null)}
                onClick={() => handleDoorClick(door)}
                className={`absolute left-1/2 -translate-x-1/2 top-[calc(100%+10px)] w-[96%] max-w-[260px] px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl bg-slate-900/92 border ${door.cardBorderClass} backdrop-blur-md text-center cursor-pointer transition-all duration-300 ${
                  isHovered ? `scale-105 ${door.cardGlowClass}` : 'opacity-95 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 ${door.iconWrapClass}`}
                  >
                    {door.icon}
                  </span>
                  <h3 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-wider uppercase font-mono truncate">
                    {door.title}
                  </h3>
                </div>
                <p className={`text-[10px] sm:text-[11px] ${door.subtitleClass} mt-1 line-clamp-1 font-sans`}>
                  {door.subtitle}
                </p>
                <div
                  className={`mt-2 inline-flex items-center gap-1 text-[10px] sm:text-xs font-mono font-bold px-3 py-1 rounded-full shadow-md ${door.ctaClass}`}
                >
                  <span>{door.cta}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Futuristic Title Header (positioned cleanly above the 3 door frames) */}
      <div
        className={`absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 text-center z-20 transition-all duration-500 pointer-events-none w-full max-w-2xl px-4 ${
          isTransitioning ? 'opacity-0 -translate-y-6' : 'opacity-100'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-400 text-[11px] font-mono font-bold tracking-widest uppercase mb-1.5 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Kingdom of Science • High-Tech Digital Wing</span>
        </div>
        <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
          CHOOSE YOUR{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400">
            SECTOR
          </span>
        </h2>
        <p className="text-slate-300 text-[11px] sm:text-xs max-w-xl mx-auto mt-1 font-mono drop-shadow-md">
          Hover over any airlock blast door to scan systems, or click to enter the laboratory!
        </p>
      </div>
    </div>
  );
};
