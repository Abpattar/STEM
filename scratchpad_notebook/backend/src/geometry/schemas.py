from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from enum import Enum


class GeometryShapeType(str, Enum):
    TRIANGLE = "triangle"
    RIGHT_TRIANGLE = "right_triangle"
    RECTANGLE = "rectangle"
    SQUARE = "square"
    PARALLELOGRAM = "parallelogram"
    TRAPEZIUM = "trapezium"
    CIRCLE = "circle"
    CUBOID = "cuboid"
    CUBE = "cube"
    CYLINDER = "cylinder"
    CONE = "cone"
    SPHERE = "sphere"


class MeasurementType(str, Enum):
    LENGTH = "length"
    ANGLE = "angle"
    AREA = "area"
    VOLUME = "volume"
    PERIMETER = "perimeter"
    SURFACE_AREA = "surface_area"
    RADIUS = "radius"
    DIAMETER = "diameter"


class RelationshipType(str, Enum):
    PARALLEL = "parallel"
    PERPENDICULAR = "perpendicular"
    EQUAL_LENGTHS = "equal_lengths"
    EQUAL_ANGLES = "equal_angles"
    RIGHT_ANGLE = "right_angle"
    MIDPOINT = "midpoint"
    BISECTOR = "bisector"
    VERTICAL_ANGLES = "vertical_angles"
    ALTERNATE_INTERIOR = "alternate_interior"
    CORRESPONDING = "corresponding"
    CO_INTERIOR = "co_interior"


class GeometryMeasurement(BaseModel):
    value: float
    unit: str
    measurement_type: MeasurementType
    label: str = ""


class GeometryRelationship(BaseModel):
    type: RelationshipType
    elements: List[str]


class GeometryShape(BaseModel):
    type: GeometryShapeType
    id: str
    vertices: List[Dict[str, Any]] = []
    measurements: List[GeometryMeasurement] = []
    relationships: List[GeometryRelationship] = []


class GeometryProblem(BaseModel):
    shapes: List[GeometryShape]
    given_measurements: Dict[str, GeometryMeasurement] = {}
    relationships: List[GeometryRelationship] = []
    requested_quantity: Dict[str, Any] = {}
    topic: str
    grade_hint: Optional[int] = None


class MensurationProblem(BaseModel):
    shape_type: GeometryShapeType
    measurements: List[GeometryMeasurement]
    requested_quantity: Dict[str, Any] = {}
    topic: str
    grade_hint: Optional[int] = None


class CoordinateGeometryProblem(BaseModel):
    points: List[Dict[str, Any]] = []
    lines: List[Dict[str, Any]] = []
    requested_quantity: Dict[str, Any] = {}
    topic: str
    grade_hint: Optional[int] = None


class StatisticsProblem(BaseModel):
    data: List[float] = []
    frequency_table: Dict[float, int] = {}
    requested_quantity: Literal["mean", "median", "mode", "range"] = "mean"
    topic: str = "statistics"
    grade_hint: Optional[int] = None


class ProbabilityProblem(BaseModel):
    experiment: str = ""
    outcomes: List[str] = []
    favorable_outcomes: List[str] = []
    requested_quantity: Literal["probability"] = "probability"
    topic: str = "probability"
    grade_hint: Optional[int] = None


class GeometrySolutionStep(BaseModel):
    step_number: int
    operation: str
    equation_ast: Dict[str, Any]
    display_math: str
    explanation: str
    validation: Dict[str, Any]
    hint: str = ""
    is_final_answer: bool = False
    final_answer_text: str = ""
    diagram_focus: List[str] = []
    diagram_type: Literal["triangle", "rectangle", "circle", "parallel_lines", "coordinate_plane", "bar_chart", "data_table", "none"] = "none"