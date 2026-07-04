import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ContinueReading } from './continue-reading'

// PAPER-018 (unit lane): ContinueReading is a pure presentational component fed
// the recently-opened list from the dashboard. The recency *ordering* is the
// Firestore query's job, so we don't re-test it here — we assert only the logic
// this component owns: the empty-state branch, the paperId-based href (the row
// is keyed by entryId but links to paperId), and keyword normalization.

const PAPER = {
  entryId: 'entry-1',
  paperId: 'paper-1',
  title: 'Alpha Paper',
  authors: 'Ada Lovelace',
  year: 2021,
  keywords: 'Machine Learning, NLP',
  synopsis: 'A short synopsis.',
}

describe('ContinueReading (PAPER-018)', () => {
  it('shows the empty state and no paper links when nothing has been opened', () => {
    render(<ContinueReading papers={[]} />)

    expect(screen.getByText('No papers opened yet')).toBeInTheDocument()
    expect(
      document.querySelectorAll('a[href^="/library/"]'),
    ).toHaveLength(0)
  })

  it('links each entry to its paperId route, not its entryId', () => {
    render(<ContinueReading papers={[PAPER]} />)

    const link = screen.getByRole('link', { name: /Alpha Paper/ })
    expect(link).toHaveAttribute('href', '/library/paper-1')
    expect(screen.queryByText('No papers opened yet')).not.toBeInTheDocument()
  })

  it('normalizes keywords into lowercase, hyphenated pills', () => {
    render(<ContinueReading papers={[PAPER]} />)

    expect(screen.getByText('#machine-learning')).toBeInTheDocument()
    expect(screen.getByText('#nlp')).toBeInTheDocument()
    // The raw, un-normalized form is never rendered.
    expect(screen.queryByText('#Machine Learning')).not.toBeInTheDocument()
  })
})
