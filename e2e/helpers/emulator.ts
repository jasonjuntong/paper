// Helpers for driving the Firebase emulators over their REST control APIs.
// These endpoints exist ONLY on the emulators, never in production.

// Must match playwright.config.ts and `--project demo-paper` in `test:e2e`.
export const PROJECT_ID = 'demo-paper'

const AUTH_HOST = 'http://127.0.0.1:9099'
const FIRESTORE_HOST = 'http://127.0.0.1:8080'

// The emulators accept a fixed owner token for their privileged control routes.
const OWNER = { Authorization: 'Bearer owner' }

/** Wipe all emulated Auth users and Firestore documents for a clean slate. */
export async function resetEmulators(): Promise<void> {
  await Promise.all([
    fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
      method: 'DELETE',
      headers: OWNER,
    }),
    fetch(
      `${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      { method: 'DELETE', headers: OWNER },
    ),
  ])
}

type OobCode = { email: string; requestType: string; oobCode: string }

/**
 * Fetch the most recent email-verification oobCode the emulator generated for
 * `email` — the stand-in for clicking the link in a real inbox. The register
 * route mints this via `generateEmailVerificationLink`; the (dummy) Resend send
 * fails harmlessly, but the code still lands here.
 */
export async function getVerificationCode(email: string): Promise<string> {
  const res = await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/oobCodes`, {
    headers: OWNER,
  })
  const { oobCodes } = (await res.json()) as { oobCodes: OobCode[] }
  const match = oobCodes
    .filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
    .at(-1)
  if (!match) throw new Error(`No verification code found for ${email}`)
  return match.oobCode
}
