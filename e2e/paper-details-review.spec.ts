import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// PAPER-002 end-to-end: the review-form half, in a real browser. The e2e
// webServer has no GROQ_API_KEY, so /api/papers/init's extraction catches and
// returns an empty draft — a deterministic, offline stand-in for "the PDF's
// structure defeated extraction". That drives the unextracted-field path: every
// field is immediately editable with the helper line, save is gated on all five
// being present, and — because there was no extracted value to diverge from —
// filling them and saving goes straight to commit (no discrepancy dialog).
//
// The discrepancy dialog itself needs a non-empty extracted value to modify,
// which can't be produced hermetically here; it's covered in the component test
// (add-paper-dialog.test.tsx). See this ticket's ## Test coverage.

const PDF_PATH = path.join(__dirname, 'fixtures', 'sample.pdf')

const HELPER =
  'Due to the complexity of the PDF content structure, the required information could not be extracted.'

function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

async function signIn(page: Page, u: ReturnType<typeof newUser>) {
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

// Drive select → processing → review with an empty extraction.
async function openReview(page: Page) {
  await page.getByRole('main').getByRole('button', { name: 'Add paper' }).click()
  await page.locator('input[type=file]').setInputFiles(PDF_PATH)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Review paper details')).toBeVisible()
}

// A field is a role=group scoped by its visible label; year is a number spinner.
const field = (page: Page, label: string) =>
  page.locator('[role=group]').filter({ hasText: label })

test.beforeEach(async () => {
  await resetEmulators()
})

test('unextracted fields are immediately editable with the helper line, no AI/metadata wording', async ({
  page,
}) => {
  await signIn(page, newUser())
  await openReview(page)

  // Empty extraction → the helper line appears (once per field), fields editable.
  await expect(page.getByText(HELPER).first()).toBeVisible()
  await expect(page.getByText(HELPER)).toHaveCount(5)
  await expect(field(page, 'Title').getByRole('textbox')).toBeEditable()

  // Within the dialog the draft is never labelled "AI" and "metadata" never appears.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/metadata/i)).toHaveCount(0)
  await expect(dialog.getByText(/\bAI\b/)).toHaveCount(0)
})

test('save is gated on all five fields, then commits the entered paper', async ({
  page,
}) => {
  await signIn(page, newUser())

  const commits: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/papers/commit')) commits.push(r.method())
  })

  await openReview(page)

  // Saving with blank fields is blocked client-side — errors show, nothing commits.
  await page.getByRole('button', { name: 'Save to library' }).click()
  await expect(page.getByText('Title is required')).toBeVisible()
  expect(commits).toHaveLength(0)

  // Fill every field, then save.
  await field(page, 'Title').getByRole('textbox').fill('E2E Review Paper')
  await field(page, 'Authors').getByRole('textbox').fill('Ada Lovelace')
  await field(page, 'Year').getByRole('spinbutton').fill('2021')
  await field(page, 'Keywords').getByRole('textbox').fill('testing, e2e')
  await field(page, 'Synopsis').getByRole('textbox').fill('A synopsis for the e2e paper.')

  // No extracted value to diverge from → straight to commit (multipart, with bytes).
  const commitReq = page.waitForRequest((r) => r.url().includes('/api/papers/commit'))
  await page.getByRole('button', { name: 'Save to library' }).click()
  const req = await commitReq
  expect(req.method()).toBe('POST')
  expect(req.headers()['content-type']).toContain('multipart/form-data')
})
