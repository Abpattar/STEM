import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MathCanvas } from './components/Canvas/MathCanvas';
import { TypedInput } from './components/Input/TypedInput';
import { MathDisplay } from './components/Solution/MathDisplay';
import { StepVerifierPanel } from './components/Solution/StepVerifierPanel';
import { VisualizerLab } from './components/Visualizers/VisualizerLab';
import { getVisualizerMeta, type VisualMode } from './components/Visualizers/visualizerConcepts';
import { ConceptLearningDrawer } from './components/Prerequisites/ConceptLearningDrawer';
import { PracticeMode } from './components/Practice/PracticeMode';
import { ModeToggle } from './components/Textbook/ModeToggle';
import { TextbookView } from './components/Textbook/TextbookView';
import { AccessibilityPanel } from './components/Accessibility/AccessibilityPanel';
import { StudentProfileModal } from './components/Accessibility/StudentProfileModal';
import { LiveISLRecognitionModal } from './components/Accessibility/LiveISLRecognitionModal';
import {
  checkMathBackendHealth,
  MathApiError,
  normalizeMathVoice,
  orchestrateMathProblem,
  recognizeHandwriting,
} from './services/mathService';
import { recognizeHandwritingInkOn } from './services/inkOnInference';
import { SAMPLE_EQUATIONS } from './utils/katexRender';
import { soundEffects } from './utils/soundEffects';
import { useStudentLearning } from '../context/StudentLearningContext';
import { useAccessibility } from '../context/AccessibilityContext';
import type { Stroke, SolutionStep, DisplayMode } from './types/canvas';
import type {
  BrailleStandard,
  UnifiedMathematicalRepresentation,
  StudentProfile,
} from './types/umr';
import './styles/mathWorkspace.css';
import './styles/learningAndA11y.css';

type ScreenTab =
  | 'canvas'
  | 'solution'
  | 'prerequisites'
  | 'practice'
  | 'verify'
  | 'visualizer'
  | 'accessibility';

