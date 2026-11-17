import json
import httpx
from typing import List, Optional, Any
from .schemas import (
    ExplanationRequest, ExplanationResponse,
    HintRequest, HintResponse,
    TeachingProviderConfig
)
from ..solver.schemas import SolutionStep, StructuredProblem


DEFAULT_EXPLANATION_PROMPT = """You are a math teacher explaining a step to a student in grade {grade}.

Problem: {problem_description}
Current step: {step_display}
Operation: {operation}
Previous steps: {previous_steps}

Write a SHORT explanation (max 2 sentences) for WHY this step is valid.
Use simple, grade-appropriate language.
Do NOT include LaTeX or math notation in your explanation - just plain text.
Focus on the reasoning: e.g., "We subtract 3 from both sides to keep the equation balanced."

Return ONLY a JSON object: {{"explanation": "...", "hint": "...", "alternative_explanation": "..."}}"""


DEFAULT_HINT_PROMPT = """You are a math teacher giving a hint to a grade {grade} student.

Problem: {problem_description}
Current step: {step_display}
Student's attempt: {attempt_display}

Give a hint at level {hint_level}:
- Level 1 (Nudge): General direction without specifics. e.g., "Look at what you did to the left side."
- Level 2 (Targeted): Points to the specific issue. e.g., "When moving a term across the equals sign, what happens to its sign?"
- Level 3 (Show step): Reveals the expected step with reasoning.
- Level 4 (Explain simply): Rephrase the step explanation for a lower grade.

IMPORTANT: NEVER reveal the final answer or the next step's result in the hint.
Keep it to ONE sentence.

Return ONLY a JSON object: {{"hint": "..."}}"""


