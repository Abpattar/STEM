/**
 * Browser-facing API configuration for the Science Kingdom AI backend (Senku AI).
 *
 * Dev proxy namespace (main_explaino/vite.config.ts):
 *   /api/science/* -> http://127.0.0.1:8002/api/*
 *
 * All AI provider credentials remain strictly server-side in science_ai_backend/.
 */

const rawBasePath =
  (import.meta.env.VITE_SCIENCE_API_BASE as string | undefined) || '/api/science';

export const SCIENCE_API_BASE_PATH = rawBasePath.replace(/\/+$/, '');

export function buildScienceApiUrl(endpointPath: string): string {
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${SCIENCE_API_BASE_PATH}${normalized}`;
}

export const SCIENCE_API_ENDPOINTS = {
  health: () => buildScienceApiUrl('/health'),
  ai: () => buildScienceApiUrl('/ai'),
} as const;

