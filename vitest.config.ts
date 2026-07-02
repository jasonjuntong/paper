import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Default `npm test` lane: pure-logic units AND React component tests, all
// offline. Component tests need a DOM, so the environment is jsdom; the pure
// units (schemas, validators) are env-agnostic and run here unchanged. The
// emulator lanes (rules/integration) use their own configs and stay in `node`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // JSX is transformed by vitest 4's oxc pipeline, which reads the automatic
  // runtime from tsconfig (`"jsx": "react-jsx"`) — no extra plugin needed
  // (@vitejs/plugin-react conflicts with vitest 4's bundled Vite peer range).
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
