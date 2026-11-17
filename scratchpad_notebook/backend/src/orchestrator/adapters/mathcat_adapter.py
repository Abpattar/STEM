import logging
import re
from typing import Dict, Any, List
from .base import BaseAdapter
from ..schemas.umr import (
    UnifiedMathematicalRepresentation,
    AccessibilityPayload,
    SpeechPayload,
    BraillePayload,
)
from ..schemas.profile import StudentProfile

logger = logging.getLogger("orchestrator.adapters.mathcat")

# Nemeth Braille code mapping for mathematical symbols and digits
NEMETH_DIGITS = {
    '1': '⠂', '2': '⠆', '3': '⠒', '4': '⠲', '5': '⠢',
    '6': '⠖', '7': '⠶', '8': '⠦', '9': '⠔', '0': '⠴'
}

UEB_DIGITS = {
    '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚'
}

BRAILLE_LETTERS = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋',
    'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚', 'k': '⠅', 'l': '⠇',
    'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗',
    's': '⠎', 't': '⠞', 'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭',
    'y': '⠽', 'z': '⠵'
}

class MathCATAdapter(BaseAdapter):
    """
    Mathematical accessibility adapter implementing MathCAT ClearSpeak/SimpleSpeak
    speech rules and Nemeth / UEB Braille translation.
    """
    capability_name: str = "mathcat"
    is_available: bool = True

    async def initialize(self) -> bool:
        self.is_available = True
        return True

    def latex_to_clearspeak(self, latex: str) -> str:
        """Translate LaTeX mathematics into ClearSpeak standard spoken English."""
        if not latex:
            return ""

        s = latex.strip()

        # Handle fractions: \frac{a}{b}
        s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'the fraction \1 over \2', s)

        # Handle square roots: \sqrt{x}
        s = re.sub(r'\\sqrt\{([^}]+)\}', r'the square root of \1', s)

        # Handle degree symbol: ^\circ or ° -> degrees
        s = re.sub(r'\^?\\circ|°', r' degrees', s)

        # Handle powers: x^2 or x^{2} -> x squared, x^3 or x^{3} -> x cubed, x^n -> x to the n-th power
        s = re.sub(r'([a-zA-Z0-9])\^\{?2\}?', r'\1 squared', s)
        s = re.sub(r'([a-zA-Z0-9])\^\{?3\}?', r'\1 cubed', s)
        s = re.sub(r'([a-zA-Z0-9])\^\{?([a-zA-Z0-9]+)\}?', r'\1 to the power of \2', s)

        # Handle parenthesized expressions: (x + 2) -> the quantity x plus 2
        s = re.sub(r'\(([^)]+)\)', r'the quantity \1, ', s)

        # Handle operators and relational symbols
        s = s.replace('=', ' equals ')
        s = s.replace('+', ' plus ')
        s = re.sub(r'(?<=\w)\s*-\s*(?=\w)', ' minus ', s)
        s = re.sub(r'(^|[=+\-,])\s*-\s*([a-zA-Z0-9]+)', r'\1 negative \2', s)
        s = s.replace('\\cdot', ' times ')
        s = s.replace('\\times', ' times ')
        s = s.replace('\\quad\\text{or}\\quad', ' or ')
        s = s.replace('\\quad', ' ')
        s = s.replace('\\left', '').replace('\\right', '')

        # Separate coefficient digits from variable letters (e.g. 5x -> 5 x, 3x -> 3 x)
        s = re.sub(r'(\d+)([a-zA-Z])', r'\1 \2', s)

        # Number-letter coefficient multiplication and digits
        num_words = {
            '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
            '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
            '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
            '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
            '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty'
        }
        for num_str, word in num_words.items():
            s = re.sub(rf'\b{num_str}\b', word, s)

        # Normalize whitespace
        s = ' '.join(s.split())
        return s

    def latex_to_nemeth_braille(self, latex: str) -> str:
        """Convert LaTeX math expression into Nemeth Code Braille symbols."""
        result = []
        i = 0
        s = latex.replace('\\quad', ' ').replace('\\left', '').replace('\\right', '')

        while i < len(s):
            ch = s[i]
            if ch in NEMETH_DIGITS:
                result.append(NEMETH_DIGITS[ch])
            elif ch.lower() in BRAILLE_LETTERS:
                result.append(BRAILLE_LETTERS[ch.lower()])
            elif ch == '+':
                result.append('⠬')
            elif ch == '-':
                result.append('⠤')
            elif ch == '=':
                result.append('⠀⠨⠤⠀')
            elif ch == '^':
                result.append('⠘')
            elif ch == '(':
                result.append('⠷')
            elif ch == ')':
                result.append('⠾')
            elif ch == ' ':
                result.append('⠀')
            elif s[i:i+4] == '\\text':
                # Skip raw latex commands
                i += 4
                continue
            i += 1

        return ''.join(result)

    def latex_to_ueb_braille(self, latex: str) -> str:
        """Convert LaTeX math expression into Unified English Braille (UEB)."""
        result = []
        i = 0
        s = latex.replace('\\quad', ' ')

        while i < len(s):
            ch = s[i]
            if ch in UEB_DIGITS:
                result.append(UEB_DIGITS[ch])
            elif ch.lower() in BRAILLE_LETTERS:
                result.append(BRAILLE_LETTERS[ch.lower()])
            elif ch == '+':
                result.append('⠐⠖')
            elif ch == '-':
                result.append('⠐⠤')
            elif ch == '=':
                result.append('⠀⠐⠶⠀')
            elif ch == '^':
                result.append('⠔')
            elif ch == '(':
                result.append('⠐⠣')
            elif ch == ')':
                result.append('⠐⠜')
            elif ch == ' ':
                result.append('⠀')
            i += 1

        return ''.join(result)

    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        input_latex = umr.input.recognized_latex or ""
        expr_speech = self.latex_to_clearspeak(input_latex)

        # Generate step-by-step ClearSpeak speech
        steps_speech = []
        for step in umr.solution.steps:
            step_math_speech = self.latex_to_clearspeak(step.latex)
            step_text = f"Step {step.step_number}: {step.explanation}. Mathematical form: {step_math_speech}."
            steps_speech.append(step_text)

        # Braille translation
        standard = profile.preferences.braille_standard
        if standard == "ueb":
            expr_braille = self.latex_to_ueb_braille(input_latex)
            steps_braille = [self.latex_to_ueb_braille(s.latex) for s in umr.solution.steps]
        else:
            expr_braille = self.latex_to_nemeth_braille(input_latex)
            steps_braille = [self.latex_to_nemeth_braille(s.latex) for s in umr.solution.steps]

        umr.accessibility.speech = SpeechPayload(
            expression_speech=expr_speech,
            steps_speech=steps_speech,
            dialect=profile.preferences.speech_dialect
        )

        umr.accessibility.braille = BraillePayload(
            standard=standard,
            expression_braille=expr_braille,
            steps_braille=steps_braille
        )

        return umr

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "speech_engine": "MathCAT ClearSpeak / SimpleSpeak Rules",
            "braille_standards": ["Nemeth", "UEB"],
            "supported_languages": ["en"]
        }
