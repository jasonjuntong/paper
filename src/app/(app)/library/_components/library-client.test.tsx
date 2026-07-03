import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// PAPER-006 unit lane (browse half). LibraryClient owns two pieces of real
// client logic worth testing: the shared/private filter (which rows + tab counts
// it derives) and the list/grid view toggle it persists to localStorage via
// useSyncExternalStore. Everything else on the page is prop-only presentation.
// We mock router (PaperTable navigates on row click) and the add-paper button
// (it would otherwise pull in pdfjs) so this stays offline.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/components/add-paper-button', () => ({
  AddPaperButton: () => <button type="button">Add paper</button>,
}))

import { LibraryClient } from './library-client'
import type { PaperRow } from './paper-table'

function row(overrides: Partial<PaperRow>): PaperRow {
  return {
    entryId: 'e1',
    paperId: 'p1',
    title: 'A Paper',
    authors: 'Ada Lovelace',
    year: 2020,
    keywords: 'alpha, beta',
    synopsis: 'A short synopsis.',
    addedAt: new Date('2024-01-01T00:00:00Z'),
    shared: false,
    ...overrides,
  }
}

const ROWS: PaperRow[] = [
  row({ entryId: 's1', paperId: 'ps', title: 'Shared Alpha', shared: true }),
  row({ entryId: 'p2', paperId: 'pp', title: 'Private Beta', shared: false }),
]

// The filter tabs are buttons whose accessible name is "<label> <count>".
function tab(name: RegExp) {
  return screen.getByRole('button', { name })
}

describe('LibraryClient — shared/private filter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('labels each tab with the correct count', () => {
    render(<LibraryClient rows={ROWS} />)
    expect(tab(/^All\s*2$/)).toBeInTheDocument()
    expect(tab(/^Shared\s*1$/)).toBeInTheDocument()
    expect(tab(/^Private\s*1$/)).toBeInTheDocument()
  })

  it('shows every row on the All tab', () => {
    render(<LibraryClient rows={ROWS} />)
    expect(screen.getByText('Shared Alpha')).toBeInTheDocument()
    expect(screen.getByText('Private Beta')).toBeInTheDocument()
  })

  it('narrows to only shared rows on the Shared tab', async () => {
    const user = userEvent.setup()
    render(<LibraryClient rows={ROWS} />)

    await user.click(tab(/^Shared\s*1$/))

    expect(screen.getByText('Shared Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Private Beta')).toBeNull()
  })

  it('narrows to only private rows on the Private tab', async () => {
    const user = userEvent.setup()
    render(<LibraryClient rows={ROWS} />)

    await user.click(tab(/^Private\s*1$/))

    expect(screen.getByText('Private Beta')).toBeInTheDocument()
    expect(screen.queryByText('Shared Alpha')).toBeNull()
  })
})

describe('LibraryClient — view toggle persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to the list (table) view when nothing is stored', () => {
    render(<LibraryClient rows={ROWS} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('reads the initial view from localStorage', () => {
    localStorage.setItem('library-view', 'grid')
    render(<LibraryClient rows={ROWS} />)
    // Grid view renders cards, not a table.
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('switches to grid and writes the choice to localStorage', async () => {
    const user = userEvent.setup()
    render(<LibraryClient rows={ROWS} />)

    await user.click(screen.getByRole('button', { name: 'Grid view' }))

    expect(screen.queryByRole('table')).toBeNull()
    expect(localStorage.getItem('library-view')).toBe('grid')
  })

  it('switches back to list and persists that too', async () => {
    const user = userEvent.setup()
    localStorage.setItem('library-view', 'grid')
    render(<LibraryClient rows={ROWS} />)

    await user.click(screen.getByRole('button', { name: 'List view' }))

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(localStorage.getItem('library-view')).toBe('list')
  })

  it('keeps the active filter when the view changes', async () => {
    const user = userEvent.setup()
    render(<LibraryClient rows={ROWS} />)

    await user.click(tab(/^Shared\s*1$/))
    await user.click(screen.getByRole('button', { name: 'Grid view' }))

    // Still only the shared row, now rendered as a grid card.
    expect(screen.getByText('Shared Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Private Beta')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

// Guard: the header count reads off the full row set, not the filtered view.
describe('LibraryClient — header', () => {
  beforeEach(() => localStorage.clear())

  it('reports the total paper count regardless of the active tab', async () => {
    const user = userEvent.setup()
    render(<LibraryClient rows={ROWS} />)
    const header = screen.getByRole('heading', { name: 'My Library' }).parentElement!

    await user.click(tab(/^Shared\s*1$/))

    expect(within(header).getByText(/2 papers/)).toBeInTheDocument()
  })
})
