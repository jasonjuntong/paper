import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// SettingsClient imports the Firebase client (inits the SDK at module load) and
// firebase/auth for the password section. Both are mocked so this stays a pure,
// offline component test.
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
}))
vi.mock('@/lib/firebase/client', () => ({ auth: {} }))

import { SettingsClient } from './settings-client'

// INFRA-004 (design-language conformance): the notification-preference failure
// renders the amber "danger notification" banner. The only behavior this ticket
// adds is the dismiss ✕ — assert the banner appears on a failed toggle and that
// dismissing it clears the message. Pure styling (colors/icon) is not tested.

const INITIAL = {
  name: 'Ada Lovelace',
  handle: 'ada',
  email: 'ada@example.com',
  notificationEmail: false,
}

const BANNER = /couldn't update your preference/i

describe('SettingsClient notification banner (INFRA-004)', () => {
  beforeEach(() => {
    // Failed toggle → the catch branch sets the error banner.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not show the banner before any failure', () => {
    render(<SettingsClient initial={INITIAL} />)
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
  })

  it('shows the banner on a failed toggle, then clears it when dismissed', async () => {
    const user = userEvent.setup()
    render(<SettingsClient initial={INITIAL} />)

    await user.click(screen.getByRole('switch', { name: /email notifications/i }))

    expect(await screen.findByText(BANNER)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
  })
})
