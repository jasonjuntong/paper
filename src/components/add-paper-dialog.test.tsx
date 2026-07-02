import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// PAPER-002 unit lane (review-form half). The review step is a draft editor: the
// Groq draft renders read-only, unlocks per-field via a pencil, warns before
// saving edits to an extracted value, and gates save on all five fields. We
// drive the dialog through its own state machine to the review step, then assert
// that behaviour. Everything network/PDF-shaped is mocked so this stays offline:
//   - pdfjs-dist + @/lib/pdf-upload: the client extract/hash pre-flight
//   - fetch: /api/papers/init (returns the draft we control) and /commit
//   - next/navigation: router used on success
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/pdf-upload', () => ({
  isPdfFile: () => true,
  computeSHA256: async () => 'deadbeef',
}))

vi.mock('pdfjs-dist', () => ({
  version: '0.0.0',
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: [{ str: 'text' }] }),
      }),
    }),
  }),
}))

import { AddPaperDialog } from './add-paper-dialog'
import type { PaperMetadataDraft } from '@/types/paper'

const HELPER =
  'Due to the complexity of the PDF content structure, the required information could not be extracted.'

const FULL: PaperMetadataDraft = {
  title: 'The Title',
  authors: 'Ada Lovelace',
  year: '2020',
  keywords: 'alpha, beta',
  synopsis: 'A short synopsis of the paper.',
}

const fetchMock = vi.fn()

function jsonOk(data: unknown) {
  return Promise.resolve({ ok: true, json: async () => data })
}

// Route init → the draft under test; commit → a generic success.
function wireFetch(draft: PaperMetadataDraft) {
  fetchMock.mockImplementation((url: string) => {
    if (String(url).includes('/api/papers/init')) {
      return jsonOk({ status: 'ok', draft, existingPaperId: null })
    }
    if (String(url).includes('/api/papers/commit')) {
      return jsonOk({ status: 'ok', entryId: 'e1', paperId: 'p1' })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
}

// Select a PDF, hit Continue, land on the review step with the given draft.
async function reachReview(
  user: ReturnType<typeof userEvent.setup>,
  draft: PaperMetadataDraft,
) {
  wireFetch(draft)
  render(<AddPaperDialog open onOpenChange={() => {}} />)
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  await user.upload(input, new File(['%PDF-1.4'], 'paper.pdf', { type: 'application/pdf' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByText('Review paper details')
}

function committed() {
  return fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/papers/commit'))
}

describe('AddPaperDialog — review form (PAPER-002)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders extracted fields read-only, each with a pencil and no editable input', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    // Every field shows its extracted value…
    expect(screen.getByText('The Title')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    // …behind a pencil, and nothing is editable yet.
    expect(screen.getAllByRole('button', { name: 'Edit field' })).toHaveLength(5)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('unlocks a single field for editing when its pencil is clicked', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    // First pencil is Title.
    await user.click(screen.getAllByRole('button', { name: 'Edit field' })[0])

    const box = screen.getByRole('textbox')
    expect(box).toHaveValue('The Title')
    // The other four stay locked.
    expect(screen.getAllByRole('button', { name: 'Edit field' })).toHaveLength(4)
  })

  it('renders unextracted fields immediately editable with the exact helper text', async () => {
    const user = userEvent.setup()
    await reachReview(user, {}) // empty extraction — nothing came back

    // All five are pre-unlocked (no pencils to click), each with the helper line.
    expect(screen.queryByRole('button', { name: 'Edit field' })).toBeNull()
    expect(screen.getAllByText(HELPER)).toHaveLength(5)
  })

  it('never surfaces the words "AI" or "metadata" in the review UI', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/metadata/i)
    expect(text).not.toMatch(/\bAI\b/)
  })

  it('blocks save and shows an error when a required field is left empty', async () => {
    const user = userEvent.setup()
    // Title came back empty → editable and blank; the rest are valid.
    await reachReview(user, { ...FULL, title: '' })

    await user.click(screen.getByRole('button', { name: 'Save to library' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(committed()).toBe(false)
  })

  it('warns before saving when an extracted value was modified, and only commits on Proceed', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    await user.click(screen.getAllByRole('button', { name: 'Edit field' })[0]) // unlock Title
    const box = screen.getByRole('textbox')
    await user.clear(box)
    await user.type(box, 'A Different Title')
    await user.click(screen.getByRole('button', { name: 'Save to library' }))

    // Blocking discrepancy dialog — no commit yet.
    expect(await screen.findByText('Changes detected in paper details')).toBeInTheDocument()
    expect(committed()).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Proceed' }))
    await waitFor(() => expect(committed()).toBe(true))
  })

  it('lets "Go back" return to the form without committing', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    await user.click(screen.getAllByRole('button', { name: 'Edit field' })[0])
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Changed')
    await user.click(screen.getByRole('button', { name: 'Save to library' }))

    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(screen.getByText('Review paper details')).toBeInTheDocument()
    expect(committed()).toBe(false)
  })

  it('commits directly with no warning when nothing was changed', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    await user.click(screen.getByRole('button', { name: 'Save to library' }))

    await waitFor(() => expect(committed()).toBe(true))
    expect(screen.queryByText('Changes detected in paper details')).toBeNull()
  })

  it('sends the confirmed fields and the raw extracted copy on commit', async () => {
    const user = userEvent.setup()
    await reachReview(user, FULL)

    await user.click(screen.getByRole('button', { name: 'Save to library' }))
    await waitFor(() => expect(committed()).toBe(true))

    const commitCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/api/papers/commit'),
    )!
    const fd = commitCall[1].body as FormData
    // Confirmed copy…
    expect(fd.get('title')).toBe('The Title')
    // …plus the immutable extracted copy for embedding/discoverability.
    expect(fd.get('emTitle')).toBe('The Title')
    expect(fd.get('emYear')).toBe('2020')
  })
})
