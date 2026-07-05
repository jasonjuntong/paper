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
 * Fetch the most recent oobCode of `requestType` the emulator generated for
 * `email` — the stand-in for clicking the link in a real inbox. Our routes mint
 * these via the Admin SDK; the (dummy) Resend send fails harmlessly, but the
 * code still lands in the emulator's oobCodes list.
 */
async function getOobCode(email: string, requestType: string): Promise<string> {
  const res = await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/oobCodes`, {
    headers: OWNER,
  })
  const { oobCodes } = (await res.json()) as { oobCodes: OobCode[] }
  const match = oobCodes
    .filter((c) => c.email === email && c.requestType === requestType)
    .at(-1)
  if (!match) throw new Error(`No ${requestType} code found for ${email}`)
  return match.oobCode
}

/** Verification code from the registration flow (`generateEmailVerificationLink`). */
export function getVerificationCode(email: string): Promise<string> {
  return getOobCode(email, 'VERIFY_EMAIL')
}

/** Password-reset code from the forgot-password flow (`generatePasswordResetLink`). */
export function getPasswordResetCode(email: string): Promise<string> {
  return getOobCode(email, 'PASSWORD_RESET')
}

/**
 * Resolve the `uid` (localId) the emulator minted for a registered `email`.
 * Uses the admin `accounts:query` endpoint (what firebase-admin's listUsers
 * calls) authorized with the emulator owner token.
 */
export async function getUidByEmail(email: string): Promise<string> {
  const res = await fetch(
    `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`,
    { method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' }, body: '{}' },
  )
  const { userInfo } = (await res.json()) as { userInfo?: { localId: string; email?: string }[] }
  const match = userInfo?.find((u) => u.email === email.toLowerCase())
  if (!match) throw new Error(`No account found for ${email}`)
  return match.localId
}

export interface SeedEntry {
  paperId: string
  title: string
  authors: string
  year: number
  keywords: string
  synopsis: string
  /** Org ids this entry is shared to; non-empty marks the row as "shared". */
  shares?: string[]
  /** ISO timestamp; controls library ordering (desc by createdAt). */
  createdAt?: string
}

/**
 * Seed a library entry straight into the Firestore emulator, bypassing the
 * commit route (which needs Gemini embeddings + Cloud Storage — neither is
 * emulated). Mirrors the shape the commit route writes and what the library /
 * detail pages read back. The owner token bypasses security rules.
 */
export async function seedLibraryEntry(uid: string, entry: SeedEntry): Promise<void> {
  const shares = entry.shares ?? []
  const fields: Record<string, unknown> = {
    paperId: { stringValue: entry.paperId },
    userId: { stringValue: uid },
    title: { stringValue: entry.title },
    authors: { stringValue: entry.authors },
    year: { integerValue: String(entry.year) },
    keywords: { stringValue: entry.keywords },
    synopsis: { stringValue: entry.synopsis },
    shares:
      shares.length > 0
        ? { arrayValue: { values: shares.map((s) => ({ stringValue: s })) } }
        : { arrayValue: {} },
    createdAt: { timestampValue: entry.createdAt ?? '2024-01-01T00:00:00Z' },
  }

  const res = await fetch(
    `${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/library`,
    {
      method: 'POST',
      headers: { ...OWNER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  )
  if (!res.ok) {
    throw new Error(`seedLibraryEntry failed: ${res.status} ${await res.text()}`)
  }
}

export interface SeedOrgEntry {
  orgId: string
  name: string
  /** default 'public' */
  visibility?: 'public' | 'private'
  /** default 'open' */
  joinPolicy?: 'open' | 'request' | 'invite'
  /** default 1 */
  memberCount?: number
  /** default 0 */
  inviteCount?: number
  /** default 0 */
  requestCount?: number
  description?: string
}

/**
 * Seed an org doc straight into the Firestore emulator, bypassing the create-org
 * route. Mirrors the shape that route writes and what the org page reads back.
 * The non-member org page only reads the org doc + the viewer's own member doc,
 * so no member subdoc is needed — the cap gate is driven by the count fields
 * (members + invites + requests). The owner token bypasses security rules.
 */
export async function seedOrg(entry: SeedOrgEntry): Promise<void> {
  const fields: Record<string, unknown> = {
    name: { stringValue: entry.name },
    mark: { stringValue: entry.name.slice(0, 2).toUpperCase() },
    description: { stringValue: entry.description ?? '' },
    visibility: { stringValue: entry.visibility ?? 'public' },
    joinPolicy: { stringValue: entry.joinPolicy ?? 'open' },
    memberCount: { integerValue: String(entry.memberCount ?? 1) },
    inviteCount: { integerValue: String(entry.inviteCount ?? 0) },
    requestCount: { integerValue: String(entry.requestCount ?? 0) },
    createdAt: { timestampValue: '2024-01-01T00:00:00Z' },
  }

  const res = await fetch(
    `${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/orgs?documentId=${entry.orgId}`,
    {
      method: 'POST',
      headers: { ...OWNER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  )
  if (!res.ok) {
    throw new Error(`seedOrg failed: ${res.status} ${await res.text()}`)
  }
}
