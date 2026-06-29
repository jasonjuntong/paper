import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { normalizeHandle } from '@/lib/handles'

/**
 * Live availability check for the registration form (USER-001), reading
 * `/handles/{handle}` directly via the client SDK. This is a deliberate
 * exception to the otherwise server-only Firestore access (see firestore.rules)
 * so the form can give instant "handle available?" feedback before submit and
 * before the user is signed in. The authoritative reservation still happens
 * server-side in a transaction, so this is UX only — never a security boundary.
 */
export async function checkHandleAvailability(handle: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'handles', normalizeHandle(handle)))
  return !snap.exists()
}
