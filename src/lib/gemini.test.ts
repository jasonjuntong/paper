// @vitest-environment node
//
// PAPER-005 unit lane. Two units are ours to test here:
//  - buildPaperEmbeddingInput: a pure assembly of RAW extracted metadata into the
//    embedding string. Order + spacing are load-bearing (they change every vector),
//    so we pin the exact output.
//  - generatePaperEmbedding: wraps a single @google/genai embedContent call. We assert
//    the spec contract we send (model, 768 dims) and the value/error handling we own —
//    it returns the values array, and swallows a missing embedding OR a thrown SDK
//    error into [] (which the commit route turns into a 500). The SDK is mocked so
//    this stays offline; we don't test that Google returns real vectors.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// hoisted so it exists before the mocked `new GoogleGenAI()` runs at gemini.ts import.
const { embedMock } = vi.hoisted(() => ({ embedMock: vi.fn() }))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { embedContent: embedMock }
  },
}))

import { buildPaperEmbeddingInput, generatePaperEmbedding } from '@/lib/gemini'

function reply(values: number[]) {
  return { embeddings: [{ values }] }
}

describe('buildPaperEmbeddingInput', () => {
  it('joins title, synopsis, keywords in that order with single spaces', () => {
    expect(
      buildPaperEmbeddingInput({
        title: 'Attention Is All You Need',
        synopsis: 'Introduces the Transformer architecture.',
        keywords: 'transformers, attention',
      }),
    ).toBe(
      'Attention Is All You Need Introduces the Transformer architecture. transformers, attention',
    )
  })

  it('keeps empty fields as empty segments without collapsing spacing', () => {
    expect(buildPaperEmbeddingInput({ title: 'T', synopsis: '', keywords: 'k' })).toBe('T  k')
  })
})

describe('generatePaperEmbedding', () => {
  beforeEach(() => {
    embedMock.mockReset()
  })

  it('requests the spec model at 768 dimensions', async () => {
    embedMock.mockResolvedValueOnce(reply([0.1, 0.2]))
    await generatePaperEmbedding('some text')
    expect(embedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-embedding-2',
        contents: 'some text',
        config: { outputDimensionality: 768 },
      }),
    )
  })

  it('returns the embedding values from a well-formed response', async () => {
    const vec = Array.from({ length: 768 }, (_, i) => i / 768)
    embedMock.mockResolvedValueOnce(reply(vec))
    await expect(generatePaperEmbedding('text')).resolves.toEqual(vec)
  })

  it('returns [] when the response carries no embedding', async () => {
    embedMock.mockResolvedValueOnce({ embeddings: [] })
    await expect(generatePaperEmbedding('text')).resolves.toEqual([])
  })

  it('swallows an SDK error into []', async () => {
    embedMock.mockRejectedValueOnce(new Error('rate limited'))
    await expect(generatePaperEmbedding('text')).resolves.toEqual([])
    expect(embedMock).toHaveBeenCalledTimes(1) // no retries
  })
})
