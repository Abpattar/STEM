import type { StudentLearningState } from '../../context/StudentLearningContext';
import type { Concept, SharedLearningContextPayload } from '../types/exo';

function isMathConceptId(id: string | null | undefined): boolean {
  if (!id) return false;
  const lower = id.toLowerCase();
  return (
    lower.startsWith('maths-') ||
    lower.startsWith('alg.') ||
    lower.startsWith('geo.') ||
    lower.startsWith('trig.') ||
    lower.startsWith('stat.') ||
    lower.startsWith('prob.') ||
    lower.startsWith('num.') ||
    lower.startsWith('calc.') ||
    lower.includes('quad') ||
    lower.includes('linear') ||
    lower.includes('poly') ||
    lower.includes('pythag')
  );
}

/**
 * Extracts a clean, backend-safe cross-module context snapshot from NILO's
 * StudentLearningContext before EXO overwrites activeModule='exo'.
 */
export function buildIncomingLearningContext(
  state: StudentLearningState
): SharedLearningContextPayload | null {
  const sourceModule =
    state.activeModule === 'math' || state.activeModule === 'science'
      ? state.activeModule
      : state.previousModule === 'math' || state.previousModule === 'science'
      ? state.previousModule
      : null;

  const hasContext = Boolean(
    sourceModule ||
      state.activeSubject ||
      state.activeConceptId ||
      state.activeConceptTitle ||
      (state.currentActivity && state.currentActivity !== 'dashboard')
  );

  if (!hasContext) return null;

  // Guard against stale conceptId/title left over from an opposite module
  // (e.g., visiting Chemistry 'acids-bases' and then opening MathNoteBook without picking a math problem yet)
  const isStaleCrossModuleConcept =
    (sourceModule === 'math' &&
      state.activeConceptId !== null &&
      !isMathConceptId(state.activeConceptId)) ||
    (sourceModule === 'science' &&
      state.activeConceptId !== null &&
      isMathConceptId(state.activeConceptId));

  return {
    previousModule: sourceModule ?? state.previousModule ?? null,
    activeSubject:
      state.activeSubject ??
      (sourceModule === 'math'
        ? 'Mathematics'
        : sourceModule === 'science'
        ? 'Science'
        : null),
    activeConceptId: isStaleCrossModuleConcept ? null : state.activeConceptId ?? null,
    activeConceptTitle: isStaleCrossModuleConcept
      ? null
      : state.activeConceptTitle ?? null,
    currentActivity:
      state.currentActivity && state.currentActivity !== 'dashboard'
        ? state.currentActivity
        : null,
    gradeLevel: state.gradeLevel ?? null,
  };
}

/**
 * Resolves the best matching verified catalog Concept for the incoming NILO context,
 * without ever inventing fake canonical IDs.
 */
export function resolveCatalogConceptFromNilo(
  catalog: Concept[],
  ctx: SharedLearningContextPayload | null
): Concept | null {
  if (!ctx || catalog.length === 0) return null;

  const expectMath =
    ctx.previousModule === 'math' ||
    (ctx.activeSubject || '').toLowerCase().includes('math');
  const expectScience =
    !expectMath &&
    (ctx.previousModule === 'science' ||
      ['science', 'physics', 'chemistry', 'biology'].some((s) =>
        (ctx.activeSubject || '').toLowerCase().includes(s)
      ));

  // 1. Direct verified canonical ID match (subject-compatible)
  if (ctx.activeConceptId) {
    const exact = catalog.find((c) => c.id === ctx.activeConceptId);
    if (exact) {
      const exactIsMath = exact.subject === 'Mathematics';
      if ((!expectMath || exactIsMath) && (!expectScience || !exactIsMath)) {
        return exact;
      }
    }

    // 2. Map MathNoteBook concept prefixes to verified EXO Class 10/9 Mathematics catalog IDs
    const cid = ctx.activeConceptId.toLowerCase();
    if (cid.includes('quad')) {
      return catalog.find((c) => c.id === 'maths-10-preview-4') || null;
    }
    if (cid.includes('linear') || cid.includes('alg.')) {
      return catalog.find((c) => c.id === 'maths-10-preview-3') || null;
    }
    if (cid.includes('trig')) {
      return catalog.find((c) => c.id === 'maths-10-preview-8') || null;
    }
    if (cid.includes('poly')) {
      return catalog.find((c) => c.id === 'maths-10-preview-2') || null;
    }
    if (cid.includes('tri') || cid.includes('pythag')) {
      return catalog.find((c) => c.id === 'maths-10-preview-6') || null;
    }
    if (cid.includes('circle')) {
      return catalog.find((c) => c.id === 'maths-10-preview-10') || null;
    }
    if (cid.includes('coord')) {
      return catalog.find((c) => c.id === 'maths-10-preview-7') || null;
    }
    if (cid.includes('prob')) {
      return catalog.find((c) => c.id === 'maths-10-preview-14') || null;
    }
    if (cid.includes('stat')) {
      return catalog.find((c) => c.id === 'maths-10-preview-13') || null;
    }
  }

  // 3. Subject/title fallback when activeConceptId is null (e.g., Pendulum Motion -> Physics/Gravitation shelf)
  const titleLower = (ctx.activeConceptTitle || '').toLowerCase();
  const subjectLower = (ctx.activeSubject || '').toLowerCase();

  if (titleLower.includes('pendulum') || titleLower.includes('gravity')) {
    return (
      catalog.find((c) => c.id === 'science-9-9') ||
      catalog.find((c) => c.id === 'gravity-basics') ||
      null
    );
  }
  if (subjectLower.includes('math')) {
    return catalog.find((c) => c.subject === 'Mathematics' && c.grade === 10) || null;
  }
  if (subjectLower.includes('chem')) {
    return catalog.find((c) => c.id === 'chemical-reactions') || null;
  }
  if (subjectLower.includes('phys')) {
    return catalog.find((c) => c.id === 'science-9-8') || null;
  }
  if (subjectLower.includes('bio')) {
    return catalog.find((c) => c.id === 'photosynthesis') || null;
  }

  return null;
}

