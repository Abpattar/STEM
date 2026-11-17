from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"

    # LLM Provider (OpenAI-compatible)
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: Optional[str] = None

    # Vision LLM (for handwriting recognition)
    vision_llm_provider: str = "gemini"
    gemini_api_key: Optional[str] = None
    vision_llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    vision_llm_model: str = "gemini-3.5-flash-lite"
    vision_llm_api_key: Optional[str] = None

    # Recognition thresholds
    recognition_confidence_threshold: float = 0.75
    max_clarification_attempts: int = 2

    # Solver
    max_solver_retries: int = 2
    sympy_verbose: bool = False


settings = Settings()