/**
 * Browser-facing API configuration for the EXO General AI Tutor backend (Voice Agent Next.js).
 *
 * Dev proxy namespace (main_explaino/vite.config.ts):
 *   /api/tutor/* -> http://localhost:3000/api/*
 */

const rawBasePath = (import.meta.env.VITE_TUTOR_API_BASE as string | undefined) || '/api/tutor';

export const TUTOR_API_BASE_PATH = rawBasePath.replace(/\/+$/, '');

export function buildTutorApiUrl(endpointPath: string): string {
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${TUTOR_API_BASE_PATH}${normalized}`;
}

/**
 * Verified Next.js API routes (voice_agent/app/api/).
 */
export const TUTOR_API_ENDPOINTS = {
  health: () => buildTutorApiUrl('/health'),
  catalog: () => buildTutorApiUrl('/catalog'),
  chat: () => buildTutorApiUrl('/chat'),
  chatStream: () => buildTutorApiUrl('/chat/stream'),
  roadmap: () => buildTutorApiUrl('/roadmap'),
  lesson: () => buildTutorApiUrl('/lesson'),
  lessonProgress: () => buildTutorApiUrl('/lesson-progress'),
  learningQuiz: () => buildTutorApiUrl('/learning-quiz'),
  learningCurve: () => buildTutorApiUrl('/learning-curve'),
  progress: () => buildTutorApiUrl('/progress'),
  achievements: () => buildTutorApiUrl('/achievements'),
  studentDashboard: () => buildTutorApiUrl('/student-dashboard'),
  studyRoom: () => buildTutorApiUrl('/study-room'),
  textbooks: () => buildTutorApiUrl('/textbooks'),
  videos: () => buildTutorApiUrl('/videos'),
  visual: () => buildTutorApiUrl('/visual'),
  visualBrief: () => buildTutorApiUrl('/visual-brief'),
  speechSpeak: () => buildTutorApiUrl('/speech/speak'),
  speechTranscribe: () => buildTutorApiUrl('/speech/transcribe'),
} as const;

