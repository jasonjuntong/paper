import { FieldValue, type Transaction } from 'firebase-admin/firestore'
import { adminFirestore } from '@/lib/firebase/admin'
import { HandleTakenError, normalizeHandle } from '@/lib/handles'

// Server-only handle reservation (Admin SDK). Writes to `/handles/{handle}` are
// always server-side; the client may only read for availability (see
// firestore.rules + handles.client.ts).

const handleRef = (handle: string) =>
  adminFirestore.collection('handles').doc(normalizeHandle(handle))

/**
 * Reserve a handle inside an existing transaction (USER-001 registration), so
 * the handle and the user doc are written atomically. Existence — active OR
 * tombstoned — means taken, and the check runs inside the transaction to catch
 * races. Throws `HandleTakenError` if unavailable.
 *
 * Contract: perform all other transaction reads BEFORE calling this. Firestore
 * requires every read to precede the first write, and this issues a write.
 */
export async function reserveHandleInTransaction(
  tx: Transaction,
  handle: string,
  uid: string,
): Promise<void> {
  const ref = handleRef(handle)
  const snap = await tx.get(ref)
  if (snap.exists) throw new HandleTakenError(handle)
  tx.set(ref, { uid, reservedAt: FieldValue.serverTimestamp() })
}

/**
 * Tombstone a handle on account deletion (USER-006): retain the doc but clear
 * the owner, so the handle can never be reclaimed. Never deletes the doc —
 * existence is what keeps the handle out of the pool. Works in or out of a
 * transaction.
 */
export async function tombstoneHandle(handle: string, tx?: Transaction): Promise<void> {
  const ref = handleRef(handle)
  const data = { uid: null, retiredAt: FieldValue.serverTimestamp() }
  if (tx) {
    tx.set(ref, data, { merge: true })
    return
  }
  await ref.set(data, { merge: true })
}
