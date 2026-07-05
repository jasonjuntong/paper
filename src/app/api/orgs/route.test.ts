// @vitest-environment node
//
// ORG-001 unit lane (server half). The POST handler's own logic is the auth
// gate, the visibility↔join-policy invariant (Zod .refine), and the two-doc
// batch that makes the creator an Admin. Session + firebase-admin are mocked so
// this stays offline — we assert only the branching we own, not that
// firebase-admin commits a batch or that Next parses a Request.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const { getSessionMock, batchSet, batchCommit, orgRef, memberRef } = vi.hoisted(
  () => {
    // memberRef is what orgRef.collection('members').doc(uid) returns; keeping
    // both refs stable lets us tell the two batch.set calls apart by identity.
    const memberRef = { kind: 'member' as const }
    const orgRef = {
      id: 'org-abc',
      collection: () => ({ doc: () => memberRef }),
    }
    return {
      getSessionMock: vi.fn(),
      batchSet: vi.fn(),
      batchCommit: vi.fn(),
      orgRef,
      memberRef,
    }
  },
)

vi.mock('@/lib/session', () => ({ getSession: getSessionMock }))

vi.mock('@/lib/firebase/admin', () => ({
  adminFirestore: {
    collection: () => ({ doc: () => orgRef }),
    batch: () => ({ set: batchSet, commit: batchCommit }),
  },
}))

import { POST } from './route'

type Body = Record<string, unknown>

function call(body: Body | null) {
  const req = { json: async () => body } as unknown as NextRequest
  return POST(req)
}

// The doc data the handler batched for each ref, keyed by identity.
function orgWrite() {
  return batchSet.mock.calls.find((c) => c[0] === orgRef)?.[1]
}
function memberWrite() {
  return batchSet.mock.calls.find((c) => c[0] === memberRef)?.[1]
}

const VALID: Body = {
  name: 'Robotics Lab',
  mark: 'rl',
  visibility: 'public',
  joinPolicy: 'request',
}

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue({ uid: 'u1' })
  batchSet.mockReset()
  batchCommit.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/orgs — auth gate', () => {
  it('401s when there is no session', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await call(VALID)
    expect(res.status).toBe(401)
    expect(batchCommit).not.toHaveBeenCalled()
  })
})

describe('POST /api/orgs — validation + invariant', () => {
  it('400s when the body is not valid JSON', async () => {
    const res = await call(null)
    expect(res.status).toBe(400)
    expect(batchCommit).not.toHaveBeenCalled()
  })

  it('400s when name is missing', async () => {
    const res = await call({ ...VALID, name: '   ' })
    expect(res.status).toBe(400)
    expect(batchCommit).not.toHaveBeenCalled()
  })

  // The invariant: public → open|request, private → invite. Each invalid combo
  // must be rejected server-side even though the UI also guards it.
  it.each([
    ['public', 'invite'],
    ['private', 'open'],
    ['private', 'request'],
  ])('400s on the invalid combo %s + %s', async (visibility, joinPolicy) => {
    const res = await call({ ...VALID, visibility, joinPolicy })
    expect(res.status).toBe(400)
    expect(batchCommit).not.toHaveBeenCalled()
  })

  it.each([
    ['public', 'open'],
    ['public', 'request'],
    ['private', 'invite'],
  ])('201s on the valid combo %s + %s', async (visibility, joinPolicy) => {
    const res = await call({ ...VALID, visibility, joinPolicy })
    expect(res.status).toBe(201)
    expect(orgWrite()).toMatchObject({ visibility, joinPolicy })
  })
})

describe('POST /api/orgs — creation writes', () => {
  it('makes the creator an Admin and returns the new org id', async () => {
    const res = await call(VALID)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ orgId: 'org-abc' })

    // Org doc: creator is adminId, counters seeded, membership of 1.
    expect(orgWrite()).toMatchObject({
      name: 'Robotics Lab',
      adminId: 'u1',
      memberCount: 1,
      inviteCount: 0,
      requestCount: 0,
    })
    // Membership doc: the creator's own member record carries the admin role.
    expect(memberWrite()).toMatchObject({ userId: 'u1', role: 'admin' })

    // Both writes ride the same batch, then a single commit.
    expect(batchSet).toHaveBeenCalledTimes(2)
    expect(batchCommit).toHaveBeenCalledTimes(1)
  })

  it('upper-cases the mark and defaults an omitted description to empty', async () => {
    const { mark: _mark, ...noMark } = VALID
    await call({ ...noMark, mark: 'ab' })
    expect(orgWrite()).toMatchObject({ mark: 'AB', description: '' })
  })
})
