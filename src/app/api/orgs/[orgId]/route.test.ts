// @vitest-environment node
//
// ORG-002 unit lane (route half). The PATCH handler owns: the auth gate, the
// admin-only + not-deleted guards, the visibility↔join-policy invariant, and —
// added here — the profile fields (name/mark/description) it folds into a single
// tx.update, writing only what actually changed. Session + firebase-admin are
// mocked so this stays offline; we assert the branching and the update payload we
// own, not that firebase-admin runs a transaction.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const { getSessionMock, txUpdate, orgDoc } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  txUpdate: vi.fn(),
  // Mutable per-test state for the Firestore org doc the transaction reads.
  orgDoc: {
    exists: true,
    data: {} as Record<string, unknown>,
  },
}))

vi.mock('@/lib/session', () => ({ getSession: getSessionMock }))

vi.mock('@/lib/firebase/admin', () => ({
  adminFirestore: {
    collection: () => ({ doc: () => ({ kind: 'orgRef' }) }),
    runTransaction: async (
      fn: (tx: {
        get: () => Promise<unknown>
        update: typeof txUpdate
      }) => Promise<unknown>
    ) =>
      fn({
        get: async () => ({
          exists: orgDoc.exists,
          data: () => orgDoc.data,
        }),
        update: txUpdate,
      }),
  },
}))

import { PATCH } from './route'

type Body = Record<string, unknown>

function call(body: Body | null) {
  const req = { json: async () => body } as unknown as NextRequest
  return PATCH(req, { params: Promise.resolve({ orgId: 'org-1' }) })
}

// The data object passed to tx.update (the only write the handler makes).
function updatePayload() {
  return txUpdate.mock.calls[0]?.[1] as Record<string, unknown> | undefined
}

const BASE_ORG = {
  adminId: 'u1',
  name: 'Robotics Lab',
  mark: 'RL',
  description: 'We read robotics papers.',
  visibility: 'public' as const,
  joinPolicy: 'request' as const,
}

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue({ uid: 'u1' })
  txUpdate.mockReset()
  orgDoc.exists = true
  orgDoc.data = { ...BASE_ORG }
})

describe('PATCH /api/orgs/[orgId] — gates', () => {
  it('401s when there is no session', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await call({ name: 'New' })
    expect(res.status).toBe(401)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('400s when the body is empty (nothing to update)', async () => {
    const res = await call({})
    expect(res.status).toBe(400)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('400s when name is only whitespace', async () => {
    const res = await call({ name: '   ' })
    expect(res.status).toBe(400)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('403s when the caller is not the admin', async () => {
    orgDoc.data = { ...BASE_ORG, adminId: 'someone-else' }
    const res = await call({ name: 'New' })
    expect(res.status).toBe(403)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('410s when the org is deleted', async () => {
    orgDoc.data = { ...BASE_ORG, deletedAt: new Date() }
    const res = await call({ name: 'New' })
    expect(res.status).toBe(410)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('404s when the org does not exist', async () => {
    orgDoc.exists = false
    const res = await call({ name: 'New' })
    expect(res.status).toBe(404)
    expect(txUpdate).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/orgs/[orgId] — profile edit', () => {
  it('updates name + mark + description, upper-casing the mark', async () => {
    const res = await call({
      name: 'Deep RL',
      mark: 'dr',
      description: 'Reinforcement learning group.',
    })
    expect(res.status).toBe(200)
    expect(updatePayload()).toEqual({
      name: 'Deep RL',
      mark: 'DR',
      description: 'Reinforcement learning group.',
    })
    expect(await res.json()).toMatchObject({ name: 'Deep RL', mark: 'DR' })
  })

  it('clears the description when an empty string is sent', async () => {
    const res = await call({ description: '' })
    expect(res.status).toBe(200)
    expect(updatePayload()).toEqual({ description: '' })
  })

  it('writes only the name when other fields are omitted', async () => {
    const res = await call({ name: 'Renamed Lab' })
    expect(res.status).toBe(200)
    // mark + description are untouched — not in the update object.
    expect(updatePayload()).toEqual({ name: 'Renamed Lab' })
  })

  it('is a no-op when the submitted values match the current ones', async () => {
    const res = await call({
      name: BASE_ORG.name,
      mark: BASE_ORG.mark,
      description: BASE_ORG.description,
    })
    expect(res.status).toBe(200)
    expect(txUpdate).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/orgs/[orgId] — join policy invariant', () => {
  // BASE_ORG is a public org on the `request` policy.
  it('lets a public org switch to the open policy', async () => {
    const res = await call({ joinPolicy: 'open' })
    expect(res.status).toBe(200)
    expect(updatePayload()).toEqual({ joinPolicy: 'open' })
    expect(await res.json()).toMatchObject({ visibility: 'public', joinPolicy: 'open' })
  })

  it('rejects invite-only for a public org (invalid combo, no write)', async () => {
    const res = await call({ joinPolicy: 'invite' })
    expect(res.status).toBe(400)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('rejects an open policy for a private org', async () => {
    orgDoc.data = { ...BASE_ORG, visibility: 'private', joinPolicy: 'invite' }
    const res = await call({ joinPolicy: 'open' })
    expect(res.status).toBe(400)
    expect(txUpdate).not.toHaveBeenCalled()
  })

  it('forces invite-only when a public org goes private (policy carried)', async () => {
    const res = await call({ visibility: 'private' })
    expect(res.status).toBe(200)
    expect(updatePayload()).toEqual({ visibility: 'private', joinPolicy: 'invite' })
    expect(await res.json()).toMatchObject({ visibility: 'private', joinPolicy: 'invite' })
  })

  it('falls back to request when a private org goes public', async () => {
    orgDoc.data = { ...BASE_ORG, visibility: 'private', joinPolicy: 'invite' }
    const res = await call({ visibility: 'public' })
    expect(res.status).toBe(200)
    expect(updatePayload()).toEqual({ visibility: 'public', joinPolicy: 'request' })
    expect(await res.json()).toMatchObject({ visibility: 'public', joinPolicy: 'request' })
  })
})
