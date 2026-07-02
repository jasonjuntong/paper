import { defineConfig } from 'vitest/config'

// Security-rules lane. Runs the specs in `tests/rules/` against the Firestore
// emulator via `@firebase/rules-unit-testing` — separate from the default
// `test` config (src/** pure units) so `npm test` stays fast and offline.
// Boot with: `npm run test:rules` (wraps this in `firebase emulators:exec`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.{test,spec}.ts'],
    // The emulator is shared mutable state; run the specs serially.
    fileParallelism: false,
  },
})
