from typing import Optional, Dict, Any, List
import sympy as sp
from .schemas import (
    AttemptResult, AttemptClassification, MisconceptionId,
    StructuredProblem, SolutionStep
)
from .catalogue import (
    MISCONCEPTION_CATALOGUE, MisconceptionEntry,
    MisconceptionId, AttemptResult, AttemptClassification,
    detect_misconception, classify_attempt, generate_hint_ladder
)


class AttemptChecker:
    def __init__(self, grade: int = 7):
        self.grade = grade
        self.catalogue = MISCONCEPTION_CATALOGUE
    
    def _ast_to_sympy(self, ast: dict) -> Any:
        """Convert AST dict to sympy expression."""
        if not ast:
            return None
        
        node_type = ast.get("type")
        
        if node_type == "number":
            val = ast.get("value", 0)
            return sp.nsimplify(val)
        
        elif node_type == "symbol":
            return sp.symbols(ast.get("name", "x"))
        
        elif node_type == "add":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            return sum(args) if args else 0
        
        elif node_type == "mul":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            result = 1
            for arg in args:
                result *= arg
            return result
        
        elif node_type == "pow":
            base = self._ast_to_sympy(ast.get("base", {}))
            exp = self._ast_to_sympy(ast.get("exp", {}))
            return base ** exp
        
        elif node_type == "sub":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            if len(args) == 2:
                return args[0] - args[1]
            return -args[0] if args else 0
        
        elif node_type == "div":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            if len(args) == 2:
                return args[0] / args[1]
            return 1 / args[0] if args else 0
        
        elif node_type == "eq":
            left = self._ast_to_sympy(ast.get("left", {}))
            right = self._ast_to_sympy(ast.get("right", {}))
            return sp.Eq(left, right)
        
        elif node_type == "sqrt":
            arg = self._ast_to_sympy(ast.get("arg", {}))
            return sp.sqrt(arg)
        
        elif node_type == "abs":
            arg = self._ast_to_sympy(ast.get("arg", {}))
            return sp.Abs(arg)
        
        elif node_type == "function":
            func_name = ast.get("name", "")
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            if func_name == "sin":
                return sp.sin(*args)
            elif func_name == "cos":
                return sp.cos(*args)
            elif func_name == "tan":
                return sp.tan(*args)
            elif func_name == "log":
                return sp.log(*args)
            elif func_name == "exp":
                return sp.exp(*args)
            return None
        
        elif node_type == "or":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            return sp.Or(*args)
        
        return None
    
    def check_attempt(self, problem, student_ast, expected_ast, current_step: int) -> AttemptResult:
        try:
            student = self._ast_to_sympy(student_ast)
            expected = self._ast_to_sympy(expected_ast)
            
            if student is None or expected is None:
                return AttemptResult(
                    classification=AttemptClassification.UNREADABLE,
                    misconception_id=None,
                    divergence_step=None,
                    feedback="Could not parse expressions.",
                    hint_level=1,
                    hint_text="Make sure your input is clear.",
                    show_step_allowed=True,
                    is_final_answer=False
                )
            
            # Handle equations (sp.Eq objects)
            if isinstance(student, sp.Eq) and isinstance(expected, sp.Eq):
                # Check for exact side-by-side match
                exact_match = (
                    sp.simplify(student.lhs - expected.lhs) == 0 and
                    sp.simplify(student.rhs - expected.rhs) == 0
                )
                if exact_match:
                    return AttemptResult(
                        classification=AttemptClassification.CORRECT_EXPECTED,
                        misconception_id=None,
                        divergence_step=None,
                        feedback="Correct! That matches the expected step.",
                        hint_level=1,
                        hint_text="Great work! Keep going.",
                        show_step_allowed=True,
                        is_final_answer=False
                    )
                
                # Check mathematical equivalence of equations
                student_diff = sp.simplify(student.lhs - student.rhs)
                expected_diff = sp.simplify(expected.lhs - expected.rhs)
                
                is_equiv = False
                if sp.simplify(student_diff - expected_diff) == 0 or sp.simplify(student_diff + expected_diff) == 0:
                    is_equiv = True
                elif expected_diff != 0:
                    try:
                        ratio = sp.simplify(student_diff / expected_diff)
                        if ratio.is_number and ratio != 0:
                            is_equiv = True
                    except Exception:
                        pass
                
                if is_equiv:
                    classification = (
                        AttemptClassification.CORRECT_EXPECTED
                        if self._is_expected_path(student, expected)
                        else AttemptClassification.CORRECT_ALTERNATE
                    )
                    return AttemptResult(
                        classification=classification,
                        misconception_id=None,
                        divergence_step=None,
                        feedback="Correct! That matches the expected step." if classification == AttemptClassification.CORRECT_EXPECTED else "That's mathematically correct but takes a different path.",
                        hint_level=1,
                        hint_text="Great work! Keep going.",
                        show_step_allowed=True,
                        is_final_answer=False
                    )
                else:
                    # Equations are not equivalent -> check misconceptions
                    mc = self._detect_misconception(student_ast, expected_ast, student, expected)
                    if mc:
                        return AttemptResult(
                            classification=AttemptClassification.NOT_EQUIVALENT,
                            misconception_id=mc.id,
                            divergence_step=None,
                            feedback=mc.explanation,
                            hint_level=2,
                            hint_text=mc.hint,
                            show_step_allowed=True,
                            is_final_answer=False
                        )
                    return AttemptResult(
                        classification=AttemptClassification.NOT_EQUIVALENT,
                        misconception_id=None,
                        divergence_step=None,
                        feedback="That step isn't equivalent. Check your algebra.",
                        hint_level=1,
                        hint_text="Try checking your algebra.",
                        show_step_allowed=True,
                        is_final_answer=False
                    )

            # Handle expressions (both not sp.Eq)
            elif not isinstance(student, sp.Eq) and not isinstance(expected, sp.Eq):
                if sp.simplify(student - expected) == 0:
                    classification = (
                        AttemptClassification.CORRECT_EXPECTED
                        if self._is_expected_path(student, expected)
                        else AttemptClassification.CORRECT_ALTERNATE
                    )
                    return AttemptResult(
                        classification=classification,
                        misconception_id=None,
                        divergence_step=None,
                        feedback="Correct! That matches the expected step.",
                        hint_level=1,
                        hint_text="Great work! Keep going.",
                        show_step_allowed=True,
                        is_final_answer=False
                    )
                else:
                    mc = self._detect_misconception(student_ast, expected_ast, student, expected)
                    if mc:
                        return AttemptResult(
                            classification=AttemptClassification.NOT_EQUIVALENT,
                            misconception_id=mc.id,
                            divergence_step=None,
                            feedback=mc.explanation,
                            hint_level=2,
                            hint_text=mc.hint,
                            show_step_allowed=True,
                            is_final_answer=False
                        )
                    return AttemptResult(
                        classification=AttemptClassification.NOT_EQUIVALENT,
                        misconception_id=None,
                        divergence_step=None,
                        feedback="That step isn't equivalent. Check your algebra.",
                        hint_level=1,
                        hint_text="Try checking your algebra.",
                        show_step_allowed=True,
                        is_final_answer=False
                    )

            # Mixed: one is an equation and one is an expression
            else:
                mc = self._detect_misconception(student_ast, expected_ast, student, expected)
                return AttemptResult(
                    classification=AttemptClassification.NOT_EQUIVALENT,
                    misconception_id=mc.id if mc else None,
                    divergence_step=None,
                    feedback=mc.explanation if mc else "That step isn't equivalent. Check your algebra.",
                    hint_level=2 if mc else 1,
                    hint_text=mc.hint if mc else "Try checking your algebra.",
                    show_step_allowed=True,
                    is_final_answer=False
                )

        except Exception as e:
            return AttemptResult(
                classification=AttemptClassification.UNREADABLE,
                misconception_id=None,
                divergence_step=None,
                feedback=f"Could not parse your attempt: {str(e)}",
                hint_level=1,
                hint_text="Make sure your input is clear.",
                show_step_allowed=True,
                is_final_answer=False
            )
    
    def _is_expected_path(self, student, expected) -> bool:
        """Check if student's expression matches the expected solution path."""
        return True
    
    def _detect_misconception(self, student_ast, expected_ast, student, expected):
        """Check all misconceptions and return the first match."""
        for entry in self.catalogue:
            if self.grade in range(entry.grade_range[0], entry.grade_range[1] + 1):
                if self._check_misconception(entry, student_ast, expected_ast, student, expected):
                    return entry
        return None
    
    def _check_misconception(self, entry, student_ast, expected_ast, student, expected) -> bool:
        """Check if a specific misconception matches the student's work."""
        try:
            if entry.id in (MisconceptionId.MC_002, "MC-002"):
                return self._check_sign_error(student_ast, expected_ast)
            return False
        except Exception:
            return False

    def _check_sign_error(self, student_ast: dict, expected_ast: dict) -> bool:
        """Check for MC-002: sign error when moving term across equals sign."""
        if not isinstance(student_ast, dict) or not isinstance(expected_ast, dict):
            return False
        if student_ast.get("type") == "eq" and expected_ast.get("type") == "eq":
            s_right = student_ast.get("right", {})
            e_right = expected_ast.get("right", {})
            if isinstance(s_right, dict) and isinstance(e_right, dict):
                s_type = s_right.get("type")
                e_type = e_right.get("type")
                if (s_type == "add" and e_type == "sub") or (s_type == "sub" and e_type == "add"):
                    s_vals = [a.get("value") for a in s_right.get("args", []) if isinstance(a, dict) and "value" in a]
                    e_vals = [a.get("value") for a in e_right.get("args", []) if isinstance(a, dict) and "value" in a]
                    if s_vals and e_vals and sorted(s_vals) == sorted(e_vals):
                        return True
        return False
    
    def get_hint(self, step_number: int, max_hints: int = 4) -> str:
        """Get the next hint in the ladder."""
        hints = generate_hint_ladder(step_number, 4)
        # In practice, we'd track which hint level the student is on
        return hints[0] if hints else "Try working through it step by step."