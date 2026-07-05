import { test, expect, type Page } from '@playwright/test'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// ORG-001 end-to-end: create an org through the real dialog → real route →
// Firestore emulator → org detail page. Covers the pre-selected defaults, the
// name-required gate, the visibility↔join-policy invariant in the UI, and the
// creator landing on their new org as its Admin. Unlike the library flow this
// needs no seeding — the create route is fully emulated.

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

test.beforeEach(async () => {
  await resetEmulators()
})

test('create org → defaults, invariant, name gate, creator is admin', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  // Open the create dialog from the Orgs header.
  await page.goto('/orgs')
  await page.getByRole('button', { name: 'Create Org' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Create a new org')).toBeVisible()

  // Defaults pre-selected: Public + by-request are active; invite-only disabled.
  await expect(dialog.getByRole('button', { name: 'Public' })).toHaveClass(/bg-pill/)
  await expect(dialog.getByRole('button', { name: 'by request' })).toHaveClass(/bg-pill/)
  await expect(dialog.getByRole('button', { name: 'invite-only' })).toBeDisabled()

  // Name required: submitting empty surfaces the inline error, no navigation.
  await dialog.getByRole('button', { name: 'Create Org' }).click()
  await expect(dialog.getByText('Name is required')).toBeVisible()
  await expect(page).toHaveURL(/\/orgs$/)

  // Invariant in the UI: flipping to Private forces invite-only on and disables
  // the public policies; flip back to Public to create a public org.
  await dialog.getByRole('button', { name: 'Private' }).click()
  await expect(dialog.getByRole('button', { name: 'invite-only' })).toHaveClass(/bg-pill/)
  await expect(dialog.getByRole('button', { name: 'open' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Public' }).click()

  // Fill and create — the mark auto-derives from the name.
  await dialog.getByPlaceholder('e.g. Diffusion Models Reading Group').fill('Robotics Lab')
  await dialog.getByRole('button', { name: 'Create Org' }).click()

  // Creator lands on the new org's page as its Admin.
  await page.waitForURL(/\/orgs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'Robotics Lab' })).toBeVisible()
  await expect(page.getByText('Admin')).toBeVisible()
})
