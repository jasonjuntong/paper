import { defineConfig, devices } from '@playwright/test'
import { PROJECT_ID } from './e2e/helpers/emulator'

// PROJECT_ID is `demo-paper` (see emulator.ts): a `demo-` prefixed project keeps
// the Firebase SDKs fully offline — they never reach real Google servers, so
// E2E can only ever hit the local emulators. Must match `--project demo-paper`
// in the `test:e2e` script.

const AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
// Dedicated port so the e2e never hijacks (via reuseExistingServer) a plain
// `next dev` running on the default 3000 — that server isn't emulator-wired, so
// reusing it silently breaks every flow that reads emulator state.
const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shared emulator state — run specs serially
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    // Never reuse a stray dev server — it may not be emulator-wired, which
    // silently breaks every flow that reads emulator state. Always boot our own.
    // (Next.js 16 allows only one `next dev` per project dir, so any other dev
    // server must be stopped before running the e2e.)
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Point both SDKs at the emulators. The admin SDK auto-detects these two;
      // the client SDK is gated on NEXT_PUBLIC_FIREBASE_EMULATOR (see client.ts).
      FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
      FIRESTORE_EMULATOR_HOST,
      NEXT_PUBLIC_FIREBASE_EMULATOR: 'true',
      // Demo Firebase config — the emulators ignore the real values, but the
      // client SDK still requires non-empty fields to initialize.
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
      NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app-id',
      FIREBASE_PROJECT_ID: PROJECT_ID,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      // Keep the suite hermetic: a dummy key stops the register route from
      // reaching the real Resend API. The send fails and is caught; the
      // verification oobCode still comes from the Auth emulator.
      RESEND_API_KEY: 'demo-resend-key',
    },
  },
})
