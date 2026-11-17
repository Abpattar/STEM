import math
import sympy as sp
from typing import List, Dict, Any, Optional
from .schemas import (
    GeometryProblem, MensurationProblem, CoordinateGeometryProblem,
    StatisticsProblem, ProbabilityProblem, GeometrySolutionStep,
    GeometryShape, GeometryMeasurement, GeometryShapeType, MeasurementType,
    RelationshipType
)
from sympy import symbols, solve, Eq, pi, sqrt


class GeometryEngine:
    def __init__(self, grade: int = 7):
        self.grade = grade

    def solve(self, problem: GeometryProblem) -> List[Dict[str, Any]]:
        steps = []
        step_number = 0
        
        for shape in problem.shapes:
            if shape.type == GeometryShapeType.TRIANGLE or shape.type == GeometryShapeType.RIGHT_TRIANGLE:
                steps.extend(self._solve_triangle(shape, problem, step_number))
                step_number = len(steps)
            elif shape.type == GeometryShapeType.CIRCLE:
                steps.extend(self._solve_circle(shape, problem, step_number))
                step_number = len(steps)
        
        if steps:
            if isinstance(steps[-1], dict):
                steps[-1]["is_final_answer"] = True
                if not steps[-1].get("final_answer_text"):
                    steps[-1]["final_answer_text"] = steps[-1]["display_math"]

        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_triangle(self, shape: GeometryShape, problem: GeometryProblem, start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        angles = [m for m in shape.measurements if m.measurement_type == MeasurementType.ANGLE]
        lengths = [m for m in shape.measurements if m.measurement_type == MeasurementType.LENGTH]
        
        if len(angles) == 2:
            a1_val = int(angles[0].value) if angles[0].value.is_integer() else angles[0].value
            a2_val = int(angles[1].value) if angles[1].value.is_integer() else angles[1].value
            known_sum = a1_val + a2_val
            missing_angle = 180 - known_sum
            
            # Step 1: Set up the angle sum equation
            step_number += 1
            steps.append({
                "step_number": step_number,
                "operation": "angle_sum_theorem",
                "equation_ast": {
                    "type": "eq",
                    "left": {"type": "add", "args": [{"type": "number", "value": float(a1_val)}, {"type": "number", "value": float(a2_val)}, {"type": "symbol", "name": "x"}]},
                    "right": {"type": "number", "value": 180}
                },
                "display_math": f"{a1_val}^\\circ + {a2_val}^\\circ + x = 180^\\circ",
                "explanation": "The sum of interior angles in any triangle is always 180 degrees.",
                "validation": {"is_valid": True, "method": "angle_sum", "details": "Triangle angle sum theorem"},
                "hint": "Set up the equation with the two known angles plus x equal to 180.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": [a.label for a in angles if a.label],
                "diagram_type": "triangle"
            })
            
            # Step 2: Combine known angles
            step_number += 1
            steps.append({
                "step_number": step_number,
                "operation": "combine_angles",
                "equation_ast": {
                    "type": "eq",
                    "left": {"type": "add", "args": [{"type": "number", "value": float(known_sum)}, {"type": "symbol", "name": "x"}]},
                    "right": {"type": "number", "value": 180}
                },
                "display_math": f"{known_sum}^\\circ + x = 180^\\circ",
                "explanation": f"Add the two known angles: {a1_val}° + {a2_val}° = {known_sum}°.",
                "validation": {"is_valid": True, "method": "addition", "details": f"{a1_val} + {a2_val} = {known_sum}"},
                "hint": f"Add the known angles together to simplify: {a1_val} + {a2_val} = {known_sum}.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["known_sum"],
                "diagram_type": "triangle"
            })
            
            # Step 3: Solve for the missing angle
            step_number += 1
            steps.append({
                "step_number": step_number,
                "operation": "solve_missing_angle",
                "equation_ast": {
                    "type": "eq",
                    "left": {"type": "symbol", "name": "x"},
                    "right": {"type": "number", "value": float(missing_angle)}
                },
                "display_math": f"x = 180^\\circ - {known_sum}^\\circ = {missing_angle}^\\circ",
                "explanation": f"Subtract {known_sum}° from 180° to isolate the missing angle: x = {missing_angle}°.",
                "validation": {"is_valid": True, "method": "subtraction", "details": f"180 - {known_sum} = {missing_angle}"},
                "hint": f"Subtract {known_sum} from 180.",
                "is_final_answer": True,
                "final_answer_text": f"x = {missing_angle}^\\circ",
                "diagram_focus": ["x"],
                "diagram_type": "triangle"
            })
            
            shape.measurements.append(GeometryMeasurement(
                value=float(missing_angle),
                unit="degrees",
                measurement_type=MeasurementType.ANGLE,
                label="x"
            ))
        
        if shape.type == GeometryShapeType.RIGHT_TRIANGLE and len(lengths) >= 2:
            leg_a = next((l for l in lengths if "a" in l.label.lower() or "leg" in l.label.lower()), None)
            leg_b = next((l for l in lengths if "b" in l.label.lower() or "leg" in l.label.lower()), None)
            hypotenuse = next((l for l in lengths if "c" in l.label.lower() or "hyp" in l.label.lower()), None)
            
            if not leg_a or not leg_b:
                sorted_lengths = sorted(lengths, key=lambda l: l.value)
                if len(sorted_lengths) >= 2:
                    leg_a = sorted_lengths[0]
                    leg_b = sorted_lengths[1]
                    if len(sorted_lengths) >= 3:
                        hypotenuse = sorted_lengths[2]
            
            if leg_a and leg_b and not hypotenuse:
                a_v = int(leg_a.value) if leg_a.value.is_integer() else leg_a.value
                b_v = int(leg_b.value) if leg_b.value.is_integer() else leg_b.value
                c_squared = a_v**2 + b_v**2
                c = math.sqrt(c_squared)
                c_val = int(c) if c.is_integer() else round(c, 2)
                
                # Step 1: State Pythagorean theorem
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "apply_pythagoras",
                    "equation_ast": {
                        "type": "eq",
                        "left": {"type": "add", "args": [
                            {"type": "pow", "base": {"type": "number", "value": float(a_v)}, "exp": {"type": "number", "value": 2}},
                            {"type": "pow", "base": {"type": "number", "value": float(b_v)}, "exp": {"type": "number", "value": 2}}
                        ]},
                        "right": {"type": "pow", "base": {"type": "symbol", "name": "c"}, "exp": {"type": "number", "value": 2}}
                    },
                    "display_math": f"a^2 + b^2 = c^2 \\implies {a_v}^2 + {b_v}^2 = c^2",
                    "explanation": f"Apply Pythagoras theorem: a² + b² = c² where a and b are the legs, and c is the hypotenuse.",
                    "validation": {"is_valid": True, "method": "pythagoras", "details": f"{a_v}^2 + {b_v}^2 = c^2"},
                    "hint": "Square both legs and add them together.",
                    "is_final_answer": False,
                    "final_answer_text": "",
                    "diagram_focus": ["a", "b", "c"],
                    "diagram_type": "triangle"
                })

                # Step 2: Compute squares
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "compute_squares",
                    "equation_ast": {
                        "type": "eq",
                        "left": {"type": "number", "value": float(c_squared)},
                        "right": {"type": "pow", "base": {"type": "symbol", "name": "c"}, "exp": {"type": "number", "value": 2}}
                    },
                    "display_math": f"{a_v**2} + {b_v**2} = c^2 \\implies c^2 = {c_squared}",
                    "explanation": f"Calculate the squares: {a_v}² = {a_v**2} and {b_v}² = {b_v**2}. Their sum is {c_squared}.",
                    "validation": {"is_valid": True, "method": "addition", "details": f"{a_v**2} + {b_v**2} = {c_squared}"},
                    "hint": f"Take the square root of {c_squared} to find c.",
                    "is_final_answer": False,
                    "final_answer_text": "",
                    "diagram_focus": ["c^2"],
                    "diagram_type": "triangle"
                })

                # Step 3: Solve for hypotenuse
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "solve_hypotenuse",
                    "equation_ast": {
                        "type": "eq",
                        "left": {"type": "symbol", "name": "c"},
                        "right": {"type": "number", "value": float(c_val)}
                    },
                    "display_math": f"c = \\sqrt{{{c_squared}}} = {c_val}",
                    "explanation": f"Take the positive square root of both sides to find the hypotenuse: c = {c_val}.",
                    "validation": {"is_valid": True, "method": "square_root", "details": f"sqrt({c_squared}) = {c_val}"},
                    "hint": f"The hypotenuse length is {c_val}.",
                    "is_final_answer": True,
                    "final_answer_text": f"c = {c_val}",
                    "diagram_focus": ["c"],
                    "diagram_type": "triangle"
                })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_circle(self, shape: GeometryShape, problem: GeometryProblem, start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        radius = next((m for m in shape.measurements if m.measurement_type == MeasurementType.RADIUS), None)
        diameter = next((m for m in shape.measurements if m.measurement_type == MeasurementType.DIAMETER), None)
        
        if radius and not diameter:
            step_number += 1
            d = 2 * radius.value
            steps.append({
                "step_number": step_number,
                "operation": "diameter_from_radius",
                "equation_ast": {"type": "eq", "left": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "r"}]}, "right": {"type": "symbol", "name": "d"}},
                "display_math": f"d = 2 \\times {radius.value} = {d}",
                "explanation": f"Diameter is twice the radius: d = 2r = 2 × {radius.value} = {d}.",
                "validation": {"is_valid": True, "method": "formula", "details": "d = 2r"},
                "hint": "Diameter is twice the radius.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["r", "d"],
                "diagram_type": "circle"
            })
        
        if radius:
            step_number += 1
            area = pi * radius.value**2
            steps.append({
                "step_number": step_number,
                "operation": "area_circle",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 2}}]}},
                "display_math": f"A = \\pi r^2 = \\pi \\times {radius.value}^2 \\approx {float(area):.2f}",
                "explanation": f"Area of a circle: A = πr². With r = {radius.value}, A = π × {radius.value}² ≈ {float(area):.2f}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"A = πr² = {float(area):.2f}"},
                "hint": "Use A = πr².",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["A", "r"],
                "diagram_type": "circle"
            })
            
            step_number += 1
            circ = 2 * pi * radius.value
            steps.append({
                "step_number": step_number,
                "operation": "circumference_circle",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "C"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "pi"}, {"type": "symbol", "name": "r"}]}},
                "display_math": f"C = 2\\pi r = 2\\pi \\times {radius.value} \\approx {float(circ):.2f}",
                "explanation": f"Circumference of a circle: C = 2πr. With r = {radius.value}, C = 2π × {radius.value} ≈ {float(circ):.2f}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"C = 2πr = {float(circ):.2f}"},
                "hint": "Use C = 2πr.",
                "is_final_answer": True,
                "final_answer_text": f"C \\approx {float(circ):.2f}",
                "diagram_focus": ["C", "r"],
                "diagram_type": "circle"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]


