import { test, expect, type Page } from '@playwright/test'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// USER-005 end-to-end: the account settings surface — reaching it from the nav,
// editing the display name, toggling the email-notification preference, and
// changing the password (wrong vs. correct current password).

function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

// Register + verify + sign in, landing inside the authenticated (app) shell.
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

test('nav dropdown opens settings; handle/email are read-only and delete is disabled', async ({
  page,
}) => {
  const u = newUser()
  await signIn(page, u)

  // Open the user menu in the sidebar footer and follow "Account settings".
  await page.getByRole('button', { name: new RegExp(u.name) }).click()
  await page.getByRole('menuitem', { name: 'Account settings' }).click()
  await page.waitForURL('**/settings')

  // Handle and email are shown but not editable.
  await expect(page.locator('#handle')).toHaveValue(u.handle)
  await expect(page.locator('#handle')).toBeDisabled()
  await expect(page.locator('#email')).toHaveValue(u.email)
  await expect(page.locator('#email')).toBeDisabled()

  // Delete account is a disabled stub (built in USER-006); no avatar field exists.
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeDisabled()
  await expect(page.locator('input[type=file]')).toHaveCount(0)
})

test('editing the display name persists across reloads', async ({ page }) => {
  const u = newUser()
  await signIn(page, u)
  await page.goto('/settings')

  await page.locator('#name').fill('Renamed Tester')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Saved')).toBeVisible()

  // The page re-reads the name from the user doc — the new value survives reload.
  await page.reload()
  await expect(page.locator('#name')).toHaveValue('Renamed Tester')
})

test('toggling email notifications off persists across reloads', async ({ page }) => {
  const u = newUser()
  await signIn(page, u)
  await page.goto('/settings')

  const toggle = page.getByRole('switch', { name: 'Email notifications' })
  await expect(toggle).toBeChecked() // default on

  // Turn it off and wait for the write to land before reloading.
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/account') && r.request().method() === 'POST',
    ),
    toggle.click(),
  ])
  await expect(toggle).not.toBeChecked()

  await page.reload()
  await expect(page.getByRole('switch', { name: 'Email notifications' })).not.toBeChecked()
})

test('password change rejects a wrong current password, then works for the next sign-in', async ({
  page,
}) => {
  const u = newUser()
  await signIn(page, u)
  await page.goto('/settings')

  const newPassword = 'newpassword456'

  // Wrong current password → inline field error, no change made.
  await page.locator('#current-password').fill('totally-wrong')
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-password').fill(newPassword)
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Current password is incorrect')).toBeVisible()

  // Correct current password → success.
  await page.locator('#current-password').fill(u.password)
  await page.locator('#new-password').fill(newPassword)
  await page.locator('#confirm-password').fill(newPassword)
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page.getByText('Password updated')).toBeVisible()

  // Sign out, then the new password gets us back into the app.
  await page.getByRole('button', { name: new RegExp(u.name) }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL('**/login')

  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0)
})
