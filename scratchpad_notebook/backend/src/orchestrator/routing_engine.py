from typing import List, Set
from .schemas.profile import StudentProfile
from .schemas.umr import UnifiedMathematicalRepresentation

class RoutingEngine:
    """Determines which capability adapters should be activated for a given problem and student profile."""

    def determine_active_capabilities(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> List[str]:
        active: Set[str] = set()

        # Step 1: Input & Recognition
        if umr.input.type in ("handwriting", "typed"):
            active.add("handwriting")
        elif umr.input.type == "sign_language":
            active.add("sixth_sense")

        # Step 2: Solver is ALWAYS active (mathematical source of truth)
        active.add("solver")

        # Step 3: Adaptive Learning (Mathua)
        # Active if student desires prerequisite learning or understanding is requested
        if profile.preferences.show_prerequisites_first or profile.preferences.explanation_depth in ("standard", "detailed"):
            active.add("mathua")

        # Step 4: Visual Learning (MathLearn-Primary)
        # Active if visual/interactive style or explicitly enabled
        if profile.preferences.interactive_visuals_enabled and profile.preferences.learning_style in ("visual", "interactive", "balanced"):
            active.add("visualization")

        # Step 5: Accessibility - Speech & Braille (MathCAT)
        if profile.preferences.speech_enabled or profile.preferences.braille_enabled or profile.preferences.learning_style == "auditory":
            active.add("mathcat")

        # Step 6: Accessible Graph Sonification (MAIDR)
        # Active when a graph or plot exists and sonification or high accessibility is requested
        if profile.preferences.sonification_enabled or (profile.preferences.braille_enabled and umr.visualisation.type in ("coordinatePlane", "quadratic_parabola", "barChart")):
            active.add("maidr")

        # Step 7: Indian Sign Language (Sixth-Sense)
        if profile.preferences.sign_language_enabled:
            active.add("sixth_sense")

        # Stable ordered pipeline
        execution_order = [
            "handwriting",
            "solver",
            "mathua",
            "visualization",
            "mathcat",
            "maidr",
            "sixth_sense"
        ]

        return [cap for cap in execution_order if cap in active]

