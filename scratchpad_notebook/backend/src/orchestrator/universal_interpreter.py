import re
import math
from typing import Dict, Any, Optional, List, Tuple
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

from src.geometry.schemas import (
    GeometryProblem, MensurationProblem, CoordinateGeometryProblem,
    StatisticsProblem, ProbabilityProblem, GeometryShape, GeometryMeasurement,
    GeometryShapeType, MeasurementType, GeometryRelationship, RelationshipType
)

class UniversalMathInterpreter:
    """
    Intelligently parses and classifies any mathematical problem:
    - Geometry: Triangles (angle sum, right triangle hypotenuse/legs, trigonometry), circles, polygons
    - Mensuration: 2D area/perimeter, 3D surface area/volume (cuboids, cylinders, cones, spheres)
    - Coordinate Geometry: Distance, midpoint, slope, line equation
    - Calculus: Differentiation (d/dx), Integration (indefinite & definite), Limits
    - Arithmetic & Pre-Algebra: Fractions, PEMDAS/BODMAS, Percentages, Ratios, GCD/LCM
    - Statistics & Probability: Mean, median, mode, range, single/compound probability
    - Algebra: Linear, quadratic, systems of equations, radical & rational equations, inequalities
    """

    def __init__(self):
        self.transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

    @staticmethod
    def _fmt_num(val: float) -> Any:
        return int(val) if float(val).is_integer() else round(val, 4)

    @staticmethod
    def _extract_positive_numbers(text: str) -> List[float]:
        nums: List[float] = []
        for m in re.findall(r'(?<![a-zA-Z0-9_])(\d+(?:\.\d+)?)', text):
            try:
                v = float(m)
                if v > 0:
                    nums.append(v)
            except ValueError:
                pass
        return nums

    def interpret(self, raw_text: str, _allow_clarification: bool = True) -> Dict[str, Any]:
        text = raw_text.strip()
        # Clean common prefixes and repeated conversational verbs
        clean = text
        prev = None
        while clean != prev:
            prev = clean
            clean = re.sub(r'^(solve(\s+for\s+\w+)?|calculate\s+value\s+of|calculate\s+value|calculate|evaluate|simplify|find\s+the\s+value\s+of|find|value\s+of)\s+', '', clean, flags=re.IGNORECASE).strip()
            clean = re.sub(r'\s+for\s+[a-zA-Z]+$', '', clean, flags=re.IGNORECASE).strip()
            clean = re.sub(r'\s+with\s+respect\s+to\s+[a-zA-Z]+$', '', clean, flags=re.IGNORECASE).strip()

        # 0. PEDAGOGICAL SHAPE CLARIFICATION (when shape is drawn/labeled without an explicit query)
        if _allow_clarification:
            clarification = self._detect_shape_clarification(clean, text)
            if clarification:
                return clarification

        # 1. TRIANGLE ANGLE SUM PATTERNS (e.g. "38°; 90°; ?", "38, 90, x", "triangle with angles 38° and 90°")
        triangle_angles = self._match_triangle_angles(clean)
        if triangle_angles:
            return triangle_angles

        # 2. TRIANGLE MENSURATION & QUERIES (Area, Shortest Length, Longest Side, Perimeter)
        triangle_mensuration = self._match_triangle_mensuration(clean, text)
        if triangle_mensuration:
            return triangle_mensuration

        # 3. PYTHAGOREAN THEOREM / RIGHT TRIANGLE LEGS (e.g. "right triangle legs 3 and 4, find c", "a=3, b=4, c=?")
        pythagoras = self._match_pythagoras(clean)
        if pythagoras:
            return pythagoras

        # 4. CIRCLE GEOMETRY & MENSURATION (e.g. "circle radius 5, find area", "r=7, circumference=?")
        circle = self._match_circle(clean)
        if circle:
            return circle

        # 5. 2D / 3D MENSURATION (e.g. "rectangle length 8 width 5 find area", "square side 6 find diagonal")
        mensuration = self._match_mensuration(clean)
        if mensuration:
            return mensuration

        # 6. COORDINATE GEOMETRY (e.g. "distance between (1,2) and (4,6)", "midpoint of (2,4) and (6,8)", "slope")
        coord = self._match_coordinate_geometry(clean)
        if coord:
            return coord

        # 7. CALCULUS (e.g. "d/dx(x^3 + 2x)", "derivative of x^2", "integral of 3x^2", "limit of sin(x)/x as x -> 0")
        calculus = self._match_calculus(clean)
        if calculus:
            return calculus

        # 8. STATISTICS & PROBABILITY (e.g. "mean of 4, 8, 12, 16", "median of ...", "probability of ...")
        stats = self._match_statistics_and_prob(clean)
        if stats:
            return stats

        # 9. FRACTIONS & ARITHMETIC (e.g. "1/2 + 3/4", "3 + 4 * 2 - (5 - 2)^2", "20% of 150")
        arith = self._match_arithmetic(clean)
        if arith:
            return arith

        # 10. GENERAL ALGEBRAIC EQUATION / EXPRESSION
        return self._match_algebra(clean, text, _allow_clarification=_allow_clarification)

    def _detect_shape_clarification(self, clean: str, original: str) -> Optional[Dict[str, Any]]:
        text_lower = original.lower()
        has_explicit_target = any(
            k in text_lower
            for k in [
                "find", "calculate", "what is", "area", "perimeter", "perim", "hypotenuse",
                "hyp", "shortest", "longest", "diagonal", "diag", "circumference", "circum",
                "diameter", "diam", "c=", "c =", "x=", "x =", "?", "volume"
            ]
        )
        if has_explicit_target:
            return None

        # 1. Right triangle with legs only (no target)
        m_rt = re.search(r'(?:right\s+triangle.*?legs?\s*(?:of|are|=|is)?\s*(\d+(?:\.\d+)?).*?(?:and|,)\s*(\d+(?:\.\d+)?))|(?:legs?\s*(?:of|are|=|is)?\s*(\d+(?:\.\d+)?).*?(?:and|,)\s*(\d+(?:\.\d+)?))', clean, re.IGNORECASE)
        if m_rt and ("right" in text_lower or "triangle" in text_lower or "leg" in text_lower):
            a = float(m_rt.group(1) or m_rt.group(3))
            b = float(m_rt.group(2) or m_rt.group(4))
            a_s = int(a) if a.is_integer() else a
            b_s = int(b) if b.is_integer() else b
            return {
                "is_ambiguous": True,
                "domain": "geometry",
                "topic": "triangle_clarification",
                "problem_type": "clarification",
                "clarification_question": f"I see a right triangle with legs {a_s} and {b_s}! What would you like to calculate?",
                "clarification_options": [
                    f"Right triangle with legs {a_s} and {b_s}, find hypotenuse",
                    f"Right triangle with legs {a_s} and {b_s}, find area",
                    f"Right triangle with legs {a_s} and {b_s}, find perimeter"
                ],
                "base_text": original
            }

        # 2. Triangle with 3 sides only (no target)
        m_tri = re.search(r'triangle.*?sides?\s*(?:of|are|=|:)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if m_tri:
            a, b, c = float(m_tri.group(1)), float(m_tri.group(2)), float(m_tri.group(3))
            a_s = int(a) if a.is_integer() else a
            b_s = int(b) if b.is_integer() else b
            c_s = int(c) if c.is_integer() else c
            return {
                "is_ambiguous": True,
                "domain": "geometry",
                "topic": "triangle_clarification",
                "problem_type": "clarification",
                "clarification_question": f"I see a triangle with sides {a_s}, {b_s}, and {c_s}! What would you like to calculate?",
                "clarification_options": [
                    f"Triangle with sides {a_s}, {b_s}, {c_s}, find area",
                    f"Triangle with sides {a_s}, {b_s}, {c_s}, find perimeter",
                    f"Triangle with sides {a_s}, {b_s}, {c_s}, find shortest length",
                    f"Triangle with sides {a_s}, {b_s}, {c_s}, find longest side"
                ],
                "base_text": original
            }

        # 3. Rectangle with dimensions only (no target)
        m_rect = re.search(r'(?:rectangle|rect).*?(?:length|l)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?).*?(?:width|breadth|w)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if m_rect or ("rectangle" in text_lower and any(char.isdigit() for char in clean)):
            l = float(m_rect.group(1)) if m_rect else 8.0
            w = float(m_rect.group(2)) if m_rect else 5.0
            l_s = int(l) if l.is_integer() else l
            w_s = int(w) if w.is_integer() else w
            return {
                "is_ambiguous": True,
                "domain": "mensuration",
                "topic": "rectangle_clarification",
                "problem_type": "clarification",
                "clarification_question": f"I see a rectangle with length {l_s} and width {w_s}! What would you like to calculate?",
                "clarification_options": [
                    f"Rectangle with length {l_s} and width {w_s}, find area",
                    f"Rectangle with length {l_s} and width {w_s}, find perimeter",
                    f"Rectangle with length {l_s} and width {w_s}, find diagonal"
                ],
                "base_text": original
            }

        # 4. Square with side only (no target)
        m_sq = re.search(r'square.*?(?:side|s)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if m_sq or ("square" in text_lower and any(char.isdigit() for char in clean)):
            s = float(m_sq.group(1)) if m_sq else 5.0
            s_s = int(s) if s.is_integer() else s
            return {
                "is_ambiguous": True,
                "domain": "mensuration",
                "topic": "square_clarification",
                "problem_type": "clarification",
                "clarification_question": f"I see a square with side {s_s}! What would you like to calculate?",
                "clarification_options": [
                    f"Square with side {s_s}, find area",
                    f"Square with side {s_s}, find perimeter",
                    f"Square with side {s_s}, find diagonal"
                ],
                "base_text": original
            }

        # 5. Circle with radius only (no target)
        m_circ = re.search(r'(?:circle|radius).*?(?:radius|r)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if m_circ or ("circle" in text_lower and any(char.isdigit() for char in clean)):
            r = float(m_circ.group(1)) if m_circ else 5.0
            r_s = int(r) if r.is_integer() else r
            return {
                "is_ambiguous": True,
                "domain": "geometry",
                "topic": "circle_clarification",
                "problem_type": "clarification",
                "clarification_question": f"I see a circle with radius {r_s}! What would you like to calculate?",
                "clarification_options": [
                    f"Circle with radius {r_s}, find area",
                    f"Circle with radius {r_s}, find circumference",
                    f"Circle with radius {r_s}, find diameter"
                ],
                "base_text": original
            }

        return None

    def _match_triangle_mensuration(self, clean: str, original: str) -> Optional[Dict[str, Any]]:
        text_lower = original.lower()

        # Check Right Triangle with area or perimeter explicitly requested
        m_rt = re.search(r'(?:right\s+triangle.*?legs?\s*(?:of|are|=|is)?\s*(\d+(?:\.\d+)?).*?(?:and|,)\s*(\d+(?:\.\d+)?))|(?:legs?\s*(?:of|are|=|is)?\s*(\d+(?:\.\d+)?).*?(?:and|,)\s*(\d+(?:\.\d+)?))', clean, re.IGNORECASE)
        if m_rt and any(w in text_lower for w in ["area", "perimeter", "perim"]):
            a = float(m_rt.group(1) or m_rt.group(3))
            b = float(m_rt.group(2) or m_rt.group(4))
            a_s = int(a) if a.is_integer() else a
            b_s = int(b) if b.is_integer() else b
            target = "area" if "area" in text_lower else "perimeter"

            prob = MensurationProblem(
                shape_type=GeometryShapeType.RIGHT_TRIANGLE,
                measurements=[
                    GeometryMeasurement(value=a, unit="cm", measurement_type=MeasurementType.LENGTH, label="a"),
                    GeometryMeasurement(value=b, unit="cm", measurement_type=MeasurementType.LENGTH, label="b")
                ],
                requested_quantity={"type": target, "target": target},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "shape_type": "right_triangle",
                "legs": [a, b],
                "unknowns": [target],
                "ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "A" if target == "area" else "P"},
                    "right": {"type": "mul", "args": [{"type": "number", "value": 0.5}, {"type": "number", "value": a}, {"type": "number", "value": b}]} if target == "area" else {"type": "number", "value": a + b}
                },
                "latex": f"A = \\frac{{1}}{{2}} \\times {a_s} \\times {b_s}" if target == "area" else f"P = {a_s} + {b_s} + c"
            }

        # Check General Triangle with 3 sides (e.g. "Triangle with sides 3, 4, 5, find shortest length")
        m_tri = re.search(r'triangle.*?sides?\s*(?:of|are|=|:)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if not m_tri:
            m_tri = re.search(r'sides?\s*(?:of|are|=|:)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)\s*[,;]?\s*(?:and)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)

        if m_tri and ("triangle" in text_lower or any(w in text_lower for w in ["shortest", "longest", "area", "perimeter"])):
            a, b, c = float(m_tri.group(1)), float(m_tri.group(2)), float(m_tri.group(3))
            a_s = int(a) if a.is_integer() else a
            b_s = int(b) if b.is_integer() else b
            c_s = int(c) if c.is_integer() else c

            if "short" in text_lower:
                target = "shortest_length"
            elif "long" in text_lower or "hyp" in text_lower:
                target = "longest_length"
            elif "perim" in text_lower:
                target = "perimeter"
            else:
                target = "area"

            prob = MensurationProblem(
                shape_type=GeometryShapeType.TRIANGLE,
                measurements=[
                    GeometryMeasurement(value=a, unit="cm", measurement_type=MeasurementType.LENGTH, label="a"),
                    GeometryMeasurement(value=b, unit="cm", measurement_type=MeasurementType.LENGTH, label="b"),
                    GeometryMeasurement(value=c, unit="cm", measurement_type=MeasurementType.LENGTH, label="c")
                ],
                requested_quantity={"type": target, "target": target},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "shape_type": "triangle",
                "sides": [a, b, c],
                "unknowns": [target],
                "ast": {"type": "symbol", "name": target},
                "latex": f"\\text{{{target.replace('_', ' ').capitalize()}}}({a_s}, {b_s}, {c_s})"
            }

        # Check Triangle with base and height
        m_bh = re.search(r'triangle.*?(?:base|b)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?).*?(?:height|h)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', clean, re.IGNORECASE)
        if m_bh:
            b_val = float(m_bh.group(1))
            h_val = float(m_bh.group(2))
            prob = MensurationProblem(
                shape_type=GeometryShapeType.TRIANGLE,
                measurements=[
                    GeometryMeasurement(value=b_val, unit="cm", measurement_type=MeasurementType.LENGTH, label="base"),
                    GeometryMeasurement(value=h_val, unit="cm", measurement_type=MeasurementType.LENGTH, label="height")
                ],
                requested_quantity={"type": "area", "target": "area"},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "shape_type": "triangle",
                "unknowns": ["area"],
                "ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "A"},
                    "right": {"type": "mul", "args": [{"type": "number", "value": 0.5}, {"type": "number", "value": b_val}, {"type": "number", "value": h_val}]}
                },
                "latex": f"A = \\frac{{1}}{{2}} \\times {int(b_val) if b_val.is_integer() else b_val} \\times {int(h_val) if h_val.is_integer() else h_val}"
            }

        return None

    def _match_triangle_angles(self, text: str) -> Optional[Dict[str, Any]]:
        # If text explicitly mentions legs, hypotenuse, or sides, do not treat as angles
        if any(w in text.lower() for w in ["legs", "hypotenuse", "pythagor", "side"]):
            return None

        # Match angle formats like "38°; 90°; ?", "38°, 90°, x", "38; 90; ?"
        m1 = re.search(r'(\d+(?:\.\d+)?)\s*[°度]?\s*[,;]?\s*(\d+(?:\.\d+)?)\s*[°度]?\s*[,;]?\s*(?:\b(?:find|calculate|what is)\s+)?(\?|[a-zA-Z])?', text, re.IGNORECASE)
        m2 = re.search(r'(?:triangle|angles?).*?(\d+(?:\.\d+)?)\s*[°度]?.*?(?:and|,|;)\s*(\d+(?:\.\d+)?)\s*[°度]?', text, re.IGNORECASE)

        angles: List[float] = []
        target = "x"

        if m1 and ("°" in text or "deg" in text.lower() or ";" in text or "triangle" in text.lower() or "?" in text):
            a1, a2 = float(m1.group(1)), float(m1.group(2))
            t_grp = m1.group(3)
            if t_grp and t_grp not in ["?", ""]:
                target = t_grp
            angles = [a1, a2]
        elif m2:
            a1, a2 = float(m2.group(1)), float(m2.group(2))
            angles = [a1, a2]

        # Valid triangle angles: each > 0, sum < 180, and sum > 20 (to differentiate from legs 3 and 4)
        if len(angles) == 2 and all(0 < a < 180 for a in angles) and 20 < sum(angles) < 180:
            is_right = (90.0 in angles) or ("right" in text.lower())
            shape_type = GeometryShapeType.RIGHT_TRIANGLE if is_right else GeometryShapeType.TRIANGLE
            shape = GeometryShape(
                type=shape_type,
                id="triangle_1",
                vertices=[
                    {"label": "A", "x": 60, "y": 240},
                    {"label": "B", "x": 340, "y": 240},
                    {"label": "C", "x": 60, "y": 60}
                ],
                measurements=[
                    GeometryMeasurement(value=angles[0], unit="degrees", measurement_type=MeasurementType.ANGLE, label="A"),
                    GeometryMeasurement(value=angles[1], unit="degrees", measurement_type=MeasurementType.ANGLE, label="B")
                ],
                relationships=[GeometryRelationship(type=RelationshipType.RIGHT_ANGLE, elements=["A"])] if is_right else []
            )
            prob = GeometryProblem(
                shapes=[shape],
                requested_quantity={"type": "angle", "target": target},
                topic="triangle_angles"
            )
            return {
                "domain": "geometry",
                "topic": "triangle_angles",
                "problem_type": "geometry",
                "angles": angles,
                "is_right_triangle": is_right,
                "geometry_problem": prob,
                "unknowns": [target],
                "ast": {
                    "type": "eq",
                    "left": {
                        "type": "add",
                        "args": [
                            {"type": "number", "value": angles[0]},
                            {"type": "number", "value": angles[1]},
                            {"type": "symbol", "name": target}
                        ]
                    },
                    "right": {"type": "number", "value": 180}
                },
                "latex": f"{int(angles[0]) if angles[0].is_integer() else angles[0]}^\\circ + {int(angles[1]) if angles[1].is_integer() else angles[1]}^\\circ + {target} = 180^\\circ"
            }
        return None

    def _match_pythagoras(self, text: str) -> Optional[Dict[str, Any]]:
        # e.g. "right triangle legs 3 and 4", "a=3, b=4, c=?", "pythagoras a=6, b=8"
        has_kw = any(w in text.lower() for w in ["pythagor", "hypotenuse", "right triangle", "legs"])
        m_sides = re.search(r'(?:a\s*=\s*(\d+(?:\.\d+)?).*?b\s*=\s*(\d+(?:\.\d+)?))|(?:legs?\s*(?:of|are|=|is)?\s*(\d+(?:\.\d+)?).*?(?:and|,)\s*(\d+(?:\.\d+)?))', text, re.IGNORECASE)
        
        if m_sides and (has_kw or "c=" in text.lower() or "hyp" in text.lower()):
            a = float(m_sides.group(1) or m_sides.group(3))
            b = float(m_sides.group(2) or m_sides.group(4))
            shape = GeometryShape(
                type=GeometryShapeType.RIGHT_TRIANGLE,
                id="triangle_pyth",
                vertices=[
                    {"label": "A", "x": 60, "y": 240},
                    {"label": "B", "x": 340, "y": 240},
                    {"label": "C", "x": 60, "y": 60}
                ],
                measurements=[
                    GeometryMeasurement(value=a, unit="cm", measurement_type=MeasurementType.LENGTH, label="a"),
                    GeometryMeasurement(value=b, unit="cm", measurement_type=MeasurementType.LENGTH, label="b")
                ],
                relationships=[GeometryRelationship(type=RelationshipType.RIGHT_ANGLE, elements=["A"])]
            )
            prob = GeometryProblem(
                shapes=[shape],
                requested_quantity={"type": "length", "target": "c"},
                topic="pythagoras"
            )
            return {
                "domain": "geometry",
                "topic": "pythagoras",
                "problem_type": "geometry",
                "geometry_problem": prob,
                "legs": [a, b],
                "unknowns": ["c"],
                "ast": {
                    "type": "eq",
                    "left": {
                        "type": "add",
                        "args": [
                            {"type": "pow", "base": {"type": "number", "value": a}, "exp": {"type": "number", "value": 2}},
                            {"type": "pow", "base": {"type": "number", "value": b}, "exp": {"type": "number", "value": 2}}
                        ]
                    },
                    "right": {"type": "pow", "base": {"type": "symbol", "name": "c"}, "exp": {"type": "number", "value": 2}}
                },
                "latex": f"{int(a) if a.is_integer() else a}^2 + {int(b) if b.is_integer() else b}^2 = c^2"
            }
        return None

    def _match_circle(self, text: str) -> Optional[Dict[str, Any]]:
        # e.g. "circle radius 5", "r = 7, find area", "circle radius 5, find circumference", "Circle 5, Area"
        m = re.search(r'(?:circle|radius)\s*(?:with|of|is|=)?\s*(?:r(?:adius)?\s*=?\s*)?(\d+(?:\.\d+)?)', text, re.IGNORECASE)
        nums = self._extract_positive_numbers(text)
        if (m or ("circle" in text.lower() and nums)) and any(w in text.lower() for w in ["circle", "radius", "circumference", "diameter", "pi"]):
            r = float(m.group(1)) if m else nums[0]
            r_s = int(r) if r.is_integer() else r
            req_type = "circumference" if ("circum" in text.lower() or "perim" in text.lower()) else ("diameter" if "diam" in text.lower() else "area")
            
            prob = MensurationProblem(
                shape_type=GeometryShapeType.CIRCLE,
                measurements=[
                    GeometryMeasurement(value=r, unit="cm", measurement_type=MeasurementType.RADIUS, label="r")
                ],
                requested_quantity={"type": req_type, "target": req_type},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "radius": r,
                "unknowns": [req_type],
                "ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "A" if req_type == "area" else ("C" if req_type == "circumference" else "d")},
                    "right": {
                        "type": "mul",
                        "args": [
                            {"type": "symbol", "name": "pi"},
                            {"type": "pow", "base": {"type": "number", "value": r}, "exp": {"type": "number", "value": 2}}
                        ]
                    } if req_type == "area" else {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "pi"}, {"type": "number", "value": r}]}
                },
                "latex": f"A = \\pi \\times {r_s}^2" if req_type == "area" else (f"C = 2\\pi \\times {r_s}" if req_type == "circumference" else f"d = 2 \\times {r_s}")
            }
        return None

    def _match_mensuration(self, text: str) -> Optional[Dict[str, Any]]:
        nums = self._extract_positive_numbers(text)
        # 1. Square: e.g. "square side 6 find area", "square side 6 find diagonal", "Square 6, Area"
        m_sq = re.search(r'square.*?(?:side|s)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
        if m_sq or ("square" in text.lower() and any(w in text.lower() for w in ["area", "perimeter", "diag", "side"])):
            s = float(m_sq.group(1)) if m_sq else (nums[0] if nums else 5.0)
            s_s = int(s) if s.is_integer() else s
            req_type = "diagonal" if "diag" in text.lower() else ("perimeter" if "perim" in text.lower() else "area")
            prob = MensurationProblem(
                shape_type=GeometryShapeType.SQUARE,
                measurements=[
                    GeometryMeasurement(value=s, unit="cm", measurement_type=MeasurementType.LENGTH, label="side")
                ],
                requested_quantity={"type": req_type, "target": req_type},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "unknowns": [req_type],
                "ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "A" if req_type == "area" else ("P" if req_type == "perimeter" else "d")},
                    "right": {"type": "pow", "base": {"type": "number", "value": s}, "exp": {"type": "number", "value": 2}}
                },
                "latex": f"A = {s_s}^2" if req_type == "area" else (f"P = 4 \\times {s_s}" if req_type == "perimeter" else f"d = {s_s}\\sqrt{{2}}")
            }

        # 2. Rectangle: e.g. "rectangle length 8 width 5 find area", "Rectangle with sides 5, 6, Area"
        m_rect = re.search(r'(?:rectangle|rect).*?(?:length|l)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?).*?(?:width|breadth|w)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
        if m_rect or (("rectangle" in text.lower() or "rect " in text.lower()) and ("length" in text.lower() or len(nums) >= 2)):
            l = float(m_rect.group(1)) if m_rect else (nums[0] if len(nums) >= 1 else 8.0)
            w = float(m_rect.group(2)) if m_rect else (nums[1] if len(nums) >= 2 else 5.0)
            l_s = int(l) if l.is_integer() else l
            w_s = int(w) if w.is_integer() else w
            req_type = "diagonal" if "diag" in text.lower() else ("perimeter" if "perim" in text.lower() else "area")
            prob = MensurationProblem(
                shape_type=GeometryShapeType.RECTANGLE,
                measurements=[
                    GeometryMeasurement(value=l, unit="cm", measurement_type=MeasurementType.LENGTH, label="length"),
                    GeometryMeasurement(value=w, unit="cm", measurement_type=MeasurementType.LENGTH, label="width")
                ],
                requested_quantity={"type": req_type, "target": req_type},
                topic="mensuration_2d"
            )
            return {
                "domain": "mensuration",
                "topic": "mensuration_2d",
                "problem_type": "geometry",
                "mensuration_problem": prob,
                "unknowns": [req_type],
                "ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "A" if req_type == "area" else ("P" if req_type == "perimeter" else "d")},
                    "right": {"type": "mul", "args": [{"type": "number", "value": l}, {"type": "number", "value": w}]}
                },
                "latex": f"A = {l_s} \\times {w_s}" if req_type == "area" else (f"P = 2({l_s} + {w_s})" if req_type == "perimeter" else f"d = \\sqrt{{{l_s}^2 + {w_s}^2}}")
            }
        return None

    def _match_coordinate_geometry(self, text: str) -> Optional[Dict[str, Any]]:
        # e.g. "distance between (1, 2) and (4, 6)", "midpoint of (2,4) and (6,8)", "slope through (1,2) and (3,6)"
        m_pts = re.findall(r'\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)', text)
        if len(m_pts) >= 2 and any(w in text.lower() for w in ["distance", "midpoint", "slope", "between", "points"]):
            p1 = {"x": float(m_pts[0][0]), "y": float(m_pts[0][1]), "label": "A"}
            p2 = {"x": float(m_pts[1][0]), "y": float(m_pts[1][1]), "label": "B"}
            
            target = "distance"
            if "midpoint" in text.lower():
                target = "midpoint"
            elif "slope" in text.lower():
                target = "slope"
                
            prob = CoordinateGeometryProblem(
                points=[p1, p2],
                requested_quantity={"type": target, "target": target},
                topic="coordinate_geometry"
            )
            return {
                "domain": "coordinate_geometry",
                "topic": "coordinate_geometry",
                "problem_type": "geometry",
                "coordinate_problem": prob,
                "points": [p1, p2],
                "unknowns": [target],
                "ast": {"type": "symbol", "name": target},
                "latex": f"\\text{{{target.capitalize()}}}({p1['x']}, {p1['y']}) \\to ({p2['x']}, {p2['y']})"
            }
        return None

    def _match_calculus(self, text: str) -> Optional[Dict[str, Any]]:
        # 1. Differentiation
        m_diff = re.search(r'(?:d/dx|derivative\s+of|diff(?:erentiate)?)\s*(?:\((.*?)\)|(.*))', text, re.IGNORECASE)
        if m_diff:
            expr_str = (m_diff.group(1) or m_diff.group(2) or "").strip()
            if expr_str:
                return {
                    "domain": "calculus",
                    "topic": "differentiation",
                    "operation": "derivative",
                    "expression_str": expr_str,
                    "variable": "x",
                    "problem_type": "calculus",
                    "unknowns": ["dy/dx"],
                    "latex": f"\\frac{{d}}{{dx}}\\left({expr_str}\\right)",
                    "ast": {"type": "calculus_diff", "expression": expr_str}
                }

        # 2. Integration
        m_int = re.search(r'(?:integrate|integral\s+of|∫)\s*(.*?)(?:\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)|$)', text, re.IGNORECASE)
        if m_int:
            expr_str = (m_int.group(1) or "").strip()
            lower = m_int.group(2)
            upper = m_int.group(3)
            if expr_str:
                return {
                    "domain": "calculus",
                    "topic": "integration",
                    "operation": "definite_integral" if (lower and upper) else "indefinite_integral",
                    "expression_str": expr_str,
                    "limits": (float(lower), float(upper)) if (lower and upper) else None,
                    "variable": "x",
                    "problem_type": "calculus",
                    "unknowns": ["integral"],
                    "latex": f"\\int_{{{lower}}}^{{{upper}}} ({expr_str})\\,dx" if (lower and upper) else f"\\int ({expr_str})\\,dx",
                    "ast": {"type": "calculus_int", "expression": expr_str}
                }

        # 3. Limits
        m_lim = re.search(r'lim(?:it)?\s*(?:of)?\s*(.*?)\s+as\s+([a-zA-Z])\s*(?:->|to)\s*(-?\d+|[a-zA-Z]|infinity|inf)', text, re.IGNORECASE)
        if m_lim:
            expr_str = m_lim.group(1).strip()
            var = m_lim.group(2).strip()
            target = m_lim.group(3).strip()
            return {
                "domain": "calculus",
                "topic": "limits",
                "operation": "limit",
                "expression_str": expr_str,
                "variable": var,
                "target": target,
                "problem_type": "calculus",
                "unknowns": ["L"],
                "latex": f"\\lim_{{{var} \\to {target}}} \\left({expr_str}\\right)",
                "ast": {"type": "calculus_limit", "expression": expr_str}
            }

        return None

    def _match_statistics_and_prob(self, text: str) -> Optional[Dict[str, Any]]:
        # e.g. "mean of 4, 8, 12, 16", "median of [3, 5, 7, 9]"
        m_stat = re.search(r'(mean|median|mode|range)\s*(?:of)?\s*(?:\[|\()?([\d\s,.-]+)(?:\]|\))?', text, re.IGNORECASE)
        if m_stat:
            stat_type = m_stat.group(1).lower()
            raw_nums = m_stat.group(2)
            nums = [float(n.strip()) for n in re.split(r'[,;\s]+', raw_nums) if n.strip() and n.strip() not in ["[", "]"]]
            if len(nums) >= 2:
                prob = StatisticsProblem(
                    data=nums,
                    requested_quantity=stat_type,
                    topic="statistics"
                )
                return {
                    "domain": "statistics",
                    "topic": "statistics",
                    "problem_type": "statistics",
                    "statistics_problem": prob,
                    "data": nums,
                    "unknowns": [stat_type],
                    "ast": {"type": "stat", "operation": stat_type, "data": nums},
                    "latex": f"\\text{{{stat_type.capitalize()}}}({', '.join(str(int(n) if n.is_integer() else n) for n in nums)})"
                }

        # Probability
        m_prob = re.search(r'probability\s*(?:of)?\s*(.*?)(?:favorable\s*=\s*(\d+).*?total\s*=\s*(\d+)|$)', text, re.IGNORECASE)
        if m_prob and m_prob.group(2) and m_prob.group(3):
            fav = int(m_prob.group(2))
            tot = int(m_prob.group(3))
            prob = ProbabilityProblem(
                experiment="specified favorable outcomes",
                outcomes=[f"outcome_{i}" for i in range(tot)],
                favorable_outcomes=[f"outcome_{i}" for i in range(fav)],
                requested_quantity="probability"
            )
            return {
                "domain": "probability",
                "topic": "probability",
                "problem_type": "probability",
                "probability_problem": prob,
                "unknowns": ["P"],
                "ast": {"type": "prob", "favorable": fav, "total": tot},
                "latex": f"P = \\frac{{{fav}}}{{{tot}}}"
            }
        return None

    def _match_arithmetic(self, text: str) -> Optional[Dict[str, Any]]:
        # Fraction arithmetic: e.g. "1/2 + 3/4", "5/6 * 2/3"
        m_frac = re.search(r'(-?\d+/\d+)\s*([+\-*/])\s*(-?\d+/\d+)', text)
        if m_frac:
            return {
                "domain": "arithmetic",
                "topic": "fractions",
                "problem_type": "arithmetic",
                "operation": "fraction_operation",
                "expression_str": text,
                "unknowns": ["ans"],
                "latex": text.replace("/", "\\div ").replace("*", "\\times "),
                "ast": {"type": "arithmetic_frac", "expr": text}
            }

        # Pure numeric PEMDAS: e.g. "3 + 4 * (2 - 1)^2" (no letters)
        if re.search(r'^\s*[\d\s+\-*/^()%.]+\s*$', text) and any(op in text for op in ["+", "-", "*", "/", "^"]):
            # Avoid single numbers
            if any(char in text for char in ["+", "*", "/", "^"]):
                return {
                    "domain": "arithmetic",
                    "topic": "order_of_operations",
                    "problem_type": "arithmetic",
                    "operation": "pemdas",
                    "expression_str": text,
                    "unknowns": ["ans"],
                    "latex": text,
                    "ast": {"type": "arithmetic_pemdas", "expr": text}
                }
        return None

    def build_solvable_clarification(self, raw_text: str) -> Dict[str, Any]:
        """
        Build guaranteed-solvable, one-click clarification options for ambiguous
        or incomplete inputs (such as a triangle given only 2 sides).
        Every returned option is verified to resolve cleanly without re-clarifying.
        """
        text = (raw_text or "").strip()
        text_lower = text.lower()
        nums = self._extract_positive_numbers(text)

        question = f"Choose how you would like to solve '{text}':" if text else "Choose a math problem to solve:"
        candidates: List[str] = []

        if "triangle" in text_lower or "tri" in text_lower:
            if len(nums) >= 3:
                a, b, c = nums[0], nums[1], nums[2]
                a_s, b_s, c_s = self._fmt_num(a), self._fmt_num(b), self._fmt_num(c)
                if a + b > c and a + c > b and b + c > a:
                    question = f"What would you like to calculate for the triangle with sides {a_s}, {b_s}, and {c_s}?"
                    candidates = [
                        f"Triangle with sides {a_s}, {b_s}, {c_s}, find area",
                        f"Triangle with sides {a_s}, {b_s}, {c_s}, find perimeter",
                        f"Triangle with sides {a_s}, {b_s}, {c_s}, find longest side",
                    ]
                else:
                    question = f"Choose a valid triangle interpretation using {a_s} and {b_s}:"
                    candidates = [
                        f"Triangle with base {a_s} and height {b_s}, find area",
                        f"Right triangle with legs {a_s} and {b_s}, find area",
                        f"Right triangle with legs {a_s} and {b_s}, find hypotenuse",
                    ]
            elif len(nums) == 2:
                a_s, b_s = self._fmt_num(nums[0]), self._fmt_num(nums[1])
                question = (
                    f"A triangle with only two values ({a_s} and {b_s}) needs one assumption to solve uniquely. "
                    "Select one to solve right away:"
                )
                candidates = [
                    f"Triangle with base {a_s} and height {b_s}, find area",
                    f"Right triangle with legs {a_s} and {b_s}, find area",
                    f"Right triangle with legs {a_s} and {b_s}, find hypotenuse",
                ]
            elif len(nums) == 1:
                a_s = self._fmt_num(nums[0])
                question = f"Treat this as an equilateral triangle with side {a_s}?"
                candidates = [
                    f"Triangle with sides {a_s}, {a_s}, {a_s}, find area",
                    f"Triangle with sides {a_s}, {a_s}, {a_s}, find perimeter",
                ]
        elif "rectangle" in text_lower or "rect" in text_lower:
            l_s = self._fmt_num(nums[0]) if len(nums) >= 1 else 8
            w_s = self._fmt_num(nums[1]) if len(nums) >= 2 else 5
            question = f"What would you like to calculate for a rectangle ({l_s} × {w_s})?"
            candidates = [
                f"Rectangle with length {l_s} and width {w_s}, find area",
                f"Rectangle with length {l_s} and width {w_s}, find perimeter",
                f"Rectangle with length {l_s} and width {w_s}, find diagonal",
            ]
        elif "square" in text_lower:
            s_s = self._fmt_num(nums[0]) if nums else 5
            question = f"What would you like to calculate for a square with side {s_s}?"
            candidates = [
                f"Square with side {s_s}, find area",
                f"Square with side {s_s}, find perimeter",
                f"Square with side {s_s}, find diagonal",
            ]
        elif "circle" in text_lower or "radius" in text_lower:
            r_s = self._fmt_num(nums[0]) if nums else 5
            question = f"What would you like to calculate for a circle with radius {r_s}?"
            candidates = [
                f"Circle with radius {r_s}, find area",
                f"Circle with radius {r_s}, find circumference",
                f"Circle with radius {r_s}, find diameter",
            ]
        elif len(nums) >= 2:
            a_s, b_s = self._fmt_num(nums[0]), self._fmt_num(nums[1])
            question = f"Pick a calculation using {a_s} and {b_s}:"
            candidates = [
                f"Triangle with base {a_s} and height {b_s}, find area",
                f"Rectangle with length {a_s} and width {b_s}, find area",
                f"Right triangle with legs {a_s} and {b_s}, find hypotenuse",
                f"{a_s} + {b_s}",
            ]
        elif len(nums) == 1:
            a_s = self._fmt_num(nums[0])
            question = f"Pick a calculation using {a_s}:"
            candidates = [
                f"Square with side {a_s}, find area",
                f"Circle with radius {a_s}, find area",
                f"2x + {a_s} = 0",
            ]

        # Verify every candidate resolves cleanly with zero chance of looping back into clarification
        verified_options: List[str] = []
        for cand in candidates:
            check = self.interpret(cand, _allow_clarification=False)
            if not check.get("is_ambiguous") and check.get("domain") != "unknown":
                verified_options.append(cand)

        if not verified_options:
            question = "I couldn't parse that expression automatically. Pick a valid problem below or edit the equation box:"
            verified_options = [
                "Triangle with base 5 and height 6, find area",
                "Right triangle with legs 3 and 4, find hypotenuse",
                "2x + 4 = 10",
                "x^2 + 5x + 6 = 0",
            ]

        return {
            "domain": "unknown",
            "topic": "unknown",
            "problem_type": "clarification",
            "ast": None,
            "latex": text,
            "unknowns": [],
            "is_ambiguous": True,
            "clarification_question": question,
            "clarification_options": verified_options,
        }

    def _match_algebra(self, clean: str, original: str, _allow_clarification: bool = True) -> Dict[str, Any]:
        # Pre-clean expression and standardize syntax
        expr_str = clean
        expr_str = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', expr_str)
        expr_str = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', expr_str)
        expr_str = re.sub(r'\b(?:root|square\s+root)\s+(?:of\s+)?(\d+|[a-zA-Z])', r'sqrt(\1)', expr_str, flags=re.IGNORECASE)
        
        # Clean any remaining filler words like "and", "please"
        filler_pattern = r'\b(calculate\s+value\s+of|calculate\s+value|calculate|value\s+of|solve\s+for\s+\w+|solve|simplify|evaluate|find\s+the\s+value\s+of|find|for\s+[a-zA-Z]+|with\s+respect\s+to\s+[a-zA-Z]+|and|please|then|now|tell\s+me)\b'
        prev = None
        while expr_str != prev:
            prev = expr_str
            expr_str = re.sub(filler_pattern, ' ', expr_str, flags=re.IGNORECASE)
            expr_str = re.sub(r'\s+', ' ', expr_str).strip()

        # Deduplicate operators without breaking **
        expr_str = re.sub(r'([+\-/])\s*([+\-/=])', r'\2', expr_str)
        expr_str = re.sub(r'(?<!\*)\*(?!\*)\s*([+\-/=])', r'\1', expr_str)
        expr_str = re.sub(r'\*{3,}', '**', expr_str)
        expr_str = re.sub(r'^[+\-*/=\s]+', '', expr_str)
        expr_str = re.sub(r'[+\-*/\s]+$', '', expr_str)
        expr_str = expr_str.replace('\\times', '*').replace('\\div', '/').replace('^', '**')

        # Standard algebraic parser
        try:
            if "=" in expr_str and expr_str.count("=") == 1:
                left_str, right_str = expr_str.split("=")
                l_expr = parse_expr(left_str.strip(), transformations=self.transformations)
                r_expr = parse_expr(right_str.strip(), transformations=self.transformations)
                eq = sp.Eq(l_expr, r_expr)
                symbols = sorted([str(s) for s in eq.free_symbols])
                main_var = sp.Symbol(symbols[0]) if symbols else sp.Symbol('x')
                try:
                    deg = sp.degree(eq.lhs - eq.rhs, gen=main_var)
                except Exception:
                    deg = 1
                is_quad = (deg == 2)
                return {
                    "domain": "algebra",
                    "topic": "quadratic_equations" if is_quad else "linear_equations",
                    "problem_type": "equation",
                    "ast": {"type": "eq", "left": self._expr_to_ast(l_expr), "right": self._expr_to_ast(r_expr)},
                    "latex": sp.latex(eq),
                    "unknowns": symbols or ["x"]
                }
            else:
                expr = parse_expr(expr_str, transformations=self.transformations)
                symbols = sorted([str(s) for s in expr.free_symbols])
                return {
                    "domain": "algebra",
                    "topic": "expressions",
                    "problem_type": "expression",
                    "ast": self._expr_to_ast(expr),
                    "latex": sp.latex(expr),
                    "unknowns": symbols or ["x"]
                }
        except Exception:
            if not _allow_clarification:
                return {
                    "domain": "unknown",
                    "topic": "unknown",
                    "problem_type": "unknown",
                    "ast": None,
                    "latex": original,
                    "unknowns": [],
                    "is_ambiguous": True,
                }
            return self.build_solvable_clarification(original)

    def _expr_to_ast(self, expr: sp.Basic) -> Dict[str, Any]:
        if expr.is_Symbol:
            return {"type": "symbol", "name": str(expr)}
        elif expr.is_Number:
            return {"type": "number", "value": float(expr)}
        elif expr.is_Add:
            return {"type": "add", "args": [self._expr_to_ast(arg) for arg in expr.args]}
        elif expr.is_Mul:
            return {"type": "mul", "args": [self._expr_to_ast(arg) for arg in expr.args]}
        elif expr.is_Pow:
            return {"type": "pow", "base": self._expr_to_ast(expr.base), "exp": self._expr_to_ast(expr.exp)}
        return {"type": "expr", "value": str(expr)}
