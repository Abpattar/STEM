import { SCIENCE_API_ENDPOINTS } from '../../services/api/scienceApi';
import { ChemicalReactionResult } from '../types/laboratory';

export interface SenkuQuestionResponse {
  ok: boolean;
  configured: boolean;
  answer?: string;
  error?: string;
}

export interface ScienceAiHealthResponse {
  healthy: boolean;
  aiConfigured: boolean;
  model: string | null;
}

/**
 * Checks whether the server-side Science AI backend is reachable and has credentials configured.
 * Zero credentials ever reside in browser code.
 */
export async function checkScienceAiHealth(): Promise<ScienceAiHealthResponse> {
  try {
    const res = await fetch(SCIENCE_API_ENDPOINTS.health());
    if (!res.ok) {
      return { healthy: false, aiConfigured: false, model: null };
    }
    const data = await res.json();
    return {
      healthy: data.status === 'healthy',
      aiConfigured: Boolean(data.ai_configured),
      model: data.model ?? null,
    };
  } catch {
    return { healthy: false, aiConfigured: false, model: null };
  }
}

/**
 * Sends a student's question to Senku AI via the server-side /api/science/ai endpoint.
 * Returns an explicit structured unavailable state when server credentials are missing.
 */
export async function askSenkuQuestion(
  question: string,
  contextLab: string = 'general'
): Promise<SenkuQuestionResponse> {
  try {
    const response = await fetch(SCIENCE_API_ENDPOINTS.ai(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'qa',
        question,
        contextLab,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 503 && data?.configured === false) {
      return {
        ok: false,
        configured: false,
        error:
          data.detail ||
          'Senku AI is currently unavailable because server-side AI credentials are not configured.',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        configured: data?.configured ?? true,
        error:
          data?.detail ||
          `Senku AI service returned HTTP ${response.status}. Please try again shortly.`,
      };
    }

    if (!data?.answer) {
      return {
        ok: false,
        configured: true,
        error: 'Senku AI returned an empty answer.',
      };
    }

    return {
      ok: true,
      configured: true,
      answer: data.answer,
    };
  } catch {
    return {
      ok: false,
      configured: false,
      error:
        'Could not reach the Science AI backend (/api/science/ai). Ensure the Science AI service is running on port 8002.',
    };
  }
}

/**
 * Evaluates a mixture of chemical reagents.
 * Always computes deterministic chemistry via the local chemical reaction matrix first,
 * and optionally enriches unknown/exotic mixtures via the server-side /api/science/ai
 * endpoint only when credentials are configured on the server.
 */
export async function analyzeChemicalMixture(
  reagents: { name: string; formula: string }[],
  isHeated: boolean = false
): Promise<ChemicalReactionResult> {
  const localResult = computeLocalChemicalReaction(reagents, isHeated);

  // If the local reaction matrix matched a known reaction (or fewer than 2 reagents), return immediately.
  if (reagents.length < 2 || localResult.title !== 'Homogeneous Aqueous Solution') {
    return localResult;
  }

  try {
    const response = await fetch(SCIENCE_API_ENDPOINTS.ai(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'reaction',
        reagents,
        isHeated,
      }),
    });

    if (!response.ok) {
      return localResult;
    }

    const data = await response.json().catch(() => null);
    if (data?.configured && data?.reaction && typeof data.reaction.title === 'string') {
      return data.reaction as ChemicalReactionResult;
    }
    return localResult;
  } catch {
    return localResult;
  }
}

/**
 * Deterministic local chemical reaction matrix for Science Kingdom Chemistry Lab.
 * Works 100% offline with accurate school-level stoichiometry and visual outcomes.
 */
