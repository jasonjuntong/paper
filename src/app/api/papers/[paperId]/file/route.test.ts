// @vitest-environment node
//
// PAPER-009 unit lane. The file route is a thin proxy over checkVisibility +
// Cloud Storage: its own logic is the access gate, ETag/304 revalidation, Range
// math, and header assembly. Session, checkVisibility, and firebase-admin are
// mocked so this stays offline — we assert only the branching we own, not that
// firebase-admin streams bytes or that Next parses a Request. `accessTier` is
// kept real (it's the gate under test); only `checkVisibility` is stubbed.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'
import type { Visibility } from '@/lib/paper-dedup-core'

const { getSessionMock, checkVisibilityMock, doc, blob } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  checkVisibilityMock: vi.fn(),
  // Mutable per-test state for the Firestore paper doc + Storage object.
  doc: { storagePath: 'papers/p1.pdf' as string | undefined },
  blob: {
    size: 1000,
    md5Hash: 'abc123',
    lastReadStreamOpts: undefined as { start: number; end: number } | undefined,
  },
}))

vi.mock('@/lib/session', () => ({ getSession: getSessionMock }))

// Keep the real `accessTier`; only stub the Firestore-backed `checkVisibility`.
vi.mock('@/lib/paper-dedup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/paper-dedup')>()
  return { ...actual, checkVisibility: checkVisibilityMock }
})

vi.mock('@/lib/firebase/admin', () => ({
  adminFirestore: {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          data: () => (doc.storagePath ? { storagePath: doc.storagePath } : {}),
        }),
      }),
    }),
  },
  adminStorage: {
    bucket: () => ({
      file: () => ({
        getMetadata: async () => [{ size: blob.size, md5Hash: blob.md5Hash }],
        createReadStream: (opts?: { start: number; end: number }) => {
          blob.lastReadStreamOpts = opts
          return Readable.from(Buffer.from('%PDF-1.4 mock body'))
        },
      }),
    }),
  },
}))

import { GET } from './route'

const ETAG = '"abc123"'
const FULL: Visibility = { visibility: 'in-library', entryId: 'e1' }
const LIST: Visibility = { visibility: 'list', orgs: [{ id: 'o1', name: 'Pub' }] }
const NONE: Visibility = { visibility: 'none' }

function call(headers: Record<string, string> = {}) {
  const req = { headers: new Headers(headers) } as unknown as NextRequest
  return GET(req, { params: Promise.resolve({ paperId: 'p1' }) })
}

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue({ uid: 'u1' })
  checkVisibilityMock.mockReset().mockResolvedValue(FULL)
  doc.storagePath = 'papers/p1.pdf'
  blob.size = 1000
  blob.md5Hash = 'abc123'
  blob.lastReadStreamOpts = undefined
})

describe('GET /api/papers/[paperId]/file — auth + access gate', () => {
  it('401s when there is no session', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await call()
    expect(res.status).toBe(401)
  })

  it('403s when access is none', async () => {
    checkVisibilityMock.mockResolvedValue(NONE)
    const res = await call()
    expect(res.status).toBe(403)
  })

  it('403s when access is list-only (public-org non-member)', async () => {
    checkVisibilityMock.mockResolvedValue(LIST)
    const res = await call()
    expect(res.status).toBe(403)
  })

  it('404s when the paper has no storagePath', async () => {
    doc.storagePath = undefined
    const res = await call()
    expect(res.status).toBe(404)
  })
})

describe('GET /api/papers/[paperId]/file — ETag revalidation', () => {
  it('304s when If-None-Match matches the ETag, with no body', async () => {
    const res = await call({ 'if-none-match': ETAG })
    expect(res.status).toBe(304)
    expect(res.headers.get('etag')).toBe(ETAG)
    expect(res.headers.get('cache-control')).toBe('private, no-cache')
    expect(res.body).toBeNull()
  })

  it('re-checks access before revalidation: revoked access → 403 even with a matching ETag', async () => {
    checkVisibilityMock.mockResolvedValue(NONE)
    const res = await call({ 'if-none-match': ETAG })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/papers/[paperId]/file — Range', () => {
  it('206s for a satisfiable range with Content-Range + Content-Length and slices the stream', async () => {
    const res = await call({ range: 'bytes=0-99' })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-99/1000')
    expect(res.headers.get('content-length')).toBe('100')
    expect(blob.lastReadStreamOpts).toEqual({ start: 0, end: 99 })
  })

  it('defaults an open-ended range to the last byte', async () => {
    const res = await call({ range: 'bytes=500-' })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 500-999/1000')
    expect(blob.lastReadStreamOpts).toEqual({ start: 500, end: 999 })
  })

  it('416s for a range beyond the file size', async () => {
    const res = await call({ range: 'bytes=2000-3000' })
    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBe('bytes */1000')
  })
})

describe('GET /api/papers/[paperId]/file — full response', () => {
  it('200s with the full stream, correct headers, and stable ETag', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-length')).toBe('1000')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('cache-control')).toBe('private, no-cache')
    expect(res.headers.get('etag')).toBe(ETAG)
    // No Range header → whole file, not a slice.
    expect(blob.lastReadStreamOpts).toBeUndefined()
  })
})
