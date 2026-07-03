import { test, expect, type Page } from '@playwright/test'
import { getUidByEmail, getVerificationCode, resetEmulators, seedLibraryEntry } from './helpers/emulator'

// PAPER-006 end-to-end: the library entry is the source of truth for display.
// We can't drive the commit flow offline (it needs Gemini embeddings + Cloud
// Storage), so we seed entries directly into the emulator and exercise the rest
// of the CRUD surface in the browser: browse (filters + view toggle) → detail →
// edit → delete, with the detail/list views reading straight from the entry.

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

const SHARED = {
  paperId: 'paper-shared',
  title: 'Shared E2E Paper',
  authors: 'Ada Lovelace',
  year: 2021,
  keywords: 'alpha, beta',
  synopsis: 'A paper shared to an org.',
  shares: ['org-1'],
  createdAt: '2024-02-01T00:00:00Z',
}
const PRIVATE = {
  paperId: 'paper-private',
  title: 'Private E2E Paper',
  authors: 'Grace Hopper',
  year: 2019,
  keywords: 'gamma, delta',
  synopsis: 'A paper kept private.',
  shares: [],
  createdAt: '2024-01-01T00:00:00Z',
}

test.beforeEach(async () => {
  await resetEmulators()
})

test('browse → filter → view toggle → detail → edit → delete', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  const uid = await getUidByEmail(u.email)
  await seedLibraryEntry(uid, SHARED)
  await seedLibraryEntry(uid, PRIVATE)

  // Browse: both entries read from the library, list (table) view by default.
  await page.goto('/library')
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByText('Shared E2E Paper')).toBeVisible()
  await expect(page.getByText('Private E2E Paper')).toBeVisible()

  // Filter: Shared shows only the shared entry…
  await page.getByRole('button', { name: /^Shared/ }).click()
  await expect(page.getByText('Shared E2E Paper')).toBeVisible()
  await expect(page.getByText('Private E2E Paper')).toHaveCount(0)

  // …Private shows only the private entry.
  await page.getByRole('button', { name: /^Private/ }).click()
  await expect(page.getByText('Private E2E Paper')).toBeVisible()
  await expect(page.getByText('Shared E2E Paper')).toHaveCount(0)

  await page.getByRole('button', { name: /^All/ }).click()

  // View toggle: grid drops the table for cards; both entries still shown.
  await page.getByRole('button', { name: 'Grid view' }).click()
  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByText('Private E2E Paper')).toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByRole('table')).toBeVisible()

  // Detail: the page reads title/authors from the library entry.
  await page.getByText('Private E2E Paper').click()
  await expect(page).toHaveURL(/\/library\/paper-private$/)
  await expect(page.getByRole('heading', { name: 'Private E2E Paper' })).toBeVisible()
  await expect(page.getByText('Grace Hopper')).toBeVisible()

  // Edit: unlock the title, rename, save — the detail view reflects the change.
  await page.getByRole('button', { name: 'Edit details' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByRole('button', { name: 'Edit field' }).first().click()
  await editDialog.getByRole('textbox').fill('Renamed E2E Paper')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Renamed E2E Paper' })).toBeVisible()

  // Delete: remove the entry — redirected to the library, entry gone.
  await page.getByRole('button', { name: 'Delete paper' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
  await page.waitForURL('**/library')
  await expect(page.getByText('Renamed E2E Paper')).toHaveCount(0)
  await expect(page.getByText('Shared E2E Paper')).toBeVisible()
})
