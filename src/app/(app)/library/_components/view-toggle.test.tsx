import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// INFRA-005 unit lane. ViewToggle is a single-select segmented control; the
// behavior we own is (1) exposing the active view to assistive tech via
// `aria-pressed` inside a labelled group, and (2) reporting the picked view.
import { ViewToggle } from './view-toggle'

describe('ViewToggle (INFRA-005)', () => {
  it('exposes the active view via aria-pressed', () => {
    render(<ViewToggle current="list" onChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('reports the picked view to onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewToggle current="list" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Grid view' }))

    expect(onChange).toHaveBeenCalledWith('grid')
  })
})
