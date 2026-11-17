from typing import List, Optional
from .schemas import SolutionStep, StructuredProblem


def generate_hint_ladder(
    step: SolutionStep,
    problem: StructuredProblem,
    grade: int,
    current_hint_level: int = 1
) -> str:
    """Generate the next hint in the ladder.
    
    Levels:
    1. Nudge - general direction
    2. Targeted hint - specific issue
    3. Show step with reason
    4. Explain more simply (on demand)
    """
    if current_hint_level == 1:
        return f"Look at the operation you applied to the left side — did you do the same to the right?"
    elif current_hint_level == 2:
        return f"When you move a term across the equals sign, what happens to its sign?"
    elif current_hint_level == 3:
        return f"Step {step.step_number}: {step.explanation}"
    elif current_hint_level == 4:
        return f"Think of it like: {_simplify_explanation(step.explanation, grade)}"
    else:
        return "Think about what operation would help simplify the problem."
    
    return "Think about what operation would help simplify the problem."


def _simplify_explanation(explanation: str, grade: int) -> str:
    """Simplify explanation for lower grade levels."""
    # In practice, this would use an LLM to rephrase
    # For now, return a simplified version
    if grade <= 5:
        return "Let's do this carefully, step by step."
    elif grade <= 8:
        return "We're keeping the equation balanced by doing the same thing to both sides."
    else:
        return "This maintains the equality of the equation by applying the same operation to both sides."


def get_next_hint_level(current_level: int) -> int:
    """Get the next hint level in the ladder."""
    if current_level < 4:
        return current_level + 1
    return 4


def should_reveal_step(hint_level: int) -> bool:
    """Check if we should reveal the step (hint level 3 or 4)."""
    return hint_level >= 3