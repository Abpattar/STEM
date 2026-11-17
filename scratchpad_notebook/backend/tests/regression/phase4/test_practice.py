import pytest
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from src.practice.schemas import AttemptResult, AttemptClassification, MisconceptionId
from src.practice.attempt_checker import AttemptChecker
from src.practice.catalogue import MISCONCEPTION_CATALOGUE, MisconceptionEntry
from src.practice.hint_ladder import generate_hint_ladder, get_next_hint_level
from src.practice.history import HistoryProvider
from src.solver.schemas import StructuredProblem, SolutionStep


class TestMisconceptionCatalogue:
    def test_all_misconceptions_defined(self):
        assert len(MISCONCEPTION_CATALOGUE) == 10
        for entry in MISCONCEPTION_CATALOGUE:
            assert entry.id.value.startswith("MC-")
            assert entry.name
            assert entry.explanation
            assert entry.hint
            assert len(entry.grade_range) == 2
            assert entry.grade_range[0] <= entry.grade_range[1]
    
    def test_mc001_square_of_sum(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_001)
        assert mc.name == "square_of_sum_error"
        assert "2ab" in mc.explanation
    
    def test_mc002_sign_error(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_002)
        assert mc.name == "sign_error_moving_term"
    
    def test_mc003_one_sided(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_003)
        assert mc.name == "one_sided_operation"
    
    def test_mc004_cancel_terms(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_004)
        assert mc.name == "cancel_terms_not_factors"
    
    def test_mc005_divide_by_zero(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_005)
        assert mc.name == "divide_by_variable_may_be_zero"
    
    def test_mc006_order_of_operations(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_006)
        assert mc.name == "wrong_order_of_operations"
    
    def test_mc007_unit_error(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_007)
        assert mc.name == "unit_error"
    
    def test_mc008_extraneous_root(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_008)
        assert mc.name == "extraneous_root_not_checked"
    
    def test_mc009_wrong_identity(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_009)
        assert mc.name == "wrong_identity_use"
    
    def test_mc010_arithmetic_slip(self):
        mc = next(e for e in MISCONCEPTION_CATALOGUE if e.id == MisconceptionId.MC_010)
        assert mc.name == "arithmetic_slip"


class TestAttemptChecker:
    def test_correct_expected_step(self):
        checker = AttemptChecker(grade=7)
        
        # x + 3 = 7 -> x = 4
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        
        result = checker.check_attempt(None, student, expected, 1)
        assert result.classification == "correct_expected"
        assert result.misconception_id is None
    
    def test_correct_alternate_path(self):
        checker = AttemptChecker(grade=7)
        
        # x + 3 = 7 -> x = 7 - 3 (alternate path)
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "sub", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}
        
        result = checker.check_attempt(None, student, expected, 1)
        assert result.classification in ["correct_expected", "correct_alternate"]
    
    def test_sign_error_misconception(self):
        checker = AttemptChecker(grade=7)
        
        # Student adds instead of subtracts: x = 7 + 3
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "sub", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "add", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}
        
        result = checker.check_attempt(None, student, {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "sub", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}, 1)
        assert result.classification == "not_equivalent"
        assert result.misconception_id == "MC-002"
    
    def test_one_sided_operation(self):
        checker = AttemptChecker(grade=7)
        
        # Student only subtracts from left side
        problem = type('Problem', (), {})()
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 7}}  # x + 3 = 7 -> x = 7 (wrong)
        
        result = checker.check_attempt(problem, student, expected, 1)
        assert result.classification == "not_equivalent"
    
    def test_divide_by_zero_misconception(self):
        checker = AttemptChecker(grade=9)
        
        # x^2 = x^3 -> x = x^2 (dividing by x without checking x != 0)
        problem = type('Problem', (), {})()
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 1}}  # x = 1 or x = 0
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "symbol", "name": "x"}}  # x = x^2
        
        result = checker.check_attempt(problem, student, expected, 1)
        assert result.classification == "not_equivalent"
        # Might detect MC-005
    
    def test_extraneous_root_not_checked(self):
        checker = AttemptChecker(grade=10)
        
        # sqrt(x) = x - 2, x = 1 is extraneous
        problem = type('Problem', (), {})()
        expected = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}  # x = 4 (only valid)
        student = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 1}}  # x = 1 (extraneous)
        
        result = checker.check_attempt(problem, student, expected, 1)
        assert result.classification == "not_equivalent"


