from abc import ABC, abstractmethod
from typing import List, Optional
from .schemas import (
    StructuredProblem, RawSolutionStep, Validation, 
    OperationType, SolutionStep, TopicSupport
)


class SolverProvider(ABC):
    @abstractmethod
    def solve(self, problem: StructuredProblem, grade: int = 7) -> List[RawSolutionStep]:
        """Generate verified solution steps using SymPy."""
        pass
    
    @abstractmethod
    def verify_step(self, before_ast: dict, after_ast: dict, operation: OperationType) -> Validation:
        """Verify a single transformation is mathematically valid."""
        pass
    
    @abstractmethod
    def get_supported_operations(self, topic: str) -> List[OperationType]:
        """Get supported operations for a topic."""
        pass
    
    @abstractmethod
    def is_topic_supported(self, topic: str) -> bool:
        """Check if a topic is fully supported."""
        pass


class SolverError(Exception):
    def __init__(self, message: str, topic: str = "", operation: str = ""):
        self.message = message
        self.topic = topic
        self.operation = operation
        super().__init__(message)