import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// INFRA-005 unit lane (toggle semantics). OrgManage's OptionPill controls are
// single-select; the behavior we own is exposing the active visibility / join
// policy to assistive tech via `aria-pressed`. next/navigation is mocked because
// OrgManage (via EditOrgProfile) reads useRouter; no request fires on render.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { OrgManage } from './org-manage'

describe('OrgManage — toggle semantics (INFRA-005)', () => {
  it('marks the active visibility and join-policy pills aria-pressed', () => {
    render(
      <OrgManage
        orgId="o1"
        name="Robotics Lab"
        mark="RL"
        description=""
        visibility="public"
        joinPolicy="request"
        inviteCount={0}
      />
    )

    expect(screen.getByRole('button', { name: 'Public' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Private' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'request' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'open' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })
})
