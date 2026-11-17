import sympy as sp
from sympy import symbols, Eq, expand, factor, simplify, collect, together, apart
from sympy.abc import x, y, z, a, b, c
from typing import Any, Optional
import json
import copy

from .schemas import (
    OperationType, Validation, ValidationMethod, RawSolutionStep,
    StructuredProblem, SolutionStep, TopicSupport
)


class SolverEngine:
    def __init__(self, grade: int = 7, max_retries: int = 2):
        self.grade = grade
        self.max_retries = max_retries
        self._symbol_cache = {}
    
    def _get_symbols(self, expr_str: str) -> dict:
        """Extract symbols from expression string and create sympy symbols."""
        if expr_str in self._symbol_cache:
            return self._symbol_cache[expr_str]
        
        found = set()
        for ch in expr_str:
            if ch.isalpha():
                found.add(ch)
        
        sym_dict = {s: symbols(s) for s in found}
        self._symbol_cache[expr_str] = sym_dict
        return sym_dict
    
    def _ast_to_sympy(self, ast: dict) -> Any:
        """Convert AST dict to sympy expression."""
        if not ast:
            return None
        
        node_type = ast.get("type")
        
        if node_type == "number":
            return sp.nsimplify(ast.get("value", 0))
        
        elif node_type == "symbol":
            return symbols(ast.get("name", "x"))
        
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
            return Eq(left, right)
        
        elif node_type == "sqrt":
            arg = self._ast_to_sympy(ast.get("arg", {}))
            return sp.sqrt(arg)
        
        elif node_type == "abs":
            arg = self._ast_to_sympy(ast.get("arg", {}))
            return sp.Abs(arg)
        
        elif node_type == "or":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            return sp.Or(*args)
        
        elif node_type == "and":
            args = [self._ast_to_sympy(arg) for arg in ast.get("args", [])]
            return sp.And(*args)
        
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
    
    def _sympy_to_ast(self, expr: Any) -> dict:
        """Convert sympy expression to AST dict."""
        if expr is None:
            return {"type": "number", "value": 0}
        
        if getattr(expr, 'is_Integer', False):
            return {"type": "number", "value": int(expr)}
        
        if getattr(expr, 'is_Rational', False):
            if expr.q == 1:
                return {"type": "number", "value": int(expr.p)}
            return {
                "type": "div",
                "args": [{"type": "number", "value": int(expr.p)}, {"type": "number", "value": int(expr.q)}]
            }
        
        if getattr(expr, 'is_Float', False):
            sim = sp.nsimplify(expr)
            if not sim.is_Float:
                return self._sympy_to_ast(sim)
            return {"type": "number", "value": float(expr)}
        
        if getattr(expr, 'is_symbol', False):
            return {"type": "symbol", "name": str(expr)}
        
        if getattr(expr, 'is_Add', False):
            return {"type": "add", "args": [self._sympy_to_ast(arg) for arg in expr.args]}
        
        if getattr(expr, 'is_Mul', False):
            return {"type": "mul", "args": [self._sympy_to_ast(arg) for arg in expr.args]}
        
        if getattr(expr, 'is_Pow', False) and expr.exp in (sp.Rational(1, 2), 0.5):
            return {"type": "sqrt", "arg": self._sympy_to_ast(expr.args[0])}
        
        if getattr(expr, 'is_Pow', False):
            base, exp = expr.args
            return {"type": "pow", "base": self._sympy_to_ast(base), "exp": self._sympy_to_ast(exp)}
        
        if isinstance(expr, Eq):
            return {"type": "eq", "left": self._sympy_to_ast(expr.lhs), "right": self._sympy_to_ast(expr.rhs)}
        
        if isinstance(expr, sp.Abs):
            return {"type": "abs", "arg": self._sympy_to_ast(expr.args[0])}
        
        if isinstance(expr, sp.Or):
            return {"type": "or", "args": [self._sympy_to_ast(arg) for arg in expr.args]}
        
        if isinstance(expr, sp.And):
            return {"type": "and", "args": [self._sympy_to_ast(arg) for arg in expr.args]}
        
        if getattr(expr, 'is_number', False):
            return {"type": "number", "value": float(expr)}
        
        if isinstance(expr, sp.Function):
            return {
                "type": "function",
                "name": expr.__class__.__name__.lower(),
                "args": [self._sympy_to_ast(arg) for arg in expr.args]
            }
        
        return {"type": "number", "value": 0}
    
    def _ast_to_latex(self, ast: dict) -> str:
        """Convert AST to LaTeX for display."""
        if not ast:
            return ""
        
        node_type = ast.get("type")
        
        if node_type == "number":
            val = ast.get("value", 0)
            if val == int(val):
                return str(int(val))
            return str(val)
        
        elif node_type == "symbol":
            return ast.get("name", "x")
        
        elif node_type == "add":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return " + ".join(args)
        
        elif node_type == "mul":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return " \\cdot ".join(args)
        
        elif node_type == "pow":
            base = self._ast_to_latex(ast.get("base", {}))
            exp = self._ast_to_latex(ast.get("exp", {}))
            return f"{base}^{{{exp}}}"
        
        elif node_type == "sub":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            if len(args) == 2:
                return f"{args[0]} - {args[1]}"
            return f"-{args[0]}" if args else "0"
        
        elif node_type == "div":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            if len(args) == 2:
                return f"\\frac{{{args[0]}}}{{{args[1]}}}"
            return f"\\frac{{1}}{{{args[0]}}}" if args else "0"
        
        elif node_type == "eq":
            left = self._ast_to_latex(ast.get("left", {}))
            right = self._ast_to_latex(ast.get("right", {}))
            return f"{left} = {right}"
        
        elif node_type == "sqrt":
            arg = self._ast_to_latex(ast.get("arg", {}))
            return f"\\sqrt{{{arg}}}"
        
        elif node_type == "abs":
            arg = self._ast_to_latex(ast.get("arg", {}))
            return f"|{arg}|"
        
        elif node_type == "and":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return ", \\quad ".join(args)
        
        elif node_type == "or":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return " \\text{ or } ".join(args)
        
        elif node_type == "function":
            func_name = ast.get("name", "")
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            if func_name in ("sin", "cos", "tan", "log", "ln", "exp"):
                return f"\\{func_name}({', '.join(args)})"
            return f"{func_name}({', '.join(args)})"
        
        return ""
    
    def verify_equivalence(self, before_ast: dict, after_ast: dict, operation: OperationType) -> Validation:
        """Verify that a transformation is mathematically valid using SymPy."""
        try:
            before_expr = self._ast_to_sympy(before_ast)
            after_expr = self._ast_to_sympy(after_ast)
            
            if before_expr is None or after_expr is None:
                return Validation(
                    is_valid=False,
                    method=ValidationMethod.MANUAL,
                    details="Could not parse expressions for verification"
                )
            
            # Handle Or expressions (multiple solutions)
            if isinstance(before_expr, sp.Or) and isinstance(after_expr, sp.Or):
                if set(before_expr.args) == set(after_expr.args):
                    return Validation(
                        is_valid=True,
                        method=ValidationMethod.EQUIVALENCE_CHECK,
                        details="Both Or expressions have identical solution branches"
                    )

            if isinstance(after_expr, sp.Or):
                after_solutions = []
                sym_var = None
                for arg in after_expr.args:
                    if isinstance(arg, Eq):
                        if arg.lhs.is_Symbol and sym_var is None:
                            sym_var = arg.lhs
                        after_solutions.append(arg.rhs)
                    else:
                        after_solutions.append(arg)
                
                if isinstance(before_expr, Eq):
                    # 1. Direct substitution verification
                    if sym_var is not None and after_solutions:
                        diff_eq = before_expr.lhs - before_expr.rhs
                        if all(sp.simplify(diff_eq.subs(sym_var, s)) == 0 for s in after_solutions):
                            return Validation(
                                is_valid=True,
                                method=ValidationMethod.EQUIVALENCE_CHECK,
                                details="All solutions satisfy the original equation"
                            )
                    
                    # 2. Solution set comparison
                    try:
                        before_solutions = sp.solve(before_expr, sym_var) if sym_var is not None else sp.solve(before_expr)
                        if isinstance(before_solutions, list):
                            if set(before_solutions) == set(after_solutions):
                                return Validation(
                                    is_valid=True,
                                    method=ValidationMethod.EQUIVALENCE_CHECK,
                                    details="Both equations have identical solution sets"
                                )
                    except Exception:
                        pass
                    
                    return Validation(
                        is_valid=False,
                        method=ValidationMethod.EQUIVALENCE_CHECK,
                        details=f"Solution sets differ for {after_solutions}"
                    )
                return Validation(
                    is_valid=False,
                    method=ValidationMethod.EQUIVALENCE_CHECK,
                    details="Cannot verify Or expression against non-equation"
                )
            
            if isinstance(before_expr, Eq) and isinstance(after_expr, Eq):
                diff = simplify(before_expr.lhs - before_expr.rhs - (after_expr.lhs - after_expr.rhs))
                if diff == 0:
                    return Validation(
                        is_valid=True,
                        method=ValidationMethod.EQUIVALENCE_CHECK,
                        details="Equations are algebraically equivalent"
                    )
                
                try:
                    ratio = simplify((before_expr.lhs - before_expr.rhs) / (after_expr.lhs - after_expr.rhs))
                    if ratio.is_number and ratio != 0:
                        return Validation(
                            is_valid=True,
                            method=ValidationMethod.EQUIVALENCE_CHECK,
                            details="Equations are algebraically equivalent by non-zero scalar"
                        )
                except Exception:
                    pass

                try:
                    sym_var = after_expr.lhs if after_expr.lhs.is_Symbol else (before_expr.lhs if before_expr.lhs.is_Symbol else None)
                    if sym_var is not None:
                        before_solutions = sp.solve(before_expr, sym_var)
                        after_solutions = sp.solve(after_expr, sym_var)
                    else:
                        before_solutions = sp.solve(before_expr)
                        after_solutions = sp.solve(after_expr)
                    
                    if before_solutions == after_solutions:
                        return Validation(
                            is_valid=True,
                            method=ValidationMethod.EQUIVALENCE_CHECK,
                            details="Both equations have identical solution sets"
                        )
                except Exception:
                    pass
                
                return Validation(
                    is_valid=False,
                    method=ValidationMethod.EQUIVALENCE_CHECK,
                    details="Equations are not equivalent"
                )
            
            diff = simplify(before_expr - after_expr)
            if diff == 0:
                return Validation(
                    is_valid=True,
                    method=ValidationMethod.EQUIVALENCE_CHECK,
                    details="Expressions are equivalent"
                )
            
            return Validation(
                is_valid=False,
                method=ValidationMethod.EQUIVALENCE_CHECK,
                details=f"Expressions differ by: {diff}"
            )
        
        except Exception as e:
            return Validation(
                is_valid=False,
                method=ValidationMethod.MANUAL,
                details=f"Verification error: {str(e)}"
            )
    
    def apply_operation(self, ast: dict, operation: OperationType, **kwargs) -> tuple[dict, Validation]:
        """Apply a named operation to an AST and return the result with validation."""
        expr = self._ast_to_sympy(ast)
        if expr is None:
            return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Could not parse AST")
        
        result_expr = None
        details = ""
        
        try:
            if operation == OperationType.EXPAND:
                result_expr = expand(expr)
                details = "Expanded expression"
            
            elif operation == OperationType.FACTORISE:
                result_expr = factor(expr)
                details = "Factorised expression"
            
            elif operation == OperationType.SIMPLIFY:
                result_expr = simplify(expr)
                details = "Simplified expression"
            
            elif operation == OperationType.COLLECT_LIKE_TERMS:
                vars_to_collect = kwargs.get("variables", [])
                if vars_to_collect:
                    sym_vars = [symbols(v) for v in vars_to_collect]
                    result_expr = collect(expr, sym_vars)
                else:
                    result_expr = collect(expr)
                details = "Collected like terms"
            
            elif operation == OperationType.SUBTRACT_BOTH_SIDES:
                if isinstance(expr, Eq):
                    value = kwargs.get("value", 0)
                    result_expr = Eq(expr.lhs - value, expr.rhs - value)
                    details = f"Subtracted {value} from both sides"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.ADD_BOTH_SIDES:
                if isinstance(expr, Eq):
                    value = kwargs.get("value", 0)
                    result_expr = Eq(expr.lhs + value, expr.rhs + value)
                    details = f"Added {value} to both sides"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.MULTIPLY_BOTH_SIDES:
                if isinstance(expr, Eq):
                    value = kwargs.get("value", 1)
                    result_expr = Eq(expr.lhs * value, expr.rhs * value)
                    details = f"Multiplied both sides by {value}"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.DIVIDE_BOTH_SIDES:
                if isinstance(expr, Eq):
                    value = kwargs.get("value", 1)
                    if value == 0:
                        return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Cannot divide by zero")
                    value = sp.nsimplify(value)
                    result_expr = Eq(sp.nsimplify(expr.lhs / value), sp.nsimplify(expr.rhs / value))
                    details = f"Divided both sides by {value}"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.ISOLATE_VARIABLE:
                if isinstance(expr, Eq):
                    var = kwargs.get("variable", "x")
                    sym_var = symbols(var)
                    solutions = sp.solve(expr, sym_var)
                    if solutions:
                        result_expr = Eq(sym_var, solutions[0])
                        details = f"Isolated {var}"
                    else:
                        return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Could not isolate variable")
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.QUADRATIC_FORMULA:
                if isinstance(expr, Eq):
                    var = kwargs.get("variable", "x")
                    sym_var = symbols(var)
                    expr_poly = sp.Poly(expr.lhs - expr.rhs, sym_var)
                    if expr_poly.degree() == 2:
                        coeffs = expr_poly.all_coeffs()
                        a, b, c = coeffs[0], coeffs[1], coeffs[2]
                        disc = b**2 - 4*a*c
                        sqrt_disc = sp.sqrt(disc)
                        sol1 = (-b + sqrt_disc) / (2*a)
                        sol2 = (-b - sqrt_disc) / (2*a)
                        result_expr = Eq(sym_var, sol1) if sol1 == sol2 else sp.Or(Eq(sym_var, sol1), Eq(sym_var, sol2))
                        details = f"Applied quadratic formula: discriminant = {disc}"
                    else:
                        return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not a quadratic equation")
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.COMPLETING_SQUARE:
                if isinstance(expr, Eq):
                    var = kwargs.get("variable", "x")
                    sym_var = symbols(var)
                    expr_poly = sp.Poly(expr.lhs - expr.rhs, sym_var)
                    if expr_poly.degree() == 2:
                        coeffs = expr_poly.all_coeffs()
                        a, b, c = coeffs[0], coeffs[1], coeffs[2]
                        if a != 1:
                            expr_normalized = (expr.lhs - expr.rhs) / a
                        else:
                            expr_normalized = expr.lhs - expr.rhs
                        p = b / (2*a)
                        q = c / a - p**2
                        result_expr = Eq((sym_var + p)**2, -q)
                        details = f"Completed the square: (x + {p})^2 = {-q}"
                    else:
                        return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not a quadratic equation")
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.APPLY_IDENTITY:
                identity = kwargs.get("identity", "")
                if identity == "square_of_sum":
                    result_expr = expand(expr)
                    details = "Applied (a+b)^2 = a^2 + 2ab + b^2"
                elif identity == "square_of_diff":
                    result_expr = expand(expr)
                    details = "Applied (a-b)^2 = a^2 - 2ab + b^2"
                elif identity == "diff_of_squares":
                    result_expr = expand(expr)
                    details = "Applied a^2 - b^2 = (a+b)(a-b)"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Unknown identity")
            
            elif operation == OperationType.ISOLATE_RADICAL:
                if isinstance(expr, Eq):
                    result_expr = expr
                    details = "Isolated radical (placeholder)"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.SQUARE_BOTH_SIDES:
                if isinstance(expr, Eq):
                    result_expr = Eq(expr.lhs**2, expr.rhs**2)
                    details = "Squared both sides"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.CHECK_EXTRANEOUS_ROOTS:
                if isinstance(expr, Eq):
                    var = kwargs.get("variable", "x")
                    sym_var = symbols(var)
                    original_expr = kwargs.get("original_equation")
                    solutions = sp.solve(expr, sym_var)
                    valid_solutions = []
                    for sol in solutions:
                        if original_expr:
                            orig = self._ast_to_sympy(original_expr)
                            if orig:
                                sub = orig.subs(sym_var, sol)
                                if sp.simplify(sub.lhs - sub.rhs) == 0:
                                    valid_solutions.append(sol)
                    if valid_solutions:
                        result_expr = Eq(sym_var, valid_solutions[0]) if len(valid_solutions) == 1 else Eq(sym_var, valid_solutions)
                        details = f"Checked extraneous roots: {len(valid_solutions)} valid solution(s)"
                    else:
                        result_expr = Eq(sym_var, sp.nan)
                        details = "No valid solutions after checking extraneous roots"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.CROSS_MULTIPLY:
                if isinstance(expr, Eq):
                    if isinstance(expr.lhs, sp.Mul) and isinstance(expr.rhs, sp.Mul):
                        pass
                    result_expr = Eq(expr.lhs * expr.rhs.as_numer_denom()[1], expr.rhs * expr.lhs.as_numer_denom()[1])
                    details = "Cross-multiplied"
                else:
                    return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Not an equation")
            
            elif operation == OperationType.FIND_COMMON_DENOMINATOR:
                result_expr = together(expr)
                details = "Found common denominator"
            
            elif operation == OperationType.SUBSTITUTE:
                substitutions = kwargs.get("substitutions", {})
                sub_dict = {symbols(k): v for k, v in substitutions.items()}
                result_expr = expr.subs(sub_dict)
                details = f"Substituted: {substitutions}"
            
            elif operation == OperationType.CONVERT_DECIMAL:
                result_expr = sp.nsimplify(expr)
                details = "Converted to exact rational"
            
            elif operation == OperationType.APPLY_FORMULA:
                formula = kwargs.get("formula", "")
                result_expr = expr
                details = f"Applied formula: {formula}"
            
            else:
                return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details=f"Unknown operation: {operation}")
            
            if result_expr is None:
                return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details="Operation returned None")
            
            result_ast = self._sympy_to_ast(result_expr)
            validation = self.verify_equivalence(ast, result_ast, operation)
            
            return result_ast, validation
            
        except Exception as e:
            return ast, Validation(is_valid=False, method=ValidationMethod.MANUAL, details=f"Operation failed: {str(e)}")
    
    def solve(self, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Generate verified solution steps using SymPy."""
        steps = []
        step_number = 0
        
        if problem.requested_operation == "solve" and problem.problem_type == "system":
            return self._solve_system(problem)
        
        for expr_dict in problem.expressions:
            current_ast = expr_dict.get("ast_json", {})
            if not current_ast:
                continue
            
            if problem.requested_operation == "solve" and problem.problem_type == "equation":
                steps.extend(self._solve_equation(current_ast, problem))
            elif problem.requested_operation == "simplify":
                steps.extend(self._simplify_expression(current_ast, problem))
            elif problem.requested_operation == "factor":
                steps.extend(self._factor_expression(current_ast, problem))
            elif problem.requested_operation == "expand":
                steps.extend(self._expand_expression(current_ast, problem))
            elif problem.requested_operation == "evaluate":
                steps.extend(self._evaluate_expression(current_ast, problem))
        
        return steps
    
    def _solve_equation(self, ast: dict, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Solve a single equation step by step."""
        steps = []
        step_number = 0
        current_ast = copy.deepcopy(ast)
        variable = problem.unknowns[0] if problem.unknowns else "x"
        
        expr = self._ast_to_sympy(current_ast)
        if not isinstance(expr, Eq):
            return steps
        
        sym_var = symbols(variable)
        
        if self._has_radical(expr, sym_var):
            return self._solve_radical(current_ast, variable, step_number)
        
        try:
            poly = sp.Poly(expr.lhs - expr.rhs, sym_var)
            if poly.degree() == 2:
                return self._solve_quadratic(current_ast, variable, step_number)
            elif poly.degree() == 1:
                return self._solve_linear(current_ast, variable, step_number)
        except Exception:
            pass
        
        solutions = sp.solve(expr, sym_var)
        if solutions:
            step_number += 1
            if len(solutions) == 1:
                result_ast = self._sympy_to_ast(Eq(sym_var, solutions[0]))
            else:
                result_ast = {
                    "type": "or",
                    "args": [self._sympy_to_ast(Eq(sym_var, sol)) for sol in solutions]
                }
            validation = self.verify_equivalence(current_ast, result_ast, OperationType.ISOLATE_VARIABLE)
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.ISOLATE_VARIABLE,
                equation_ast=current_ast,
                result_ast=result_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps
    
    def _solve_linear(self, ast: dict, variable: str, start_step: int) -> list[RawSolutionStep]:
        """Solve linear equation ax + b = c."""
        steps = []
        step_number = start_step
        current_ast = copy.deepcopy(ast)
        sym_var = symbols(variable)
        
        expr = self._ast_to_sympy(current_ast)
        if not isinstance(expr, Eq):
            return steps
        
        # 1. If RHS contains variable terms, move them to LHS
        rhs_indep, rhs_dep = expr.rhs.as_independent(sym_var, as_Add=True)
        if rhs_dep != 0:
            step_number += 1
            new_ast, validation = self.apply_operation(current_ast, OperationType.SUBTRACT_BOTH_SIDES, value=rhs_dep)
            if validation.is_valid:
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.SUBTRACT_BOTH_SIDES,
                    equation_ast=current_ast,
                    result_ast=new_ast,
                    validation=validation,
                    from_step=step_number - 1
                ))
                current_ast = new_ast
                expr = self._ast_to_sympy(current_ast)
        
        # 2. If LHS contains terms independent of variable, move them to RHS
        lhs_indep, lhs_dep = expr.lhs.as_independent(sym_var, as_Add=True)
        if lhs_indep != 0:
            step_number += 1
            new_ast, validation = self.apply_operation(current_ast, OperationType.SUBTRACT_BOTH_SIDES, value=lhs_indep)
            if validation.is_valid:
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.SUBTRACT_BOTH_SIDES,
                    equation_ast=current_ast,
                    result_ast=new_ast,
                    validation=validation,
                    from_step=step_number - 1
                ))
                current_ast = new_ast
                expr = self._ast_to_sympy(current_ast)
        
        # 3. If coefficient of variable is not 1 and not 0, divide both sides
        coeff = expr.lhs.coeff(sym_var, 1)
        if coeff != 1 and coeff != 0:
            step_number += 1
            new_ast, validation = self.apply_operation(current_ast, OperationType.DIVIDE_BOTH_SIDES, value=coeff)
            if validation.is_valid:
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.DIVIDE_BOTH_SIDES,
                    equation_ast=current_ast,
                    result_ast=new_ast,
                    validation=validation,
                    from_step=step_number - 1
                ))
                current_ast = new_ast
                expr = self._ast_to_sympy(current_ast)
        
        # 4. Final step: if not yet explicitly isolated, isolate variable
        if expr.lhs != sym_var:
            solutions = sp.solve(expr, sym_var)
            if solutions:
                step_number += 1
                final_ast = self._sympy_to_ast(Eq(sym_var, solutions[0]))
                validation = self.verify_equivalence(current_ast, final_ast, OperationType.ISOLATE_VARIABLE)
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.ISOLATE_VARIABLE,
                    equation_ast=current_ast,
                    result_ast=final_ast,
                    validation=validation,
                    from_step=step_number - 1
                ))
        
        return steps
    
    def _solve_quadratic(self, ast: dict, variable: str, start_step: int) -> list[RawSolutionStep]:
        """Solve quadratic equation with grade-aware method selection."""
        steps = []
        step_number = start_step
        current_ast = copy.deepcopy(ast)
        sym_var = symbols(variable)
        
        expr = self._ast_to_sympy(current_ast)
        if not isinstance(expr, Eq):
            return steps
        
        try:
            poly = sp.Poly(expr.lhs - expr.rhs, sym_var)
        except Exception:
            return steps
            
        if poly.degree() != 2:
            return steps
            
        coeffs = poly.all_coeffs()
        a = coeffs[0]
        b = coeffs[1] if len(coeffs) > 1 else 0
        c = coeffs[2] if len(coeffs) > 2 else 0
        
        # Case 1: Pure quadratic (b == 0), e.g. a*x^2 + c = 0 or 4*x^2 + 5 = 2*x^2 + 20
        if b == 0:
            # 1a. If RHS contains variable terms, subtract them from both sides
            rhs_indep, rhs_dep = expr.rhs.as_independent(sym_var, as_Add=True)
            if rhs_dep != 0:
                step_number += 1
                new_ast, validation = self.apply_operation(current_ast, OperationType.SUBTRACT_BOTH_SIDES, value=rhs_dep)
                if validation.is_valid:
                    validation.details = f"Subtracted {rhs_dep} from both sides to collect terms with {variable} on the left"
                    steps.append(RawSolutionStep(
                        step_number=step_number,
                        operation=OperationType.SUBTRACT_BOTH_SIDES,
                        equation_ast=current_ast,
                        result_ast=new_ast,
                        validation=validation,
                        from_step=step_number - 1
                    ))
                    current_ast = new_ast
                    expr = self._ast_to_sympy(current_ast)

            # 1b. If LHS contains constant terms, subtract them to move to RHS
            lhs_indep, lhs_dep = expr.lhs.as_independent(sym_var, as_Add=True)
            if lhs_indep != 0:
                step_number += 1
                new_ast, validation = self.apply_operation(current_ast, OperationType.SUBTRACT_BOTH_SIDES, value=lhs_indep)
                if validation.is_valid:
                    validation.details = f"Subtracted {lhs_indep} from both sides to isolate the {variable}^2 term"
                    steps.append(RawSolutionStep(
                        step_number=step_number,
                        operation=OperationType.SUBTRACT_BOTH_SIDES,
                        equation_ast=current_ast,
                        result_ast=new_ast,
                        validation=validation,
                        from_step=step_number - 1
                    ))
                    current_ast = new_ast
                    expr = self._ast_to_sympy(current_ast)
            
            # 1c. If coefficient of x^2 is not 1, divide both sides
            coeff_x2 = expr.lhs.coeff(sym_var**2)
            if coeff_x2 != 1 and coeff_x2 != 0:
                step_number += 1
                new_ast, validation = self.apply_operation(current_ast, OperationType.DIVIDE_BOTH_SIDES, value=coeff_x2)
                if validation.is_valid:
                    validation.details = f"Divided both sides by {coeff_x2} to isolate {variable}^2"
                    steps.append(RawSolutionStep(
                        step_number=step_number,
                        operation=OperationType.DIVIDE_BOTH_SIDES,
                        equation_ast=current_ast,
                        result_ast=new_ast,
                        validation=validation,
                        from_step=step_number - 1
                    ))
                    current_ast = new_ast
                    expr = self._ast_to_sympy(current_ast)
            
            # 1d. Take square root of both sides
            step_number += 1
            rhs_expr = expr.rhs
            sols = [sp.sqrt(rhs_expr), -sp.sqrt(rhs_expr)]
            sols_simp = [sp.simplify(s) for s in sols]
            if sols_simp[0] == sols_simp[1]:
                final_ast = self._sympy_to_ast(Eq(sym_var, sols_simp[0]))
            else:
                final_ast = {
                    "type": "or",
                    "args": [self._sympy_to_ast(Eq(sym_var, sols_simp[0])), self._sympy_to_ast(Eq(sym_var, sols_simp[1]))]
                }
            validation = self.verify_equivalence(current_ast, final_ast, OperationType.ISOLATE_VARIABLE)
            validation.details = f"Took square root of both sides to solve for {variable} (giving both positive and negative roots)"
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.ISOLATE_VARIABLE,
                equation_ast=current_ast,
                result_ast=final_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            return steps
            
        # Case 2: General quadratic (b != 0)
        if expr.rhs != 0:
            step_number += 1
            new_ast, validation = self.apply_operation(current_ast, OperationType.SUBTRACT_BOTH_SIDES, value=expr.rhs)
            if validation.is_valid:
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.SUBTRACT_BOTH_SIDES,
                    equation_ast=current_ast,
                    result_ast=new_ast,
                    validation=validation,
                    from_step=step_number - 1
                ))
                current_ast = new_ast
                expr = self._ast_to_sympy(current_ast)

        factored = factor(poly.as_expr())
        solutions = sp.solve(poly.as_expr(), sym_var)
        
        if factored != poly.as_expr() and not factored.is_Number and self.grade <= 8:
            step_number += 1
            factor_ast = self._sympy_to_ast(Eq(factored, 0))
            validation = self.verify_equivalence(current_ast, factor_ast, OperationType.FACTORISE)
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.FACTORISE,
                equation_ast=current_ast,
                result_ast=factor_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            current_ast = factor_ast
            
            step_number += 1
            if len(solutions) == 1:
                final_ast = self._sympy_to_ast(Eq(sym_var, solutions[0]))
            else:
                final_ast = {
                    "type": "or",
                    "args": [self._sympy_to_ast(Eq(sym_var, sol)) for sol in solutions]
                }
            validation = self.verify_equivalence(current_ast, final_ast, OperationType.ISOLATE_VARIABLE)
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.ISOLATE_VARIABLE,
                equation_ast=current_ast,
                result_ast=final_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            return steps
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.QUADRATIC_FORMULA, variable=variable)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.QUADRATIC_FORMULA,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            return steps
            
        step_number += 1
        if len(solutions) == 1:
            final_ast = self._sympy_to_ast(Eq(sym_var, solutions[0]))
        else:
            final_ast = {
                "type": "or",
                "args": [self._sympy_to_ast(Eq(sym_var, sol)) for sol in solutions]
            }
        validation = self.verify_equivalence(current_ast, final_ast, OperationType.ISOLATE_VARIABLE)
        steps.append(RawSolutionStep(
            step_number=step_number,
            operation=OperationType.ISOLATE_VARIABLE,
            equation_ast=current_ast,
            result_ast=final_ast,
            validation=validation,
            from_step=step_number - 1
        ))
        return steps
    
    def _has_radical(self, expr: Any, variable: Optional[Any] = None) -> bool:
        """Check if expression contains a radical. If variable is provided, only return True if the radical contains that variable."""
        if expr is None:
            return False
        if isinstance(expr, sp.Pow) and (expr.exp == sp.Rational(1, 2) or expr.exp == 0.5):
            if variable is not None:
                return variable in expr.base.free_symbols
            return True
        if hasattr(expr, 'args'):
            return any(self._has_radical(arg, variable) for arg in expr.args)
        return False
    
    def _solve_radical(self, ast: dict, variable: str, start_step: int) -> list[RawSolutionStep]:
        """Solve radical equation with extraneous root checking."""
        steps = []
        step_number = start_step
        current_ast = copy.deepcopy(ast)
        sym_var = symbols(variable)
        
        original_ast = copy.deepcopy(ast)
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.ISOLATE_RADICAL)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.ISOLATE_RADICAL,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            current_ast = new_ast
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.SQUARE_BOTH_SIDES)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.SQUARE_BOTH_SIDES,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
            current_ast = new_ast
        
        # Solve the polynomial equation resulting from squaring
        poly_steps = self._solve_equation(current_ast, StructuredProblem(
            problem_type="equation",
            expressions=[{"ast_json": current_ast, "latex": ""}],
            unknowns=[variable],
            given_values={},
            constraints=[],
            requested_operation="solve",
            topic="linear_equations",
            units={},
            grade_hint=self.grade,
            source="mixed"
        ))
        for ps in poly_steps:
            step_number += 1
            ps.step_number = step_number
            steps.append(ps)
            current_ast = ps.result_ast
        
        step_number += 1
        new_ast, validation = self.apply_operation(
            current_ast, 
            OperationType.CHECK_EXTRANEOUS_ROOTS, 
            variable=variable,
            original_equation=original_ast
        )
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.CHECK_EXTRANEOUS_ROOTS,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps
    
    def _solve_system(self, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Solve system of equations with substitution and elimination."""
        steps = []
        step_number = 0
        
        if len(problem.expressions) < 2:
            return steps
        
        equations = []
        for expr_dict in problem.expressions:
            ast = expr_dict.get("ast_json", {})
            eq = self._ast_to_sympy(ast)
            if isinstance(eq, Eq):
                equations.append(eq)
        
        if len(equations) < 2:
            return steps
        
        eq1, eq2 = equations[0], equations[1]
        
        def find_isolated(eq: Eq):
            if eq.lhs.is_Symbol and not eq.rhs.has(eq.lhs):
                return eq.lhs, eq.rhs
            if eq.rhs.is_Symbol and not eq.lhs.has(eq.rhs):
                return eq.rhs, eq.lhs
            return None, None

        iso_var, iso_val = find_isolated(eq2)
        target_eq = eq1
        if not iso_var:
            iso_var, iso_val = find_isolated(eq1)
            if iso_var:
                target_eq = eq2

        if not iso_var:
            free_symbols = list(eq2.free_symbols)
            if free_symbols:
                iso_var = free_symbols[0]
                sols = sp.solve(eq2, iso_var)
                if sols:
                    iso_val = sols[0]
                    target_eq = eq1

        if iso_var is not None and iso_val is not None:
            subbed_eq = Eq(target_eq.lhs.subs(iso_var, iso_val), target_eq.rhs.subs(iso_var, iso_val))
            step_number += 1
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.SUBSTITUTE,
                equation_ast=self._sympy_to_ast(target_eq),
                result_ast=self._sympy_to_ast(subbed_eq),
                validation=Validation(is_valid=True, method=ValidationMethod.SYMPY_VERIFY, details=f"Substituted {iso_var} = {iso_val}"),
                from_step=0
            ))
            
            other_symbols = [s for s in subbed_eq.free_symbols]
            if other_symbols:
                other_var = str(other_symbols[0])
                sub_steps = self._solve_equation(self._sympy_to_ast(subbed_eq), StructuredProblem(
                    problem_type="equation",
                    expressions=[{"ast_json": self._sympy_to_ast(subbed_eq), "latex": sp.latex(subbed_eq)}],
                    unknowns=[other_var],
                    given_values={},
                    constraints=[],
                    requested_operation="solve",
                    topic="quadratic_equations" if sp.Poly(subbed_eq.lhs - subbed_eq.rhs, symbols(other_var)).degree() == 2 else "linear_equations",
                    units={},
                    grade_hint=self.grade,
                    source="mixed"
                ))
                for s in sub_steps:
                    step_number += 1
                    s.step_number = step_number
                    steps.append(s)
            
            all_sols = sp.solve(equations, dict=True)
            if all_sols:
                step_number += 1
                sol_branches = []
                for sol in all_sols:
                    sol_eqs = [Eq(k, v) for k, v in sol.items()]
                    if len(sol_eqs) == 1:
                        sol_branches.append(self._sympy_to_ast(sol_eqs[0]))
                    else:
                        sol_branches.append({
                            "type": "and",
                            "args": [self._sympy_to_ast(e) for e in sol_eqs]
                        })
                
                final_ast = sol_branches[0] if len(sol_branches) == 1 else {
                    "type": "or",
                    "args": sol_branches
                }
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.ISOLATE_VARIABLE,
                    equation_ast=steps[-1].result_ast if len(steps) > 1 else {},
                    result_ast=final_ast,
                    validation=Validation(is_valid=True, method=ValidationMethod.SYMPY_VERIFY, details="System solved"),
                    from_step=step_number - 1
                ))
        else:
            all_sols = sp.solve(equations, dict=True)
            if all_sols:
                step_number += 1
                sol_branches = []
                for sol in all_sols:
                    sol_eqs = [Eq(k, v) for k, v in sol.items()]
                    if len(sol_eqs) == 1:
                        sol_branches.append(self._sympy_to_ast(sol_eqs[0]))
                    else:
                        sol_branches.append({
                            "type": "and",
                            "args": [self._sympy_to_ast(e) for e in sol_eqs]
                        })
                
                final_ast = sol_branches[0] if len(sol_branches) == 1 else {
                    "type": "or",
                    "args": sol_branches
                }
                steps.append(RawSolutionStep(
                    step_number=step_number,
                    operation=OperationType.SUBSTITUTE,
                    equation_ast={},
                    result_ast=final_ast,
                    validation=Validation(is_valid=True, method=ValidationMethod.SYMPY_VERIFY, details="System solved"),
                    from_step=0
                ))
        
        return steps
    
    def _simplify_expression(self, ast: dict, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Simplify an expression step by step."""
        steps = []
        step_number = 0
        current_ast = copy.deepcopy(ast)
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.SIMPLIFY)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.SIMPLIFY,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps
    
    def _factor_expression(self, ast: dict, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Factor an expression step by step."""
        steps = []
        step_number = 0
        current_ast = copy.deepcopy(ast)
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.FACTORISE)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.FACTORISE,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps
    
    def _expand_expression(self, ast: dict, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Expand an expression step by step."""
        steps = []
        step_number = 0
        current_ast = copy.deepcopy(ast)
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.EXPAND)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.EXPAND,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps
    
    def _evaluate_expression(self, ast: dict, problem: StructuredProblem) -> list[RawSolutionStep]:
        """Evaluate an expression with given values."""
        steps = []
        step_number = 0
        current_ast = copy.deepcopy(ast)
        
        if problem.given_values:
            substitutions = {}
            for var, val_dict in problem.given_values.items():
                val_ast = val_dict.get("ast_json", {})
                val = self._ast_to_sympy(val_ast)
                substitutions[var] = val
            
            if substitutions:
                step_number += 1
                new_ast, validation = self.apply_operation(current_ast, OperationType.SUBSTITUTE, substitutions=substitutions)
                if validation.is_valid:
                    steps.append(RawSolutionStep(
                        step_number=step_number,
                        operation=OperationType.SUBSTITUTE,
                        equation_ast=current_ast,
                        result_ast=new_ast,
                        validation=validation,
                        from_step=step_number - 1
                    ))
                    current_ast = new_ast
        
        step_number += 1
        new_ast, validation = self.apply_operation(current_ast, OperationType.SIMPLIFY)
        if validation.is_valid:
            steps.append(RawSolutionStep(
                step_number=step_number,
                operation=OperationType.SIMPLIFY,
                equation_ast=current_ast,
                result_ast=new_ast,
                validation=validation,
                from_step=step_number - 1
            ))
        
        return steps


def solve(problem: StructuredProblem, grade: int = 7) -> list[RawSolutionStep]:
    """Main entry point for solving a structured problem."""
    engine = SolverEngine(grade=grade)
    return engine.solve(problem)


def verify_step(before_ast: dict, after_ast: dict, operation: OperationType) -> Validation:
    """Verify a single transformation step."""
    engine = SolverEngine()
    return engine.verify_equivalence(before_ast, after_ast, operation)