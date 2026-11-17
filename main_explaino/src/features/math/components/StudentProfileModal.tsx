import React from 'react';
import type { StudentProfile, StudentPreferences } from '../types/umr';
import './StudentProfileModal.css';

interface StudentProfileModalProps {
  profile: StudentProfile;
  onChange: (newProfile: StudentProfile) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  profile,
  onChange,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const updatePref = <K extends keyof StudentPreferences>(key: K, val: StudentPreferences[K]) => {
    onChange({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: val
      }
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="profile-modal-title">Personalized Learning &amp; Accessibility Preferences</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close preferences">✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">
            Configure your accommodations freely. Preferences are independently combinable and saved to your device.
          </p>

          {/* Learning Style */}
          <div className="pref-section">
            <h4>Learning &amp; Presentation Style</h4>
            <div className="pref-row">
              <label htmlFor="pref-learning-style">Primary Style:</label>
              <select
                id="pref-learning-style"
                value={profile.preferences.learning_style}
                onChange={(e) => updatePref('learning_style', e.target.value as any)}
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
                id="pref-prereqs"
                type="checkbox"
                checked={profile.preferences.show_prerequisites_first}
                onChange={(e) => updatePref('show_prerequisites_first', e.target.checked)}
              />
              <label htmlFor="pref-prereqs">Show prerequisite foundational concepts before solution (Mathua)</label>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="pref-focus-mode"
                type="checkbox"
                checked={profile.preferences.steps_per_screen === 1}
                onChange={(e) => updatePref('steps_per_screen', e.target.checked ? 1 : 0)}
              />
              <label htmlFor="pref-focus-mode">Focused Mode: Reveal one step at a time with guided reflection</label>
            </div>
          </div>

          {/* Visual & Auditory Accommodations */}
          <div className="pref-section">
            <h4>Blind &amp; Low-Vision Accommodations</h4>
            <div className="pref-checkbox-row">
              <input
                id="pref-speech"
                type="checkbox"
                checked={profile.preferences.speech_enabled}
                onChange={(e) => updatePref('speech_enabled', e.target.checked)}
              />
              <label htmlFor="pref-speech">Mathematical Speech Enabled (ClearSpeak narration)</label>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="pref-braille"
                type="checkbox"
                checked={profile.preferences.braille_enabled}
                onChange={(e) => updatePref('braille_enabled', e.target.checked)}
              />
              <label htmlFor="pref-braille">Braille Code Display (Nemeth Code / UEB)</label>
            </div>

            <div className="pref-checkbox-row">
              <input
                id="pref-sonification"
                type="checkbox"
                checked={profile.preferences.sonification_enabled}
                onChange={(e) => updatePref('sonification_enabled', e.target.checked)}
              />
              <label htmlFor="pref-sonification">Graph Audio Sonification (MAIDR tone pitch mapping)</label>
            </div>
          </div>

          {/* Deaf & Hard-of-Hearing Accommodations */}
          <div className="pref-section">
            <h4>Deaf &amp; Hard-of-Hearing Accommodations</h4>
            <div className="pref-checkbox-row">
              <input
                id="pref-sign"
                type="checkbox"
                checked={profile.preferences.sign_language_enabled}
                onChange={(e) => updatePref('sign_language_enabled', e.target.checked)}
              />
              <label htmlFor="pref-sign">Indian Sign Language (ISL) Gestures for supported digits/variables</label>
            </div>
          </div>

          {/* Cognitive / Neurodiversity */}
          <div className="pref-section">
            <h4>Focus &amp; Reduced Distraction</h4>
            <div className="pref-checkbox-row">
              <input
                id="pref-distraction"
                type="checkbox"
                checked={profile.preferences.reduced_distraction}
                onChange={(e) => updatePref('reduced_distraction', e.target.checked)}
              />
              <label htmlFor="pref-distraction">Minimalist View: Hide decorative elements and excess toolbars</label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