export function computeLocalChemicalReaction(
  reagents: { name: string; formula: string }[],
  isHeated: boolean
): ChemicalReactionResult {
  const names = reagents.map((r) => r.name.toLowerCase());
  const has = (keyword: string) => names.some((n) => n.includes(keyword));

  // 1. Metallic Sodium + Water/Acid -> EXOTHERMIC EXPLOSION (match elemental metallic sodium only, not NaOH/NaCl/NaHCO3)
  if (has('metallic sodium') && (has('water') || has('acid') || has('hydrochloric') || has('vinegar'))) {
    return {
      title: 'Violent Alkali Metal Explosion!',
      equation: '2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)↑ + EXPLOSIVE HEAT',
      explanation:
        'Metallic sodium aggressively donates its outer electron to water molecules, releasing scorching hydrogen gas that instantly ignites into fiery orange sparks and an exothermic explosion!',
      visualEffect: 'explosion',
      resultColor: '#fb923c',
      temperatureChange: 'exothermic',
      ph: 13.5,
      senkuCommentary:
        'WHOA!! Step back! Alkali metals in water release raw ignited hydrogen gas—ten billion percent exhilarating, and that is why we keep sodium locked under mineral oil!',
      isHazardous: true,
    };
  }

  // 2. Baking Soda + Vinegar -> Carbon Dioxide Vigorous Foam Eruption
  if (has('bicarbonate') && (has('acetic') || has('vinegar') || has('hydrochloric'))) {
    return {
      title: 'Effervescent CO₂ Carbonic Eruption!',
      equation: 'NaHCO₃(s) + CH₃COOH(aq) → CH₃COONa(aq) + H₂O(l) + CO₂(g)↑',
      explanation:
        'An acid-carbonate reaction instantly forms unstable carbonic acid (H₂CO₃), which rapidly decomposes into millions of vigorous carbon dioxide bubbles erupting out of solution!',
      visualEffect: 'bubbles',
      resultColor: '#f8fafc',
      temperatureChange: 'endothermic',
      ph: 6.2,
      senkuCommentary:
        'Kukuku! Pure carbon dioxide foam fizz! Feel the beaker get slightly cooler too—that is an endothermic reaction absorbing ambient heat!',
      isHazardous: false,
    };
  }

  // 3. Hydrogen Peroxide + Potassium Permanganate -> Oxygen Volcano
  if (has('peroxide') && (has('permanganate') || has('iodide'))) {
    return {
      title: 'Catalytic Oxygen Gas & Steam Eruption!',
      equation: '2H₂O₂(aq) —[MnO₂ / I⁻]→ 2H₂O(l) + O₂(g)↑ + Intense Steam',
      explanation:
        'Rapid catalytic decomposition of hydrogen peroxide releases massive plumes of superheated oxygen gas and billowing white water vapor!',
      visualEffect: 'smoke',
      resultColor: '#78350f',
      temperatureChange: 'exothermic',
      ph: 7.0,
      senkuCommentary:
        'Catalysis at its finest! The permanganate triggers instant peroxide breakdown—watch that steaming oxygen plume shoot skyward!',
      isHazardous: true,
    };
  }

  // 4. Silver Nitrate + Sodium Chloride -> White Curdy AgCl Precipitate
  if (has('silver') && (has('chloride') || has('hydrochloric'))) {
    return {
      title: 'Curd-White Silver Chloride Precipitation',
      equation: 'AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq)',
      explanation:
        'Silver cations (Ag⁺) immediately lock with chloride anions (Cl⁻) to crystallize out as dense, snowy-white insoluble Silver Chloride sediment!',
      visualEffect: 'precipitate',
      resultColor: '#e2e8f0',
      precipitateColor: '#ffffff',
      temperatureChange: 'neutral',
      ph: 6.8,
      senkuCommentary:
        'Classic halide test! Insoluble silver chloride clouds up the beaker instantaneously—10 billion points for recognizing a double displacement precipitate!',
      isHazardous: false,
    };
  }

  // 5. Lead Nitrate + Potassium Iodide -> Golden Rain PbI2
  if (has('lead') && has('iodide')) {
    return {
      title: 'Golden Rain Precipitation (Lead Iodide)',
      equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)',
      explanation:
        'Double displacement reaction! Clear lead ions and iodide ions snap into gleaming golden-yellow Lead(II) Iodide crystals that shimmer and settle to the bottom!',
      visualEffect: 'precipitate',
      resultColor: '#fef08a',
      precipitateColor: '#eab308',
      temperatureChange: 'neutral',
      ph: 6.5,
      senkuCommentary:
        'Ten billion percent breathtaking! Golden PbI₂ hexagonal platelets sparkling like liquid gold!',
      isHazardous: true,
    };
  }

  // 6. Copper Sulfate + Iron Filings -> Displacement Reaction
  if (has('copper') && has('iron')) {
    return {
      title: 'Single Displacement: Iron Displaces Copper!',
      equation: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)↓',
      explanation:
        'Because Iron is higher than Copper in the electrochemical reactivity series, Iron pushes Copper out of solution! The blue copper sulfate turns pale emerald green while reddish copper coats the iron!',
      visualEffect: 'precipitate',
      resultColor: '#86efac',
      precipitateColor: '#c2410c',
      temperatureChange: 'exothermic',
      ph: 5.5,
      senkuCommentary:
        'Look at that blue solution transforming into pale green Ferrous Sulfate while pure metallic copper precipitates! Reactivity series in action!',
      isHazardous: false,
    };
  }

  // 7. Copper Sulfate + Sodium Hydroxide -> Azure Blue Gelatinous Cu(OH)2 Precipitate
  if (has('copper') && has('hydroxide')) {
    return {
      title: 'Copper(II) Hydroxide Blue Precipitate',
      equation: 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ + Na₂SO₄(aq)',
      explanation:
        'Deep royal-blue gelatinous Copper(II) Hydroxide flocculates out immediately upon mixing with strong alkaline hydroxide ions!',
      visualEffect: 'precipitate',
      resultColor: '#0284c7',
      precipitateColor: '#1d4ed8',
      temperatureChange: 'neutral',
      ph: 9.0,
      senkuCommentary:
        'An intense cobalt-blue precipitate cloud! That is pure insoluble Cu(OH)₂!',
      isHazardous: false,
    };
  }

  // 8. Natural Turmeric Indicator + Base -> Deep Blood Red
  if (has('turmeric') && (has('hydroxide') || has('bicarbonate'))) {
    return {
      title: 'Alkaline Curcumin Blood-Red Color Shift!',
      equation: 'Curcumin (Yellow, Neutral) + OH⁻ → Anionic Curcumin (Deep Blood-Red)',
      explanation:
        'Curcumin molecules in natural turmeric act as an acid-base indicator! Under alkaline conditions (pH > 8.5), the molecule deprotonates and transforms from golden yellow to vivid blood-red!',
      visualEffect: 'color_change',
      resultColor: '#dc2626',
      temperatureChange: 'neutral',
      ph: 11.2,
      senkuCommentary:
        'Even without synthetic factory chemicals, ordinary village turmeric detects alkali hydroxide with 100% scientific accuracy!',
      isHazardous: false,
    };
  }

  // 9. Phenolphthalein + Base -> Magenta Pink
  if (has('phenolphthalein') && (has('hydroxide') || has('bicarbonate'))) {
    if (has('hydrochloric') || has('acetic') || has('vinegar')) {
      return {
        title: 'Acid-Base Titration Neutralization!',
        equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
        explanation:
          'Hydrogen ions neutralize hydroxide ions into pure water and salt. Once pH drops below 8.2, phenolphthalein reverts immediately back to crystal clear!',
        visualEffect: 'color_change',
        resultColor: '#e0f2fe',
        temperatureChange: 'exothermic',
        ph: 7.0,
        senkuCommentary:
          'Neutralization endpoint hit! From magenta back to transparent neutral pH 7.0!',
        isHazardous: false,
      };
    }
    return {
      title: 'Alkaline Phenolphthalein Magenta Flash',
      equation: 'H₂In (Colorless) + 2OH⁻ ⇌ In²⁻ (Vibrant Pink) + 2H₂O',
      explanation:
        'Alkaline OH⁻ ions open the lactone ring of phenolphthalein, shifting its light absorption into vivid magenta-pink!',
      visualEffect: 'color_change',
      resultColor: '#ec4899',
      temperatureChange: 'neutral',
      ph: 12.2,
      senkuCommentary:
        'Bam! Classic alkaline pink flash! Add a drop of HCl to watch it neutralize right back to clear!',
      isHazardous: false,
    };
  }

  // 10. Strong Acid + Strong Base (without indicator) -> Exothermic Neutralization
  if (has('hydrochloric') && has('hydroxide')) {
    return {
      title: 'Strong Acid-Base Exothermic Neutralization',
      equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l) + ΔH (-57.3 kJ/mol)',
      explanation:
        'Hydronium ions and hydroxide ions combine rapidly to form neutral liquid water and dissolved sodium chloride while releasing measurable heat.',
      visualEffect: 'heat',
      resultColor: '#e0f2fe',
      temperatureChange: 'exothermic',
      ph: 7.0,
      senkuCommentary:
        'Neutralization complete! Acid plus base yields salt, water, and a crisp burst of thermal energy—add phenolphthalein next time to see the pH shift!',
      isHazardous: false,
    };
  }

  // 11. Potassium Permanganate Oxidation
  if (has('permanganate')) {
    return {
      title: 'Intense Violet Permanganate Solution',
      equation: 'KMnO₄(aq) → K⁺(aq) + MnO₄⁻(aq)',
      explanation:
        'Permanganate ions exhibit deep violet color due to intense charge-transfer absorption. Adding Hydrogen Peroxide causes rapid redox oxidation!',
      visualEffect: isHeated ? 'smoke' : 'color_change',
      resultColor: '#6b21a8',
      temperatureChange: 'neutral',
      ph: 7.0,
      senkuCommentary:
        'Deep royal violet! Try dropping some Hydrogen Peroxide in there to trigger an oxygen geyser!',
      isHazardous: false,
    };
  }

  // 12. Boiling / Heated generic aqueous solution
  if (isHeated) {
    return {
      title: 'Thermal Boiling & Vaporization',
      equation: 'Liquid(l) + ΔHeat → Boiling Vapor(g)↑',
      explanation:
        'Thermal energy from the Bunsen flame accelerates molecular kinetic energy until vapor pressure equals atmospheric pressure, generating convection boiling bubbles and steam.',
      visualEffect: 'bubbles',
      resultColor: '#bae6fd',
      temperatureChange: 'endothermic',
      ph: 7.0,
      senkuCommentary:
        'Heating accelerates reaction kinetics exponentially! Try mixing an acid, base, or catalyst while applying heat!',
      isHazardous: false,
    };
  }

  // Default fallback mixture
  return {
    title: 'Homogeneous Aqueous Solution',
    equation: reagents.map((r) => r.formula).join(' + ') + ' ⇌ Aqueous Mixture',
    explanation:
      'The added reagents have dispersed cleanly into solution. Try mixing incompatible ions (like Lead Nitrate + Potassium Iodide, Vinegar + Baking Soda, or Sodium + Water) to see dramatic reactions!',
    visualEffect: 'none',
    resultColor: '#93c5fd',
    temperatureChange: 'neutral',
    ph: 7.0,
    senkuCommentary:
      'Solutions mixed! Experiment with combining acids, bases, indicators, or reactive metals to witness dynamic chemistry!',
    isHazardous: false,
  };
}

