from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json
import uuid
from .schemas import SavedProblem, AnalyticsEvent, PracticeSession


class HistoryProvider:
    """Handles session-only and opt-in persistent storage for practice sessions."""
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or "./.history"
        self.session_data: Dict[str, Any] = {}
        self.saved_problems: List[SavedProblem] = []
        self._load_persisted()
    
    def _load_persisted(self):
        """Load saved problems from disk."""
        try:
            import os
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                    self.saved_problems = [SavedProblem(**p) for p in data]
        except Exception:
            self.saved_problems = []
    
    def _save_persisted(self):
        """Save problems to disk."""
        try:
            import os
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            with open(self.storage_path, 'w') as f:
                json.dump([p.model_dump() for p in self.saved_problems], f, default=str)
        except Exception:
            pass
    
    def start_session(self, session_id: str, problem, grade: int) -> PracticeSession:
        """Start a new practice session."""
        session = PracticeSession(
            problem=problem,
            current_step=0,
            grade=grade,
            attempts=[],
            hints_used=0,
            misconceptions_found=[]
        )
        self.session_data[session_id] = session.model_dump()
        return session
    
    def record_attempt(self, session_id: str, step: int, attempt_data: Dict[str, Any], result: dict) -> None:
        """Record a practice attempt."""
        if session_id in self.session_data:
            session = PracticeSession(**self.session_data[session_id])
            session.attempts.append({
                "step": step,
                "attempt": attempt_data,
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            })
            if result.get("hint_level", 0) > 0:
                session.hints_used += 1
            if result.get("misconception_id"):
                session.misconceptions_found.append(result["misconception_id"])
            self.session_data[session_id] = session.model_dump()
    
    def record_analytics(self, event: AnalyticsEvent) -> None:
        """Record an analytics event (privacy-conscious)."""
        # In production, this would send to analytics service
        # For now, we just log it
        pass
    
    def save_problem(self, problem, solution_steps, practice_summary, topic: str, grade: int) -> SavedProblem:
        """Save a problem to history (opt-in)."""
        saved = SavedProblem(
            id=str(uuid.uuid4()),
            problem_data=problem,
            solution_steps=solution_steps,
            practice_summary=practice_summary,
            topic=topic,
            grade=grade,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        self.saved_problems.append(saved)
        self._save_persisted()
        return saved
    
    def get_saved_problems(self) -> List[SavedProblem]:
        """Get all saved problems."""
        return self.saved_problems
    
    def get_saved_problem(self, problem_id: str) -> Optional[SavedProblem]:
        """Get a specific saved problem."""
        for p in self.saved_problems:
            if p.id == problem_id:
                return p
        return None
    
    def delete_problem(self, problem_id: str) -> bool:
        """Delete a saved problem."""
        for i, p in enumerate(self.saved_problems):
            if p.id == problem_id:
                self.saved_problems.pop(i)
                self._save_persisted()
                return True
        return False
    
    def delete_all_problems(self) -> int:
        """Delete all saved problems."""
        count = len(self.saved_problems)
        self.saved_problems = []
        self._save_persisted()
        return count
    
    def get_session(self, session_id: str) -> Optional[PracticeSession]:
        """Get a practice session."""
        if session_id in self.session_data:
            return PracticeSession(**self.session_data[session_id])
        return None
    
    def end_session(self, session_id: str) -> Optional[PracticeSession]:
        """End a practice session."""
        if session_id in self.session_data:
            session = PracticeSession(**self.session_data.pop(session_id))
            return session
        return None
    
    def clear_session(self, session_id: str) -> None:
        """Clear session data."""
        self.session_data.pop(session_id, None)