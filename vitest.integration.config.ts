import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Integration lane. Runs the specs in `tests/integration/` against the Auth +
// Firestore emulators using the real firebase-admin SDK (admin.ts auto-routes
// to the emulators via the *_EMULATOR_HOST vars that `emulators:exec` exports).
// Separate from the default `test` config so `npm test` stays fast and offline.
// Boot with: `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.{test,spec}.ts'],
    // Shared emulator state; run specs serially.
    fileParallelism: false,
    env: {
      // admin.ts reads FIREBASE_PROJECT_ID; must match `--project demo-paper`.
      FIREBASE_PROJECT_ID: 'demo-paper',
      // Leave RESEND_API_KEY unset: getClient() throws synchronously, the
      // register route catches it, and no real Resend call is made — hermetic.
    },
  },
})
