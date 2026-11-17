export type LearningLane = 'logic' | 'course' | 'future';

export type SpeechLanguage =
  | 'en-IN'
  | 'hi-IN'
  | 'kn-IN'
  | 'ta-IN'
  | 'te-IN'
  | 'bn-IN'
  | 'mr-IN'
  | 'gu-IN'
  | 'ml-IN'
  | 'pa-IN'
  | 'od-IN';

export interface Concept {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  essentials: string[];
  misconception: string;
  question: string;
  keywords?: string[];
  grade?: number;
  subject?: string;
  previewOnly?: boolean;
}

export interface Source {
  kind: string;
  title: string;
  chapter: string;
  id: string;
  page?: number;
  bookId?: string;
  excerpt?: string;
}

export interface Book {
  id: string;
  title: string;
  grade: number;
  subject: string;
  indexedChunks: number;
  previewOnly: boolean;
  pages: number;
}

export interface WorkedExample {
  problem: string;
  working: string[];
  answer: string;
  check: string;
}

export interface LessonDetail {
  concept: Concept;
  sourceStatus: string;
  citations: Array<{ title: string; page: number; excerpt: string; chapter: string }>;
  workedExample?: WorkedExample | null;
  prerequisites?: string[];
  resource?: { url: string; title: string; note: string } | null;
  warning?: string;
}

export interface Visual {
  title: string;
  caption: string;
  nodes: Array<{ label: string; detail: string }>;
  links: string[];
  source: string;
}

export interface Turn {
  role: 'student' | 'exo';
  text: string;
}

export interface Message extends Turn {
  id: number;
  provider?: string;
  conceptId?: string;
}

export interface Evidence {
  objective: string;
  status: 'correct' | 'misconception' | 'unverified';
  quote?: string;
  note: string;
  source: string;
}

export interface Analysis {
  conceptId: string;
  conceptTitle: string;
  evidence: Evidence[];
  confidence: string;
  recommendation: string;
  rationale: string;
  studentTurns: number;
  analysisMethod: string;
  needsReview: boolean;
}

export interface Lesson {
  id: string;
  conceptId: string;
  title: string;
  chapter: string;
  description: string;
  objective: string;
  status: 'start' | 'next' | 'later';
  minutes: number;
  activity: string;
}

export interface JourneyStep {
  index: number;
  text: string;
  focus: string;
  kind: 'question' | 'supported' | 'misconception' | 'off-topic' | 'unverified';
  signal: number;
  why: string;
  next: string;
  evidence?: string;
}

export interface Roadmap {
  analysis: Analysis;
  lessons: Lesson[];
  generatedAt: string;
  reviewProvider: string;
  analysisTimeMs: number;
  journey?: JourneyStep[];
  topicDetection?: {
    conceptId: string;
    confidence: string;
    reason: string;
    relevantTurns: string[];
    questions: string[];
  };
}

export interface QuizPublicQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface TopicLaneProgress {
  id: LearningLane;
  name: string;
  reviewed: boolean;
  passed: boolean;
  score: number | null;
  total: number | null;
  attempts: number;
}

export interface TopicProgress {
  conceptId: string;
  title: string;
  chapter: string;
  lastActivity: string;
  observed: number;
  misconceptions: number;
  unverified: number;
  reviews: number;
  questions: number;
  lanes: TopicLaneProgress[];
  reviewedLanes: number;
  passedQuizzes: number;
  videosReviewed: number;
  status: 'not-yet-checked' | 'in-progress' | 'needs-review' | 'practiced';
  nextStep: string;
}

export interface DashboardSummary {
  topics: TopicProgress[];
  totalTopics: number;
  activeTopics: number;
  coveredTopics: number;
  passedQuizzes: number;
  reviewedPaths: number;
  videosReviewed: number;
  timeline: Array<{
    conceptId: string;
    date: string;
    observed: number;
    misconceptions: number;
  }>;
  focus: TopicProgress | null;
  latestReview: string | null;
}

export interface SharedLearningContextPayload {
  previousModule: string | null;
  activeSubject: string | null;
  activeConceptId: string | null;
  activeConceptTitle: string | null;
  currentActivity: string | null;
  gradeLevel: number | string | null;
}

