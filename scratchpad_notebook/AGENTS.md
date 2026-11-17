# AGENTS.md - AI Math Notebook Agent Instructions

## Non-Negotiable Rules (from PRD)

1. **Never show raw syntax to students**: No x^2, sqrt(), LaTeX source, or programming text. All maths rendered with KaTeX.

2. **Source of truth is structured expression (SymPy/AST)**: Never a display string. Display LaTeX is generated from it.

3. **LLM is never the calculator**: SymPy performs and verifies every transformation (equivalence check) and substitutes the final answer back. LLMs only interpret intent/word problems, choose methods, and write explanations as strict JSON validated by pydantic schemas.

4. **Uncertain handwriting/ambiguous intent → ask clarification**: x vs ×, 1 vs l, minus vs fraction bar → targeted clarification. Never silently guess. Never invent missing values; ask for them.

5. **Unsupported topic → say so and offer next action**: Never show an unverified solution. If a step fails verification, regenerate (max 2 retries), then show an honest error.

6. **Model API keys live only in server-side env vars**: .env git-ignored, commit .env.example. Never in browser code.

7. **On network/AI failure keep student's canvas and typed input intact**: Offer retry.

8. **Modules are separate behind interfaces**: Recognition, interpretation, solving, teaching, rendering. LLM providers swappable by config (OpenAI-compatible base URL + model + key from env).

9. **Maintain topic-support registry**: Fully supported / limited / not yet supported per PRD section 5.1.

## Additional Rules

- **No speculative features**: Build only what's in the current phase.
- **Small vertical slices**: Tests + lint + build after each slice; git commit; update PROGRESS.md.
- **Files under ~300 lines**: One responsibility each. Targeted edits only.
- **Never claim something works unless you ran it**: Quote real test output.
- **Do only the current phase**: Stop at exit condition, report, wait for approval.

## Non-Negotiable Test Requirements

- Every generated step verified for mathematical equivalence (not just final answer).
- Raw syntax scan: no "^", "\frac", "sqrt(", "**" in student-facing output.
- AT-009: Notebook ↔ Textbook mode preserves all equations, explanations, step order, correctness.
- Regression suite: ≥15 problems per topic group with expected answers.
- Edge cases: no solution, infinite solutions, repeated root, extraneous root, no real roots.
- Grade-level test: same problem at different grades → different methods/wording.