class MensurationEngine:
    def __init__(self, grade: int = 7):
        self.grade = grade

    def solve(self, problem: 'MensurationProblem') -> List[Dict[str, Any]]:
        steps = []
        step_number = 0
        
        if problem.shape_type == GeometryShapeType.RECTANGLE:
            steps = self._solve_rectangle(problem, step_number)
        elif problem.shape_type == GeometryShapeType.SQUARE:
            steps = self._solve_square(problem, step_number)
        elif problem.shape_type in [GeometryShapeType.TRIANGLE, GeometryShapeType.RIGHT_TRIANGLE]:
            steps = self._solve_triangle_area(problem, step_number)
        elif problem.shape_type == GeometryShapeType.PARALLELOGRAM:
            steps = self._solve_parallelogram(problem, step_number)
        elif problem.shape_type == GeometryShapeType.TRAPEZIUM:
            steps = self._solve_trapezium(problem, step_number)
        elif problem.shape_type == GeometryShapeType.CIRCLE:
            steps = self._solve_circle_area(problem, step_number)
        elif problem.shape_type == GeometryShapeType.CUBOID:
            steps = self._solve_cuboid(problem, step_number)
        elif problem.shape_type == GeometryShapeType.CUBE:
            steps = self._solve_cube(problem, step_number)
        elif problem.shape_type == GeometryShapeType.CYLINDER:
            steps = self._solve_cylinder(problem, step_number)
        elif problem.shape_type == GeometryShapeType.CONE:
            steps = self._solve_cone(problem, step_number)
        elif problem.shape_type == GeometryShapeType.SPHERE:
            steps = self._solve_sphere(problem, step_number)
        
        if steps:
            if isinstance(steps[-1], dict):
                steps[-1]["is_final_answer"] = True
                if not steps[-1].get("final_answer_text"):
                    steps[-1]["final_answer_text"] = steps[-1]["display_math"]

        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_rectangle(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        length = next((m for m in problem.measurements if "length" in m.label.lower() or "l" == m.label.lower()), None)
        width = next((m for m in problem.measurements if "width" in m.label.lower() or "breadth" in m.label.lower() or "w" == m.label.lower()), None)
        
        target = (problem.requested_quantity.get("target") or "area").lower() if problem.requested_quantity else "area"
        unit = (width.unit if width else (length.unit if length else "cm"))

        if length and width:
            l_val = int(length.value) if float(length.value).is_integer() else length.value
            w_val = int(width.value) if float(width.value).is_integer() else width.value

            if "diag" in target:
                diag_sq = l_val**2 + w_val**2
                diag = math.sqrt(diag_sq)
                d_str = int(diag) if diag.is_integer() else f"{diag:.2f}"
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "diagonal_rectangle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "d"}, "right": {"type": "sqrt", "arg": {"type": "add", "args": [{"type": "pow", "base": {"type": "symbol", "name": "l"}, "exp": {"type": "number", "value": 2}}, {"type": "pow", "base": {"type": "symbol", "name": "w"}, "exp": {"type": "number", "value": 2}}]}}},
                    "display_math": f"d = \\sqrt{{l^2 + w^2}} = \\sqrt{{{l_val}^2 + {w_val}^2}} = \\sqrt{{{diag_sq}}} \\approx {d_str}",
                    "explanation": f"Diagonal of rectangle by Pythagorean theorem: d = √(l² + w²) = √({l_val}² + {w_val}²) = √{diag_sq} ≈ {d_str} {unit}.",
                    "validation": {"is_valid": True, "method": "pythagoras", "details": f"d = sqrt({l_val}^2 + {w_val}^2) = {d_str}"},
                    "hint": "Use d = √(l² + w²).",
                    "is_final_answer": True,
                    "final_answer_text": f"d = {d_str} {unit}",
                    "diagram_focus": ["d", "l", "w"],
                    "diagram_type": "rectangle"
                })
            elif "perim" in target:
                perimeter = 2 * (l_val + w_val)
                p_str = int(perimeter) if float(perimeter).is_integer() else perimeter
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "perimeter_rectangle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "P"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "add", "args": [{"type": "symbol", "name": "l"}, {"type": "symbol", "name": "w"}]}]}},
                    "display_math": f"P = 2(l + w) = 2({l_val} + {w_val}) = {p_str}",
                    "explanation": f"Perimeter of rectangle: P = 2(l + w) = 2({l_val} + {w_val}) = {p_str} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"P = 2(l + w) = {p_str}"},
                    "hint": "Add length and width, then multiply by 2.",
                    "is_final_answer": True,
                    "final_answer_text": f"P = {p_str} {unit}",
                    "diagram_focus": ["P", "l", "w"],
                    "diagram_type": "rectangle"
                })
            else:
                area = l_val * w_val
                a_str = int(area) if float(area).is_integer() else area
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "area_rectangle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "l"}, {"type": "symbol", "name": "w"}]}},
                    "display_math": f"A = l \\times w = {l_val} \\times {w_val} = {a_str}",
                    "explanation": f"Area of rectangle: A = length × width = {l_val} × {w_val} = {a_str} {unit}².",
                    "validation": {"is_valid": True, "method": "formula", "details": f"A = l × w = {a_str}"},
                    "hint": "Multiply length by width.",
                    "is_final_answer": True,
                    "final_answer_text": f"A = {a_str} {unit}^2",
                    "diagram_focus": ["A", "l", "w"],
                    "diagram_type": "rectangle"
                })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_square(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        side = next((m for m in problem.measurements if "side" in m.label.lower() or "s" == m.label.lower()), None)
        target = (problem.requested_quantity.get("target") or "area").lower() if problem.requested_quantity else "area"
        
        if side:
            s_val = int(side.value) if float(side.value).is_integer() else side.value
            unit = side.unit or "cm"

            if "diag" in target:
                diag = s_val * math.sqrt(2)
                d_str = f"{diag:.2f}"
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "diagonal_square",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "d"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "s"}, {"type": "sqrt", "arg": {"type": "number", "value": 2}}]}},
                    "display_math": f"d = s\\sqrt{{2}} = {s_val}\\sqrt{{2}} \\approx {d_str}",
                    "explanation": f"Diagonal of square: d = s√2 = {s_val}√2 ≈ {d_str} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"d = s*sqrt(2) ≈ {d_str}"},
                    "hint": "Multiply side length by √2.",
                    "is_final_answer": True,
                    "final_answer_text": f"d = {d_str} {unit}",
                    "diagram_focus": ["d", "s"],
                    "diagram_type": "rectangle"
                })
            elif "perim" in target:
                perimeter = 4 * s_val
                p_str = int(perimeter) if float(perimeter).is_integer() else perimeter
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "perimeter_square",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "P"}, "right": {"type": "mul", "args": [{"type": "number", "value": 4}, {"type": "symbol", "name": "s"}]}},
                    "display_math": f"P = 4s = 4 \\times {s_val} = {p_str}",
                    "explanation": f"Perimeter of square: P = 4s = 4 × {s_val} = {p_str} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"P = 4s = {p_str}"},
                    "hint": "Multiply side length by 4.",
                    "is_final_answer": True,
                    "final_answer_text": f"P = {p_str} {unit}",
                    "diagram_focus": ["P", "s"],
                    "diagram_type": "rectangle"
                })
            else:
                area = s_val ** 2
                a_str = int(area) if float(area).is_integer() else area
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "area_square",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "pow", "base": {"type": "symbol", "name": "s"}, "exp": {"type": "number", "value": 2}}},
                    "display_math": f"A = s^2 = {s_val}^2 = {a_str}",
                    "explanation": f"Area of square: A = s² = {s_val}² = {a_str} {unit}².",
                    "validation": {"is_valid": True, "method": "formula", "details": f"A = s² = {a_str}"},
                    "hint": "Square the side length.",
                    "is_final_answer": True,
                    "final_answer_text": f"A = {a_str} {unit}^2",
                    "diagram_focus": ["A", "s"],
                    "diagram_type": "rectangle"
                })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_triangle_area(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        target = (problem.requested_quantity.get("target") or "area").lower() if problem.requested_quantity else "area"
        
        base = next((m for m in problem.measurements if "base" in m.label.lower() or "b" == m.label.lower()), None)
        height = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        lengths = [m for m in problem.measurements if m.measurement_type == MeasurementType.LENGTH or "side" in m.label.lower() or "leg" in m.label.lower() or m.label in ["a", "b", "c"]]
        
        # Case 1: Base and Height given
        if base and height:
            b_val = int(base.value) if float(base.value).is_integer() else base.value
            h_val = int(height.value) if float(height.value).is_integer() else height.value
            unit = base.unit or "cm"
            area = 0.5 * b_val * h_val
            a_str = int(area) if float(area).is_integer() else area

            step_number += 1
            steps.append({
                "step_number": step_number,
                "operation": "area_triangle",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "number", "value": 0.5}, {"type": "symbol", "name": "b"}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"A = \\frac{{1}}{{2}} b h = \\frac{{1}}{{2}} \\times {b_val} \\times {h_val} = {a_str}",
                "explanation": f"Area of triangle: A = ½ × base × height = ½ × {b_val} × {h_val} = {a_str} {unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"A = ½bh = {a_str}"},
                "hint": "Multiply base by height, then halve.",
                "is_final_answer": True,
                "final_answer_text": f"A = {a_str} {unit}^2",
                "diagram_focus": ["A", "b", "h"],
                "diagram_type": "triangle"
            })
            return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

        # Case 2: Right Triangle with 2 legs given
        is_right = (problem.shape_type == GeometryShapeType.RIGHT_TRIANGLE) or any("leg" in m.label.lower() for m in lengths)
        if is_right and len(lengths) == 2:
            a = lengths[0].value
            b = lengths[1].value
            a_val = int(a) if float(a).is_integer() else a
            b_val = int(b) if float(b).is_integer() else b
            unit = lengths[0].unit or "cm"

            if "area" in target:
                area = 0.5 * a_val * b_val
                a_str = int(area) if float(area).is_integer() else area
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "right_triangle_area",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "number", "value": 0.5}, {"type": "number", "value": float(a_val)}, {"type": "number", "value": float(b_val)}]}},
                    "display_math": f"A = \\frac{{1}}{{2}} a b = \\frac{{1}}{{2}} \\times {a_val} \\times {b_val} = {a_str}",
                    "explanation": f"In a right triangle, the legs act as base and height: Area = ½ × a × b = ½ × {a_val} × {b_val} = {a_str} {unit}².",
                    "validation": {"is_valid": True, "method": "formula", "details": f"A = ½ab = {a_str}"},
                    "hint": "Multiply the two legs and divide by 2.",
                    "is_final_answer": True,
                    "final_answer_text": f"A = {a_str} {unit}^2",
                    "diagram_focus": ["A", "a", "b"],
                    "diagram_type": "triangle"
                })
                return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

        # Case 3: 3 side lengths given (Heron's Formula, Shortest Length, Longest Length, Perimeter)
        if len(lengths) >= 3:
            s_vals = [int(l.value) if float(l.value).is_integer() else l.value for l in lengths[:3]]
            a, b, c = s_vals[0], s_vals[1], s_vals[2]
            unit = lengths[0].unit or "cm"

            if "short" in target:
                shortest_val = min(a, b, c)
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "compare_lengths",
                    "equation_ast": {"type": "compare", "values": s_vals},
                    "display_math": f"\\text{{Side lengths: }} a = {a}, \\; b = {b}, \\; c = {c}",
                    "explanation": f"Given the triangle side lengths {a}, {b}, and {c}, we compare them to identify the shortest.",
                    "validation": {"is_valid": True, "method": "comparison", "details": f"Sides {s_vals}"},
                    "hint": "Identify the smallest numerical side length.",
                    "is_final_answer": False,
                    "final_answer_text": "",
                    "diagram_focus": ["sides"],
                    "diagram_type": "triangle"
                })
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "identify_shortest_length",
                    "equation_ast": {"type": "min", "result": shortest_val},
                    "display_math": f"\\min({a}, {b}, {c}) = {shortest_val}",
                    "explanation": f"Comparing the values: {shortest_val} is the minimum among {a}, {b}, and {c}. Therefore, the shortest length is {shortest_val} {unit}.",
                    "validation": {"is_valid": True, "method": "minimum", "details": f"min({a}, {b}, {c}) = {shortest_val}"},
                    "hint": f"The shortest length is {shortest_val}.",
                    "is_final_answer": True,
                    "final_answer_text": f"\\text{{Shortest length}} = {shortest_val} {unit}",
                    "diagram_focus": ["shortest"],
                    "diagram_type": "triangle"
                })
                return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

            elif "long" in target or "hyp" in target:
                longest_val = max(a, b, c)
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "identify_longest_length",
                    "equation_ast": {"type": "max", "result": longest_val},
                    "display_math": f"\\max({a}, {b}, {c}) = {longest_val}",
                    "explanation": f"Comparing the sides: {longest_val} is the maximum among {a}, {b}, and {c}. The longest length is {longest_val} {unit}.",
                    "validation": {"is_valid": True, "method": "maximum", "details": f"max({a}, {b}, {c}) = {longest_val}"},
                    "hint": f"The longest side is {longest_val}.",
                    "is_final_answer": True,
                    "final_answer_text": f"\\text{{Longest length}} = {longest_val} {unit}",
                    "diagram_focus": ["longest"],
                    "diagram_type": "triangle"
                })
                return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

            elif "perim" in target:
                perim = a + b + c
                p_str = int(perim) if float(perim).is_integer() else perim
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "perimeter_triangle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "P"}, "right": {"type": "add", "args": [{"type": "number", "value": float(a)}, {"type": "number", "value": float(b)}, {"type": "number", "value": float(c)}]}},
                    "display_math": f"P = a + b + c = {a} + {b} + {c} = {p_str}",
                    "explanation": f"Perimeter of triangle: P = a + b + c = {a} + {b} + {c} = {p_str} {unit}.",
                    "validation": {"is_valid": True, "method": "addition", "details": f"P = {a} + {b} + {c} = {p_str}"},
                    "hint": "Add all three sides together.",
                    "is_final_answer": True,
                    "final_answer_text": f"P = {p_str} {unit}",
                    "diagram_focus": ["P"],
                    "diagram_type": "triangle"
                })
                return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

            else:
                # Heron's Formula for Area
                s_semi = (a + b + c) / 2.0
                s_str = int(s_semi) if s_semi.is_integer() else s_semi
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "semi_perimeter",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "s"}, "right": {"type": "div", "args": [{"type": "add", "args": [{"type": "number", "value": float(a)}, {"type": "number", "value": float(b)}, {"type": "number", "value": float(c)}]}, {"type": "number", "value": 2}]}},
                    "display_math": f"s = \\frac{{a + b + c}}{{2}} = \\frac{{{a} + {b} + {c}}}{{2}} = {s_str}",
                    "explanation": f"First calculate the semi-perimeter: s = (a + b + c) / 2 = ({a} + {b} + {c}) / 2 = {s_str} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"s = ({a}+{b}+{c})/2 = {s_str}"},
                    "hint": "Add all three sides and divide by 2.",
                    "is_final_answer": False,
                    "final_answer_text": "",
                    "diagram_focus": ["s"],
                    "diagram_type": "triangle"
                })

                radicand = s_semi * (s_semi - a) * (s_semi - b) * (s_semi - c)
                area = math.sqrt(max(0, radicand))
                a_str = int(area) if area.is_integer() else f"{area:.2f}"
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "herons_formula",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "sqrt", "arg": {"type": "number", "value": float(radicand)}}},
                    "display_math": f"A = \\sqrt{{s(s-a)(s-b)(s-c)}} = \\sqrt{{{s_str}({s_str}-{a})({s_str}-{b})({s_str}-{c})}} = {a_str}",
                    "explanation": f"Apply Heron's formula: A = √(s(s-a)(s-b)(s-c)) = √({s_str} × {s_str-a} × {s_str-b} × {s_str-c}) = {a_str} {unit}².",
                    "validation": {"is_valid": True, "method": "heron", "details": f"sqrt({radicand}) = {a_str}"},
                    "hint": "Substitute s and sides into Heron's formula.",
                    "is_final_answer": True,
                    "final_answer_text": f"A = {a_str} {unit}^2",
                    "diagram_focus": ["A"],
                    "diagram_type": "triangle"
                })
                return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]

        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_parallelogram(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        base = next((m for m in problem.measurements if "base" in m.label.lower() or "b" == m.label.lower()), None)
        height = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        
        if base and height:
            step_number += 1
            area = base.value * height.value
            steps.append({
                "step_number": step_number,
                "operation": "area_parallelogram",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "b"}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"A = b \\times h = {base.value} \\times {height.value} = {area}",
                "explanation": f"Area of parallelogram: A = base × height = {base.value} × {height.value} = {area} {base.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"A = b × h = {area}"},
                "hint": "Multiply base by perpendicular height.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["A", "b", "h"],
                "diagram_type": "parallelogram"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_trapezium(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        a = next((m for m in problem.measurements if "a" == m.label.lower() or "base1" in m.label.lower()), None)
        b = next((m for m in problem.measurements if "b" == m.label.lower() or "base2" in m.label.lower()), None)
        height = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        
        if a and b and height:
            step_number += 1
            area = 0.5 * (a.value + b.value) * height.value
            steps.append({
                "step_number": step_number,
                "operation": "area_trapezium",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "number", "value": 0.5}, {"type": "add", "args": [{"type": "symbol", "name": "a"}, {"type": "symbol", "name": "b"}]}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"A = \\frac{{1}}{{2}} (a + b) h = \\frac{{1}}{{2}} ({a.value} + {b.value}) \\times {height.value} = {area}",
                "explanation": f"Area of trapezium: A = ½(a + b)h = ½({a.value} + {b.value}) × {height.value} = {area} {a.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"A = ½(a+b)h = {area}"},
                "hint": "Add parallel sides, multiply by height, then halve.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["A", "a", "b", "h"],
                "diagram_type": "trapezium"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_circle_area(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        radius = next((m for m in problem.measurements if m.measurement_type.value == "radius"), None)
        diameter = next((m for m in problem.measurements if m.measurement_type.value == "diameter"), None)
        
        target = (problem.requested_quantity.get("target") or "area").lower() if problem.requested_quantity else "area"
        
        if radius:
            r = radius.value
            r_val = int(r) if float(r).is_integer() else r
            unit = radius.unit or "cm"

            if "circum" in target or "perim" in target:
                circ = 2 * math.pi * r_val
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "circumference_circle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "C"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "pi"}, {"type": "symbol", "name": "r"}]}},
                    "display_math": f"C = 2\\pi r = 2 \\times \\pi \\times {r_val} \\approx {circ:.2f}",
                    "explanation": f"Circumference of circle: C = 2πr = 2 × π × {r_val} ≈ {circ:.2f} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"C = 2*pi*r ≈ {circ:.2f}"},
                    "hint": "Use C = 2πr.",
                    "is_final_answer": True,
                    "final_answer_text": f"C \\approx {circ:.2f} {unit}",
                    "diagram_focus": ["C", "r"],
                    "diagram_type": "circle"
                })
            elif "diam" in target:
                diam = 2 * r_val
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "diameter_circle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "d"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "r"}]}},
                    "display_math": f"d = 2r = 2 \\times {r_val} = {diam}",
                    "explanation": f"Diameter of circle: d = 2r = 2 × {r_val} = {diam} {unit}.",
                    "validation": {"is_valid": True, "method": "formula", "details": f"d = 2r = {diam}"},
                    "hint": "Double the radius.",
                    "is_final_answer": True,
                    "final_answer_text": f"d = {diam} {unit}",
                    "diagram_focus": ["d", "r"],
                    "diagram_type": "circle"
                })
            else:
                area = math.pi * r_val**2
                step_number += 1
                steps.append({
                    "step_number": step_number,
                    "operation": "area_circle",
                    "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "A"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 2}}]}},
                    "display_math": f"A = \\pi r^2 = \\pi \\times {r_val}^2 \\approx {area:.2f}",
                    "explanation": f"Area of circle: A = πr² = π × {r_val}² ≈ {area:.2f} {unit}².",
                    "validation": {"is_valid": True, "method": "formula", "details": f"A = πr² ≈ {area:.2f}"},
                    "hint": "Use A = πr².",
                    "is_final_answer": True,
                    "final_answer_text": f"A \\approx {area:.2f} {unit}^2",
                    "diagram_focus": ["A", "r"],
                    "diagram_type": "circle"
                })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_cuboid(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        l = next((m for m in problem.measurements if "length" in m.label.lower() or "l" == m.label.lower()), None)
        w = next((m for m in problem.measurements if "width" in m.label.lower() or "breadth" in m.label.lower() or "w" == m.label.lower()), None)
        h = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        
        if l and w and h:
            step_number += 1
            volume = l.value * w.value * h.value
            steps.append({
                "step_number": step_number,
                "operation": "volume_cuboid",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "V"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "l"}, {"type": "symbol", "name": "w"}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"V = l \\times w \\times h = {l.value} \\times {w.value} \\times {h.value} = {volume}",
                "explanation": f"Volume of cuboid: V = l × w × h = {l.value} × {w.value} × {h.value} = {volume} {l.unit}³.",
                "validation": {"is_valid": True, "method": "formula", "details": f"V = lwh = {volume}"},
                "hint": "Multiply length, width, and height.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["V", "l", "w", "h"],
                "diagram_type": "cuboid"
            })
            
            step_number += 1
            sa = 2 * (l.value*w.value + w.value*h.value + h.value*l.value)
            steps.append({
                "step_number": step_number,
                "operation": "surface_area_cuboid",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "SA"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "add", "args": [{"type": "mul", "args": [{"type": "symbol", "name": "l"}, {"type": "symbol", "name": "w"}]}, {"type": "mul", "args": [{"type": "symbol", "name": "w"}, {"type": "symbol", "name": "h"}]}, {"type": "mul", "args": [{"type": "symbol", "name": "h"}, {"type": "symbol", "name": "l"}]}]}]}},
                "display_math": f"SA = 2(lw + wh + hl) = 2({l.value}\\times{w.value} + {w.value}\\times{h.value} + {h.value}\\times{l.value}) = {sa}",
                "explanation": f"Surface area of cuboid: SA = 2(lw + wh + hl) = {sa} {l.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"SA = 2(lw + wh + hl) = {sa}"},
                "hint": "Find area of each pair of opposite faces, sum them, multiply by 2.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["SA", "l", "w", "h"],
                "diagram_type": "cuboid"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_cube(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        side = next((m for m in problem.measurements if "side" in m.label.lower() or "s" == m.label.lower()), None)
        
        if side:
            step_number += 1
            volume = side.value ** 3
            steps.append({
                "step_number": step_number,
                "operation": "volume_cube",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "V"}, "right": {"type": "pow", "base": {"type": "symbol", "name": "s"}, "exp": {"type": "number", "value": 3}}},
                "display_math": f"V = s^3 = {side.value}^3 = {volume}",
                "explanation": f"Volume of cube: V = s³ = {side.value}³ = {volume} {side.unit}³.",
                "validation": {"is_valid": True, "method": "formula", "details": f"V = s³ = {volume}"},
                "hint": "Cube the side length.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["V", "s"],
                "diagram_type": "cuboid"
            })
            
            step_number += 1
            sa = 6 * side.value ** 2
            steps.append({
                "step_number": step_number,
                "operation": "surface_area_cube",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "SA"}, "right": {"type": "mul", "args": [{"type": "number", "value": 6}, {"type": "pow", "base": {"type": "symbol", "name": "s"}, "exp": {"type": "number", "value": 2}}]}},
                "display_math": f"SA = 6s^2 = 6 \\times {side.value}^2 = {sa}",
                "explanation": f"Surface area of cube: SA = 6s² = 6 × {side.value}² = {sa} {side.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"SA = 6s² = {sa}"},
                "hint": "Find area of one face, multiply by 6.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["SA", "s"],
                "diagram_type": "cuboid"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_cylinder(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        radius = next((m for m in problem.measurements if m.measurement_type.value == "radius"), None)
        height = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        
        if radius and height:
            step_number += 1
            volume = math.pi * radius.value**2 * height.value
            steps.append({
                "step_number": step_number,
                "operation": "volume_cylinder",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "V"}, "right": {"type": "mul", "args": [{"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 2}}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"V = \\pi r^2 h = \\pi \\times {radius.value}^2 \\times {height.value} \\approx {volume:.2f}",
                "explanation": f"Volume of cylinder: V = πr²h = π × {radius.value}² × {height.value} ≈ {volume:.2f} {radius.unit}³.",
                "validation": {"is_valid": True, "method": "formula", "details": f"V = πr²h ≈ {volume:.2f}"},
                "hint": "Area of base times height.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["V", "r", "h"],
                "diagram_type": "cylinder"
            })
            
            step_number += 1
            sa = 2 * math.pi * radius.value * (radius.value + height.value)
            steps.append({
                "step_number": step_number,
                "operation": "surface_area_cylinder",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "SA"}, "right": {"type": "mul", "args": [{"type": "number", "value": 2}, {"type": "symbol", "name": "pi"}, {"type": "symbol", "name": "r"}, {"type": "add", "args": [{"type": "symbol", "name": "r"}, {"type": "symbol", "name": "h"}]}]}},
                "display_math": f"SA = 2\\pi r(r + h) = 2\\pi \\times {radius.value}({radius.value} + {height.value}) \\approx {sa:.2f}",
                "explanation": f"Surface area of cylinder: SA = 2πr(r + h) = 2π × {radius.value} × ({radius.value} + {height.value}) ≈ {sa:.2f} {radius.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"SA = 2πr(r+h) ≈ {sa:.2f}"},
                "hint": "Sum of areas of two circles and rectangle wrap.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["SA", "r", "h"],
                "diagram_type": "cylinder"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_cone(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        radius = next((m for m in problem.measurements if m.measurement_type.value == "radius"), None)
        height = next((m for m in problem.measurements if "height" in m.label.lower() or "h" == m.label.lower()), None)
        
        if radius and height:
            step_number += 1
            volume = (1/3) * math.pi * radius.value**2 * height.value
            steps.append({
                "step_number": step_number,
                "operation": "volume_cone",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "V"}, "right": {"type": "mul", "args": [{"type": "number", "value": 1/3}, {"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 2}}, {"type": "symbol", "name": "h"}]}},
                "display_math": f"V = \\frac{{1}}{{3}} \\pi r^2 h = \\frac{{1}}{{3}} \\pi \\times {radius.value}^2 \\times {height.value} \\approx {volume:.2f}",
                "explanation": f"Volume of cone: V = ⅓πr²h = ⅓π × {radius.value}² × {height.value} ≈ {volume:.2f} {radius.unit}³.",
                "validation": {"is_valid": True, "method": "formula", "details": f"V = ⅓πr²h ≈ {volume:.2f}"},
                "hint": "One-third of cylinder volume with same base and height.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["V", "r", "h"],
                "diagram_type": "cone"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
    
    def _solve_sphere(self, problem: 'MensurationProblem', start_step: int) -> List[Dict[str, Any]]:
        steps = []
        step_number = start_step
        
        radius = next((m for m in problem.measurements if m.measurement_type.value == "radius"), None)
        
        if radius:
            step_number += 1
            volume = (4/3) * math.pi * radius.value**3
            steps.append({
                "step_number": step_number,
                "operation": "volume_sphere",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "V"}, "right": {"type": "mul", "args": [{"type": "number", "value": 4/3}, {"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 3}}]}},
                "display_math": f"V = \\frac{{4}}{{3}} \\pi r^3 = \\frac{{4}}{{3}} \\pi \\times {radius.value}^3 \\approx {volume:.2f}",
                "explanation": f"Volume of sphere: V = ⁴⁄₃πr³ = ⁴⁄₃π × {radius.value}³ ≈ {volume:.2f} {radius.unit}³.",
                "validation": {"is_valid": True, "method": "formula", "details": f"V = ⁴⁄₃πr³ ≈ {volume:.2f}"},
                "hint": "Four-thirds times pi times radius cubed.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["V", "r"],
                "diagram_type": "circle"
            })
            
            step_number += 1
            sa = 4 * math.pi * radius.value**2
            steps.append({
                "step_number": step_number,
                "operation": "surface_area_sphere",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "SA"}, "right": {"type": "mul", "args": [{"type": "number", "value": 4}, {"type": "symbol", "name": "pi"}, {"type": "pow", "base": {"type": "symbol", "name": "r"}, "exp": {"type": "number", "value": 2}}]}},
                "display_math": f"SA = 4\\pi r^2 = 4\\pi \\times {radius.value}^2 \\approx {sa:.2f}",
                "explanation": f"Surface area of sphere: SA = 4πr² = 4π × {radius.value}² ≈ {sa:.2f} {radius.unit}².",
                "validation": {"is_valid": True, "method": "formula", "details": f"SA = 4πr² ≈ {sa:.2f}"},
                "hint": "Four times the area of a great circle.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["SA", "r"],
                "diagram_type": "circle"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]


class CoordinateGeometryEngine:
    def __init__(self, grade: int = 7):
        self.grade = grade

    def solve(self, problem: 'CoordinateGeometryProblem') -> List[Dict[str, Any]]:
        steps = []
        step_number = 0
        
        points = problem.points
        
        if len(points) >= 2:
            p1 = points[0]
            p2 = points[1]
            
            step_number += 1
            dx = p2["x"] - p1["x"]
            dy = p2["y"] - p1["y"]
            distance = math.sqrt(dx**2 + dy**2)
            
            steps.append({
                "step_number": step_number,
                "operation": "distance_formula",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "d"}, "right": {"type": "sqrt", "arg": {"type": "add", "args": [{"type": "pow", "base": {"type": "sub", "args": [{"type": "symbol", "name": "x2"}, {"type": "symbol", "name": "x1"}]}, "exp": {"type": "number", "value": 2}}, {"type": "pow", "base": {"type": "sub", "args": [{"type": "symbol", "name": "y2"}, {"type": "symbol", "name": "y1"}]}, "exp": {"type": "number", "value": 2}}]}}},
                "display_math": f"d = \\sqrt{{({p2['x']} - {p1['x']})^2 + ({p2['y']} - {p1['y']})^2}} = {distance:.2f}",
                "explanation": f"Distance between ({p1['x']}, {p1['y']}) and ({p2['x']}, {p2['y']}): d = √(({dx})² + ({dy})²) = {distance:.2f}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"d = √({dx}² + {dy}²) = {distance:.2f}"},
                "hint": "Use the distance formula: √((x₂-x₁)² + (y₂-y₁)²).",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["d", "A", "B"],
                "diagram_type": "coordinate_plane"
            })
            
            step_number += 1
            mx = (p1["x"] + p2["x"]) / 2
            my = (p1["y"] + p2["y"]) / 2
            
            steps.append({
                "step_number": step_number,
                "operation": "midpoint_formula",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "M"}, "right": {"type": "add", "args": [{"type": "div", "args": [{"type": "add", "args": [{"type": "symbol", "name": "x1"}, {"type": "symbol", "name": "x2"}]}, {"type": "number", "value": 2}]}, {"type": "div", "args": [{"type": "add", "args": [{"type": "symbol", "name": "y1"}, {"type": "symbol", "name": "y2"}]}, {"type": "number", "value": 2}]}]}},
                "display_math": f"M = (\\frac{{{p1['x']} + {p2['x']}}}{{2}}, \\frac{{{p1['y']} + {p2['y']}}}{{2}}) = ({mx}, {my})",
                "explanation": f"Midpoint: M = (({p1['x']}+{p2['x']})/2, ({p1['y']}+{p2['y']})/2) = ({mx}, {my}).",
                "validation": {"is_valid": True, "method": "formula", "details": f"M = (({p1['x']}+{p2['x']})/2, ({p1['y']}+{p2['y']})/2)"},
                "hint": "Average the x-coordinates and y-coordinates.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["M", "A", "B"],
                "diagram_type": "coordinate_plane"
            })
        
        if len(points) >= 3:
            step_number += 1
            p1 = points[0]
            p2 = points[1]
            slope = (p2["y"] - p1["y"]) / (p2["x"] - p1["x"]) if p2["x"] != p1["x"] else float('inf')
            
            steps.append({
                "step_number": step_number,
                "operation": "slope_formula",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "m"}, "right": {"type": "div", "args": [{"type": "sub", "args": [{"type": "symbol", "name": "y2"}, {"type": "symbol", "name": "y1"}]}, {"type": "sub", "args": [{"type": "symbol", "name": "x2"}, {"type": "symbol", "name": "x1"}]}]}},
                "display_math": f"m = \\frac{{{p2['y']} - {p1['y']}}}{{{p2['x']} - {p1['x']}}} = {slope:.2f}",
                "explanation": f"Slope between points: m = (y₂-y₁)/(x₂-x₁) = ({p2['y']}-{p1['y']})/({p2['x']}-{p1['x']}) = {slope:.2f}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"m = ({p2['y']}-{p1['y']})/({p2['x']}-{p1['x']}) = {slope:.2f}"},
                "hint": "Slope = rise over run.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["m", "A", "B"],
                "diagram_type": "coordinate_plane"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]


class StatisticsEngine:
    def __init__(self, grade: int = 7):
        self.grade = grade

    def solve(self, problem: 'StatisticsProblem') -> List[Dict[str, Any]]:
        steps = []
        step_number = 0
        
        data = problem.data
        if problem.frequency_table:
            data = []
            for value, freq in problem.frequency_table.items():
                data.extend([value] * freq)
        
        if not data:
            return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]
        
        if problem.requested_quantity in ["mean", "all"]:
            step_number += 1
            mean = sum(data) / len(data)
            steps.append({
                "step_number": step_number,
                "operation": "mean",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "mean"}, "right": {"type": "div", "args": [{"type": "add", "args": [{"type": "number", "value": v} for v in data]}, {"type": "number", "value": len(data)}]}},
                "display_math": f"\\bar{{x}} = \\frac{{\\sum x}}{{n}} = \\frac{{{sum(data)}}}{{{len(data)}}} = {mean:.2f}",
                "explanation": f"Mean = sum of all values ÷ number of values = {sum(data)} ÷ {len(data)} = {mean:.2f}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"Mean = Σx/n = {mean:.2f}"},
                "hint": "Add all values, divide by count.",
                "is_final_answer": True,
                "final_answer_text": f"\\bar{{x}} = {mean:.2f}",
                "diagram_focus": ["mean", "data"],
                "diagram_type": "bar_chart"
            })
        
        if problem.requested_quantity in ["median", "all"]:
            step_number += 1
            sorted_data = sorted(data)
            n = len(sorted_data)
            if n % 2 == 1:
                median = sorted_data[n // 2]
            else:
                median = (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2
            
            steps.append({
                "step_number": step_number,
                "operation": "median",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "median"}, "right": {"type": "number", "value": median}},
                "display_math": f"\\text{{median}} = {median}",
                "explanation": f"Median = middle value of sorted data. Sorted: {sorted_data}. Median = {median}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"Median = {median}"},
                "hint": "Sort data, find middle value (or average of two middle values).",
                "is_final_answer": True,
                "final_answer_text": f"\\text{{median}} = {median}",
                "diagram_focus": ["median", "data"],
                "diagram_type": "bar_chart"
            })
        
        if problem.requested_quantity in ["mode", "all"]:
            step_number += 1
            from collections import Counter
            counts = Counter(data)
            max_count = max(counts.values())
            modes = [k for k, v in counts.items() if v == max_count]
            
            steps.append({
                "step_number": step_number,
                "operation": "mode",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "mode"}, "right": {"type": "add", "args": [{"type": "number", "value": m} for m in modes]}},
                "display_math": f"\\text{{mode}} = {', '.join(str(m) for m in modes)}",
                "explanation": f"Mode = value(s) appearing most frequently. Frequencies: {dict(counts)}. Mode = {modes}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"Mode = {modes}"},
                "hint": "Find the value that appears most often.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["mode", "data"],
                "diagram_type": "bar_chart"
            })
        
        if problem.requested_quantity in ["range", "all"]:
            step_number += 1
            data_range = max(data) - min(data)
            
            steps.append({
                "step_number": step_number,
                "operation": "range",
                "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "range"}, "right": {"type": "sub", "args": [{"type": "number", "value": max(data)}, {"type": "number", "value": min(data)}]}},
                "display_math": f"\\text{{range}} = {max(data)} - {min(data)} = {data_range}",
                "explanation": f"Range = maximum - minimum = {max(data)} - {min(data)} = {data_range}.",
                "validation": {"is_valid": True, "method": "formula", "details": f"Range = max - min = {data_range}"},
                "hint": "Subtract minimum from maximum.",
                "is_final_answer": False,
                "final_answer_text": "",
                "diagram_focus": ["range", "data"],
                "diagram_type": "bar_chart"
            })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]


