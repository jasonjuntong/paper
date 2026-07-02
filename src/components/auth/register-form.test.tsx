import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The form does one network read for live handle availability and one fetch to
// /api/auth/register on submit. Both are mocked so this stays a pure, offline
// component test. The pure handle helpers (@/lib/handles) are left real — they
// have no network/firebase imports and drive the reserved-handle branch.
const availMock = vi.fn()
vi.mock('@/lib/handles.client', () => ({
  checkHandleAvailability: (...args: unknown[]) => availMock(...args),
}))

import { RegisterForm } from './register-form'

const fetchMock = vi.fn()

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Handle'), 'researcher')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret123')
}

describe('RegisterForm', () => {
  beforeEach(() => {
    availMock.mockReset()
    availMock.mockResolvedValue(true)
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders the name, handle, email, password, and submit controls', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Handle')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('rejects an invalid email and never calls the register endpoint', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
    await user.type(screen.getByLabelText('Handle'), 'researcher')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 8 characters', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace')
    await user.type(screen.getByLabelText('Handle'), 'researcher')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Password must be at least 8 characters')
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a live "available" indicator once a valid handle is looked up', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Handle'), 'researcher')

    expect(await screen.findByLabelText('Handle available')).toBeInTheDocument()
    expect(availMock).toHaveBeenCalledWith('researcher')
  })

  it('marks a reserved handle as taken without querying availability', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Handle'), 'admin')

    expect(await screen.findByLabelText('Handle already taken')).toBeInTheDocument()
    // Reserved handles fail the schema, so the availability read is never issued.
    expect(availMock).not.toHaveBeenCalledWith('admin')
  })

  it('surfaces a handle_taken conflict from the server', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'handle_taken' }),
    })
    const user = userEvent.setup()
    render(<RegisterForm />)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('This handle is already taken')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })
})
