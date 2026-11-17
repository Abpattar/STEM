from .schemas import (
    GeometryProblem, MensurationProblem, CoordinateGeometryProblem,
    StatisticsProblem, ProbabilityProblem, GeometrySolutionStep,
    GeometryShape, GeometryMeasurement, GeometryShapeType, MeasurementType,
    RelationshipType, GeometryShapeType, MeasurementType, RelationshipType
)
from .engine import (
    GeometryEngine, MensurationEngine, CoordinateGeometryEngine,
    StatisticsEngine, ProbabilityEngine
)


def solve(problem: GeometryProblem, grade: int = 8) -> list:
    engine = GeometryEngine(grade=grade)
    return engine.solve(problem)


__all__ = [
    "GeometryProblem", "MensurationProblem", "CoordinateGeometryProblem",
    "StatisticsProblem", "ProbabilityProblem", "GeometrySolutionStep",
    "GeometryShape", "GeometryMeasurement", "GeometryShapeType", "MeasurementType",
    "RelationshipType",
    "GeometryEngine", "MensurationEngine", "CoordinateGeometryEngine",
    "StatisticsEngine", "ProbabilityEngine", "solve",
]