class TestHintLadder:
    def test_hint_levels(self):
        step = type('Step', (), {'step_number': 1, 'explanation': 'Subtract 3 from both sides'})()
        problem = type('Problem', (), {})()
        
        hint1 = generate_hint_ladder(step, problem, 7, 1)
        assert "Look at the operation" in hint1
        
        hint2 = generate_hint_ladder(step, problem, 7, 2)
        assert "equals sign" in hint2
        
        hint3 = generate_hint_ladder(step, problem, 7, 3)
        assert "Step 1" in hint3
        
        hint4 = generate_hint_ladder(step, problem, 7, 4)
        assert "simply" in hint4.lower() or "simply" in hint4.lower()
    
    def test_next_hint_level(self):
        assert get_next_hint_level(1) == 2
        assert get_next_hint_level(2) == 3
        assert get_next_hint_level(3) == 4
        assert get_next_hint_level(4) == 4


class TestHintLadder:
    def test_no_answer_leak(self):
        """Verify hints never contain the final answer value."""
        step = type('Step', (), {'step_number': 1, 'explanation': 'Subtract 3 from both sides'})()
        problem = type('Problem', (), {})()
        
        for level in [1, 2, 3]:
            hint = generate_hint_ladder(step, {}, 7, level)
            # Should not contain "4" (the answer to x + 3 = 7)
            assert "4" not in hint
            assert "four" not in hint.lower()
            # Should not contain "x = 4"
            assert "x = 4" not in hint
            assert "x=4" not in hint


class TestHistoryProvider:
    def test_session_clears_on_leave(self):
        history = HistoryProvider()
        from src.solver.schemas import StructuredProblem
        
        problem = StructuredProblem(
            problem_type="equation",
            expressions=[{"ast_json": {}, "latex": "x=1"}],
            unknowns=["x"],
            given_values={},
            constraints=[],
            requested_operation="solve",
            topic="test",
            units={},
            grade_hint=7,
            source="typed"
        )
        
        session = history.start_session("test-session", problem, 7)
        assert session.current_step == 0
        history.clear_session("test-session")
        session2 = history.get_session("test-session")
        assert session2 is None
    
    def test_opt_in_save(self):
        history = HistoryProvider()
        from src.solver.schemas import StructuredProblem, SolutionStep
        
        problem = StructuredProblem(
            problem_type="equation",
            expressions=[{"ast_json": {}, "latex": "x=1"}],
            unknowns=["x"],
            given_values={},
            constraints=[],
            requested_operation="solve",
            topic="test",
            units={},
            grade_hint=7,
            source="typed"
        )
        
        steps = [type('Step', (), {
            'step_number': 1,
            'operation': 'test',
            'equation_ast': {},
            'display_math': 'x=1',
            'explanation': 'test',
            'validation': {'is_valid': True, 'method': 'test', 'details': ''},
            'hint': 'hint',
            'is_final_answer': True,
            'final_answer_text': 'x=1',
            'diagram_focus': [],
            'diagram_type': 'none'
        })()]
        
        saved = history.save_problem(problem, [], {"steps_attempted": 1, "hints_used": 0, "misconceptions_found": [], "completed": True}, "test", 7)
        assert saved.id
        assert saved.problem_data.topic == "test"
        
        # Retrieve
        retrieved = history.get_saved_problem(saved.id)
        assert retrieved is not None
        assert retrieved.id == saved.id
        
        # Delete
        deleted = history.delete_problem(saved.id)
        assert deleted
        retrieved2 = history.get_saved_problem(saved.id)
        assert retrieved2 is None
    
    def test_delete_all(self):
        history = HistoryProvider()
        count = history.delete_all_problems()
        assert isinstance(count, int)


class TestPracticeIntegration:
    @pytest.mark.asyncio
    async def test_full_practice_flow(self):
        """Test a complete practice session flow."""
        from src.practice.attempt_checker import AttemptChecker
        
        checker = AttemptChecker(grade=7)
        
        # Problem: x + 3 = 7
        expected_step1 = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "sub", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}
        expected_step2 = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        
        # Step 1: subtract 3 from both sides
        student1 = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "sub", "args": [{"type": "number", "value": 7}, {"type": "number", "value": 3}]}}
        result1 = checker.check_attempt(None, student1, {"type": "eq", "left": {"type": "add", "args": [{"type": "symbol", "name": "x"}, {"type": "number", "value": 3}]}, "right": {"type": "number", "value": 7}}, 1)
        assert result1.classification == "correct_expected"
        
        # Step 2: simplify
        student2 = {"type": "eq", "left": {"type": "symbol", "name": "x"}, "right": {"type": "number", "value": 4}}
        result2 = checker.check_attempt(None, student2, expected_step2, 2)
        assert result2.classification == "correct_expected"
        assert result2.is_final_answer is False  # We don't mark final in checker


if __name__ == "__main__":
    pytest.main([__file__, "-v"])