import { test, expect } from '@playwright/test'
import { getVerificationCode, resetEmulators } from './helpers/emulator'

// USER-001 end-to-end: registration → email verification → login → (app) gate,
// plus the guarantee that an unverified account cannot reach the app.

// A fresh, unique identity per test keeps runs independent of leftover state.
function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

async function register(page: import('@playwright/test').Page, u: ReturnType<typeof newUser>) {
  await page.goto('/register')
  await page.locator('#name').fill(u.name)
  await page.locator('#handle').fill(u.handle)
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  // The form redirects here on success (genuine + duplicate email alike).
  await page.waitForURL('**/verify-email')
}

test.beforeEach(async () => {
  await resetEmulators()
})

test('register → verify email → login → reach the app', async ({ page }) => {
  const u = newUser()

  await register(page, u)

  // Stand in for clicking the emailed link: pull the oobCode from the emulator
  // and visit the real verification page.
  const code = await getVerificationCode(u.email)
  await page.goto(`/verify-email?code=${code}`)
  await expect(page.getByText('Email verified')).toBeVisible()

  // Now sign in — the verified account should land inside the (app) area.
  await page.goto('/login')
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL((url) => url.pathname === '/')
  // The login form is gone — we're in the authenticated shell, not bounced back.
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0)
})

test('unverified account is blocked at login', async ({ page }) => {
  const u = newUser()

  await register(page, u) // deliberately skip verification

  await page.goto('/login')
  await page.locator('#email').fill(u.email)
  await page.locator('#password').fill(u.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Client signs in, sees emailVerified=false, signs back out, and shows this —
  // no session cookie is ever minted, so the (app) area stays unreachable.
  await expect(page.getByText("email hasn't been verified")).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
