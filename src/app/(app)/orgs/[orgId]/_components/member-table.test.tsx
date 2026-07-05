import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ORG-006 unit lane. MemberTable owns the roster display logic: mapping each
// row's role to a badge (exactly one Admin), flagging the current user with a
// "You" badge, formatting the join timestamp (ISO date or an em dash when
// absent), the case-insensitive name/handle search filter, the no-match empty
// state, and the "+N more" cap hint. We assert that owned logic only — not that
// shadcn's Table/Badge/Avatar render their own props.
import { MemberTable, type MemberRow } from './member-table'

function member(overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    uid: 'u1',
    name: 'Ada Lovelace',
    handle: 'ada',
    role: 'member',
    joinedAt: 0,
    sharedCount: 0,
    ...overrides,
  }
}

// A row's role badge is the only "Admin"/"Member" text inside its <tr> (the
// column header lives in <thead>), so scope by row to read it back.
function rowFor(name: string): HTMLElement {
  const cell = screen.getByText(name)
  const row = cell.closest('tr')
  if (!row) throw new Error(`no row for ${name}`)
  return row
}

function renderTable(overrides?: {
  members?: MemberRow[]
  currentUid?: string
  totalCount?: number
}) {
  const members = overrides?.members ?? [
    member({ uid: 'admin', name: 'Alan Turing', handle: 'alan', role: 'admin' }),
    member({ uid: 'u1', name: 'Ada Lovelace', handle: 'ada' }),
    member({ uid: 'u2', name: 'Grace Hopper', handle: 'grace' }),
  ]
  render(
    <MemberTable
      members={members}
      currentUid={overrides?.currentUid ?? 'admin'}
      totalCount={overrides?.totalCount ?? members.length}
    />
  )
}

describe('MemberTable — role badges', () => {
  it('shows exactly one Admin badge and a Member badge on every other row', () => {
    renderTable()

    expect(screen.getAllByText('Admin')).toHaveLength(1)
    expect(within(rowFor('Alan Turing')).getByText('Admin')).toBeInTheDocument()
    expect(within(rowFor('Ada Lovelace')).getByText('Member')).toBeInTheDocument()
    expect(within(rowFor('Grace Hopper')).getByText('Member')).toBeInTheDocument()
  })
})

describe('MemberTable — current-user marker', () => {
  it('renders the "You" badge only on the viewer\'s row', () => {
    renderTable({ currentUid: 'u1' })

    expect(screen.getAllByText('You')).toHaveLength(1)
    expect(within(rowFor('Ada Lovelace')).getByText('You')).toBeInTheDocument()
    expect(within(rowFor('Alan Turing')).queryByText('You')).toBeNull()
  })
})

describe('MemberTable — join timestamp', () => {
  it('formats a real timestamp as an ISO date and an absent one as an em dash', () => {
    renderTable({
      members: [
        member({ uid: 'u1', name: 'Ada Lovelace', joinedAt: Date.UTC(2026, 0, 15) }),
        member({ uid: 'u2', name: 'Grace Hopper', joinedAt: 0 }),
      ],
      currentUid: 'nobody',
    })

    expect(within(rowFor('Ada Lovelace')).getByText('2026-01-15')).toBeInTheDocument()
    expect(within(rowFor('Grace Hopper')).getByText('—')).toBeInTheDocument()
  })
})

describe('MemberTable — search', () => {
  it('filters by name, case-insensitively', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.type(screen.getByRole('searchbox'), 'ADA')

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText('Alan Turing')).toBeNull()
    expect(screen.queryByText('Grace Hopper')).toBeNull()
  })

  it('filters by handle', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.type(screen.getByRole('searchbox'), 'grace')

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).toBeNull()
  })

  it('shows an empty state and no rows when nothing matches', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.type(screen.getByRole('searchbox'), 'zzz')

    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.getByText(/No members match/)).toBeInTheDocument()
    expect(screen.queryByText('Ada Lovelace')).toBeNull()
    expect(screen.queryByText('Alan Turing')).toBeNull()
  })
})

describe('MemberTable — cap hint', () => {
  it('shows "+N more" when the preview is capped and hides it while searching', async () => {
    const user = userEvent.setup()
    renderTable({ totalCount: 5 })

    expect(screen.getByText('+2 more')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'ada')
    expect(screen.queryByText(/more/)).toBeNull()
  })

  it('omits the hint when the whole roster is shown', () => {
    renderTable({ totalCount: 3 })

    expect(screen.queryByText(/more/)).toBeNull()
  })
})
