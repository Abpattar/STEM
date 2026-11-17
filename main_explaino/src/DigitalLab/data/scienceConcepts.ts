/**
 * Canonical Science Kingdom -> StudentLearningContext concept registry.
 *
 * STRICT POLICY:
 * - Only conceptIds verified from EXO's live curriculum catalog (/api/tutor/catalog)
 *   are mapped here.
 * - Where no verified canonical conceptId exists in EXO's catalog (e.g., Simple
 *   Harmonic Pendulum), conceptId is explicitly null while still recording subject
 *   and currentActivity.
 * - Opening or completing an experiment NEVER falsely marks a concept as mastered.
 */

export interface ScienceConceptMapping {
  subject: 'Science' | 'Physics' | 'Chemistry' | 'Biology';
  /** Verified canonical EXO conceptId, or null if no canonical match exists yet. */
  conceptId: string | null;
  /** Human-readable concept/experiment title. */
  conceptTitle: string;
  /** Activity identifier for StudentLearningContext.currentActivity. */
  activity: string;
  /** Optional note if proposed for future canonical catalog addition. */
  proposedConceptNote?: string;
}

export const SCIENCE_CONCEPT_MAP: Record<string, ScienceConceptMapping> = {
  // Corridor
  corridor: {
    subject: 'Science',
    conceptId: null,
    conceptTitle: 'Science Kingdom Digital Lab',
    activity: 'science-corridor',
  },

  // Physics Lab & Stations
  'physics:table': {
    subject: 'Physics',
    conceptId: 'science-9-8',
    conceptTitle: 'Force and Laws of Motion',
    activity: 'physics-workbench',
  },
  'physics:mechanics': {
    subject: 'Physics',
    conceptId: 'science-9-8',
    conceptTitle: 'Force and Laws of Motion',
    activity: 'physics-mechanics-station',
  },
  'physics:optics': {
    subject: 'Physics',
    conceptId: 'refraction',
    conceptTitle: 'Refraction and lenses',
    activity: 'physics-optics-bench',
  },
  'physics:circuits': {
    subject: 'Physics',
    conceptId: 'circuits',
    conceptTitle: 'Series and parallel circuits',
    activity: 'physics-circuit-station',
  },
  'physics:pendulum': {
    subject: 'Physics',
    conceptId: null,
    conceptTitle: 'Simple Pendulum & Harmonic Motion',
    activity: 'physics-pendulum-station',
    proposedConceptNote:
      'No dedicated pendulum/SHM conceptId exists in EXO catalog yet (closest general topic: science-9-9 Gravitation). Kept null per canonical integrity rule.',
  },
  'physics:astronomy': {
    subject: 'Physics',
    conceptId: 'orbit-motion',
    conceptTitle: 'Why the Moon stays in orbit',
    activity: 'physics-astronomy-orrery',
  },
  'physics:unthinkable': {
    subject: 'Physics',
    conceptId: 'gravity-basics',
    conceptTitle: 'How gravity pulls objects',
    activity: 'physics-cosmic-gravity',
  },

  // Chemistry Lab & Stations
  'chemistry:table': {
    subject: 'Chemistry',
    conceptId: 'chemical-reactions',
    conceptTitle: 'Chemical equations',
    activity: 'chemistry-workbench',
  },
  'chemistry:table3d': {
    subject: 'Chemistry',
    conceptId: 'chemical-reactions',
    conceptTitle: 'Chemical equations',
    activity: 'chemistry-3d-workbench',
  },
  'chemistry:simulator': {
    subject: 'Chemistry',
    conceptId: 'chemical-reactions',
    conceptTitle: 'Chemical equations',
    activity: 'chemistry-reaction-simulator',
  },
  'chemistry:titration': {
    subject: 'Chemistry',
    conceptId: 'acids-bases',
    conceptTitle: 'Acids, bases and indicators',
    activity: 'chemistry-acid-base-titration',
  },

  // Biology Lab & Stations
  'biology:table': {
    subject: 'Biology',
    conceptId: 'science-9-5',
    conceptTitle: 'The Fundamental Unit of Life',
    activity: 'biology-workbench',
  },
  'biology:microscopy': {
    subject: 'Biology',
    conceptId: 'science-9-5',
    conceptTitle: 'The Fundamental Unit of Life',
    activity: 'biology-microscopy',
  },
  'biology:specimen:onion_peel': {
    subject: 'Biology',
    conceptId: 'science-9-5',
    conceptTitle: 'The Fundamental Unit of Life',
    activity: 'biology-microscopy-onion-peel',
  },
  'biology:specimen:cheek_cell': {
    subject: 'Biology',
    conceptId: 'science-9-5',
    conceptTitle: 'The Fundamental Unit of Life',
    activity: 'biology-microscopy-cheek-cell',
  },
  'biology:specimen:leaf_stomata': {
    subject: 'Biology',
    conceptId: 'photosynthesis',
    conceptTitle: 'Photosynthesis',
    activity: 'biology-microscopy-leaf-stomata',
  },
  'biology:dissection': {
    subject: 'Biology',
    conceptId: 'reproduction',
    conceptTitle: 'Reproduction and variation',
    activity: 'biology-flower-dissection',
  },
};

export function getScienceConcept(key: string): ScienceConceptMapping {
  return SCIENCE_CONCEPT_MAP[key] || SCIENCE_CONCEPT_MAP.corridor;
}