/**
 * Generates contextual starter greeting & quick prompts when arriving from MathNoteBook or Science Kingdom.
 */
export function buildContextualGreeting(
  ctx: SharedLearningContextPayload | null
): { greeting: string; suggestions: string[] } {
  if (!ctx) {
    return {
      greeting:
        "Hey! I'm EXO. What would you like to understand today?",
      suggestions: [
        "I don't understand electricity",
        'Explain photosynthesis simply',
        'Give me a quick science check',
      ],
    };
  }

  const label = ctx.activeConceptTitle || ctx.activeSubject || 'your last activity';

  if (ctx.previousModule === 'science') {
    return {
      greeting: `Hi, I'm EXO! I see you were just exploring ${label}${
        ctx.activeSubject ? ` in Science Kingdom (${ctx.activeSubject})` : ' in Science Kingdom'
      }. Want to unpack why what you observed happened, or ask a question about the experiment?`,
      suggestions: [
        `Why does ${label.toLowerCase()} behave that way?`,
        'Let me explain what I observed in the lab',
        'Give me a quick check on this topic',
      ],
    };
  }

  if (ctx.previousModule === 'math') {
    return {
      greeting: `Hi, I'm EXO! I see you were just working on ${label} in MathNoteBook Scratchpad. Would you like to talk through one of the steps or check why an algebraic move works?`,
      suggestions: [
        `Explain the key idea behind ${label.toLowerCase()}`,
        'Why do we perform the same operation on both sides?',
        'Give me a quick practice check',
      ],
    };
  }

  return {
    greeting: `Hi, I'm EXO. We can explore ${label} together — ask any question or explain what you already know.`,
    suggestions: [
      `I have a question about ${label.toLowerCase()}`,
      'Let me explain what I already know',
      'Give me a quick check',
    ],
  };
}

export interface ModuleRecommendation {
  target: 'scratchpad' | 'digitallab';
  label: string;
  description: string;
}

/**
 * Suggests the appropriate NILO hands-on module (MathNoteBook Scratchpad or Science Kingdom Digital Lab)
 * for the currently selected EXO concept.
 */
export function recommendedNiloModuleForConcept(
  concept: Concept | undefined,
  subject: string
): ModuleRecommendation {
  const isMath =
    concept?.subject === 'Mathematics' || subject.toLowerCase().includes('math');

  if (isMath) {
    return {
      target: 'scratchpad',
      label: 'Open in MathNoteBook Scratchpad',
      description:
        'Work through equations, visualizers, step verification, and practice inside NILO Scratchpad.',
    };
  }

  return {
    target: 'digitallab',
    label: 'Explore in Science Kingdom Lab',
    description:
      'Test this science idea hands-on in Physics, Chemistry, or Biology inside NILO Digital Lab.',
  };
}

