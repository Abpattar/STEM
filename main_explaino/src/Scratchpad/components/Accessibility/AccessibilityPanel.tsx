import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { AccessibilityPayload, BrailleStandard, SonificationPoint } from '../../types/umr';
import { ISLSkeletonViewer } from './ISLSkeletonViewer';
import { CurveSonificationPlayer } from '../../utils/sonificationEngine';
import { useAccessibility } from '../../../context/AccessibilityContext';
import { useStudentLearning } from '../../../context/StudentLearningContext';

export interface AccessibilityPanelProps {
  accessibility?: AccessibilityPayload | null;
  brailleStandard: BrailleStandard;
  onChangeBrailleStandard: (std: BrailleStandard) => void;
  speechRate: number;
  onChangeSpeechRate: (rate: number) => void;
  onOpenLiveISL?: () => void;
  onOpenProfile?: () => void;
  isActiveView?: boolean;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  accessibility,
  brailleStandard,
  onChangeBrailleStandard,
  speechRate,
  onChangeSpeechRate,
  onOpenLiveISL,
  onOpenProfile,
  isActiveView = true,
}) => {
  const { settings: niloA11y, toggleMenu: toggleNiloA11yMenu } = useAccessibility();
  const { setCurrentActivity } = useStudentLearning();

  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showStepBraille, setShowStepBraille] = useState(false);

  // Curve Sonification state & cleanup-safe player
  const sonificationPlayerRef = useRef<CurveSonificationPlayer | null>(null);
  const [isPlayingSonification, setIsPlayingSonification] = useState(false);
  const [sonificationSpeed, setSonificationSpeed] = useState<number>(1.0);
  const [sonificationVolume, setSonificationVolume] = useState<number>(0.15);
  const [activeSonificationPoint, setActiveSonificationPoint] = useState<{
    point: SonificationPoint;
    index: number;
    total: number;
  } | null>(null);

  // ISL Drawer state
  const [showISLDrawer, setShowISLDrawer] = useState(false);
  const [selectedISLSign, setSelectedISLSign] = useState<string>('');
  const [islTab, setIslTab] = useState<'problem' | 'steps'>('steps');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeStepLayer, setActiveStepLayer] = useState<
    'layer_1_state' | 'layer_2_action' | 'layer_3_pedagogy'
  >('layer_1_state');

  const stopAllAudio = useCallback(() => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    setIsPlayingSpeech(false);
    if (sonificationPlayerRef.current) {
      sonificationPlayerRef.current.stop();
    }
    setIsPlayingSonification(false);
    setActiveSonificationPoint(null);
  }, []);

  // Stop audio cleanly on unmount or when switching away from the view
  useEffect(() => {
    if (!isActiveView) {
      stopAllAudio();
    }
  }, [isActiveView, stopAllAudio]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const speech = accessibility?.speech ?? null;
  const braille = accessibility?.braille ?? null;
  const sonification = accessibility?.sonification ?? null;
  const signLanguage = accessibility?.sign_language ?? null;

  // Mathematical Speech TTS (distinct from EXO conversational voice tutor)
  const handleToggleMathSpeech = () => {
    setSpeechError(null);
    if (!('speechSynthesis' in window)) {
      setSpeechError('Web Speech synthesis (speechSynthesis) is not supported in this browser.');
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    if (!speech?.expression_speech && !(speech?.steps_speech?.length)) {
      setSpeechError('Solve an equation first to generate mathematical speech output.');
      return;
    }

    window.speechSynthesis.cancel();
    const fullText = [
      speech.expression_speech ? `Problem: ${speech.expression_speech}.` : '',
      ...(speech.steps_speech || []),
    ]
      .filter(Boolean)
      .join(' ');

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = speechRate || niloA11y.speechRate || 1.0;
    utterance.onend = () => setIsPlayingSpeech(false);
    utterance.onerror = () => setIsPlayingSpeech(false);

    setIsPlayingSpeech(true);
    setCurrentActivity('math-speech-started');
    window.speechSynthesis.speak(utterance);
  };

  const currentBraille = braille?.expression_braille || '';

  const handleCopyBraille = async () => {
    if (!currentBraille) return;
    try {
      await navigator.clipboard.writeText(currentBraille);
    } catch {
      // Clipboard may be restricted in headless contexts; still provide UI feedback
    }
    setCopied(true);
    setCurrentActivity('braille-requested');
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleBrailleStandardChange = (nextStd: BrailleStandard) => {
    onChangeBrailleStandard(nextStd);
    setCurrentActivity('braille-requested');
  };

  const handleToggleSonification = () => {
    if (!sonificationPlayerRef.current) {
      sonificationPlayerRef.current = new CurveSonificationPlayer();
    }

    if (isPlayingSonification) {
      sonificationPlayerRef.current.stop();
      setIsPlayingSonification(false);
      setActiveSonificationPoint(null);
      return;
    }

    const points = sonification?.points;
    if (!points || points.length === 0) return;

    setCurrentActivity('sonification-started');
    const started = sonificationPlayerRef.current.play(points, {
      speed: sonificationSpeed,
      volume: sonificationVolume,
      onPointChange: (point, index, total) => {
        setActiveSonificationPoint({ point, index, total });
      },
      onFinish: () => {
        setIsPlayingSonification(false);
        setActiveSonificationPoint(null);
      },
    });
    setIsPlayingSonification(started);
  };

  const handleToggleISLDrawer = () => {
    const next = !showISLDrawer;
    setShowISLDrawer(next);
    if (next) {
      setCurrentActivity('isl-playback-started');
    }
  };

  return (
    <div
      className="accessibility-panel"
      role="region"
      aria-label="Mathematics Accessibility & Multimodal Accommodations"
      data-testid="math-accessibility-panel"
    >
      <div className="a11y-header">
        <div>
          <span className="a11y-badge">♿ Mathematics Accessibility Accommodations</span>
          <p className="a11y-header-sub">
            Math-specific Braille, mathematical speech, curve sonification, and ISL 3D landmark
            playback. Connected harmoniously with NILO&apos;s global accessibility controls.
          </p>
        </div>

        <div className="a11y-nilo-bridge">
          <button
            type="button"
            className="a11y-bridge-btn"
            onClick={toggleNiloA11yMenu}
            data-testid="open-nilo-global-a11y"
            title="Open NILO Global Accessibility Settings (Contrast, Font Size, Dyslexic Font, Reading Ruler)"
          >
            NILO Global A11y
            {(niloA11y.highContrast !== 'off' ||
              niloA11y.dyslexicFont ||
              niloA11y.reduceMotion ||
              niloA11y.fontSize !== 100) && <span className="a11y-bridge-dot" />}
          </button>
          {onOpenProfile && (
            <button
              type="button"
              className="a11y-bridge-btn"
              onClick={onOpenProfile}
              data-testid="a11y-open-profile-btn"
            >
              Math Preferences
            </button>
          )}
        </div>
      </div>

      {/* Empty state if no equation solved yet */}
      {!accessibility ? (
        <div className="a11y-empty-card" data-testid="a11y-empty-state">
          <p>
            Solve a mathematical equation on the <strong>Canvas</strong> or via{' '}
            <strong>Typed Input</strong> to generate Nemeth/UEB Braille, ClearSpeak-style math
            speech, curve sonification (for quadratics), and 3D ISL sign sequences.
          </p>
          {onOpenLiveISL && (
            <button
              type="button"
              className="a11y-btn isl"
              onClick={onOpenLiveISL}
              data-testid="a11y-live-isl-empty-btn"
            >
              🤟 Open Live Webcam ISL Input (Experimental)
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Primary Action Row */}
          <div className="a11y-controls-row">
            {speech && (
              <div className="a11y-control-cluster">
                <button
                  type="button"
                  className={`a11y-btn ${isPlayingSpeech ? 'active' : ''}`}
                  onClick={handleToggleMathSpeech}
                  aria-label={
                    isPlayingSpeech
                      ? 'Stop mathematical speech readout'
                      : 'Play mathematical speech readout'
                  }
                  data-testid="a11y-speech-btn"
                >
                  {isPlayingSpeech ? '⏹ Stop Math Speech' : '🔊 Hear Math Speech'}
                </button>
                <label className="a11y-mini-control">
                  <span>Rate</span>
                  <select
                    value={speechRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeSpeechRate(val);
                      setCurrentActivity('accessibility-changed');
                    }}
                    aria-label="Mathematical speech rate"
                    data-testid="a11y-speech-rate"
                  >
                    <option value="0.8">0.8x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                  </select>
                </label>
              </div>
            )}

            {sonification && sonification.points && sonification.points.length > 0 && (
              <div className="a11y-control-cluster">
                <button
                  type="button"
                  className={`a11y-btn sonification ${isPlayingSonification ? 'active' : ''}`}
                  onClick={handleToggleSonification}
                  aria-label={
                    isPlayingSonification ? 'Stop curve sonification' : 'Play curve sonification'
                  }
                  data-testid="a11y-sonification-btn"
                >
                  {isPlayingSonification ? '⏹ Stop Sonification' : '🎵 Play Curve Sonification'}
                </button>
                <label className="a11y-mini-control">
                  <span>Speed</span>
                  <select
                    value={sonificationSpeed}
                    onChange={(e) => setSonificationSpeed(parseFloat(e.target.value))}
                    aria-label="Sonification playback speed"
                    data-testid="a11y-sonification-speed"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>
                </label>
                <label className="a11y-mini-control">
                  <span>Vol</span>
                  <input
                    type="range"
                    min="0.04"
                    max="0.3"
                    step="0.02"
                    value={sonificationVolume}
                    onChange={(e) => setSonificationVolume(parseFloat(e.target.value))}
                    aria-label="Sonification volume"
                    data-testid="a11y-sonification-volume"
                  />
                </label>
              </div>
            )}

            {signLanguage && (
              <button
                type="button"
                className={`a11y-btn isl ${showISLDrawer ? 'active' : ''}`}
                onClick={handleToggleISLDrawer}
                aria-expanded={showISLDrawer}
                data-testid="a11y-isl-toggle-btn"
              >
                🤟 {showISLDrawer ? 'Hide ISL 3D Gestures' : 'ISL 3D Gestures'}
              </button>
            )}

            {onOpenLiveISL && (
              <button
                type="button"
                className="a11y-btn isl"
                onClick={onOpenLiveISL}
                data-testid="a11y-live-isl-btn"
              >
                📷 Live Webcam Sign Input
              </button>
            )}
          </div>

          {speechError && (
            <div className="isl-warning" role="alert">
              {speechError}
            </div>
          )}

          {/* Live Sonification Readout (ARIA live) */}
          {activeSonificationPoint && (
            <div
              className="sonification-live-bar"
              role="status"
              aria-live="polite"
              data-testid="sonification-live-readout"
            >
              <span>
                Playing point {activeSonificationPoint.index + 1}/{activeSonificationPoint.total}:{' '}
                <strong>
                  x = {activeSonificationPoint.point.x}, y = {activeSonificationPoint.point.y}
                </strong>{' '}
                → <code>{activeSonificationPoint.point.frequency_hz} Hz</code>
              </span>
            </div>
          )}

          {/* Mathematical Speech Text Preview */}
          {speech && speech.expression_speech && (
            <div className="math-speech-card" data-testid="a11y-speech-card">
              <div className="braille-card-header">
                <span className="braille-label">
                  Mathematical Speech Readout ({speech.dialect || 'clearspeak'} heuristic)
                </span>
                <span className="a11y-honesty-tag">Distinct from EXO Voice Tutor</span>
              </div>
              <p className="math-speech-text" data-testid="a11y-speech-text">
                &ldquo;{speech.expression_speech}&rdquo;
              </p>
              <div className="braille-subtext">
                Generated by backend <code>mathcat_adapter.py</code> regex rules (not compiled Rust
                MathCAT WASM; hierarchical MathML tree navigation is not yet available).
              </div>
            </div>
          )}

          {/* Braille Display Output */}
          {braille && (
            <div className="braille-output-card" data-testid="a11y-braille-card">
              <div className="braille-card-header">
                <span className="braille-label">
                  Unicode Braille ({(braille.standard || brailleStandard).toUpperCase()} Converter)
                </span>
                <div className="braille-actions">
                  <div className="braille-std-toggle" role="group" aria-label="Braille standard">
                    <button
                      type="button"
                      className={`braille-std-btn ${brailleStandard === 'nemeth' ? 'active' : ''}`}
                      onClick={() => handleBrailleStandardChange('nemeth')}
                      data-testid="braille-std-nemeth"
                    >
                      Nemeth
                    </button>
                    <button
                      type="button"
                      className={`braille-std-btn ${brailleStandard === 'ueb' ? 'active' : ''}`}
                      onClick={() => handleBrailleStandardChange('ueb')}
                      data-testid="braille-std-ueb"
                    >
                      UEB
                    </button>
                  </div>
                  <button
                    type="button"
                    className="braille-copy-btn"
                    onClick={() => void handleCopyBraille()}
                    aria-label="Copy Unicode Braille characters to clipboard"
                    data-testid="braille-copy-btn"
                  >
                    {copied ? '✓ Copied' : '📋 Copy Braille'}
                  </button>
                </div>
              </div>

              <div
                className="braille-text-display"
                aria-label={`Braille output: ${currentBraille}`}
                data-testid="a11y-braille-text"
              >
                {currentBraille || '—'}
              </div>

              {braille.steps_braille && braille.steps_braille.length > 0 && (
                <div className="braille-steps-wrap">
                  <button
                    type="button"
                    className="braille-steps-toggle"
                    onClick={() => setShowStepBraille((prev) => !prev)}
                  >
                    {showStepBraille
                      ? 'Hide Step-by-Step Braille'
                      : `Show Step-by-Step Braille (${braille.steps_braille.length})`}
                  </button>
                  {showStepBraille && (
                    <ol className="braille-steps-list">
                      {braille.steps_braille.map((sb, i) => (
                        <li key={i}>
                          <span className="braille-step-num">Step {i + 1}:</span>{' '}
                          <span className="braille-step-chars">{sb}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              <div className="braille-subtext">
                Generated via backend rule-based lookup table (<code>mathcat_adapter.py</code>).
                Full standards-certified MathCAT Rust/WASM Braille translation is not compiled in
                this build.
              </div>
            </div>
          )}

          {/* ISL 3D Landmark Skeleton Drawer */}
          {showISLDrawer && signLanguage && (
            <div className="isl-drawer" data-testid="isl-drawer">
              <div className="isl-drawer-header">
                <div>
                  <h5>Indian Sign Language 3D Landmark Sequence Player</h5>
                  <span className="isl-dialect-badge">
                    ISL Preset Skeleton Playback (Not Video / Not Full Translation)
                  </span>
                </div>

                {signLanguage.step_gestures && signLanguage.step_gestures.length > 0 && (
                  <div className="isl-mode-tabs">
                    <button
                      type="button"
                      className={`isl-mode-tab ${islTab === 'steps' ? 'active' : ''}`}
                      onClick={() => setIslTab('steps')}
                    >
                      Solution Steps ({signLanguage.step_gestures.length})
                    </button>
                    <button
                      type="button"
                      className={`isl-mode-tab ${islTab === 'problem' ? 'active' : ''}`}
                      onClick={() => setIslTab('problem')}
                    >
                      Problem Equation
                    </button>
                  </div>
                )}
              </div>

              {islTab === 'steps' &&
              signLanguage.step_gestures &&
              signLanguage.step_gestures.length > 0 ? (
                <div className="isl-step-gestures-view">
                  <div className="isl-step-selector">
                    <span className="selector-label">Select Solution Step:</span>
                    <div className="step-chips">
                      {signLanguage.step_gestures.map((sg, idx) => (
                        <button
                          key={`step-${sg.step_number}`}
                          type="button"
                          className={`step-select-chip ${activeStepIndex === idx ? 'active' : ''}`}
                          onClick={() => {
                            setActiveStepIndex(idx);
                            setSelectedISLSign('');
                          }}
                        >
                          Step {sg.step_number}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const currentStepData =
                      signLanguage.step_gestures[activeStepIndex] || signLanguage.step_gestures[0];
                    const layerData = currentStepData.layers?.[activeStepLayer] || {
                      title: 'Layer 1: Mathematical State',
                      description: currentStepData.explanation,
                      tokens: currentStepData.sign_sequence,
                    };

                    return (
                      <div className="step-layer-container">
                        <div className="step-math-preview">
                          <span className="step-math-label">
                            Step {currentStepData.step_number} Equation:
                          </span>
                          <code>{currentStepData.latex}</code>
                        </div>

                        <div className="isl-layer-tabs">
                          <button
                            type="button"
                            className={`isl-layer-tab ${activeStepLayer === 'layer_1_state' ? 'active' : ''}`}
                            onClick={() => {
                              setActiveStepLayer('layer_1_state');
                              setSelectedISLSign('');
                            }}
                          >
                            1. Equation State
                          </button>
                          <button
                            type="button"
                            className={`isl-layer-tab ${activeStepLayer === 'layer_2_action' ? 'active' : ''}`}
                            onClick={() => {
                              setActiveStepLayer('layer_2_action');
                              setSelectedISLSign('');
                            }}
                          >
                            2. Action Sign
                          </button>
                          <button
                            type="button"
                            className={`isl-layer-tab ${activeStepLayer === 'layer_3_pedagogy' ? 'active' : ''}`}
                            onClick={() => {
                              setActiveStepLayer('layer_3_pedagogy');
                              setSelectedISLSign('');
                            }}
                          >
                            3. Pedagogy Rationale
                          </button>
                        </div>

                        <div className="isl-layer-info-card">
                          <div className="layer-title-row">
                            <strong>{layerData.title}</strong>
                            <span className="layer-desc">{layerData.description}</span>
                          </div>
                          {layerData.spatial_direction && (
                            <div className="isl-spatial-cue">
                              <strong>Spatial Sign Cue:</strong> {layerData.spatial_direction}
                            </div>
                          )}
                          {layerData.rationale_text && (
                            <div className="isl-rationale-note">
                              <strong>Educational Principle:</strong> {layerData.rationale_text}
                            </div>
                          )}
                        </div>

                        <ISLSkeletonViewer
                          signSequence={layerData.tokens || []}
                          activeSign={selectedISLSign}
                          onSelectSign={setSelectedISLSign}
                          onPlaybackStart={() => setCurrentActivity('isl-playback-started')}
                        />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="isl-problem-view">
                  {signLanguage.sign_sequence && signLanguage.sign_sequence.length > 0 && (
                    <ISLSkeletonViewer
                      signSequence={signLanguage.sign_sequence}
                      activeSign={selectedISLSign}
                      onSelectSign={setSelectedISLSign}
                      onPlaybackStart={() => setCurrentActivity('isl-playback-started')}
                    />
                  )}
                </div>
              )}

              {signLanguage.unsupported_tokens.length > 0 ? (
                <div className="isl-warning">
                  Unmapped tokens without 3D presets: {signLanguage.unsupported_tokens.join(' ')}
                </div>
              ) : (
                <div className="isl-success-note">
                  ✓ Tokens in this expression have mapped 3D landmark presets for skeleton playback.
                </div>
              )}

              <p className="isl-disclaimer">{signLanguage.disclaimer}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