class ProbabilityEngine:
    def __init__(self, grade: int = 7):
        self.grade = grade

    def solve(self, problem: 'ProbabilityProblem') -> List[Dict[str, Any]]:
        steps = []
        step_number = 0
        
        total_outcomes = len(problem.outcomes)
        favorable = len(problem.favorable_outcomes)
        
        step_number += 1
        prob = favorable / total_outcomes if total_outcomes > 0 else 0
        
        steps.append({
            "step_number": step_number,
            "operation": "probability",
            "equation_ast": {"type": "eq", "left": {"type": "symbol", "name": "P"}, "right": {"type": "div", "args": [{"type": "number", "value": favorable}, {"type": "number", "value": total_outcomes}]}},
            "display_math": f"P = \\frac{{\\text{{favorable outcomes}}}}{{\\text{{total outcomes}}}} = \\frac{{{favorable}}}{{{total_outcomes}}} = {prob:.2f}",
            "explanation": f"Probability = favorable outcomes / total outcomes = {favorable}/{total_outcomes} = {prob:.2f}.",
            "validation": {"is_valid": True, "method": "formula", "details": f"P = {favorable}/{total_outcomes} = {prob:.2f}"},
            "hint": "Divide favorable outcomes by total outcomes. Simplify if needed.",
            "is_final_answer": True,
            "final_answer_text": f"Probability = {prob:.2f} (or {favorable}/{total_outcomes})",
            "diagram_focus": ["P"],
            "diagram_type": "data_table"
        })
        
        return [GeometrySolutionStep(**s) if isinstance(s, dict) else s for s in steps]