class TeachingProvider:
    def __init__(self, config: Optional[TeachingProviderConfig] = None):
        self.config = config or TeachingProviderConfig()
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.config.llm_base_url,
                headers={"Authorization": f"Bearer {self.config.llm_api_key}"} if self.config.llm_api_key else {},
                timeout=30.0
            )
        return self._client
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def _format_problem(self, problem: StructuredProblem) -> str:
        if problem.problem_type == "word_problem":
            return f"Word problem: {problem.expressions[0].get('latex', '') if problem.expressions else ''}"
        elif problem.problem_type == "system":
            eqs = [e.get('latex', '') for e in problem.expressions]
            return f"System: {', '.join(eqs)}"
        elif problem.problem_type == "expression":
            return f"Expression: {problem.expressions[0].get('latex', '') if problem.expressions else ''}"
        else:
            eqs = [e.get('latex', '') for e in problem.expressions]
            return f"Equation: {', '.join(eqs)}"
    
    def _format_steps(self, steps: List[SolutionStep]) -> str:
        if not steps:
            return "None"
        return "; ".join([f"Step {s.step_number}: {s.explanation}" for s in steps])
    
    def _ast_to_latex(self, ast: dict) -> str:
        """Convert AST dict to LaTeX for display."""
        if not ast:
            return ""
        
        node_type = ast.get("type")
        if node_type == "or":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return r" \text{ or } ".join(args)
        
        if node_type == "and":
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            return r", \quad ".join(args)
        
        try:
            from ..solver.engine import SolverEngine
            engine = SolverEngine(grade=grade if 'grade' in locals() else 7)
            expr = engine._ast_to_sympy(ast)
            if expr is not None:
                import sympy as sp
                if isinstance(expr, sp.Eq):
                    return f"{sp.latex(expr.lhs)} = {sp.latex(expr.rhs)}"
                return sp.latex(expr)
        except Exception:
            pass
        
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
            return r" \cdot ".join(args)
        
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
                return rf"\frac{{{args[0]}}}{{{args[1]}}}"
            return rf"\frac{{1}}{{{args[0]}}}" if args else "0"
        
        elif node_type == "eq":
            left = self._ast_to_latex(ast.get("left", {}))
            right = self._ast_to_latex(ast.get("right", {}))
            return f"{left} = {right}"
        
        elif node_type == "sqrt":
            arg = self._ast_to_latex(ast.get("arg", {}))
            return rf"\sqrt{{{arg}}}"
        
        elif node_type == "abs":
            arg = self._ast_to_latex(ast.get("arg", {}))
            return f"|{arg}|"
        
        elif node_type == "function":
            func_name = ast.get("name", "")
            args = [self._ast_to_latex(arg) for arg in ast.get("args", [])]
            if func_name in ("sin", "cos", "tan", "log", "ln", "exp"):
                return rf"\{func_name}({', '.join(args)})"
            return f"{func_name}({', '.join(args)})"
        
        return ""
    
    async def enrich_steps(
        self,
        problem: StructuredProblem,
        raw_steps: List[Any],  # Can be RawSolutionStep or SolutionStep
        grade: int,
    ) -> List[SolutionStep]:
        """Add explanations and hints to verified solution steps."""
        enriched = []
        
        for i, step in enumerate(raw_steps):
            explanation = self._generate_explanation(step, problem, grade, raw_steps[:i])
            hint = self._generate_hint(step, problem, grade)
            
            # Handle both RawSolutionStep and SolutionStep
            step_number = getattr(step, 'step_number', i + 1)
            operation = getattr(step, 'operation', '')
            if hasattr(operation, 'value'):
                operation = operation.value
            equation_ast = getattr(step, 'equation_ast', {})
            validation = getattr(step, 'validation', None)
            is_final_answer = getattr(step, 'is_final_answer', False)
            final_answer_text = getattr(step, 'final_answer_text', '')
            diagram_focus = getattr(step, 'diagram_focus', [])
            diagram_type = getattr(step, 'diagram_type', 'none')
            
            # Generate display_math from result_ast (or equation_ast) if not present
            display_math = getattr(step, 'display_math', None)
            if not display_math:
                target_ast = getattr(step, 'result_ast', None) or equation_ast
                display_math = self._ast_to_latex(target_ast)
            
            enriched_step = SolutionStep(
                step_number=step_number,
                operation=operation,
                equation_ast=equation_ast,
                display_math=display_math,
                explanation=explanation,
                validation=validation,
                hint=hint,
                is_final_answer=is_final_answer,
                final_answer_text=final_answer_text,
                diagram_focus=diagram_focus,
                diagram_type=diagram_type,
            )
            enriched.append(enriched_step)
        
        return enriched
    
    async def generate_hint(
        self, 
        problem: StructuredProblem, 
        current_step: int, 
        student_attempt: Optional[dict] = None,
        grade: int = 7
    ) -> str:
        """Generate a contextual hint for guided practice."""
        if current_step <= 0:
            return "Read the problem carefully and identify what you need to find."
        
        prompt = DEFAULT_HINT_PROMPT.format(
            grade=grade,
            problem_description=self._format_problem(problem),
            step_display=f"Step {current_step}",
            attempt_display="Not provided" if not student_attempt else "Provided",
            hint_level=2
        )
        
        try:
            response = await self._call_llm(prompt)
            data = json.loads(response)
            return data.get("hint", "Try working through the problem step by step.")
        except Exception:
            return "Think about what operation would help simplify the problem."
    
    def _generate_explanation(
        self, 
        step: Any, 
        problem: StructuredProblem, 
        grade: int,
        previous_steps: List[Any]
    ) -> str:
        """Generate a contextual, educational explanation for why this step is done."""
        op = getattr(step, 'operation', '')
        if hasattr(op, 'value'):
            op = op.value
        op = str(op).lower()
        
        var = problem.unknowns[0] if problem.unknowns else "x"
        details = ""
        val = getattr(step, 'validation', None)
        if val and getattr(val, 'details', None):
            details = str(val.details)
        
        def clean_math_text(t: str) -> str:
            import re
            t = t.replace("**2", "²").replace("^2", "²").replace("**3", "³").replace("^3", "³").replace("**", "")
            t = re.sub(r'(\d)\*([a-zA-Z])', r'\1\2', t)
            t = t.replace("*", "")
            return t
            
        details = clean_math_text(details)
        before_ast = getattr(step, 'equation_ast', {})
        after_ast = getattr(step, 'result_ast', {})
        
        # 1. SUBTRACT_BOTH_SIDES
        if op == "subtract_both_sides":
            if details and "subtracted" in details.lower():
                if "to collect" in details or "to isolate" in details:
                    return f"We {details[0].lower() + details[1:]}."
                sub_val = details.lower().split("subtracted ")[1].split(" from")[0].strip()
                if var in sub_val or "x" in sub_val:
                    return f"We subtract {sub_val} from both sides to group all terms containing {var} on the left side."
                else:
                    return f"We subtract {sub_val} from both sides to isolate the variable term on the left."
            return f"We subtract the term from both sides to group like terms and keep the equation balanced."
        
        # 2. ADD_BOTH_SIDES
        elif op == "add_both_sides":
            if details and "added" in details.lower():
                add_val = details.lower().split("added ")[1].split(" to")[0].strip()
                if var in add_val or "x" in add_val:
                    return f"We add {add_val} to both sides to move terms containing {var} to the left."
                else:
                    return f"We add {add_val} to both sides to move constant numbers to the right side."
            return f"We add the term to both sides to keep the equation balanced."
        
        # 3. DIVIDE_BOTH_SIDES
        elif op == "divide_both_sides":
            if details and "divided both sides by" in details.lower():
                div_val = details.lower().split("divided both sides by ")[1].split(" ")[0].strip()
                return f"We divide both sides by {div_val} to eliminate the coefficient and isolate {var} completely."
            return f"We divide both sides by the coefficient to get {var} by itself."
        
        # 4. MULTIPLY_BOTH_SIDES
        elif op == "multiply_both_sides":
            if details and "multiplied both sides by" in details.lower():
                mult_val = details.lower().split("multiplied both sides by ")[1].split(" ")[0].strip()
                return f"We multiply both sides by {mult_val} to clear the fraction and simplify."
            return f"We multiply both sides to eliminate the denominator."
        
        # 5. ISOLATE_VARIABLE
        elif op == "isolate_variable":
            if details and "took square root" in details.lower():
                return f"We take the square root of both sides to remove the square and solve for {var}. This gives both the positive and negative roots (±)."
            
            before_str = str(before_ast)
            after_str = str(after_ast)
            if "pow" in before_str or "sqrt" in after_str or after_ast.get("type") == "or":
                return f"We take the square root of both sides to undo the square on {var}^2. Remember that taking a square root yields both positive and negative solutions (±)."
            
            if problem.problem_type == "system":
                return f"We substitute the calculated value back into the other equation to determine both variable values ({', '.join(problem.unknowns)})."
            
            return f"We isolate {var} on one side to obtain the final solution."
        
        # 6. SUBSTITUTE
        elif op == "substitute":
            if details and "substituted" in details.lower():
                sub_detail = details.replace("Substituted ", "").strip()
                return f"We substitute {sub_detail} into the equation to reduce it to an equation in only one variable."
            return f"We replace the variable with its known value to simplify the equation."
        
        # 7. FACTORISE
        elif op == "factorise":
            return f"We factor the quadratic expression into two binomial factors so we can apply the Zero Product Property."
        
        # 8. QUADRATIC_FORMULA
        elif op == "quadratic_formula":
            return f"We apply the quadratic formula using the identified coefficients to calculate the roots for {var}."
        
        # 9. ISOLATE_RADICAL
        elif op == "isolate_radical":
            return f"We isolate the square root radical on one side of the equation before squaring."
        
        # 10. SQUARE_BOTH_SIDES
        elif op == "square_both_sides":
            return f"We square both sides of the equation to eliminate the square root radical and solve for {var}."
        
        # 11. CHECK_EXTRANEOUS_ROOTS
        elif op == "check_extraneous_roots":
            return f"We substitute each candidate root back into the original equation to verify that no extraneous roots were introduced."
        
        return f"We perform {op.replace('_', ' ')} to keep the equation balanced while solving for {var}."
    
    def _generate_hint(self, step: SolutionStep, problem: StructuredProblem, grade: int) -> str:
        """Generate a helpful hint for the step."""
        hints = {
            "subtract_both_sides": "What can you do to both sides to simplify?",
            "add_both_sides": "What can you add to both sides?",
            "multiply_both_sides": "What can you multiply both sides by?",
            "divide_both_sides": "What can you divide both sides by?",
            "expand": "Try multiplying out the brackets.",
            "factorise": "Look for common factors or known patterns.",
            "simplify": "Can you combine any like terms?",
            "collect_like_terms": "Group the terms with the same variable.",
            "isolate_variable": "What operation gets the variable alone?",
            "substitute": "Replace the variable with its value.",
            "quadratic_formula": "Remember the quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
            "completing_square": "Try to make a perfect square trinomial.",
            "factorise": "Look for two numbers that multiply to... and add to...",
            "cross_multiply": "Multiply across the equals sign diagonally.",
            "find_common_denominator": "What denominator works for all fractions?",
            "apply_identity": "Do you recognize a pattern like (a+b)² or a²-b²?",
            "isolate_radical": "Get the square root by itself first.",
            "square_both_sides": "What happens when you square both sides?",
            "check_extraneous_roots": "Don't forget to test your answers in the original equation!",
            "substitute": "Replace the variable with its value.",
            "expand": "Try multiplying out the brackets.",
            "factorise": "Look for common factors or known patterns.",
            "simplify": "Can you combine any like terms?",
        }
        
        op = step.operation.lower()
        return op in hints and hints[op] or "Try working through it step by step."
    
    async def _call_llm(self, prompt: str) -> str:
        """Call the LLM with the given prompt."""
        client = await self._get_client()
        
        payload = {
            "model": self.config.llm_model,
            "messages": [
                {"role": "system", "content": "You are a math teacher. Output ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "response_format": {"type": "json_object"}
        }
        
        response = await client.post("/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def enrich_steps(
    problem: StructuredProblem, 
    raw_steps: List, 
    grade: int,
    config: Optional[TeachingProviderConfig] = None
) -> List:
    """Convenience function to enrich steps with explanations."""
    provider = TeachingProvider(config)
    try:
        return await provider.enrich_steps(problem, raw_steps, grade)
    finally:
        await provider.close()
