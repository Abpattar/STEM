from typing import Dict, List
from ..solver.schemas import TopicSupport, OperationType
from ..solver.schemas import SupportLevel


PHASE_1_TOPICS = {
    "arithmetic": TopicSupport(
        topic="arithmetic",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SIMPLIFY,
            OperationType.ADD_BOTH_SIDES,
            OperationType.SUBTRACT_BOTH_SIDES,
            OperationType.MULTIPLY_BOTH_SIDES,
            OperationType.DIVIDE_BOTH_SIDES,
            OperationType.CONVERT_DECIMAL,
        ],
        grade_range=[1, 4],
        test_status="passed",
    ),
    "fractions": TopicSupport(
        topic="fractions",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SIMPLIFY,
            OperationType.FIND_COMMON_DENOMINATOR,
            OperationType.CROSS_MULTIPLY,
            OperationType.CONVERT_DECIMAL,
        ],
        grade_range=[3, 7],
        test_status="passed",
    ),
    "decimals": TopicSupport(
        topic="decimals",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SIMPLIFY,
            OperationType.CONVERT_DECIMAL,
            OperationType.CONVERT_PERCENTAGE,
        ],
        grade_range=[4, 7],
        test_status="passed",
    ),
    "percentages": TopicSupport(
        topic="percentages",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.CONVERT_PERCENTAGE,
            OperationType.CONVERT_DECIMAL,
            OperationType.UNIT_CONVERSION,
        ],
        grade_range=[5, 8],
        test_status="passed",
    ),
    "linear_equations": TopicSupport(
        topic="linear_equations",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SUBTRACT_BOTH_SIDES,
            OperationType.ADD_BOTH_SIDES,
            OperationType.DIVIDE_BOTH_SIDES,
            OperationType.MULTIPLY_BOTH_SIDES,
            OperationType.ISOLATE_VARIABLE,
            OperationType.SUBSTITUTE,
        ],
        grade_range=[6, 10],
        test_status="passed",
    ),
    "systems_2var": TopicSupport(
        topic="systems_2var",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SUBSTITUTE,
        ],
        grade_range=[8, 10],
        test_status="passed",
    ),
    "word_problems_price_qty": TopicSupport(
        topic="word_problems_price_qty",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SUBSTITUTE,
            OperationType.CONVERT_DECIMAL,
            OperationType.UNIT_CONVERSION,
        ],
        grade_range=[3, 7],
        test_status="passed",
    ),
}


PHASE_2_TOPICS = {
    "expressions": TopicSupport(
        topic="expressions",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.EXPAND,
            OperationType.FACTORISE,
            OperationType.SIMPLIFY,
            OperationType.COLLECT_LIKE_TERMS,
            OperationType.APPLY_IDENTITY,
        ],
        grade_range=[7, 10],
        test_status="passed",
    ),
    "exponents": TopicSupport(
        topic="exponents",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SIMPLIFY,
            OperationType.EXPAND,
            OperationType.FACTORISE,
            OperationType.APPLY_IDENTITY,
        ],
        grade_range=[7, 10],
        test_status="passed",
    ),
    "algebraic_identities": TopicSupport(
        topic="algebraic_identities",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.APPLY_IDENTITY,
            OperationType.EXPAND,
            OperationType.FACTORISE,
        ],
        grade_range=[7, 10],
        test_status="passed",
    ),
    "polynomials": TopicSupport(
        topic="polynomials",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.ADD_BOTH_SIDES,
            OperationType.SUBTRACT_BOTH_SIDES,
            OperationType.MULTIPLY_BOTH_SIDES,
            OperationType.DIVIDE_BOTH_SIDES,
            OperationType.EXPAND,
            OperationType.FACTORISE,
            OperationType.SIMPLIFY,
        ],
        grade_range=[8, 10],
        test_status="passed",
    ),
    "factorisation": TopicSupport(
        topic="factorisation",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.FACTORISE,
            OperationType.APPLY_IDENTITY,
            OperationType.COLLECT_LIKE_TERMS,
        ],
        grade_range=[8, 10],
        test_status="passed",
    ),
    "systems_2var_full": TopicSupport(
        topic="systems_2var_full",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.SUBSTITUTE,
            OperationType.SUBTRACT_BOTH_SIDES,
            OperationType.ADD_BOTH_SIDES,
            OperationType.MULTIPLY_BOTH_SIDES,
            OperationType.DIVIDE_BOTH_SIDES,
        ],
        grade_range=[8, 10],
        test_status="passed",
    ),
    "quadratic_equations": TopicSupport(
        topic="quadratic_equations",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.FACTORISE,
            OperationType.QUADRATIC_FORMULA,
            OperationType.COMPLETING_SQUARE,
            OperationType.ISOLATE_VARIABLE,
        ],
        grade_range=[8, 10],
        test_status="passed",
    ),
    "radical_equations": TopicSupport(
        topic="radical_equations",
        level=SupportLevel.FULL,
        supported_operations=[
            OperationType.ISOLATE_RADICAL,
            OperationType.SQUARE_BOTH_SIDES,
            OperationType.CHECK_EXTRANEOUS_ROOTS,
            OperationType.ISOLATE_VARIABLE,
        ],
        grade_range=[9, 10],
        test_status="passed",
    ),
    "render_only_integrals": TopicSupport(
        topic="render_only_integrals",
        level=SupportLevel.UNSUPPORTED,
        supported_operations=[],
        grade_range=[10, 10],
        test_status="pending",
        limitations=["Rendering only - integrals, limits, summations not solved"]
    ),
    "render_only_limits": TopicSupport(
        topic="render_only_limits",
        level=SupportLevel.UNSUPPORTED,
        supported_operations=[],
        grade_range=[10, 10],
        test_status="pending",
        limitations=["Rendering only - limits not solved"]
    ),
    "render_only_summations": TopicSupport(
        topic="render_only_summations",
        level=SupportLevel.UNSUPPORTED,
        supported_operations=[],
        grade_range=[10, 10],
        test_status="pending",
        limitations=["Rendering only - summations not solved"]
    ),
}


ALL_TOPICS = {**PHASE_1_TOPICS, **PHASE_2_TOPICS}


def get_topic_support(topic: str) -> TopicSupport:
    """Get topic support info, creating default if not found."""
    if topic in ALL_TOPICS:
        return ALL_TOPICS[topic]
    return TopicSupport(
        topic=topic,
        level=SupportLevel.UNSUPPORTED,
        supported_operations=[],
        grade_range=[1, 10],
        test_status="pending",
        limitations=["Topic not in registry"]
    )


def is_topic_supported(topic: str) -> bool:
    """Check if a topic is fully supported."""
    support = get_topic_support(topic)
    return support.level == SupportLevel.FULL


def get_supported_operations(topic: str) -> list:
    """Get supported operations for a topic."""
    support = get_topic_support(topic)
    return support.supported_operations


def get_all_topics() -> Dict[str, TopicSupport]:
    """Get all registered topics."""
    return ALL_TOPICS.copy()


def validate_operation_for_topic(operation: str, topic: str) -> bool:
    """Check if an operation is supported for a given topic."""
    support = get_topic_support(topic)
    try:
        op_enum = OperationType(operation)
        return op_enum in support.supported_operations
    except ValueError:
        return False