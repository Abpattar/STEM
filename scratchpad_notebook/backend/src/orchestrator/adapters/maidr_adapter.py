import logging
from typing import Dict, Any, List
from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
)
from ..schemas.profile import StudentProfile

logger = logging.getLogger("orchestrator.adapters.maidr")

class MAIDRAdapter(BaseAdapter):
    """
    Adapter for MAIDR (Multimodal Access and Interactive Data Representation).
    Generates sonification tone profiles (audio frequencies mapped to curve values)
    and keyboard spatial navigation points for mathematical plots.
    Kept strictly modular to observe GPL-3.0 isolation.
    """
    capability_name: str = "maidr"
    is_available: bool = True

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def _generate_parabola_sonification(self, a: float, b: float, c: float) -> Dict[str, Any]:
        """Compute sonification data points and audio frequencies for y = ax^2 + bx + c."""
        data_points = []
        base_freq = 220.0  # A3 (Hz)
        max_freq = 880.0   # A5 (Hz)

        # Sample 21 points from x = -5 to x = 5
        raw_vals = []
        for x_idx in range(-5, 6):
            x = float(x_idx)
            y = a * (x**2) + b * x + c
            raw_vals.append((x, y))

        y_values = [pt[1] for pt in raw_vals]
        min_y = min(y_values)
        max_y = max(y_values)
        y_range = max_y - min_y if max_y != min_y else 1.0

        for x, y in raw_vals:
            # Map y-value to audio pitch frequency in Hz
            normalized_y = (y - min_y) / y_range
            freq = base_freq + normalized_y * (max_freq - base_freq)
            data_points.append({
                "x": x,
                "y": round(y, 2),
                "frequency_hz": round(freq, 1),
                "duration_ms": 120,
                "braille": f"({x}, {round(y, 1)})",
                "aria_label": f"At x equals {x}, y is {round(y, 2)}"
            })

        return {
            "chart_type": "parabola",
            "title": f"Parabola y = {a}x^2 + {b}x + {c}",
            "points": data_points,
            "min_point": min(data_points, key=lambda p: p["y"]),
            "max_point": max(data_points, key=lambda p: p["y"]),
            "keyboard_shortcuts": {
                "next_point": "ArrowRight",
                "prev_point": "ArrowLeft",
                "play_sonification": "Space",
                "first_point": "Home",
                "last_point": "End"
            }
        }

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        vis = umr.visualisation
        if vis.type == "quadratic_parabola":
            params = vis.initial_params
            a = params.get("a", 1.0)
            b = params.get("b", 0.0)
            c = params.get("c", 0.0)
            sonification_data = self._generate_parabola_sonification(a, b, c)
            umr.accessibility.sonification = sonification_data
        elif vis.type in ("coordinatePlane", "barChart"):
            umr.accessibility.sonification = {
                "chart_type": vis.type,
                "title": "Interactive Accessible Diagram",
                "keyboard_navigation_enabled": True
            }

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "engine": "MAIDR Sonification & Spatial Navigation",
            "supported_charts": ["parabola", "coordinate_plane", "bar_chart"]
        }

