import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

const MEMBER_CAP = 1000

// Self-service join for public Orgs:
// - `open`   → join immediately
// - `request` → create a pending join request the Admin approves
// Private / invite-only Orgs are never joinable through this route.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params
  const orgRef = adminFirestore.collection('orgs').doc(orgId)
  const memberRef = orgRef.collection('members').doc(session.uid)
  const requestRef = orgRef.collection('joinRequests').doc(session.uid)

  try {
    const result = await adminFirestore.runTransaction(async (tx) => {
      const [orgSnap, memberSnap] = await Promise.all([
        tx.get(orgRef),
        tx.get(memberRef),
      ])

      if (!orgSnap.exists) return { status: 404 as const, error: 'Org not found' }
      const org = orgSnap.data()!

      if (org.deletedAt) return { status: 410 as const, error: 'This org has been deleted' }
      if (memberSnap.exists)
        return { status: 409 as const, error: 'You are already a member' }
      if ((org.visibility ?? 'public') !== 'public')
        return { status: 403 as const, error: 'This org is invite-only' }

      const joinPolicy = (org.joinPolicy ?? 'request') as 'open' | 'request' | 'invite'
      if (joinPolicy === 'invite')
        return { status: 403 as const, error: 'This org is invite-only' }

      // Cap projection re-checked inside the transaction to avoid races:
      // members + pending invites + pending join requests can never exceed 1000.
      const memberCount = (org.memberCount ?? 0) as number
      const inviteCount = (org.inviteCount ?? 0) as number
      const requestCount = (org.requestCount ?? 0) as number
      if (memberCount + inviteCount + requestCount >= MEMBER_CAP)
        return { status: 409 as const, error: 'This org is full' }

      const now = new Date()

      if (joinPolicy === 'open') {
        tx.set(memberRef, { userId: session.uid, role: 'member', joinedAt: now })
        tx.update(orgRef, { memberCount: FieldValue.increment(1) })
        return { status: 200 as const, body: { status: 'joined' as const } }
      }

      // `request` policy.
      const requestSnap = await tx.get(requestRef)
      if (requestSnap.exists)
        return { status: 409 as const, error: 'You already have a pending request' }

      tx.set(requestRef, { userId: session.uid, status: 'pending', requestedAt: now })
      tx.update(orgRef, { requestCount: FieldValue.increment(1) })
      return { status: 200 as const, body: { status: 'requested' as const } }
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result.body, { status: 200 })
  } catch (err) {
    console.error('[orgs/join] failed:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