interface NoticeState {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const PREFS_STORAGE_KEY = 'nilo_math_preferences_v1';

const DEFAULT_PROFILE: StudentProfile = {
  student_id: 'anonymous_session',
  grade: 9,
  preferences: {
    learning_style: 'balanced',
    steps_per_screen: 1,
    explanation_depth: 'detailed',
    show_prerequisites_first: false,
    speech_enabled: true,
    speech_rate: 1.0,
    speech_dialect: 'clearspeak',
    braille_enabled: true,
    braille_standard: 'nemeth',
    sign_language_enabled: true,
    sign_language_dialect: 'ISL',
    interactive_visuals_enabled: true,
    sonification_enabled: true,
    reduced_distraction: false,
    break_reminders: false,
    animation_enabled: true,
  },
};

function loadSavedProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    return {
      student_id: 'anonymous_session',
      grade: typeof parsed.grade === 'number' ? parsed.grade : DEFAULT_PROFILE.grade,
      preferences: {
        ...DEFAULT_PROFILE.preferences,
        ...(parsed.preferences || {}),
      },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function cleanExpressionText(raw: string): string {
  let text = raw.trim();
  let prev = '';
  while (text !== prev) {
    prev = text;
    text = text
      .replace(
        /^(solve(\s+for\s+\w+)?|simplify|calculate(\s+value\s+of)?|evaluate|find(\s+the\s+value\s+of)?|value\s+of)\s*/i,
        ''
      )
      .trim();
    text = text.replace(/\s+for\s+[a-zA-Z]+$/i, '').trim();
    text = text.replace(/\s+with\s+respect\s+to\s+[a-zA-Z]+$/i, '').trim();
  }
  return text;
}

export interface MathNotebookWorkspaceProps {
  onBackendStatusChange?: (status: 'checking' | 'online' | 'offline') => void;
}

export const MathNotebookWorkspace: React.FC<MathNotebookWorkspaceProps> = ({
  onBackendStatusChange,
}) => {
  const { state: learningState, navigateToModule, setActiveConcept, setCurrentActivity } =
    useStudentLearning();
  const { settings: niloA11y } = useAccessibility();

  const [strokeHistory, setStrokeHistory] = useState<{
    strokes: Stroke[];
    redoStack: Stroke[][];
  }>({ strokes: [], redoStack: [] });
  const strokes = strokeHistory.strokes;
  const redoStack = strokeHistory.redoStack;

  const [typedInput, setTypedInput] = useState('');
  const [lastActiveSource, setLastActiveSource] = useState<'canvas' | 'typed'>('canvas');
  const [mode, setMode] = useState<DisplayMode>('notebook');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'select'>('pen');
  const [penColor] = useState('#111827');
  const [penWidth] = useState(2.5);
  const [eraserWidth] = useState(20);
  const [activeTab, setActiveTab] = useState<ScreenTab>('canvas');
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [clarification, setClarification] = useState<{
    question: string;
    options: Array<{ label: string; value: string }>;
  } | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(loadSavedProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [showPhraseNormalizer, setShowPhraseNormalizer] = useState(false);
  const [spokenPhraseDraft, setSpokenPhraseDraft] = useState('');
  const [isNormalizingVoice, setIsNormalizingVoice] = useState(false);
  const [umr, setUmr] = useState<UnifiedMathematicalRepresentation | null>(null);
  const [visualMode, setVisualMode] = useState<VisualMode>('parabola');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const exportCanvasRef = useRef<() => string>(() => '');
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const recognizeAbortRef = useRef<AbortController | null>(null);
  const isRecognizingRef = useRef(false);
  const speechRecRef = useRef<SpeechRecognitionInstance | null>(null);

  const canUndo = strokes.length > 0;
  const canRedo = redoStack.length > 0;

  // Persist math preferences locally (without inventing an authenticated studentId)
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          grade: profile.grade,
          preferences: profile.preferences,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  // Harmonize sound effects & animation flags with NILO's global AccessibilityContext
  useEffect(() => {
    soundEffects.setMuted(!niloA11y.soundCues);
  }, [niloA11y.soundCues]);

  // Register module presence in shared StudentLearningContext
  useEffect(() => {
    navigateToModule('math', {
      activity: 'math-scratchpad',
      subject: 'Mathematics',
      returnDestination: {
        module: 'nilo',
        view: 'home-radial',
        label: 'Back to Wheel',
      },
    });
  }, [navigateToModule]);

  // Verify FastAPI backend availability through /api/math/health
  const verifyBackend = useCallback(async () => {
    setBackendStatus('checking');
    onBackendStatusChange?.('checking');
    try {
      await checkMathBackendHealth();
      setBackendStatus('online');
      onBackendStatusChange?.('online');
    } catch {
      setBackendStatus('offline');
      onBackendStatusChange?.('offline');
    }
  }, [onBackendStatusChange]);

  useEffect(() => {
    void verifyBackend();
  }, [verifyBackend]);

  // Cleanup active speech recognizer / abortable requests on unmount
  useEffect(() => {
    return () => {
      recognizeAbortRef.current?.abort();
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
    };
  }, []);

  const handleExportReady = useCallback((fn: () => string) => {
    exportCanvasRef.current = fn;
  }, []);

  const handleCanvasElement = useCallback((el: HTMLCanvasElement | null) => {
    canvasElementRef.current = el;
  }, []);

  const handleStrokesChange = useCallback((newStrokes: Stroke[]) => {
    setStrokeHistory({ strokes: newStrokes, redoStack: [] });
    setLastActiveSource('canvas');
    setNotice(null);
  }, []);

  // Debounced auto-recognize only while canvas is the active input source
  useEffect(() => {
    if (strokes.length === 0 || lastActiveSource !== 'canvas') {
      recognizeAbortRef.current?.abort();
      return;
    }
    recognizeAbortRef.current?.abort();

    const timer = setTimeout(async () => {
      const imageB64 = exportCanvasRef.current ? exportCanvasRef.current() : '';
      if (!imageB64 || isRecognizingRef.current) return;

      const controller = new AbortController();
      recognizeAbortRef.current = controller;
      isRecognizingRef.current = true;
      setIsRecognizing(true);

      try {
        const recData = await recognizeHandwriting(
          { image_b64: imageB64, strokes },
          controller.signal
        );
        if (!controller.signal.aborted && recData.recognized_text) {
          setTypedInput(recData.recognized_text);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      } finally {
        isRecognizingRef.current = false;
        setIsRecognizing(false);
      }
    }, 2200);

    return () => {
      clearTimeout(timer);
      recognizeAbortRef.current?.abort();
    };
  }, [strokes, lastActiveSource]);

  const handleRecognizeNow = useCallback(async () => {
    if (strokes.length === 0) {
      setNotice({ message: 'Draw a mathematical expression on the canvas first.', type: 'warning' });
      return;
    }

    setNotice(null);
    setIsRecognizing(true);
    try {
      const imageB64 = exportCanvasRef.current ? exportCanvasRef.current() : '';
      if (imageB64) {
        const recData = await recognizeHandwriting({ image_b64: imageB64, strokes });
        if (recData.recognized_text) {
          setTypedInput(recData.recognized_text);
          setBackendStatus('online');
          onBackendStatusChange?.('online');
          setNotice({
            message: `Recognized handwriting: ${recData.recognized_text}`,
            type: 'success',
          });
          soundEffects.playClick(620, 0.06);
          return;
        }
        if (recData.needs_clarification && recData.clarification) {
          setNotice({ message: recData.clarification.question, type: 'warning' });
          return;
        }
      }

      if (canvasElementRef.current) {
        const localRes = await recognizeHandwritingInkOn(canvasElementRef.current);
        if (localRes.latex) {
          setTypedInput(localRes.latex);
          setNotice({
            message: `Recognized (${localRes.provider}): ${localRes.latex}`,
            type: 'success',
          });
          return;
        }
      }

      setNotice({
        message:
          'Could not recognize the handwritten strokes. Try writing more clearly or type the equation below.',
        type: 'warning',
      });
    } catch (err) {
      if (err instanceof MathApiError) {
        if (err.isBackendUnavailable) {
          setBackendStatus('offline');
          onBackendStatusChange?.('offline');
        }
        setNotice({ message: err.message, type: 'error' });
      } else {
        setNotice({ message: 'Handwriting recognition failed.', type: 'error' });
      }
    } finally {
      setIsRecognizing(false);
    }
  }, [strokes, onBackendStatusChange]);

  const handleUndo = useCallback(() => {
    setStrokeHistory((prev) => {
      if (prev.strokes.length === 0) return prev;
      const last = prev.strokes[prev.strokes.length - 1];
      return {
        strokes: prev.strokes.slice(0, -1),
        redoStack: [...prev.redoStack, [last]],
      };
    });
    soundEffects.playClick(400, 0.03);
  }, []);

  const handleRedo = useCallback(() => {
    setStrokeHistory((prev) => {
      if (prev.redoStack.length === 0) return prev;
      const last = prev.redoStack[prev.redoStack.length - 1];
      return {
        strokes: [...prev.strokes, ...last],
        redoStack: prev.redoStack.slice(0, -1),
      };
    });
    soundEffects.playClick(500, 0.03);
  }, []);

  const handleClear = useCallback(() => {
    setStrokeHistory({ strokes: [], redoStack: [] });
    setSolutionSteps([]);
    setTypedInput('');
    setNotice(null);
    setClarification(null);
    setUmr(null);
    setActiveTab('canvas');
    soundEffects.playClick(300, 0.05);
  }, []);

  // Normalize spoken math transcript via /api/math/voice/normalize
  const applyVoiceTranscript = useCallback(
    async (transcript: string) => {
      const cleanedTranscript = transcript.trim();
      if (!cleanedTranscript) return;

      setIsNormalizingVoice(true);
      setNotice(null);
      try {
        const normData = await normalizeMathVoice(cleanedTranscript);
        const cleanMath = normData.latex || normData.normalized || cleanedTranscript;
        setTypedInput(cleanMath);
        setLastActiveSource('typed');
        setBackendStatus('online');
        onBackendStatusChange?.('online');
        setNotice({
          message: `Voice Normalized: "${cleanedTranscript}" → ${cleanMath}`,
          type: 'success',
        });
        soundEffects.playSuccessChime();
      } catch (err) {
        if (err instanceof MathApiError) {
          if (err.isBackendUnavailable) {
            setBackendStatus('offline');
            onBackendStatusChange?.('offline');
          }
          setNotice({ message: err.message, type: 'error' });
        } else {
          setTypedInput(cleanedTranscript);
          setLastActiveSource('typed');
        }
      } finally {
        setIsNormalizingVoice(false);
      }
    },
    [onBackendStatusChange]
  );

  // Mathematical Voice Input (Web Speech API -> /api/math/voice/normalize; NOT EXO general tutor)
  const handleVoiceInput = useCallback(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setShowPhraseNormalizer(true);
      setNotice({
        message:
          'Browser microphone speech recognition is unavailable here. Use the Spoken Math Normalizer field below to convert spoken math phrases.',
        type: 'info',
      });
      return;
    }

    if (isListeningVoice) {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognizer = new SpeechRec();
      speechRecRef.current = recognizer;
      recognizer.lang = 'en-US';
      recognizer.continuous = false;
      recognizer.interimResults = false;

      soundEffects.playClick(600, 0.08);
      setIsListeningVoice(true);

      recognizer.onresult = (event) => {
        setIsListeningVoice(false);
        const transcript = event.results[0]?.[0]?.transcript || '';
        soundEffects.playClick(700, 0.08);
        if (transcript) {
          void applyVoiceTranscript(transcript);
        }
      };

      recognizer.onerror = () => {
        setIsListeningVoice(false);
      };

      recognizer.onend = () => {
        setIsListeningVoice(false);
      };

      recognizer.start();
    } catch {
      setIsListeningVoice(false);
    }
  }, [isListeningVoice, applyVoiceTranscript]);

  // Sign language insertion handlers from LiveISLRecognitionModal
  const handleSignRecognized = useCallback((sign: string) => {
    setTypedInput((prev) => (prev ? `${prev} ${sign}` : sign).trim());
    setLastActiveSource('typed');
    soundEffects.playClick(500, 0.06);
  }, []);

  const handleSignDeleteLast = useCallback(() => {
    setTypedInput((prev) => {
      if (!prev) return '';
      const trimmed = prev.trimEnd();
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        parts.pop();
        return parts.join(' ');
      }
      return '';
    });
    soundEffects.playClick(440, 0.06);
  }, []);

  const handleSignClear = useCallback(() => {
    setTypedInput('');
    soundEffects.playClick(320, 0.08);
  }, []);

  const handleSolve = useCallback(
    async (
      overrideText?: string | React.MouseEvent,
      options?: {
        targetTab?: ScreenTab;
        keepMode?: boolean;
        profileOverride?: StudentProfile;
        fromClarification?: boolean;
      }
    ) => {
      recognizeAbortRef.current?.abort();

      const rawInput = typeof overrideText === 'string' ? overrideText : typedInput;
      const text = options?.fromClarification ? rawInput.trim() : cleanExpressionText(rawInput);

      setNotice(null);
      setClarification(null);
      setIsLoading(true);
      soundEffects.playClick(520, 0.08);

      try {
        const shouldSolveCanvas =
          !options?.fromClarification && lastActiveSource === 'canvas' && strokes.length > 0 && !text;
        let textToSolve = text;
        let imageB64 = '';

        if (!options?.fromClarification && (shouldSolveCanvas || strokes.length > 0)) {
          if (exportCanvasRef.current) {
            imageB64 = exportCanvasRef.current();
          }

          if (!textToSolve && imageB64) {
            try {
              const recData = await recognizeHandwriting({ image_b64: imageB64, strokes });
              if (recData.recognized_text) {
                textToSolve = cleanExpressionText(recData.recognized_text);
                setTypedInput(recData.recognized_text);
              }
              if (
                recData.needs_clarification &&
                recData.clarification &&
                recData.clarification.options?.length > 0
              ) {
                setClarification({
                  question: recData.clarification.question,
                  options: recData.clarification.options
                    .map((o) =>
                      typeof o === 'string'
                        ? { label: o, value: o }
                        : {
                            label: o.label || o.value || o.latex || '',
                            value: o.value || o.latex || o.label || '',
                          }
                    )
                    .filter((o) => o.value.trim().length > 0),
                });
                setActiveTab('canvas');
                setIsLoading(false);
                return;
              }
            } catch (recErr) {
              if (recErr instanceof MathApiError && recErr.isBackendUnavailable) {
                throw recErr;
              }
            }
          }
        }

        if (!textToSolve && strokes.length === 0) {
          setNotice({
            message: 'Please draw or type a mathematical equation first.',
            type: 'warning',
          });
          setIsLoading(false);
          return;
        }

        const activeProfile = options?.profileOverride || profile;
        const profileForRequest: StudentProfile = {
          ...activeProfile,
          student_id: learningState.studentId || 'anonymous_session',
          grade:
            typeof learningState.gradeLevel === 'number'
              ? learningState.gradeLevel
              : activeProfile.grade,
          preferences: {
            ...activeProfile.preferences,
            animation_enabled: !niloA11y.reduceMotion && activeProfile.preferences.animation_enabled,
          },
        };

        const orchData = await orchestrateMathProblem({
          raw_content: textToSolve || 'handwritten_canvas',
          input_type: shouldSolveCanvas ? 'handwriting' : 'typed',
          strokes: shouldSolveCanvas ? strokes : undefined,
          image_b64: shouldSolveCanvas ? imageB64 : undefined,
          recognized_latex: textToSolve || undefined,
          profile: profileForRequest,
        });

        setBackendStatus('online');
        onBackendStatusChange?.('online');
        setUmr(orchData);

        if (orchData.understanding?.topic) {
          const conceptId = orchData.learning?.primary_concept_id || null;
          const conceptTitle = orchData.understanding.topic
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          setActiveConcept({
            conceptId,
            conceptTitle,
            subject: 'Mathematics',
          });
          setCurrentActivity('solving-equation');
        }

        if (
          !options?.fromClarification &&
          orchData.understanding?.is_ambiguous &&
          orchData.understanding.clarification_question
        ) {
          const opts = (orchData.understanding.clarification_options || [])
            .map((o) => ({ label: o, value: o }))
            .filter((o) => o.value.trim().length > 0);
          setClarification({
            question: orchData.understanding.clarification_question,
            options: opts,
          });
          setActiveTab('canvas');
          return;
        }

        if (orchData.solution?.steps && orchData.solution.steps.length > 0) {
          const transformedSteps: SolutionStep[] = orchData.solution.steps.map((s, idx, arr) => ({
            step_number: s.step_number,
            operation: s.operation || '',
            equation_ast: {},
            display_math: s.latex,
            explanation: s.explanation,
            validation: {
              is_valid: s.verified !== false,
              method: 'SymPy algebraic equivalence',
              details:
                s.verified !== false
                  ? 'Verified correct algebraic progression'
                  : 'Step requires manual verification',
            },
            hint: s.hint || s.why || '',
            is_final_answer: s.is_final_answer || idx === arr.length - 1,
            final_answer_text:
              idx === arr.length - 1 ? orchData.solution.final_answer_text || s.latex : '',
            step_gestures: s.step_gestures,
          }));

          setSolutionSteps(transformedSteps);
          setCurrentStep(
            activeProfile.preferences.steps_per_screen === 0 ? transformedSteps.length : 1
          );
          soundEffects.playSuccessChime();

          const vizType = orchData.visualisation?.type;
          const topicName = orchData.understanding?.topic || '';
          if (vizType === 'quadratic_parabola') {
            setVisualMode('parabola');
          } else if (vizType === 'equation_balance') {
            setVisualMode('balance');
          } else if (vizType === 'circle_exhaustion') {
            setVisualMode('circle');
          } else if (vizType === 'pythagoras') {
            setVisualMode('pythagoras');
          } else if (
            topicName === 'geometry' ||
            vizType === 'geometry_diagram' ||
            vizType === 'svg_diagram'
          ) {
            setVisualMode('geometry');
          } else if (topicName === 'factorisation' || topicName === 'expressions') {
            setVisualMode('tiles');
          } else if (topicName === 'arithmetic') {
            setVisualMode('numberline');
          }

          if (!options?.keepMode) {
            if (options?.targetTab) {
              setActiveTab(options.targetTab);
            } else if (
              activeProfile.preferences.show_prerequisites_first &&
              orchData.learning?.prerequisites?.length > 0
            ) {
              setActiveTab('prerequisites');
              setNotice({
                message: `Identified topic: ${topicName.replace(/_/g, ' ')}. Review foundational prerequisites before checking the solution.`,
                type: 'info',
              });
            } else {
              setActiveTab('solution');
            }
          }
        } else {
          setNotice({
            message:
              orchData.solution?.error_message ||
              'Unable to derive a step-by-step solution for this input. Please check the expression syntax.',
            type: 'warning',
          });
        }
      } catch (err) {
        if (err instanceof MathApiError) {
          if (err.isBackendUnavailable) {
            setBackendStatus('offline');
            onBackendStatusChange?.('offline');
          }
          setNotice({ message: err.message, type: 'error' });
        } else if (err instanceof Error) {
          setNotice({ message: err.message, type: 'error' });
        } else {
          setNotice({ message: 'An error occurred while solving the problem.', type: 'error' });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      typedInput,
      strokes,
      lastActiveSource,
      profile,
      learningState.studentId,
      learningState.gradeLevel,
      niloA11y.reduceMotion,
      onBackendStatusChange,
      setActiveConcept,
      setCurrentActivity,
    ]
  );

  // Switch Braille standard (Nemeth <-> UEB) and refresh active UMR Braille from backend
  const handleChangeBrailleStandard = useCallback(
    (nextStd: BrailleStandard) => {
      const nextProfile: StudentProfile = {
        ...profile,
        preferences: {
          ...profile.preferences,
          braille_enabled: true,
          braille_standard: nextStd,
        },
      };
      setProfile(nextProfile);

      const currentExpr =
        typedInput.trim() || umr?.input?.raw_content || umr?.input?.recognized_latex || '';
      if (umr && currentExpr) {
        void orchestrateMathProblem({
          raw_content: currentExpr,
          input_type: 'typed',
          recognized_latex: currentExpr,
          profile: {
            ...nextProfile,
            student_id: learningState.studentId || 'anonymous_session',
          },
        })
          .then((updated) => {
            if (updated.accessibility?.braille) {
              setUmr(updated);
            }
          })
          .catch(() => {
            // Keep existing UMR if refresh fails
          });
      }
    },
    [profile, umr, typedInput, learningState.studentId]
  );

  const handleChangeSpeechRate = useCallback((rate: number) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        speech_rate: rate,
      },
    }));
  }, []);

  const handleClarificationSelect = useCallback(
    (option: { label: string; value: string }) => {
      let clean = (option.value || option.label).trim();
      if (/^(solve|simplify|evaluate)\s*:/i.test(clean)) {
        clean = clean.replace(/^(solve|simplify|evaluate)\s*:/i, '').trim();
      }
      clean = clean.replace(/^[+\-*/=\s]+/, '').replace(/[+\-*/\s]+$/, '').trim();

      setClarification(null);
      setNotice(null);
      setTypedInput(clean);
      setLastActiveSource('typed');
      void handleSolve(clean, { fromClarification: true });
    },
    [handleSolve]
  );

  const handleHint = useCallback(() => {
    setCurrentActivity('hint-requested');
    soundEffects.playClick(440, 0.05);
  }, [setCurrentActivity]);

  const handleShowAll = useCallback(() => {
    setCurrentStep(solutionSteps.length);
    soundEffects.playClick(500, 0.05);
  }, [solutionSteps.length]);

  const handleRestartSteps = useCallback(() => {
    setCurrentStep(1);
    soundEffects.playClick(420, 0.05);
  }, []);

  const handleBackToCanvas = useCallback(() => {
    setActiveTab('canvas');
  }, []);

  const handlePhraseNormalizeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!spokenPhraseDraft.trim()) return;
      await applyVoiceTranscript(spokenPhraseDraft);
    },
    [spokenPhraseDraft, applyVoiceTranscript]
  );

  const handleLoadPracticePreset = useCallback(
    async (expression: string) => {
      setTypedInput(expression);
      setLastActiveSource('typed');
      await handleSolve(expression, { targetTab: 'practice' });
    },
    [handleSolve]
  );

  const handleTextbookSolve = useCallback(
    (expr: string) => {
      setTypedInput(expr);
      setLastActiveSource('typed');
      void handleSolve(expr, { keepMode: true });
    },
    [handleSolve]
  );

  return (
    <div
      className={`nilo-math-workspace ${profile.preferences.reduced_distraction ? 'reduced-distraction' : ''}`}
      data-testid="native-math-workspace"
      data-workspace-mode={mode}
      data-context-concept-id={learningState.activeConceptId ?? ''}
      data-context-activity={learningState.currentActivity ?? ''}
      data-context-student-id={learningState.studentId ?? ''}
    >
      <div className="math-workspace-inner">
        {backendStatus === 'offline' && (
          <div className="backend-status-banner" role="alert" data-testid="math-backend-offline">
            <span>
              Mathematics solver backend is unavailable at <code>/api/math/*</code>. Ensure the
              FastAPI service is running on port 8000.
            </span>
            <button
              type="button"
              className="backend-status-retry"
              onClick={() => void verifyBackend()}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Workspace Mode & Utility Toolbar (Notebook/Textbook Toggle + Preferences + Live ISL) */}
        <div className="workspace-mode-bar" role="toolbar" aria-label="Mathematics workspace mode and preferences">
          <div className="workspace-mode-left">
            <span className="workspace-mode-title">
              {mode === 'textbook' ? 'Mathematics Academic Textbook' : 'Mathematics Interactive Notebook'}
            </span>
            <span className="workspace-mode-sub">
              {mode === 'textbook'
                ? 'Chapter theory, axiomatic proofs, worked derivations & self-checks'
                : 'Handwriting canvas, SymPy solver, visualizers, prerequisites, practice & accessibility'}
            </span>
          </div>

          <div className="workspace-mode-right">
            <button
              type="button"
              className="workspace-utility-btn isl-cam"
              onClick={() => setIsSignModalOpen(true)}
              data-testid="open-live-isl-btn"
              title="Open experimental webcam ISL hand-gesture input"
            >
              🤟 Sign Input
            </button>

            <button
              type="button"
              className="workspace-utility-btn"
              onClick={() => setIsProfileModalOpen(true)}
              data-testid="open-profile-modal-btn"
              aria-label="Open Student Learning Profile and Accessibility Preferences"
            >
              ⚙️ Preferences
            </button>

            <ModeToggle mode={mode} onChange={setMode} disabled={isLoading} />
          </div>
        </div>

        {/* Textbook View (Rendered when mode === 'textbook'; Notebook stays mounted below to preserve 100% of state!) */}
        {mode === 'textbook' && (
          <TextbookView
            umr={umr}
            steps={solutionSteps}
            onSolveProblem={handleTextbookSolve}
            onSwitchToNotebook={() => setMode('notebook')}
            isLoading={isLoading}
          />
        )}

        {/* Notebook Unified Card (Mounted continuously with display:none in Textbook mode so canvas strokes, visualizers & practice state are NEVER lost) */}
        <section
          className="single-screen-card"
          aria-label="Unified Mathematics Workspace"
          style={{ display: mode === 'notebook' ? 'flex' : 'none' }}
        >
          <div className="screen-header-bar">
            <div className="screen-tabs" role="tablist">
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'canvas' ? 'active' : ''}`}
                onClick={() => setActiveTab('canvas')}
                role="tab"
                aria-selected={activeTab === 'canvas'}
                data-testid="math-tab-canvas"
              >
                Canvas Drawing
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'solution' ? 'active' : ''}`}
                onClick={() => setActiveTab('solution')}
                role="tab"
                aria-selected={activeTab === 'solution'}
                data-testid="math-tab-solution"
              >
                Verified Solution
                {solutionSteps.length > 0 && (
                  <span className="screen-tab-badge">{solutionSteps.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'prerequisites' ? 'active' : ''}`}
                onClick={() => setActiveTab('prerequisites')}
                role="tab"
                aria-selected={activeTab === 'prerequisites'}
                data-testid="math-tab-prerequisites"
              >
                Prerequisites
                {umr?.learning?.prerequisites && umr.learning.prerequisites.length > 0 && (
                  <span className="screen-tab-badge">{umr.learning.prerequisites.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
                onClick={() => setActiveTab('practice')}
                role="tab"
                aria-selected={activeTab === 'practice'}
                data-testid="math-tab-practice"
              >
                Practice
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
                onClick={() => setActiveTab('verify')}
                role="tab"
                aria-selected={activeTab === 'verify'}
                data-testid="math-tab-verify"
              >
                Verify Step
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'visualizer' ? 'active' : ''}`}
                onClick={() => setActiveTab('visualizer')}
                role="tab"
                aria-selected={activeTab === 'visualizer'}
                data-testid="math-tab-visualizer"
              >
                Interactive Visualizers
              </button>
              <button
                type="button"
                className={`screen-tab-btn ${activeTab === 'accessibility' ? 'active' : ''}`}
                onClick={() => setActiveTab('accessibility')}
                role="tab"
                aria-selected={activeTab === 'accessibility'}
                data-testid="math-tab-accessibility"
              >
                Accessibility
              </button>
            </div>

            <div className="screen-actions">
              {activeTab === 'canvas' && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => void handleRecognizeNow()}
                  disabled={isLoading || isRecognizing || strokes.length === 0}
                  title="Recognize handwritten strokes on canvas"
                >
                  {isRecognizing ? 'Recognizing...' : 'Recognize Ink'}
                </button>
              )}
              <button
                type="button"
                className="action-btn"
                onClick={handleClear}
                disabled={isLoading && strokes.length === 0 && !typedInput}
                title="Clear notebook and reset canvas"
              >
                Reset
              </button>
            </div>
          </div>

          {clarification && (
            <div className="clarification-card" role="region" aria-label="Interactive Problem Clarification">
              <div className="clarification-header">
                <div className="clarification-title-wrap">
                  <h4 className="clarification-title">Clarify what to solve</h4>
                  <p className="clarification-question">{clarification.question}</p>
                </div>
                <button
                  type="button"
                  className="screen-notice-close"
                  onClick={() => setClarification(null)}
                  aria-label="Dismiss clarification"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
              {clarification.options.length > 0 && (
                <div className="clarification-options">
                  {clarification.options.map((opt, idx) => (
                    <button
                      type="button"
                      key={idx}
                      className="clarification-option-btn"
                      onClick={() => handleClarificationSelect(opt)}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {notice && !clarification && (
            <div className={`screen-notice ${notice.type}`} role="alert" data-testid="math-notice">
              <span>{notice.message}</span>
              <button
                type="button"
                className="screen-notice-close"
                onClick={() => setNotice(null)}
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          )}

          <div className="screen-body">
            {/* 1. Canvas Drawing */}
            <div style={{ display: activeTab === 'canvas' ? 'block' : 'none', height: '100%' }}>
              <MathCanvas
                strokes={strokes}
                onStrokesChange={handleStrokesChange}
                tool={tool}
                penColor={penColor}
                penWidth={penWidth}
                eraserWidth={eraserWidth}
                onToolChange={setTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClear}
                canUndo={canUndo}
                canRedo={canRedo}
                disabled={isLoading}
                onExportCanvas={handleExportReady}
                onCanvasElement={handleCanvasElement}
              />
            </div>

            {/* 2. Verified Solution + Contextual Accessibility Panel */}
            <div
              className="screen-body-solution"
              style={{ display: activeTab === 'solution' ? 'block' : 'none' }}
            >
              <MathDisplay
                steps={solutionSteps}
                mode={mode}
                currentStep={currentStep}
                onStepReveal={setCurrentStep}
                onShowAll={handleShowAll}
                onHint={handleHint}
                onRestart={handleRestartSteps}
                onBackToCanvas={handleBackToCanvas}
                showISLGestures={profile.preferences.sign_language_enabled}
                onISLPlaybackStart={() => setCurrentActivity('isl-playback-started')}
                disabled={isLoading}
              />

              {solutionSteps.length > 0 && (
                <div className="solution-viz-callout">
                  <span>
                    Next: explore <strong>{getVisualizerMeta(visualMode).label}</strong>, review
                    prerequisites, or test yourself in Practice Mode.
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="control-btn secondary"
                      onClick={() => setActiveTab('visualizer')}
                    >
                      Open Visualizer
                    </button>
                    <button
                      type="button"
                      className="control-btn secondary"
                      onClick={() => setActiveTab('prerequisites')}
                    >
                      Prerequisites
                    </button>
                    <button
                      type="button"
                      className="control-btn primary"
                      onClick={() => setActiveTab('practice')}
                    >
                      Practice Steps
                    </button>
                  </div>
                </div>
              )}

              {umr?.accessibility && (
                <AccessibilityPanel
                  accessibility={umr.accessibility}
                  brailleStandard={profile.preferences.braille_standard}
                  onChangeBrailleStandard={handleChangeBrailleStandard}
                  speechRate={profile.preferences.speech_rate}
                  onChangeSpeechRate={handleChangeSpeechRate}
                  onOpenLiveISL={() => setIsSignModalOpen(true)}
                  onOpenProfile={() => setIsProfileModalOpen(true)}
                  isActiveView={mode === 'notebook' && activeTab === 'solution'}
                />
              )}
            </div>

            {/* 3. Prerequisites & Concept Dependency Graph (Mathua DAG + FSRS-6) */}
            <div
              style={{
                display: activeTab === 'prerequisites' ? 'block' : 'none',
                padding: '14px',
              }}
            >
              <ConceptLearningDrawer
                prerequisites={umr?.learning?.prerequisites || []}
                primaryConceptId={umr?.learning?.primary_concept_id}
                problemLatex={umr?.input?.recognized_latex}
                onReturnToSolution={() => setActiveTab('solution')}
                onReturnToCanvas={handleBackToCanvas}
                onStartPractice={() => setActiveTab('practice')}
                isActive={mode === 'notebook' && activeTab === 'prerequisites'}
              />
            </div>

            {/* 4. Practice Mode, Hints & Misconceptions */}
            <div style={{ display: activeTab === 'practice' ? 'block' : 'none' }}>
              <PracticeMode
                umr={umr}
                solutionSteps={solutionSteps}
                grade={profile.grade}
                isActive={mode === 'notebook' && activeTab === 'practice'}
                onLoadPresetProblem={handleLoadPracticePreset}
                onOpenFullSolution={() => setActiveTab('solution')}
                onReturnToCanvas={handleBackToCanvas}
              />
            </div>

            {/* 5. Step Equivalence Verifier */}
            <div style={{ display: activeTab === 'verify' ? 'block' : 'none' }}>
              <StepVerifierPanel
                initialBefore={typedInput || umr?.input?.recognized_latex || ''}
                disabled={isLoading}
              />
            </div>

            {/* 6. Interactive Visualizers & 11 Geometry Diagrams */}
            <div style={{ display: activeTab === 'visualizer' ? 'block' : 'none' }}>
              <VisualizerLab
                visualMode={visualMode}
                onVisualModeChange={setVisualMode}
                umr={umr}
                isActive={mode === 'notebook' && activeTab === 'visualizer'}
              />
            </div>

            {/* 7. Dedicated Mathematical Accessibility Tab */}
            <div
              data-testid="accessibility-tab-pane"
              style={{
                display: activeTab === 'accessibility' ? 'block' : 'none',
                padding: '14px',
              }}
            >
              <AccessibilityPanel
                accessibility={umr?.accessibility}
                brailleStandard={profile.preferences.braille_standard}
                onChangeBrailleStandard={handleChangeBrailleStandard}
                speechRate={profile.preferences.speech_rate}
                onChangeSpeechRate={handleChangeSpeechRate}
                onOpenLiveISL={() => setIsSignModalOpen(true)}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                isActiveView={mode === 'notebook' && activeTab === 'accessibility'}
              />
            </div>
          </div>
        </section>

        {/* Unified Multimodal Input Row (Always accessible across Notebook & Textbook) */}
        <section className="problem-input-row" aria-label="Problem Input">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TypedInput
              value={typedInput}
              onChange={(val) => {
                setTypedInput(val);
                setLastActiveSource('typed');
              }}
              onSubmit={() => void handleSolve(undefined, { keepMode: mode === 'textbook' })}
              placeholder="Type an equation, draw above, speak math, or sign via ISL (e.g. x^2 + 5x + 6 = 0 or 2x + 4 = 10)..."
              disabled={isLoading}
              rows={2}
            />

            <div className="input-multimodal-actions">
              <button
                type="button"
                className={`voice-btn ${isListeningVoice ? 'listening' : ''}`}
                onClick={handleVoiceInput}
                disabled={isLoading || isNormalizingVoice}
                title="Speak a mathematical expression via microphone (Voice Normalizer)"
              >
                {isListeningVoice ? 'Listening (Speak Math)...' : 'Speak Math (Voice Normalizer)'}
              </button>

              <button
                type="button"
                className="sample-chip-btn"
                onClick={() => setShowPhraseNormalizer((prev) => !prev)}
                disabled={isLoading}
              >
                {showPhraseNormalizer ? 'Hide Spoken Math Bar' : 'Normalize Spoken Phrase'}
              </button>

              {SAMPLE_EQUATIONS.map((sample) => (
                <button
                  type="button"
                  key={sample.id}
                  className="sample-chip-btn"
                  onClick={() => {
                    setTypedInput(sample.latex);
                    setLastActiveSource('typed');
                  }}
                  disabled={isLoading}
                  title={sample.description}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {showPhraseNormalizer && (
              <form className="voice-phrase-bar" onSubmit={handlePhraseNormalizeSubmit}>
                <input
                  type="text"
                  className="voice-phrase-input"
                  value={spokenPhraseDraft}
                  onChange={(e) => setSpokenPhraseDraft(e.target.value)}
                  placeholder='e.g. "x squared plus five x plus six equals zero"'
                  aria-label="Spoken math phrase to normalize"
                  disabled={isNormalizingVoice}
                />
                <button
                  type="submit"
                  className="control-btn secondary"
                  disabled={isNormalizingVoice || !spokenPhraseDraft.trim()}
                >
                  {isNormalizingVoice ? 'Normalizing...' : 'Normalize'}
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            className="solve-btn"
            onClick={() => void handleSolve(undefined, { keepMode: mode === 'textbook' })}
            disabled={isLoading}
            aria-label="Solve math problem"
          >
            {isLoading ? (
              <>
                <svg
                  className="spinner"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Solving...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Solve
              </>
            )}
          </button>
        </section>
      </div>

      {/* Student Learning Profile & Math Accessibility Preferences Modal */}
      <StudentProfileModal
        profile={profile}
        onChange={setProfile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Live Webcam ISL Hand-Gesture Recognition Modal */}
      <LiveISLRecognitionModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onRecognizedSign={handleSignRecognized}
        onDeleteLastSign={handleSignDeleteLast}
        onClearSigns={handleSignClear}
        currentInput={typedInput}
      />
    </div>
  );
};
