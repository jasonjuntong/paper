import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// PAPER-006 unit lane (edit half). EditPaperDialog is a per-field-unlock editor
// that Zod-validates the five fields, gates the PATCH on that validation, and
// posts to /api/papers/update. We drive its own state machine and assert the
// validation gating, the request it sends, and the success transition. router
// and fetch are mocked so the test stays offline.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { EditPaperDialog, type PaperMetadata } from './edit-paper-dialog'

const PAPER: PaperMetadata = {
  paperId: 'p1',
  title: 'The Title',
  authors: 'Ada Lovelace',
  year: 2020,
  keywords: 'alpha, beta',
  synopsis: 'A short synopsis of the paper.',
}

const fetchMock = vi.fn()

function renderDialog() {
  render(<EditPaperDialog entryId="e1" paper={PAPER} open onOpenChange={() => {}} />)
}

// Fields render read-only behind a pencil; click it to unlock the input.
function pencils() {
  return screen.getAllByRole('button', { name: 'Edit field' })
}
const FIELD_INDEX = { title: 0, authors: 1, year: 2, keywords: 3, synopsis: 4 }

function updateCall() {
  return fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/papers/update'))
}

describe('EditPaperDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders the confirmed fields read-only, one pencil per field', () => {
    renderDialog()
    expect(screen.getByText('The Title')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(pencils()).toHaveLength(5)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('unlocks only the field whose pencil was clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(pencils()[FIELD_INDEX.title])

    expect(screen.getByRole('textbox')).toHaveValue('The Title')
    expect(pencils()).toHaveLength(4)
  })

  it('blocks the update and shows an error for a missing year', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(pencils()[FIELD_INDEX.year])
    // Clear the year → empty passes the input's native number constraints (it
    // isn't `required`) but fails the schema's 4-digit regex, so we exercise the
    // Zod gate rather than the browser's. (A value like "12" would be rejected
    // by the input's own min=1000 before submit ever fires.)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid 4-digit year')).toBeInTheDocument()
    expect(updateCall()).toBeUndefined()
  })

  it('blocks the update and shows an error for a blank required field', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(pencils()[FIELD_INDEX.title])
    await user.clear(screen.getByRole('textbox'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(updateCall()).toBeUndefined()
  })

  it('clears a field error once the user edits that field', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(pencils()[FIELD_INDEX.title])
    await user.clear(screen.getByRole('textbox'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Title is required')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), 'A New Title')

    expect(screen.queryByText('Title is required')).toBeNull()
  })

  it('posts the entry id and all five fields, then shows the success state', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateCall()).toBeDefined())
    const [, init] = updateCall()!
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      entryId: 'e1',
      title: 'The Title',
      authors: 'Ada Lovelace',
      year: '2020',
      keywords: 'alpha, beta',
      synopsis: 'A short synopsis of the paper.',
    })
    expect(await screen.findByText('Details updated')).toBeInTheDocument()
  })

  it('sends the edited value when a field is changed', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(pencils()[FIELD_INDEX.title])
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'A Different Title')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateCall()).toBeDefined())
    expect(JSON.parse(updateCall()![1].body).title).toBe('A Different Title')
  })
})
