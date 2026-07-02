import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// PAPER-001 end-to-end: the upload pre-flight. A PDF is chosen, its text is
// extracted and its bytes SHA-256'd *in the browser*, and only that hash + text
// is sent to `/api/papers/init` — the raw PDF is held client-side and never
// uploaded until the user confirms details at commit (no orphaned PDFs).

const PDF_PATH = path.join(__dirname, 'fixtures', 'sample.pdf')
// The client hashes the same bytes; recompute here to assert they match.
const EXPECTED_HASH = createHash('sha256').update(readFileSync(PDF_PATH)).digest('hex')

function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

// Register + verify + sign in, landing inside the authenticated app shell.
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

test.beforeEach(async () => {
  await resetEmulators()
})

test('extracts text + SHA-256 client-side and sends only hash + pages to init (no bytes)', async ({
  page,
}) => {
  const u = newUser()
  await signIn(page, u)

  // Record every request so we can prove what did — and did not — get sent.
  const requests: { url: string; method: string }[] = []
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }))

  await page.getByRole('main').getByRole('button', { name: 'Add paper' }).click()
  await page.locator('input[type=file]').setInputFiles(PDF_PATH)
  await expect(page.getByText('sample.pdf')).toBeVisible()

  // Capture the init call fired when the user hits Continue.
  const initReqPromise = page.waitForRequest((r) =>
    r.url().includes('/api/papers/init'),
  )
  await page.getByRole('button', { name: 'Continue' }).click()
  const initReq = await initReqPromise

  // The pre-flight is JSON-only: the client extracted text + hashed bytes and
  // sent just those — no multipart, no file.
  expect(initReq.method()).toBe('POST')
  expect(initReq.headers()['content-type']).toContain('application/json')

  const body = initReq.postDataJSON() as { hash: string; pages: string[] }
  expect(body.hash).toBe(EXPECTED_HASH) // client hash == server-side recompute
  expect(body.pages.join(' ')).toContain('Hello Scolar') // real client extraction

  // The flow reaches the review step — extraction/hash succeeded before upload.
  await expect(page.getByText('Review paper details')).toBeVisible()

  // Bytes are deferred: nothing was committed/uploaded during the pre-flight.
  expect(requests.some((r) => r.url.includes('/api/papers/commit'))).toBe(false)
})

test('rejects a non-PDF file — the upload guard keeps Continue disabled', async ({
  page,
}) => {
  const u = newUser()
  await signIn(page, u)

  await page.getByRole('main').getByRole('button', { name: 'Add paper' }).click()

  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a pdf'),
  })

  // The guard drops the non-PDF: no file is staged, so Continue stays disabled.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  await expect(page.getByText('notes.txt')).toHaveCount(0)
})
