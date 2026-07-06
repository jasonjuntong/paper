import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, setDoc } from 'firebase/firestore'

// Exercises firestore.rules against the emulator. The app never touches
// Firestore from the client except for the two deliberate read exceptions
// (public orgs, /handles); everything else is server-only (firebase-admin,
// which bypasses rules). These specs pin that contract: what a would-be client
// SDK may read, and that it may never write.

const PROJECT_ID = 'demo-paper'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// Seed documents with rules disabled — the fixtures themselves are written
// server-side in the real app, so they must not be gated by the client rules.
async function seed(fn: (db: Firestore) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as unknown as Firestore)
  })
}

describe('/handles/{handle}', () => {
  it('is readable without auth (registration availability check)', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'handles', 'alice')))
  })

  it('is readable when signed in', async () => {
    const db = testEnv.authenticatedContext('user1').firestore()
    await assertSucceeds(getDoc(doc(db, 'handles', 'alice')))
  })

  it('rejects client writes (reservation is server-only)', async () => {
    const db = testEnv.authenticatedContext('user1').firestore()
    await assertFails(setDoc(doc(db, 'handles', 'alice'), { uid: 'user1' }))
  })
})

describe('/orgs/{orgId}', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'orgs', 'pub'), { visibility: 'public', name: 'Public Org' })
      await setDoc(doc(db, 'orgs', 'priv'), { visibility: 'private', name: 'Private Org' })
      // member of the private org only
      await setDoc(doc(db, 'orgs', 'priv', 'members', 'member1'), { role: 'member' })
      await setDoc(doc(db, 'orgs', 'priv', 'invites', 'invite1'), { handle: 'x' })
    })
  })

  it('lets anyone read a public org', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'orgs', 'pub')))
  })

  it('lets a member read a private org', async () => {
    const db = testEnv.authenticatedContext('member1').firestore()
    await assertSucceeds(getDoc(doc(db, 'orgs', 'priv')))
  })

  it('denies a non-member reading a private org', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'priv')))
  })

  it('denies an unauthenticated read of a private org', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'priv')))
  })

  it('denies all client writes to orgs', async () => {
    const db = testEnv.authenticatedContext('member1').firestore()
    await assertFails(setDoc(doc(db, 'orgs', 'priv'), { name: 'hijacked' }))
  })

  it('lets a member read org subcollections', async () => {
    const db = testEnv.authenticatedContext('member1').firestore()
    await assertSucceeds(getDoc(doc(db, 'orgs', 'priv', 'invites', 'invite1')))
  })

  it('denies a non-member reading org subcollections', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'priv', 'members', 'member1')))
  })

  it('denies client writes to org subcollections', async () => {
    const db = testEnv.authenticatedContext('member1').firestore()
    await assertFails(setDoc(doc(db, 'orgs', 'priv', 'members', 'member1'), { role: 'admin' }))
  })
})

// Public-org list access (permissions table): any *authenticated* user may read
// the metadata snapshot of papers shared to a public org. The exception is
// sharedPapers-only — a public org's other subcollections stay member-only, and
// a private org's sharedPapers stay member-only.
describe('/orgs/{orgId}/sharedPapers — public-org list access', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'orgs', 'pub'), { visibility: 'public', name: 'Public Org' })
      await setDoc(doc(db, 'orgs', 'priv'), { visibility: 'private', name: 'Private Org' })
      await setDoc(doc(db, 'orgs', 'priv', 'members', 'member1'), { role: 'member' })
      await setDoc(doc(db, 'orgs', 'pub', 'members', 'member2'), { role: 'member' })
      await setDoc(doc(db, 'orgs', 'pub', 'sharedPapers', 'paper1'), { title: 'A' })
      await setDoc(doc(db, 'orgs', 'priv', 'sharedPapers', 'paper2'), { title: 'B' })
      await setDoc(doc(db, 'orgs', 'pub', 'invites', 'invite1'), { handle: 'x' })
    })
  })

  it('lets a signed-in non-member read a public org shared paper', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertSucceeds(getDoc(doc(db, 'orgs', 'pub', 'sharedPapers', 'paper1')))
  })

  it('denies an unauthenticated read of a public org shared paper', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'pub', 'sharedPapers', 'paper1')))
  })

  it('denies a non-member reading a private org shared paper', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'priv', 'sharedPapers', 'paper2')))
  })

  it('lets a member read a private org shared paper', async () => {
    const db = testEnv.authenticatedContext('member1').firestore()
    await assertSucceeds(getDoc(doc(db, 'orgs', 'priv', 'sharedPapers', 'paper2')))
  })

  it('keeps other public-org subcollections member-only (not readable by a non-member)', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(getDoc(doc(db, 'orgs', 'pub', 'members', 'member2')))
    await assertFails(getDoc(doc(db, 'orgs', 'pub', 'invites', 'invite1')))
  })

  it('denies client writes to a public org shared paper', async () => {
    const db = testEnv.authenticatedContext('stranger').firestore()
    await assertFails(setDoc(doc(db, 'orgs', 'pub', 'sharedPapers', 'paper1'), { title: 'hijacked' }))
  })
})

describe('default deny (server-managed collections)', () => {
  it('denies reading a user doc even to its owner', async () => {
    const db = testEnv.authenticatedContext('user1').firestore()
    await assertFails(getDoc(doc(db, 'users', 'user1')))
  })

  it('denies writing a user doc even to its owner', async () => {
    const db = testEnv.authenticatedContext('user1').firestore()
    await assertFails(setDoc(doc(db, 'users', 'user1'), { name: 'me' }))
  })
})
