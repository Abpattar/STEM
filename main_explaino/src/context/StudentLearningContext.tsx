import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type LearningModule = 'nilo' | 'math' | 'science' | 'exo';

export interface LearningReturnDestination {
  module: LearningModule;
  view?: string;
  conceptId?: string | null;
  label?: string;
}

export interface StudentIdentity {
  /** Nullable until real authentication provides a verified student identifier. Never derived from sessionId. */
  studentId: string | null;
  /** Optional display name supplied by the host application or authenticated profile. */
  displayName: string | null;
  /** Optional grade or learning level (e.g., 9, 10, "Grade 10"). */
  gradeLevel?: number | string | null;
}

export interface ActiveConcept {
  /** Stable canonical concept identifier (e.g., "photosynthesis", "quadratic-equations"). */
  conceptId: string | null;
  /** Human-readable display title associated with the conceptId. */
  conceptTitle: string | null;
  /** Active academic subject (e.g., "Mathematics", "Science", "Physics", "Chemistry", "Biology"). */
  subject?: string | null;
}

export interface StudentLearningState {
  /** Authenticated student ID; strictly null until real authentication is connected. */
  studentId: string | null;
  /** Student display name; null until explicitly provided. */
  studentDisplayName: string | null;
  /** Optional grade or learning level. */
  gradeLevel: number | string | null;
  /** Active subject across NILO modules. */
  activeSubject: string | null;
  /** Stable identifier for the active concept. */
  activeConceptId: string | null;
  /** Human-readable display title for the active concept. */
  activeConceptTitle: string | null;
  /** Currently active module inside the NILO shell. */
  activeModule: LearningModule;
  /** Current learning activity descriptor (e.g., "solving-equation", "optics-bench", "socratic-dialogue"). */
  currentActivity: string | null;
  /** Module that was active immediately prior to the latest transition. */
  previousModule: LearningModule | null;
  /** Explicit return target when exiting the current module. */
  returnDestination: LearningReturnDestination | null;
  /** Optional ephemeral session ID; never treated as an authenticated studentId. */
  sessionId: string | null;
}

export type StudentLearningContextPatch = Partial<StudentLearningState>;

export interface NavigateToModuleOptions {
  activity?: string | null;
  returnDestination?: LearningReturnDestination | null;
  subject?: string | null;
  conceptId?: string | null;
  conceptTitle?: string | null;
}

export interface ClearLearningContextOptions {
  /** When true, preserves studentId, studentDisplayName, and gradeLevel while clearing active study state. */
  preserveStudentIdentity?: boolean;
}

export interface StudentLearningContextValue {
  state: StudentLearningState;
  updateLearningContext: (patch: StudentLearningContextPatch) => void;
  setStudentIdentity: (identity: Partial<StudentIdentity>) => void;
  setActiveConcept: (concept: ActiveConcept) => void;
  navigateToModule: (nextModule: LearningModule, options?: NavigateToModuleOptions) => void;
  setCurrentActivity: (activity: string | null) => void;
  setSessionId: (sessionId: string | null) => void;
  clearLearningContext: (options?: ClearLearningContextOptions) => void;
}

export const INITIAL_STUDENT_LEARNING_STATE: StudentLearningState = {
  studentId: null,
  studentDisplayName: null,
  gradeLevel: null,
  activeSubject: null,
  activeConceptId: null,
  activeConceptTitle: null,
  activeModule: 'nilo',
  currentActivity: null,
  previousModule: null,
  returnDestination: null,
  sessionId: null,
};

const StudentLearningContext = createContext<StudentLearningContextValue | undefined>(undefined);

export interface StudentLearningProviderProps {
  children: React.ReactNode;
  initialState?: Partial<StudentLearningState>;
}

export const StudentLearningProvider: React.FC<StudentLearningProviderProps> = ({
  children,
  initialState,
}) => {
  const [state, setState] = useState<StudentLearningState>(() => ({
    ...INITIAL_STUDENT_LEARNING_STATE,
    ...initialState,
  }));

  const updateLearningContext = useCallback((patch: StudentLearningContextPatch) => {
    setState((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const setStudentIdentity = useCallback((identity: Partial<StudentIdentity>) => {
    setState((prev) => ({
      ...prev,
      ...(identity.studentId !== undefined ? { studentId: identity.studentId } : {}),
      ...(identity.displayName !== undefined ? { studentDisplayName: identity.displayName } : {}),
      ...(identity.gradeLevel !== undefined ? { gradeLevel: identity.gradeLevel } : {}),
    }));
  }, []);

  const setActiveConcept = useCallback((concept: ActiveConcept) => {
    setState((prev) => ({
      ...prev,
      activeConceptId: concept.conceptId,
      activeConceptTitle: concept.conceptTitle,
      ...(concept.subject !== undefined ? { activeSubject: concept.subject } : {}),
    }));
  }, []);

  const navigateToModule = useCallback(
    (nextModule: LearningModule, options?: NavigateToModuleOptions) => {
      setState((prev) => ({
        ...prev,
        previousModule: prev.activeModule !== nextModule ? prev.activeModule : prev.previousModule,
        activeModule: nextModule,
        ...(options?.activity !== undefined ? { currentActivity: options.activity } : {}),
        ...(options?.returnDestination !== undefined
          ? { returnDestination: options.returnDestination }
          : {}),
        ...(options?.subject !== undefined ? { activeSubject: options.subject } : {}),
        ...(options?.conceptId !== undefined ? { activeConceptId: options.conceptId } : {}),
        ...(options?.conceptTitle !== undefined
          ? { activeConceptTitle: options.conceptTitle }
          : {}),
      }));
    },
    []
  );

  const setCurrentActivity = useCallback((activity: string | null) => {
    setState((prev) => ({
      ...prev,
      currentActivity: activity,
    }));
  }, []);

  const setSessionId = useCallback((sessionId: string | null) => {
    setState((prev) => ({
      ...prev,
      sessionId,
    }));
  }, []);

  const clearLearningContext = useCallback((options?: ClearLearningContextOptions) => {
    setState((prev) => {
      if (options?.preserveStudentIdentity) {
        return {
          ...INITIAL_STUDENT_LEARNING_STATE,
          studentId: prev.studentId,
          studentDisplayName: prev.studentDisplayName,
          gradeLevel: prev.gradeLevel,
        };
      }
      return { ...INITIAL_STUDENT_LEARNING_STATE };
    });
  }, []);

  const value = useMemo<StudentLearningContextValue>(
    () => ({
      state,
      updateLearningContext,
      setStudentIdentity,
      setActiveConcept,
      navigateToModule,
      setCurrentActivity,
      setSessionId,
      clearLearningContext,
    }),
    [
      state,
      updateLearningContext,
      setStudentIdentity,
      setActiveConcept,
      navigateToModule,
      setCurrentActivity,
      setSessionId,
      clearLearningContext,
    ]
  );

  return (
    <StudentLearningContext.Provider value={value}>
      {children}
    </StudentLearningContext.Provider>
  );
};

export function useStudentLearning(): StudentLearningContextValue {
  const ctx = useContext(StudentLearningContext);
  if (!ctx) {
    throw new Error('useStudentLearning must be used within a StudentLearningProvider');
  }
  return ctx;
}

