import { test, expect, type Page } from '@playwright/test'
import { getVerificationCode, resetEmulators, seedOrg } from './helpers/emulator'

// ORG-014 end-to-end: a user self-joins a public + open org with no approval,
// through the real Join button → real POST /api/orgs/{id}/join → Firestore
// emulator. Also asserts the 1000-member cap: the UI gate (disabled button +
// "This org is full") and the route's in-transaction cap re-check (a direct
// authenticated POST is rejected with 409).
//
// Orgs are seeded straight into Firestore (`seedOrg`) rather than driven through
// the create-org UI as a second user — the non-member page only reads the org
// doc + the viewer's own member doc, so the count fields are all the cap gate
// needs. The registered viewer is a genuinely different account, so the join is
// a real self-service join, not "joining your own org".

function newUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  return {
    name: 'E2E Tester',
    handle: `e2e${id}`.slice(0, 20),
    email: `e2e-${id}@example.com`,
    password: 'password123',
  }
}

function newOrgId() {
  return `org-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
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

test('user self-joins an open public org with no approval', async ({ page }) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  const orgId = newOrgId()
  await seedOrg({
    orgId,
    name: 'Open Robotics Lab',
    visibility: 'public',
    joinPolicy: 'open',
    memberCount: 1,
  })

  // Non-member view: the header renders and the Join button is offered.
  await page.goto(`/orgs/${orgId}`)
  await expect(page.getByRole('heading', { name: 'Open Robotics Lab' })).toBeVisible()
  const joinButton = page.getByRole('button', { name: 'Join', exact: true })
  await expect(joinButton).toBeVisible()

  // Click Join and wait for the join POST to succeed before asserting the
  // re-rendered member view (the button triggers router.refresh() on success).
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/orgs\/.+\/join$/.test(r.url())
    ),
    joinButton.click(),
  ])
  expect(res.status()).toBe(200)

  // Member view: the member tabs appear and the Join affordance is gone.
  await expect(page.getByRole('button', { name: 'Members' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Papers' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Join', exact: true })).toHaveCount(0)
})

test('join is rejected when the open public org is at the 1000-member cap', async ({
  page,
}) => {
  const u = newUser()
  await registerVerifiedAndLogin(page, u)

  const orgId = newOrgId()
  await seedOrg({
    orgId,
    name: 'Full Robotics Lab',
    visibility: 'public',
    joinPolicy: 'open',
    memberCount: 1000,
  })

  // UI gate: the Join button is disabled and the "full" copy explains why.
  await page.goto(`/orgs/${orgId}`)
  await expect(page.getByRole('button', { name: 'Join', exact: true })).toBeDisabled()
  await expect(page.getByText('This org is full')).toBeVisible()

  // Transactional gate: a direct authenticated POST (shares the session cookie)
  // is rejected by the route's in-transaction cap re-check, not just the UI.
  const apiRes = await page.request.post(`/api/orgs/${orgId}/join`)
  expect(apiRes.status()).toBe(409)
  expect((await apiRes.json()).error).toBe('This org is full')
})
