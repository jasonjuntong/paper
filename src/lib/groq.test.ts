// @vitest-environment node
//
// PAPER-002 unit lane (extraction half). extractPaperMetadata wraps a single
// Groq call: it parses the JSON response, defaults every missing field to '',
// and — because extraction is best-effort, never a hard failure — swallows any
// error into an empty draft. The Groq SDK is mocked so this stays offline; we
// only assert the parsing/defaulting/fallback logic we own, not the SDK.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// hoisted so it exists before the mocked `new Groq()` runs at groq.ts import.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('groq-sdk', () => ({
  default: class Groq {
    chat = { completions: { create: createMock } }
  },
}))

import { extractPaperMetadata } from '@/lib/groq'

function reply(content: string) {
  return { choices: [{ message: { content } }] }
}

const FULL = {
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A., Shazeer, N.',
  year: '2017',
  keywords: 'transformers, attention',
  synopsis: 'Introduces the Transformer architecture.',
}

describe('extractPaperMetadata', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('returns all five fields from a complete JSON response', async () => {
    createMock.mockResolvedValueOnce(reply(JSON.stringify(FULL)))
    await expect(extractPaperMetadata(['page one'])).resolves.toEqual(FULL)
  })

  it('defaults any missing field to an empty string', async () => {
    createMock.mockResolvedValueOnce(reply(JSON.stringify({ title: 'Partial Paper' })))
    await expect(extractPaperMetadata(['text'])).resolves.toEqual({
      title: 'Partial Paper',
      authors: '',
      year: '',
      keywords: '',
      synopsis: '',
    })
  })

  it('returns an empty draft when the model output is not valid JSON', async () => {
    createMock.mockResolvedValueOnce(reply('sorry, I could not read that PDF'))
    await expect(extractPaperMetadata(['text'])).resolves.toEqual({})
  })

  it('returns an empty draft when null content comes back', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
    await expect(extractPaperMetadata(['text'])).resolves.toEqual({})
  })

  it('makes a single attempt and swallows an API error into an empty draft', async () => {
    createMock.mockRejectedValueOnce(new Error('rate limited'))
    await expect(extractPaperMetadata(['text'])).resolves.toEqual({})
    expect(createMock).toHaveBeenCalledTimes(1) // no retries
  })

  it('asks Groq for the spec model in JSON mode', async () => {
    createMock.mockResolvedValueOnce(reply(JSON.stringify(FULL)))
    await extractPaperMetadata(['text'])
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
      }),
    )
  })
})
