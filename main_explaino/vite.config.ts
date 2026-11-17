import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mathApiTarget =
    env.MATH_API_TARGET || process.env.MATH_API_TARGET || 'http://127.0.0.1:8001'
  const scienceApiTarget =
    env.SCIENCE_AI_TARGET || process.env.SCIENCE_AI_TARGET || 'http://127.0.0.1:8002'
  const tutorApiTarget =
    env.TUTOR_API_TARGET || process.env.TUTOR_API_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api/math/': {
          target: mathApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/math/, '/api'),
        },
        '/api/science/': {
          target: scienceApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/science/, '/api'),
        },
        '/api/tutor/': {
          target: tutorApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tutor/, '/api'),
        },
      },
    },
  }
})
