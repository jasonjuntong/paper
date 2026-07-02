// @vitest-environment node
//
// These are pure, DOM-free helpers. Running them under `node` (rather than the
// suite-default jsdom) uses Node's global File + WebCrypto, which live in one
// realm — jsdom's File.arrayBuffer() returns a cross-realm buffer that Node's
// crypto.subtle rejects, an artifact of the test env, not our code (in a real
// browser it's same-realm and works).
import { describe, it, expect } from 'vitest'
import { computeSHA256, isPdfFile } from '@/lib/pdf-upload'

// PAPER-001 unit lane: the two pure pre-flight bits — the PDF-only guard and the
// client-side SHA-256 fingerprint. Both are our logic (not framework behavior).

describe('isPdfFile', () => {
  it('accepts a .pdf file', () => {
    expect(isPdfFile(new File(['x'], 'paper.pdf'))).toBe(true)
  })

  it('is case-insensitive on the extension', () => {
    expect(isPdfFile(new File(['x'], 'PAPER.PDF'))).toBe(true)
    expect(isPdfFile(new File(['x'], 'Paper.Pdf'))).toBe(true)
  })

  it('rejects non-PDF extensions', () => {
    expect(isPdfFile(new File(['x'], 'notes.txt'))).toBe(false)
    expect(isPdfFile(new File(['x'], 'scan.png'))).toBe(false)
    expect(isPdfFile(new File(['x'], 'archive.pdf.zip'))).toBe(false)
  })

  it('rejects a name that merely contains "pdf" but does not end with it', () => {
    expect(isPdfFile(new File(['x'], 'pdf-guide.md'))).toBe(false)
  })

  it('rejects a bare extensionless name', () => {
    expect(isPdfFile(new File(['x'], 'pdf'))).toBe(false)
  })
})

describe('computeSHA256', () => {
  // Known SHA-256 vectors — proves we emit the standard lowercase-hex digest.
  it('hashes empty content to the known digest', async () => {
    const digest = await computeSHA256(new File([new Uint8Array(0)], 'empty.pdf'))
    expect(digest).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('hashes "abc" to the known digest', async () => {
    const digest = await computeSHA256(new File(['abc'], 'abc.pdf'))
    expect(digest).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('produces a 64-char lowercase hex string', async () => {
    const digest = await computeSHA256(new File(['some bytes'], 'x.pdf'))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes by content, not by file name', async () => {
    const a = await computeSHA256(new File(['same bytes'], 'a.pdf'))
    const b = await computeSHA256(new File(['same bytes'], 'b.pdf'))
    expect(a).toBe(b)
  })

  it('gives different digests for different content', async () => {
    const a = await computeSHA256(new File(['one'], 'x.pdf'))
    const b = await computeSHA256(new File(['two'], 'x.pdf'))
    expect(a).not.toBe(b)
  })
})
