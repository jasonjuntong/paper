import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { NextRequest } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { POST } from '@/app/api/auth/register/route'
import { normalizeHandle } from '@/lib/handles'
import { tombstoneHandle } from '@/lib/handles.server'

// Drives the real registration route (USER-001) against the emulators to prove
// the transactional guarantees that pure unit tests can't reach: the handle +
// user doc are written atomically, a taken handle 409s, and a race leaves no
// orphaned Auth user or handle behind.

const PROJECT_ID = 'demo-paper'
const AUTH_HOST = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`
const FIRESTORE_HOST = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`
const OWNER = { Authorization: 'Bearer owner' }

/** Wipe emulated Auth users + Firestore docs between tests. */
async function reset(): Promise<void> {
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

/** The route only calls `req.json()`, so a minimal stand-in suffices. */
function register(body: Record<string, unknown>): Promise<Response> {
  return POST({ json: async () => body } as unknown as NextRequest)
}

const valid = (over: Partial<Record<string, string>> = {}) => ({
  name: 'Ada Lovelace',
  handle: 'ada',
  email: 'ada@example.com',
  password: 'password123',
  ...over,
})

async function handleDoc(handle: string) {
  return adminFirestore.collection('handles').doc(normalizeHandle(handle)).get()
}
async function userMissing(email: string): Promise<boolean> {
  return adminAuth
    .getUserByEmail(email)
    .then(() => false)
    .catch(() => true)
}

beforeEach(reset)
afterAll(reset)

describe('POST /api/auth/register', () => {
  it('reserves the handle and writes the user doc atomically', async () => {
    const res = await register(valid())
    expect(res.status).toBe(200)

    const user = await adminAuth.getUserByEmail('ada@example.com')
    const handle = await handleDoc('ada')
    expect(handle.exists).toBe(true)
    expect(handle.data()?.uid).toBe(user.uid)

    const userDoc = await adminFirestore.collection('users').doc(user.uid).get()
    expect(userDoc.exists).toBe(true)
    expect(userDoc.data()).toMatchObject({ handle: 'ada', handleLower: 'ada', email: 'ada@example.com' })
  })

  it('409s a taken handle and leaves no orphaned Auth user', async () => {
    expect((await register(valid())).status).toBe(200)

    const res = await register(valid({ email: 'grace@example.com' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'handle_taken' })

    // The loser's Auth user was cleaned up (Step 4); the winner still owns it.
    expect(await userMissing('grace@example.com')).toBe(true)
    const winner = await adminAuth.getUserByEmail('ada@example.com')
    expect((await handleDoc('ada')).data()?.uid).toBe(winner.uid)
  })

  it('leaves no orphan on a simulated race for the same handle', async () => {
    const [a, b] = await Promise.all([
      register(valid({ email: 'a@example.com' })),
      register(valid({ email: 'b@example.com' })),
    ])
    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 409])

    const winnerEmail = a.status === 200 ? 'a@example.com' : 'b@example.com'
    const loserEmail = a.status === 200 ? 'b@example.com' : 'a@example.com'

    expect(await userMissing(loserEmail)).toBe(true)
    const winner = await adminAuth.getUserByEmail(winnerEmail)
    expect((await handleDoc('ada')).data()?.uid).toBe(winner.uid)

    // Exactly one Auth user survived the race.
    const { users } = await adminAuth.listUsers()
    expect(users).toHaveLength(1)
  })

  it('keeps a tombstoned handle out of the pool', async () => {
    expect((await register(valid())).status).toBe(200)

    // Simulate account deletion tombstoning the handle (USER-006).
    await tombstoneHandle('ada')
    const tomb = await handleDoc('ada')
    expect(tomb.data()?.uid).toBeNull()

    // A new registration can never reclaim it.
    const res = await register(valid({ email: 'new@example.com' }))
    expect(res.status).toBe(409)
    expect(await userMissing('new@example.com')).toBe(true)
  })
})
