import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// PAPER-006 unit lane (delete half). DeletePaperDialog drives a confirm →
// deleting → done state machine off POST /api/papers/delete, and rewinds to
// confirm if the request fails. We assert the request it sends and each branch
// of the machine. router + fetch are mocked so the test stays offline.
const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import { DeletePaperDialog } from './delete-paper-dialog'

const fetchMock = vi.fn()

function renderDialog() {
  render(
    <DeletePaperDialog entryId="e1" title="The Title" open onOpenChange={() => {}} />,
  )
}

function deleteCall() {
  return fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/papers/delete'))
}

describe('DeletePaperDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    pushMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('confirms against the paper title before deleting', () => {
    renderDialog()
    expect(screen.getByText('The Title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('posts the entry id and reaches the done state on success', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(deleteCall()).toBeDefined())
    const [, init] = deleteCall()!
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ entryId: 'e1' })
    expect(await screen.findByText('Removed from library')).toBeInTheDocument()
  })

  it('returns to the confirm step when the delete request fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'nope' }) })
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    // Back on confirm — the Remove button is available again and we never
    // transitioned to the done state.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled(),
    )
    expect(screen.queryByText('Removed from library')).toBeNull()
  })
})
