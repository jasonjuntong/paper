import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

type Visibility = 'public' | 'private'
type JoinPolicy = 'open' | 'request' | 'invite'

const PatchSchema = z
  .object({
    visibility: z.enum(['public', 'private']).optional(),
    joinPolicy: z.enum(['open', 'request', 'invite']).optional(),
  })
  .refine((d) => d.visibility !== undefined || d.joinPolicy !== undefined, {
    message: 'Nothing to update',
  })

// A join policy is valid only for the matching visibility:
// public → open | request, private → invite-only.
function isPolicyValid(vis: Visibility, policy: JoinPolicy): boolean {
  return vis === 'public'
    ? policy === 'open' || policy === 'request'
    : policy === 'invite'
}

// Edit Org visibility / join policy. Admin only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid update', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { orgId } = await params
  const orgRef = adminFirestore.collection('orgs').doc(orgId)

  try {
    const result = await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(orgRef)
      if (!snap.exists) return { status: 404 as const, error: 'Org not found' }
      const org = snap.data()!

      if (org.deletedAt)
        return { status: 410 as const, error: 'This org has been deleted' }
      if (org.adminId !== session.uid)
        return { status: 403 as const, error: 'Only the admin can edit this org' }

      const curVis = (org.visibility ?? 'public') as Visibility
      const curPolicy = (org.joinPolicy ?? 'request') as JoinPolicy

      const nextVis = parsed.data.visibility ?? curVis
      let nextPolicy = curPolicy

      // A visibility change carries the join policy with it (spec):
      // Private → Public defaults to `request`; Public → Private forces `invite`.
      if (parsed.data.visibility && parsed.data.visibility !== curVis) {
        nextPolicy = parsed.data.visibility === 'public' ? 'request' : 'invite'
      }

      // An explicit join-policy change must be valid for the resulting visibility.
      if (parsed.data.joinPolicy) {
        if (!isPolicyValid(nextVis, parsed.data.joinPolicy)) {
          return {
            status: 400 as const,
            error: 'That join policy is not valid for this visibility',
          }
        }
        nextPolicy = parsed.data.joinPolicy
      }

      // Defense in depth — never persist an invalid pairing.
      if (!isPolicyValid(nextVis, nextPolicy)) {
        nextPolicy = nextVis === 'public' ? 'request' : 'invite'
      }

      if (nextVis !== curVis || nextPolicy !== curPolicy) {
        tx.update(orgRef, { visibility: nextVis, joinPolicy: nextPolicy })
      }
      return {
        status: 200 as const,
        body: { visibility: nextVis, joinPolicy: nextPolicy },
      }
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result.body, { status: 200 })
  } catch (err) {
    console.error('[orgs/patch] failed:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
