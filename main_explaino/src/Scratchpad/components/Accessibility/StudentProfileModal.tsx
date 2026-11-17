import React from 'react';
import type {
  BrailleStandard,
  LearningStyle,
  SpeechDialect,
  StudentPreferences,
  StudentProfile,
} from '../../types/umr';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { useStudentLearning } from '../../../context/StudentLearningContext';

export interface StudentProfileModalProps {
  profile: StudentProfile;
  onChange: (newProfile: StudentProfile) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  profile,
  onChange,
  isOpen,
  onClose,
}) => {
  const { settings: niloA11y, toggleMenu: toggleNiloA11yMenu } = useAccessibility();
  const { state: learningState, setStudentIdentity, setCurrentActivity } = useStudentLearning();

  if (!isOpen) return null;

  const updatePref = <K extends keyof StudentPreferences>(key: K, val: StudentPreferences[K]) => {
    onChange({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: val,
      },
    });
    setCurrentActivity('accessibility-changed');
  };

  const handleGradeChange = (nextGrade: number) => {
    onChange({
      ...profile,
      grade: nextGrade,
    });
    // Sync grade level into StudentLearningContext WITHOUT inventing an authenticated studentId
    setStudentIdentity({ gradeLevel: nextGrade });
    setCurrentActivity('accessibility-changed');
  };

  return (
    <div
      className="math-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      data-testid="student-profile-modal"
    >
      <div className="math-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="math-modal-header">
          <h3 id="profile-modal-title">Mathematics Learning &amp; Accessibility Preferences</h3>
          <button
            type="button"
            className="math-modal-close-btn"
            onClick={onClose}
            aria-label="Close preferences"
            data-testid="profile-modal-close"
          >
            ✕
          </button>
        </div>

        <div className="math-modal-body">
          <div className="profile-identity-banner" data-testid="profile-identity-status">
            <div>
              <strong>Session Identity:</strong>{' '}
              {learningState.studentId
                ? `${learningState.studentDisplayName || 'Student'} (${learningState.studentId})`
                : 'Guest / Local Session (unauthenticated — preferences saved locally to this browser only)'}
            </div>
          </div>

          {/* Learning Style & Grade */}
          <div className="pref-section">
            <h4>Learning &amp; Presentation Style</h4>
            <div className="pref-row">
              <label htmlFor="nilo-pref-grade">Mathematics Grade Level:</label>
              <select
                id="nilo-pref-grade"
                value={profile.grade}
                onChange={(e) => handleGradeChange(Number(e.target.value))}
                data-testid="pref-grade-select"
              >
                {[4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="pref-row">
              <label htmlFor="nilo-pref-learning-style">Primary Style:</label>
              <select
                id="nilo-pref-learning-style"
                value={profile.preferences.learning_style}
                onChange={(e) => updatePref('learning_style', e.target.value as LearningStyle)}
                data-testid="pref-learning-style"
              >
                <option value="balanced">Balanced (Math + Visuals)</option>
                <option value="visual">Visual (Graphs &amp; Balance Scale)</option>
                <option value="interactive">Interactive Exploration</option>
                <option value="auditory">Auditory &amp; Speech</option>
                <option value="text">Step-by-Step Text Only</option>
              </select>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-prereqs"
                type="checkbox"
                checked={profile.preferences.show_prerequisites_first}
                onChange={(e) => updatePref('show_prerequisites_first', e.target.checked)}
                data-testid="pref-prereqs-first"
              />
              <label htmlFor="nilo-pref-prereqs">
                Open prerequisite foundational concepts first when a problem is solved (Mathua DAG)
              </label>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-focus-mode"
                type="checkbox"
                checked={profile.preferences.steps_per_screen === 1}
                onChange={(e) => updatePref('steps_per_screen', e.target.checked ? 1 : 0)}
              />
              <label htmlFor="nilo-pref-focus-mode">
                Focused Step Mode: Reveal one solution step at a time
              </label>
            </div>
          </div>

          {/* Blind & Low-Vision Math Accommodations */}
          <div className="pref-section">
            <h4>Blind &amp; Low-Vision Mathematics Accommodations</h4>
            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-speech"
                type="checkbox"
                checked={profile.preferences.speech_enabled}
                onChange={(e) => updatePref('speech_enabled', e.target.checked)}
              />
              <label htmlFor="nilo-pref-speech">
                Mathematical Speech Enabled (ClearSpeak-style heuristic readout)
              </label>
            </div>

            <div className="pref-row">
              <label htmlFor="nilo-pref-speech-dialect">Speech Dialect Preference:</label>
              <select
                id="nilo-pref-speech-dialect"
                value={profile.preferences.speech_dialect}
                onChange={(e) => updatePref('speech_dialect', e.target.value as SpeechDialect)}
              >
                <option value="clearspeak">ClearSpeak-style</option>
                <option value="simplespeak">SimpleSpeak (mapped to heuristic)</option>
              </select>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-braille"
                type="checkbox"
                checked={profile.preferences.braille_enabled}
                onChange={(e) => updatePref('braille_enabled', e.target.checked)}
                data-testid="pref-braille-enabled"
              />
              <label htmlFor="nilo-pref-braille">Unicode Braille Mathematics Display</label>
            </div>

            <div className="pref-row">
              <label htmlFor="nilo-pref-braille-std">Braille Standard:</label>
              <select
                id="nilo-pref-braille-std"
                value={profile.preferences.braille_standard}
                onChange={(e) => updatePref('braille_standard', e.target.value as BrailleStandard)}
                data-testid="pref-braille-standard"
              >
                <option value="nemeth">Nemeth Code</option>
                <option value="ueb">UEB (Unified English Braille)</option>
              </select>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-sonification"
                type="checkbox"
                checked={profile.preferences.sonification_enabled}
                onChange={(e) => updatePref('sonification_enabled', e.target.checked)}
              />
              <label htmlFor="nilo-pref-sonification">
                Curve Audio Sonification (Web Audio pitch mapping)
              </label>
            </div>
          </div>

          {/* Deaf & Hard-of-Hearing Accommodations */}
          <div className="pref-section">
            <h4>Deaf &amp; Hard-of-Hearing Accommodations</h4>
            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-sign"
                type="checkbox"
                checked={profile.preferences.sign_language_enabled}
                onChange={(e) => updatePref('sign_language_enabled', e.target.checked)}
              />
              <label htmlFor="nilo-pref-sign">
                Indian Sign Language (ISL) 3D Landmark Sequence Gestures
              </label>
            </div>
          </div>

          {/* Cognitive / Focus & NILO Global Accessibility Bridge */}
          <div className="pref-section">
            <h4>Focus &amp; NILO Global Accessibility</h4>
            <div className="pref-checkbox-row">
              <input
                id="nilo-pref-distraction"
                type="checkbox"
                checked={profile.preferences.reduced_distraction}
                onChange={(e) => updatePref('reduced_distraction', e.target.checked)}
                data-testid="pref-reduced-distraction"
              />
              <label htmlFor="nilo-pref-distraction">
                Reduced Distraction View: Simplify decorative chrome inside the math workspace
              </label>
            </div>

            <div className="nilo-global-a11y-summary">
              <span>
                <strong>NILO Global Settings Active:</strong> Font {niloA11y.fontSize}%, Contrast{' '}
                {niloA11y.highContrast}, Speech Rate {niloA11y.speechRate}x, Sound Cues{' '}
                {niloA11y.soundCues ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                className="a11y-bridge-btn"
                onClick={() => {
                  onClose();
                  toggleNiloA11yMenu();
                }}
              >
                Open NILO Global A11y Menu
              </button>
            </div>
          </div>
        </div>

        <div className="math-modal-footer">
          <button
            type="button"
            className="control-btn primary"
            onClick={onClose}
            data-testid="profile-modal-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

