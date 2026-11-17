from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ..geometry.schemas import GeometryProblem, MensurationProblem, CoordinateGeometryProblem, StatisticsProblem, ProbabilityProblem


class DiagramProvider(ABC):
    @abstractmethod
    def generate(self, problem_type: str, data: Dict[str, Any]) -> str:
        """Generate SVG for a given problem type and data."""
        pass


class DiagramGenerator(ABC):
    @abstractmethod
    def generate_svg(self, data: Dict[str, Any]) -> str:
        """Generate SVG string for the given data."""
        pass