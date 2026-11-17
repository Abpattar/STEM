/**
 * Browser-facing API configuration for the Mathematics backend (MathNoteBook FastAPI).
 *
 * Dev proxy namespace (main_explaino/vite.config.ts):
 *   /api/math/* -> http://127.0.0.1:8001/api/*
 */

const rawBasePath = (import.meta.env.VITE_MATH_API_BASE as string | undefined) || '/api/math';

export const MATH_API_BASE_PATH = rawBasePath.replace(/\/+$/, '');

export function buildMathApiUrl(endpointPath: string): string {
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${MATH_API_BASE_PATH}${normalized}`;
}

/**
 * Verified FastAPI backend endpoints (scratchpad_notebook/backend/src/api/).
 */
export const MATH_API_ENDPOINTS = {
  health: () => buildMathApiUrl('/health'),
  solve: () => buildMathApiUrl('/solve'),
  verifyStep: () => buildMathApiUrl('/verify-step'),
  topics: () => buildMathApiUrl('/topics'),
  topicByName: (topic: string) => buildMathApiUrl(`/topics/${encodeURIComponent(topic)}`),
  recognize: () => buildMathApiUrl('/recognize'),
  recognizeTyped: () => buildMathApiUrl('/recognize-typed'),
  interpret: () => buildMathApiUrl('/interpret'),
  practiceAttempt: () => buildMathApiUrl('/practice/attempt'),
  practiceHint: () => buildMathApiUrl('/practice/hint'),
  history: () => buildMathApiUrl('/history'),
  historyById: (problemId: string) => buildMathApiUrl(`/history/${encodeURIComponent(problemId)}`),
  analytics: () => buildMathApiUrl('/analytics'),
  voiceNormalize: () => buildMathApiUrl('/voice/normalize'),
  learningReview: () => buildMathApiUrl('/learning/review'),
  orchestrateProcess: () => buildMathApiUrl('/orchestrate/process'),
  orchestrateCapabilities: () => buildMathApiUrl('/orchestrate/capabilities'),
  orchestrateHealth: () => buildMathApiUrl('/orchestrate/health'),
} as const;

