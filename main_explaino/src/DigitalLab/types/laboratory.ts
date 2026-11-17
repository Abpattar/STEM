export type LabType = 'corridor' | 'physics' | 'chemistry' | 'biology';

export interface DialogueStep {
  id: string;
  speaker: 'Senku Ishigami' | 'Mecha Senku';
  text: string;
  expression?: 'confident' | 'excited' | 'thinking' | 'explaining' | 'serious';
  highlightTarget?: string;
}

export interface ChemicalReagent {
  id: string;
  name: string;
  formula: string;
  color: string;
  state: 'liquid' | 'powder' | 'indicator';
  description: string;
  ph?: number;
  hazards?: string[];
}

export interface ChemicalReactionResult {
  title: string;
  equation: string;
  explanation: string;
  visualEffect:
    | 'none'
    | 'bubbles'
    | 'smoke'
    | 'precipitate'
    | 'color_change'
    | 'heat'
    | 'explosion'
    | 'glow';
  resultColor: string;
  precipitateColor?: string;
  temperatureChange: 'exothermic' | 'endothermic' | 'neutral';
  ph: number;
  senkuCommentary: string;
  isHazardous: boolean;
}

export interface SpecimenData {
  id: string;
  name: string;
  type: 'plant' | 'animal' | 'tissue';
  stain: string;
  description: string;
  organelles: {
    id: string;
    name: string;
    function: string;
    x: number;
    y: number;
    color: string;
  }[];
  magnificationLevels: {
    power: '4x' | '10x' | '40x' | '100x';
    scale: number;
    description: string;
  }[];
}

export interface AstronomyTarget {
  id: string;
  name: string;
  type: 'planet' | 'star' | 'moon';
  distance: string;
  diameter: string;
  temperature: string;
  description: string;
  color: string;
  hasRings?: boolean;
  orbitalPeriod?: string;
  gravity?: string;
  escapeVelocity?: string;
  atmosphere?: string;
  moonsCount?: number;
  isroData?: {
    missionHighlight: string;
    keyAchievement: string;
    spacecraft?: string[];
  };
  nasaData?: {
    missionHighlight: string;
    keyFact: string;
    spacecraft?: string[];
  };
}

