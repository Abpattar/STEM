from abc import ABC, abstractmethod
from typing import Dict, Any
from ..schemas.umr import UnifiedMathematicalRepresentation
from ..schemas.profile import StudentProfile

class BaseAdapter(ABC):
    capability_name: str = "base"
    is_available: bool = True

    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the adapter resources (load models, verify files)."""
        pass

    @abstractmethod
    async def process(
        self,
        umr: UnifiedMathematicalRepresentation,
        profile: StudentProfile
    ) -> UnifiedMathematicalRepresentation:
        """Process or enrich the UMR packet."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Return diagnostic health and status metrics."""
        pass

