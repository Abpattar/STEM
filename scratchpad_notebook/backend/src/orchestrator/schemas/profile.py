from pydantic import BaseModel, Field
from typing import Literal

class StudentPreferences(BaseModel):
    learning_style: Literal["visual", "text", "interactive", "auditory", "balanced"] = "balanced"
    steps_per_screen: int = Field(default=1, ge=0, le=20, description="1 for focused single-step, 0 for full overview")
    explanation_depth: Literal["brief", "standard", "detailed"] = "detailed"
    show_prerequisites_first: bool = True
    
    # Accessibility Preferences
    speech_enabled: bool = True
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    speech_dialect: Literal["clearspeak", "simplespeak"] = "clearspeak"
    
    braille_enabled: bool = True
    braille_standard: Literal["nemeth", "ueb"] = "nemeth"
    
    sign_language_enabled: bool = True
    sign_language_dialect: Literal["ISL"] = "ISL"
    
    interactive_visuals_enabled: bool = True
    sonification_enabled: bool = True
    
    # Cognitive / Focus Accommodations
    reduced_distraction: bool = False
    break_reminders: bool = False
    animation_enabled: bool = True

class StudentProfile(BaseModel):
    student_id: str = "student_default"
    grade: int = Field(default=7, ge=1, le=12)
    preferences: StudentPreferences = Field(default_factory=StudentPreferences)

