import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ORG-001 unit lane (form half). The dialog owns: the pre-selected defaults
// (public + by-request), the visibility↔join-policy coupling in the UI (picking
// Private forces invite-only and disables the public policies, and back again),
// validation gating the submit, the POST payload it assembles, and the
// success/error branches. next/navigation + fetch are mocked so this is offline
// and we assert only our logic, not that Radix renders a dialog.
const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import { CreateOrgDialog } from './create-org-dialog'

const fetchMock = vi.fn()

function jsonOk(data: unknown) {
  return Promise.resolve({ ok: true, json: async () => data })
}

function renderDialog() {
  const onOpenChange = vi.fn()
  render(<CreateOrgDialog open onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

// Segmented options render as buttons labelled by their text; the active one
// carries the `bg-pill` class and disabled ones the `disabled` attribute.
function seg(name: string) {
  return screen.getByRole('button', { name })
}

const nameField = () =>
  screen.getByPlaceholderText('e.g. Diffusion Models Reading Group')
const markField = () => screen.getByPlaceholderText('AB')
const createBtn = () => screen.getByRole('button', { name: 'Create Org' })

beforeEach(() => {
  pushMock.mockReset()
  refreshMock.mockReset()
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ orgId: 'new-1' }) })
  vi.stubGlobal('fetch', fetchMock)
})

describe('CreateOrgDialog — defaults + invariant coupling', () => {
  it('pre-selects public + by-request, with invite-only disabled', () => {
    renderDialog()
    expect(seg('Public')).toHaveClass('bg-pill')
    expect(seg('by request')).toHaveClass('bg-pill')
    expect(seg('invite-only')).toBeDisabled()
  })

  it('forces invite-only when Private is chosen, disabling the public policies', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(seg('Private'))

    expect(seg('invite-only')).toHaveClass('bg-pill')
    expect(seg('invite-only')).toBeEnabled()
    expect(seg('open')).toBeDisabled()
    expect(seg('by request')).toBeDisabled()
  })

  it('moves off invite-only back to by-request when Public is re-selected', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(seg('Private'))
    await user.click(seg('Public'))

    expect(seg('by request')).toHaveClass('bg-pill')
    expect(seg('invite-only')).toBeDisabled()
  })
})

describe('CreateOrgDialog — submit', () => {
  it('blocks submit and shows an error when name is empty', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(createBtn())

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the assembled payload (upper-cased mark, defaults) and routes to the new org', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    // Typing the name auto-derives the mark ("robotics lab" → "RL").
    await user.type(nameField(), 'robotics lab')
    expect(markField()).toHaveValue('RL')

    await user.click(createBtn())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/orgs')
    expect(JSON.parse(init.body)).toEqual({
      name: 'robotics lab',
      mark: 'RL',
      description: '',
      visibility: 'public',
      joinPolicy: 'request',
    })

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/orgs/new-1'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('surfaces an error and stays open when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    renderDialog()

    await user.type(nameField(), 'Robotics Lab')
    await user.click(createBtn())

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  // INFRA-005: the submit button carries `aria-busy` while the POST is in flight.
  it('marks the submit button aria-busy while creating', async () => {
    let resolve!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    renderDialog()

    await user.type(nameField(), 'Robotics Lab')
    const create = createBtn()
    expect(create).toHaveAttribute('aria-busy', 'false')

    await user.click(create)
    expect(create).toHaveAttribute('aria-busy', 'true')
    expect(create).toBeDisabled()

    resolve({ ok: true, json: async () => ({ orgId: 'new-1' }) })
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
  })

  // INFRA-005: the dialog is a real <form>, so Enter in a field submits it.
  it('submits on Enter pressed within a field', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(nameField(), 'Robotics Lab{Enter}')

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orgs')
  })
})

// INFRA-005: the segmented controls expose their selection to assistive tech.
describe('CreateOrgDialog — toggle semantics', () => {
  it('marks the active segment aria-pressed and the others not', () => {
    renderDialog()
    expect(seg('Public')).toHaveAttribute('aria-pressed', 'true')
    expect(seg('Private')).toHaveAttribute('aria-pressed', 'false')
    expect(seg('by request')).toHaveAttribute('aria-pressed', 'true')
    expect(seg('open')).toHaveAttribute('aria-pressed', 'false')
  })
})
