import math
from typing import Dict, Any, Tuple
from enum import IntEnum

class FSRSRating(IntEnum):
    AGAIN = 1
    HARD = 2
    GOOD = 3
    EASY = 4

# FSRS-6 Published 21 Default Parameters from Mathua reference
DEFAULT_PARAMETERS = [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
    1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
    1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
]

STABILITY_MIN = 0.01
DIFFICULTY_MIN = 1.0
DIFFICULTY_MAX = 10.0
DEFAULT_RETENTION = 0.9

class FSRS6Engine:
    """
    Native implementation of Free Spaced Repetition Scheduler v6 (FSRS-6)
    ported from Mathua (internal/fsrs/).
    """
    def __init__(self, params=None):
        self.p = params or DEFAULT_PARAMETERS
        self.decay = -self.p[20]
        self.factor = math.pow(0.9, 1.0 / self.decay) - 1.0

    def retrievability(self, elapsed_days: float, stability: float) -> float:
        """Probability of recalling concept after elapsed_days given stability S."""
        if stability <= 0 or math.isnan(stability) or math.isinf(stability):
            stability = STABILITY_MIN
        if elapsed_days <= 0:
            return 1.0
        return math.pow(1.0 + self.factor * elapsed_days / stability, self.decay)

    def initial_difficulty(self, rating: FSRSRating) -> float:
        """Initial difficulty D0 for a concept based on initial performance."""
        d0_raw = self.p[4] - math.exp(self.p[5] * (float(rating) - 1.0)) + 1.0
        return max(DIFFICULTY_MIN, min(DIFFICULTY_MAX, d0_raw))

    def initial_stability(self, rating: FSRSRating) -> float:
        """Initial stability S0 (in days) for a concept based on first review."""
        idx = max(0, min(3, int(rating) - 1))
        return max(STABILITY_MIN, self.p[idx])

    def next_difficulty(self, current_d: float, rating: FSRSRating) -> float:
        """Next difficulty with mean reversion."""
        d = max(DIFFICULTY_MIN, min(DIFFICULTY_MAX, current_d))
        delta = -self.p[6] * (float(rating) - 3.0)
        # Mean reversion towards initial difficulty of Easy
        d0_easy = self.p[4] - math.exp(self.p[5] * 3.0) + 1.0
        d_next = d + delta
        d_reverted = self.p[7] * d0_easy + (1.0 - self.p[7]) * d_next
        return max(DIFFICULTY_MIN, min(DIFFICULTY_MAX, d_reverted))

    def next_stability(
        self,
        stability: float,
        difficulty: float,
        retrievability: float,
        rating: FSRSRating
    ) -> float:
        """Compute memory stability S following a review attempt."""
        s = max(STABILITY_MIN, stability)
        d = max(DIFFICULTY_MIN, min(DIFFICULTY_MAX, difficulty))
        r = max(0.0, min(1.0, retrievability if not math.isnan(retrievability) else DEFAULT_RETENTION))

        if rating == FSRSRating.AGAIN:
            # Forgetting curve upon failure (lapse)
            s_lapse = self.p[11] * math.pow(d, -self.p[12]) * (math.pow(s + 1.0, self.p[13]) - 1.0) * math.exp((1.0 - r) * self.p[14])
            return max(STABILITY_MIN, min(s, s_lapse))
        else:
            # Successful recall gain
            hard_mult = self.p[15] if rating == FSRSRating.HARD else 1.0
            easy_mult = self.p[16] if rating == FSRSRating.EASY else 1.0
            s_recall = s * (1.0 + math.exp(self.p[8]) * (11.0 - d) * math.pow(s, -self.p[9]) * (math.exp((1.0 - r) * self.p[10]) - 1.0) * hard_mult * easy_mult)
            return max(STABILITY_MIN, s_recall)

    def interval_for_retention(self, stability: float, target_retention: float = DEFAULT_RETENTION) -> int:
        """Calculate optimal next review interval in days."""
        s = max(STABILITY_MIN, stability)
        if target_retention <= 0.0 or target_retention >= 1.0:
            target_retention = DEFAULT_RETENTION
        interval = (s / self.factor) * (math.pow(target_retention, 1.0 / self.decay) - 1.0)
        return max(1, min(36500, int(round(interval))))

    def review_concept(
        self,
        concept_id: str,
        is_correct: bool,
        elapsed_days: float = 1.0,
        current_state: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process one learning attempt on a concept and return updated FSRS state."""
        state = current_state or {}
        stability = state.get("stability", 0.0)
        difficulty = state.get("difficulty", 0.0)
        streak = state.get("streak", 0)

        rating = FSRSRating.GOOD if is_correct else FSRSRating.AGAIN

        if stability <= 0:
            # First attempt on this concept
            new_s = self.initial_stability(rating)
            new_d = self.initial_difficulty(rating)
            r = 1.0
        else:
            r = self.retrievability(elapsed_days, stability)
            new_s = self.next_stability(stability, difficulty, r, rating)
            new_d = self.next_difficulty(difficulty, rating)

        next_interval_days = self.interval_for_retention(new_s)
        new_streak = (streak + 1) if is_correct else 0
        mastery_pct = min(100.0, (new_s / 30.0) * 100.0) if new_streak > 0 else max(10.0, (new_s / 30.0) * 50.0)

        return {
            "concept_id": concept_id,
            "is_correct": is_correct,
            "rating": int(rating),
            "stability": round(new_s, 3),
            "difficulty": round(new_d, 3),
            "retrievability": round(r, 3),
            "next_interval_days": next_interval_days,
            "streak": new_streak,
            "mastery_pct": round(mastery_pct, 1),
            "status": "mastered" if new_streak >= 3 and mastery_pct >= 75.0 else ("learning" if is_correct else "review_needed")
        }

