import React, { useState, useEffect } from 'react';
import { PendulumStation } from './PendulumStation';
import { OpticsBench } from './OpticsBench';
import { CircuitStation } from './CircuitStation';
import { AstronomyStation } from './AstronomyStation';
import { MechanicsStation } from './MechanicsStation';
import { PhysWorkbenchRealistic } from './PhysWorkbenchRealistic';
import { UnthinkableCosmicPhysics } from './UnthinkableCosmicPhysics';
import { soundManager } from '../../audio/SoundManager';
import {
  Activity,
  Sparkles,
  Zap,
  Orbit,
  Sliders,
  ArrowLeft,
  Rocket,
  Atom,
} from 'lucide-react';

interface PhysicsLabProps {
  onBackToCorridor: () => void;
  onStationContextChange?: (conceptKey: string) => void;
}

export const PhysicsLab: React.FC<PhysicsLabProps> = ({
  onStationContextChange,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'classical' | 'unthinkable'>('table');
  const [classicalTab, setClassicalTab] = useState<
    'mechanics' | 'optics' | 'pendulum' | 'circuits' | 'astronomy'
  >('mechanics');

  useEffect(() => {
    if (!onStationContextChange) return;
    if (viewMode === 'table') {
      onStationContextChange('physics:table');
    } else if (viewMode === 'unthinkable') {
      onStationContextChange('physics:unthinkable');
    } else {
      onStationContextChange(`physics:${classicalTab}`);
    }
  }, [viewMode, classicalTab, onStationContextChange]);

  const handleSelectFromTable = (station: 'classical' | 'unthinkable') => {
    setViewMode(station);
    soundManager.playClick();
  };

  if (viewMode === 'table') {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <PhysWorkbenchRealistic onSelectStation={handleSelectFromTable} />
      </div>
    );
  }

  if (viewMode === 'classical' && classicalTab === 'astronomy') {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <AstronomyStation onBackToLab={() => setClassicalTab('mechanics')} />
      </div>
    );
  }

  return (
    <div
      data-testid="physics-lab-active"
      className="relative w-full h-full overflow-hidden flex flex-col pt-16 pb-3 px-3 sm:px-6 bg-slate-950"
    >
      <img
        src="/science-assets/futuristic_phys_lab.jpg"
        alt="Futuristic Physics Laboratory Background"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none opacity-40 brightness-85"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/95" />

      {/* Top Navigation & Station Selector Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="physics-back-workbench"
            onClick={() => {
              soundManager.playDoorSlide();
              setViewMode('table');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Back to Workbench</span>
          </button>

          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-700 shadow-md">
            <button
              type="button"
              data-testid="physics-mode-classical"
              onClick={() => {
                soundManager.playClick();
                setViewMode('classical');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'classical'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Atom className="w-3.5 h-3.5" /> 1. Classical STEM Lab
            </button>
            <button
              type="button"
              data-testid="physics-mode-unthinkable"
              onClick={() => {
                soundManager.playClick();
                setViewMode('unthinkable');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'unthinkable'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" /> 2. Unthinkable Cosmic Physics
            </button>
          </div>
        </div>

        {/* Sub-Tabs for Classical Lab */}
        {viewMode === 'classical' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'mechanics', label: 'Mechanics', icon: Sliders },
              { id: 'optics', label: 'Optics Bench', icon: Sparkles },
              { id: 'pendulum', label: 'Pendulum', icon: Activity },
              { id: 'circuits', label: 'Circuits', icon: Zap },
              { id: 'astronomy', label: '3D Astronomy', icon: Orbit },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = classicalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`physics-tab-${tab.id}`}
                  onClick={() => {
                    soundManager.playClick();
                    setClassicalTab(tab.id as typeof classicalTab);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Active Workspace Stage */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
        {viewMode === 'classical' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-0.5">
            {classicalTab === 'mechanics' && <MechanicsStation />}
            {classicalTab === 'optics' && <OpticsBench />}
            {classicalTab === 'pendulum' && <PendulumStation />}
            {classicalTab === 'circuits' && <CircuitStation />}
          </div>
        )}

        {viewMode === 'unthinkable' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <UnthinkableCosmicPhysics />
          </div>
        )}
      </div>
    </div>
  );
};

