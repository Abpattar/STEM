import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from .adapters.base import BaseAdapter

logger = logging.getLogger("orchestrator.capability_registry")

class CapabilityMetadata(BaseModel):
    name: str
    description: str
    is_available: bool = True
    supported_inputs: list[str] = Field(default_factory=list)
    supported_outputs: list[str] = Field(default_factory=list)
    supported_languages: list[str] = Field(default_factory=lambda: ["en"])
    required_permissions: list[str] = Field(default_factory=list)
    known_limitations: list[str] = Field(default_factory=list)
    health_status: str = "healthy"

class CapabilityRegistry:
    def __init__(self):
        self._adapters: Dict[str, BaseAdapter] = {}
        self._metadata: Dict[str, CapabilityMetadata] = {}

    def register(self, adapter: BaseAdapter, metadata: CapabilityMetadata) -> None:
        self._adapters[metadata.name] = adapter
        self._metadata[metadata.name] = metadata
        logger.info(f"Registered capability '{metadata.name}' (available={metadata.is_available})")

    def get_adapter(self, name: str) -> Optional[BaseAdapter]:
        return self._adapters.get(name)

    def is_available(self, name: str) -> bool:
        meta = self._metadata.get(name)
        if not meta:
            return False
        adapter = self._adapters.get(name)
        return meta.is_available and (adapter.is_available if adapter else False)

    def get_metadata(self, name: str) -> Optional[CapabilityMetadata]:
        return self._metadata.get(name)

    def list_capabilities(self) -> Dict[str, CapabilityMetadata]:
        return dict(self._metadata)

    async def initialize_all(self) -> None:
        for name, adapter in self._adapters.items():
            try:
                await adapter.initialize()
            except Exception as e:
                logger.error(f"Error initializing adapter '{name}': {e}")

    def health_report(self) -> Dict[str, Any]:
        report = {}
        for name, adapter in self._adapters.items():
            meta = self._metadata.get(name)
            status = adapter.health_check()
            report[name] = {
                "available": meta.is_available if meta else False,
                "diagnostics": status
            }
        return report

