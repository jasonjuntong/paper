import { test, expect, type Page } from '@playwright/test'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// ORG-002 end-to-end: an Admin edits their org's profile through the real
// Manage tab → real PATCH route → Firestore emulator, and the server-rendered
// header re-renders with the new name + description. Reuses the create flow to
// stand up an org the caller admins (no seeding — both routes are emulated).

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

test('admin edits org name + description from the Manage tab', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)
  await createOrg(page, 'Robotics Lab')

  // Open the admin-only Manage tab and edit the profile.
  await page.getByRole('button', { name: 'Manage' }).click()

  await page.getByLabel('NAME *').fill('Deep RL Reading Group')
  await page.getByLabel(/DESCRIPTION/).fill('We read reinforcement learning papers.')

  const save = page.getByRole('button', { name: 'Save changes' })
  await expect(save).toBeEnabled()
  await save.click()

  // router.refresh() re-renders the server component: header + description update.
  await expect(
    page.getByRole('heading', { name: 'Deep RL Reading Group' })
  ).toBeVisible()
  // Scope to the header paragraph — the same text also lives in the still-open
  // Manage-tab textarea after refresh.
  await expect(
    page
      .getByRole('paragraph')
      .filter({ hasText: 'We read reinforcement learning papers.' })
  ).toBeVisible()
})
