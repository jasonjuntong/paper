import { test, expect, type Page } from '@playwright/test'
import { getUidByEmail, getVerificationCode, resetEmulators, seedLibraryEntry } from './helpers/emulator'

// PAPER-018 end-to-end: opening a paper records `lastOpenedAt` on the library
// entry, which powers the dashboard "Continue reading" surface. We seed entries
// directly into the emulator (the commit flow needs Gemini + Cloud Storage,
// neither emulated) — crucially *without* a lastOpenedAt — then drive the real
// detail page, whose <MarkOpened> fires POST /api/papers/touch on mount. Because
// the dashboard query orders by `lastOpenedAt` (which excludes docs missing the
// field), a seeded-but-unopened entry stays out of Continue reading until it's
// actually opened.

function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

async function registerVerifiedAndLogin(page: Page, u: ReturnType<typeof newUser>) {
  await page.goto('/register')
  await page.locator('#name').fill(u.name)
  await page.locator('#handle').fill(u.handle)
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('**/verify-email')

  const code = await getVerificationCode(u.email)
  await page.goto(`/verify-email?code=${code}`)
  await expect(page.getByText('Email verified')).toBeVisible()

  await page.goto('/login')
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

const ALPHA = {
  paperId: 'paper-a',
  title: 'Alpha Paper',
  authors: 'Ada Lovelace',
  year: 2021,
  keywords: 'alpha, beta',
  synopsis: 'The first paper.',
  createdAt: '2024-01-01T00:00:00Z',
}
const BETA = {
  paperId: 'paper-b',
  title: 'Beta Paper',
  authors: 'Grace Hopper',
  year: 2019,
  keywords: 'gamma, delta',
  synopsis: 'The second paper.',
  createdAt: '2024-01-02T00:00:00Z',
}

// Open a paper's detail page and wait for the read-tracking touch to land.
async function openPaper(page: Page, paperId: string) {
  await page.goto(`/library/${paperId}`)
  await page.waitForResponse(
    (res) => res.url().includes('/api/papers/touch') && res.request().method() === 'POST',
  )
}

// The dashboard LIBRARY card links to `/library` exactly, so `^="/library/"`
// uniquely targets the Continue-reading rows (which link to `/library/{paperId}`).
function continueReadingLinks(page: Page) {
  return page.locator('a[href^="/library/"]')
}

test.beforeEach(async () => {
  await resetEmulators()
})

test('opening a paper records it in Continue reading', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  const uid = await getUidByEmail(u.email)
  await seedLibraryEntry(uid, ALPHA)

  // Seeded but never opened: Continue reading shows the empty state.
  await page.goto('/')
  await expect(page.getByText('No papers opened yet')).toBeVisible()

  // Open it — <MarkOpened> fires the touch, recording lastOpenedAt.
  await openPaper(page, ALPHA.paperId)

  // Back on the dashboard it now surfaces in Continue reading.
  await page.goto('/')
  await expect(page.getByText('No papers opened yet')).toHaveCount(0)
  await expect(continueReadingLinks(page).filter({ hasText: 'Alpha Paper' })).toBeVisible()
})

test('Continue reading orders papers by most-recently-opened', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  const uid = await getUidByEmail(u.email)
  await seedLibraryEntry(uid, ALPHA)
  await seedLibraryEntry(uid, BETA)

  // Open Alpha, then Beta — Beta is now the most recently opened.
  await openPaper(page, ALPHA.paperId)
  await openPaper(page, BETA.paperId)

  await page.goto('/')
  await expect(continueReadingLinks(page).nth(0)).toContainText('Beta Paper')
  await expect(continueReadingLinks(page).nth(1)).toContainText('Alpha Paper')

  // Re-open Alpha — recency, not seed order, drives the list, so Alpha moves up.
  await openPaper(page, ALPHA.paperId)

  await page.goto('/')
  await expect(continueReadingLinks(page).nth(0)).toContainText('Alpha Paper')
  await expect(continueReadingLinks(page).nth(1)).toContainText('Beta Paper')
})
