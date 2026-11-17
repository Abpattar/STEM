import logging
from typing import Dict, Any
from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    VisualisationPayload,
)
from ..schemas.profile import StudentProfile

logger = logging.getLogger("orchestrator.adapters.visualization")

class VisualizationAdapter(BaseAdapter):
    capability_name: str = "visualization"
    is_available: bool = True

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def _extract_quadratic_coefficients(self, umr: UnifiedMathematicalRepresentation) -> Dict[str, float]:
        """Extract a, b, c from quadratic expression or AST using SymPy."""
        latex = (
            (umr.metadata.get("interpretation", {}) or {}).get("latex")
            or umr.input.recognized_latex
            or umr.input.raw_content
            or ""
        )
        
        # 1. Try SymPy algebraic reduction first
        try:
            import sympy as sp
            from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
            import re
            transformations = standard_transformations + (implicit_multiplication_application,)
            s = latex
            s = re.sub(r'\\?frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', s)
            s = re.sub(r'\\?sqrt\{([^}]+)\}', r'sqrt(\1)', s)
            s = re.sub(r'\{([^{}]+)\}', r'(\1)', s)
            s = s.replace('\\', '').replace('^', '**')
            
            if '=' in s:
                lhs_str, rhs_str = s.split('=', 1)
                lhs = parse_expr(lhs_str, transformations=transformations)
                rhs = parse_expr(rhs_str, transformations=transformations)
                expr = sp.simplify(lhs - rhs)
            else:
                expr = sp.simplify(parse_expr(s, transformations=transformations))
            
            symbols = list(expr.free_symbols)
            var = symbols[0] if symbols else sp.Symbol('x')
            poly = sp.Poly(expr, var)
            if poly.degree() == 2:
                a_val = float(poly.coeff_monomial(var**2))
                b_val = float(poly.coeff_monomial(var))
                c_val = float(poly.coeff_monomial(1))
                return {"a": round(a_val, 3), "b": round(b_val, 3), "c": round(c_val, 3)}
        except Exception as e:
            logger.debug(f"SymPy quadratic extraction failed: {e}")

        # 2. Regex fallback
        import re
        match = re.search(r'([+-]?\s*\d*\.?\d*)\s*x\^?2(?:\s*([+-]\s*\d*\.?\d*)\s*x)?(?:\s*([+-]\s*\d*\.?\d+))?', latex.replace(" ", ""))
        if match:
            a_str, b_str, c_str = match.groups()
            try:
                a_val = float(a_str.replace("+", "")) if a_str and a_str not in ("+", "-") else (-1.0 if a_str == "-" else 1.0)
                b_val = float(b_str.replace("+", "")) if b_str and b_str not in ("+", "-") else 0.0
                c_val = float(c_str.replace("+", "")) if c_str else 0.0
                return {"a": a_val, "b": b_val, "c": c_val}
            except Exception:
                pass

        return {"a": 1.0, "b": 5.0, "c": 6.0}

    def _extract_linear_coefficients(self, umr: UnifiedMathematicalRepresentation) -> Dict[str, float]:
        """Extract a, b, c for ax + b = c using SymPy."""
        latex = (
            (umr.metadata.get("interpretation", {}) or {}).get("latex")
            or umr.input.recognized_latex
            or umr.input.raw_content
            or ""
        )
        try:
            import sympy as sp
            from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
            import re
            transformations = standard_transformations + (implicit_multiplication_application,)
            s = latex
            s = re.sub(r'\\?frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', s)
            s = re.sub(r'\\?sqrt\{([^}]+)\}', r'sqrt(\1)', s)
            s = re.sub(r'\{([^{}]+)\}', r'(\1)', s)
            s = s.replace('\\', '').replace('^', '**')
            
            if '=' in s:
                lhs_str, rhs_str = s.split('=', 1)
                lhs = parse_expr(lhs_str, transformations=transformations)
                rhs = parse_expr(rhs_str, transformations=transformations)
                symbols = list((lhs - rhs).free_symbols)
                var = symbols[0] if symbols else sp.Symbol('x')
                lhs_poly = sp.Poly(lhs, var)
                a_val = float(lhs_poly.coeff_monomial(var))
                b_val = float(lhs_poly.coeff_monomial(1))
                c_val = float(sp.simplify(rhs))
                return {"a": round(a_val, 3), "b": round(b_val, 3), "c": round(c_val, 3)}
        except Exception as e:
            logger.debug(f"SymPy linear extraction failed: {e}")

        import re
        match = re.search(r'([+-]?\s*\d*\.?\d*)\s*x(?:\s*([+-]\s*\d*\.?\d+))?\s*=\s*([+-]?\s*\d*\.?\d+)', latex.replace(" ", ""))
        if match:
            a_str, b_str, c_str = match.groups()
            try:
                a_val = float(a_str) if a_str and a_str not in ("+", "-") else (-1.0 if a_str == "-" else 1.0)
                b_val = float(b_str) if b_str else 0.0
                c_val = float(c_str) if c_str else 0.0
                return {"a": a_val, "b": b_val, "c": c_val}
            except Exception:
                pass
        return {"a": 2.0, "b": 3.0, "c": 7.0}

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        # Preserve pre-generated geometry or SVG diagrams
        if umr.visualisation.type in ("svg_diagram", "geometry_diagram"):
            return umr

        topic = umr.understanding.topic
        raw = (umr.input.recognized_latex or umr.input.raw_content or "").lower()

        # Check for circle
        import re
        circle_match = re.search(r'radius\s*(?:of|=|is)?\s*(\d+)', raw) or re.search(r'circle.*?(\d+)', raw)
        if "circle" in raw and circle_match:
            try:
                r_val = float(circle_match.group(1))
            except Exception:
                r_val = 5.0
            umr.visualisation = VisualisationPayload(
                type="circle_exhaustion",
                component_id="MathLearnCircleVisualizer",
                initial_params={"radius": r_val},
                description="Interactive circle area exhaustion model demonstrating pi*r^2."
            )
            return umr

        # Check for pythagoras / right triangle
        pyth_match = re.search(r'sides?\s*(\d+)\s*(?:and|,)\s*(\d+)', raw) or re.search(r'(\d+)\s*,\s*(\d+)\s*,\s*find', raw)
        if ("triangle" in raw or "pythagor" in raw or "hypotenuse" in raw) and pyth_match:
            try:
                a_side = float(pyth_match.group(1))
                b_side = float(pyth_match.group(2))
            except Exception:
                a_side, b_side = 3.0, 4.0
            umr.visualisation = VisualisationPayload(
                type="pythagoras",
                component_id="MathLearnPythagoreanVisualizer",
                initial_params={"a": a_side, "b": b_side},
                description="Interactive Pythagorean Theorem 3-squares proof visualization."
            )
            return umr

        if topic == "quadratic_equations" or "^2" in raw or "²" in raw:
            coeffs = self._extract_quadratic_coefficients(umr)
            a, b, c = coeffs["a"], coeffs["b"], coeffs["c"]
            delta = b**2 - 4*a*c
            umr.visualisation = VisualisationPayload(
                type="quadratic_parabola",
                component_id="MathLearnParabolaVisualizer",
                initial_params={
                    "a": a,
                    "b": b,
                    "c": c,
                    "discriminant": delta,
                    "vertex_x": -b / (2 * a) if a != 0 else 0,
                    "vertex_y": c - (b**2) / (4 * a) if a != 0 else 0,
                    "has_real_roots": delta >= 0
                },
                description="Interactive parabola with dynamic roots, vertex, and discriminant slider."
            )
        elif topic in ("linear_equations", "prealgebra") or "=" in raw:
            coeffs = self._extract_linear_coefficients(umr)
            umr.visualisation = VisualisationPayload(
                type="equation_balance",
                component_id="MathLearnBalanceVisualizer",
                initial_params={
                    "a": coeffs["a"],
                    "b": coeffs["b"],
                    "c": coeffs["c"]
                },
                description="Interactive equation balance demonstrating inverse operations on both sides."
            )
        else:
            # General fallback to parabola
            coeffs = self._extract_quadratic_coefficients(umr)
            umr.visualisation = VisualisationPayload(
                type="quadratic_parabola",
                component_id="MathLearnParabolaVisualizer",
                initial_params={
                    "a": coeffs["a"],
                    "b": coeffs["b"],
                    "c": coeffs["c"],
                    "discriminant": coeffs["b"]**2 - 4*coeffs["a"]*coeffs["c"],
                    "vertex_x": 0,
                    "vertex_y": coeffs["c"],
                    "has_real_roots": True
                },
                description="Interactive parabola visualizer with dynamic algebraic parameters."
            )

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "visualizers": ["quadratic_parabola", "equation_balance", "algebra_tiles"],
            "source": "MathLearn-Primary ported components"
        }

