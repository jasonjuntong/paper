import { test, expect, type Page } from '@playwright/test'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// ORG-004 end-to-end: an Admin changes their org's join policy through the real
// Manage-tab pills → real PATCH route → Firestore emulator. Asserts the
// visibility ↔ join-policy coupling in the UI, and that each change persists
// across a reload (a fresh server render reads it back from Firestore). Reuses
// the create flow to stand up an org the caller admins (both routes are emulated).
//
// The pills carry no aria-state, so "which policy is active" is asserted via the
// help copy the component renders for the active policy/visibility.

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

async function createOrg(page: Page, name: string) {
  await page.goto('/orgs')
  await page.getByRole('button', { name: 'Create Org' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Create a new org')).toBeVisible()
  await dialog.getByPlaceholder('e.g. Diffusion Models Reading Group').fill(name)
  await dialog.getByRole('button', { name: 'Create Org' }).click()
  await page.waitForURL(/\/orgs\/[^/]+$/)
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test.beforeEach(async () => {
  await resetEmulators()
})

test('admin changes join policy from the Manage tab', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)
  // New public orgs default to the `request` policy.
  await createOrg(page, 'Robotics Lab')

  // The Manage tab is client-side state, reset on every reload — re-open it.
  const openManage = () => page.getByRole('button', { name: 'Manage' }).click()

  // Click a pill and wait for its PATCH to actually persist (a 200) before
  // moving on — so a later reload reads the stored value, not optimistic UI.
  async function clickPill(name: string) {
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === 'PATCH' && /\/api\/orgs\//.test(r.url())
      ),
      page.getByRole('button', { name, exact: true }).click(),
    ])
    expect(res.status()).toBe(200)
  }

  await openManage()
  await expect(page.getByText(/Users request to join/)).toBeVisible()

  // Public: switch request → open, and confirm it persisted across a reload.
  await clickPill('open')
  await expect(page.getByText(/Anyone can join instantly/)).toBeVisible()
  await page.reload()
  await openManage()
  await expect(page.getByText(/Anyone can join instantly/)).toBeVisible()

  // Going private forces invite-only and disables the public-only policies.
  await clickPill('Private')
  await expect(page.getByText(/Each invite expires in 7 days/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'open', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'request', exact: true })).toBeDisabled()
  await page.reload()
  await openManage()
  await expect(page.getByText(/Each invite expires in 7 days/)).toBeVisible()

  // Going back to public falls the policy back to `request`.
  await clickPill('Public')
  await expect(page.getByText(/Users request to join/)).toBeVisible()
})
