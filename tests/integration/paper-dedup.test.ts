import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { adminFirestore } from '@/lib/firebase/admin'
import { checkVisibility, ensureLibraryEntry } from '@/lib/paper-dedup'

// PAPER-003 Layer-1 dedup, integration lane. `decideVisibility` is unit-tested
// in isolation (src/lib/paper-dedup.test.ts); here we prove the Firestore-backed
// half against the real emulator — the library query, the `members`
// collection-group lookup, and the per-org `sharedPapers` reads that a pure test
// can't reach — plus that a hit never creates a duplicate library entry.

const PROJECT_ID = 'demo-paper'
const FIRESTORE_HOST = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`
const OWNER = { Authorization: 'Bearer owner' }

const UID = 'user-alice'
const PAPER_ID = 'paper-xyz'

/** Wipe emulated Firestore docs between tests. */
async function reset(): Promise<void> {
  await fetch(
    `${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE', headers: OWNER },
  )
}

/** Seed a library entry for `uid` pointing at `paperId`; returns its doc id. */
async function seedLibraryEntry(uid: string, paperId: string): Promise<string> {
  const ref = adminFirestore.collection('users').doc(uid).collection('library').doc()
  await ref.set({ paperId, userId: uid, shares: [], createdAt: new Date() })
  return ref.id
}

/** Seed an org named `name` with `uid` as a member; optionally share `paperId` into it. */
async function seedOrgMembership(
  orgId: string,
  name: string,
  uid: string,
  sharedPaperId?: string,
): Promise<void> {
  await adminFirestore.collection('orgs').doc(orgId).set({ name })
  await adminFirestore.collection('orgs').doc(orgId).collection('members').doc(uid).set({ userId: uid })
  if (sharedPaperId) {
    await adminFirestore
      .collection('orgs')
      .doc(orgId)
      .collection('sharedPapers')
      .doc(sharedPaperId)
      .set({ paperId: sharedPaperId })
  }
}

beforeEach(reset)
afterAll(reset)

describe('checkVisibility', () => {
  it('returns in-library with the entry id when the user already owns the paper', async () => {
    const entryId = await seedLibraryEntry(UID, PAPER_ID)

    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'in-library', entryId })
  })

  it('returns in-org with the sharing org when the paper is shared to a member org', async () => {
    await seedOrgMembership('org-1', 'Acme Lab', UID, PAPER_ID)

    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'in-org', orgs: [{ id: 'org-1', name: 'Acme Lab' }] })
  })

  it('prefers in-library over in-org when the paper is both owned and org-shared', async () => {
    const entryId = await seedLibraryEntry(UID, PAPER_ID)
    await seedOrgMembership('org-1', 'Acme Lab', UID, PAPER_ID)

    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'in-library', entryId })
  })

  it('returns none when the user is in an org that does not share the paper', async () => {
    await seedOrgMembership('org-1', 'Acme Lab', UID) // member, but paper not shared

    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'none' })
  })

  it('returns none when the paper is neither owned nor in any member org', async () => {
    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'none' })
  })

  it('does not surface an org the user is not a member of', async () => {
    // Paper is shared into org-1, but UID is a member of org-2 only.
    await seedOrgMembership('org-1', 'Acme Lab', 'someone-else', PAPER_ID)
    await seedOrgMembership('org-2', 'Globex', UID)

    const vis = await checkVisibility(UID, PAPER_ID)

    expect(vis).toEqual({ visibility: 'none' })
  })
})

describe('ensureLibraryEntry', () => {
  const details = {
    title: 'On Widgets',
    authors: 'Ada Lovelace',
    year: 2023,
    keywords: 'widgets, gears',
    synopsis: 'A study of widgets.',
  }

  it('creates a library entry for a paper the user does not yet own', async () => {
    const entryId = await ensureLibraryEntry(UID, PAPER_ID, details)

    const doc = await adminFirestore
      .collection('users')
      .doc(UID)
      .collection('library')
      .doc(entryId)
      .get()
    expect(doc.exists).toBe(true)
    expect(doc.data()).toMatchObject({ paperId: PAPER_ID, userId: UID, title: 'On Widgets' })
  })

  it('never creates a duplicate entry for a paper the user already owns', async () => {
    const first = await ensureLibraryEntry(UID, PAPER_ID, details)
    const second = await ensureLibraryEntry(UID, PAPER_ID, details)

    expect(second).toBe(first)

    const entries = await adminFirestore
      .collection('users')
      .doc(UID)
      .collection('library')
      .where('paperId', '==', PAPER_ID)
      .get()
    expect(entries.size).toBe(1)
  })
})
