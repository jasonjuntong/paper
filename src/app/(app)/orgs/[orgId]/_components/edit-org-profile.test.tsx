import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ORG-002 unit lane (form half). EditOrgProfile owns: populating from the
// server-rendered props, the dirty check that gates Save, name-required
// validation blocking submit, the PATCH payload it assembles (mark upper-cased,
// description clearable), and the success (refresh) / error (mapped message)
// branches. next/navigation + fetch are mocked so this is offline and we assert
// only our logic, not that the Input/Textarea render.
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

import { EditOrgProfile } from './edit-org-profile'

const fetchMock = vi.fn()

function renderForm(overrides?: Partial<React.ComponentProps<typeof EditOrgProfile>>) {
  render(
    <EditOrgProfile
      orgId="org-1"
      initialName="Robotics Lab"
      initialMark="RL"
      initialDescription="We read robotics papers."
      {...overrides}
    />
  )
}

const nameField = () => screen.getByLabelText('NAME *')
const markField = () => screen.getByLabelText('MARK *')
const descField = () => screen.getByLabelText(/DESCRIPTION/)
const saveBtn = () => screen.getByRole('button', { name: 'Save changes' })

beforeEach(() => {
  refreshMock.mockReset()
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({
      name: 'Robotics Lab',
      mark: 'RL',
      description: 'We read robotics papers.',
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
})

describe('EditOrgProfile — dirty gating', () => {
  it('populates the fields from props and disables Save until a change is made', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(nameField()).toHaveValue('Robotics Lab')
    expect(markField()).toHaveValue('RL')
    expect(saveBtn()).toBeDisabled()

    await user.type(nameField(), '!')
    expect(saveBtn()).toBeEnabled()
  })
})

describe('EditOrgProfile — submit', () => {
  it('blocks submit and shows an error when name is cleared', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(nameField())
    await user.click(saveBtn())

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('PATCHes the assembled payload (mark upper-cased) then refreshes', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(nameField())
    await user.type(nameField(), 'Deep RL')
    await user.clear(markField())
    await user.type(markField(), 'dr')
    await user.click(saveBtn())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/orgs/org-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Deep RL',
      mark: 'DR',
      description: 'We read robotics papers.',
    })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })

  it('sends an empty description when it is cleared', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(descField())
    await user.click(saveBtn())

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).description).toBe('')
  })

  it('surfaces the server error message on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Only the admin can edit this org' }),
    })
    const user = userEvent.setup()
    renderForm()

    await user.type(nameField(), '!')
    await user.click(saveBtn())

    expect(
      await screen.findByText('Only the admin can edit this org')
    ).toBeInTheDocument()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  // INFRA-005: Save carries `aria-busy` while the PATCH is in flight.
  it('marks Save aria-busy while saving', async () => {
    let resolve!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    renderForm()

    await user.type(nameField(), '!')
    const save = saveBtn()
    await user.click(save)

    expect(save).toHaveAttribute('aria-busy', 'true')
    expect(save).toBeDisabled()

    resolve({
      ok: true,
      json: async () => ({
        name: 'Robotics Lab!',
        mark: 'RL',
        description: 'We read robotics papers.',
      }),
    })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })
})

// INFRA-005: the card is a real <form> — Enter submits, but only when dirty.
describe('EditOrgProfile — Enter to submit', () => {
  it('submits on Enter within a field once dirty', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(nameField(), '!{Enter}')

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orgs/org-1')
  })

  it('does not submit on Enter while nothing has changed', async () => {
    const user = userEvent.setup()
    renderForm()

    // Focus a field and press Enter without editing → still pristine.
    nameField().focus()
    await user.keyboard('{Enter}')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
