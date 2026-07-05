import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import {
  defaultJoinPolicy,
  isJoinPolicyValid,
  type JoinPolicy,
  type Visibility,
} from '@/lib/orgs/join-policy'

export const runtime = 'nodejs'

// Profile field limits mirror the create route (src/app/api/orgs/route.ts).
const NAME_MAX = 60
const MARK_MAX = 2
const DESCRIPTION_MAX = 280

const PatchSchema = z
  .object({
    visibility: z.enum(['public', 'private']).optional(),
    joinPolicy: z.enum(['open', 'request', 'invite']).optional(),
    name: z.string().trim().min(1, 'Name is required').max(NAME_MAX).optional(),
    mark: z
      .string()
      .trim()
      .min(1, 'Mark is required')
      .max(MARK_MAX)
      .transform((m) => m.toUpperCase())
      .optional(),
    // description may be cleared: an explicit '' is a valid update.
    description: z.string().trim().max(DESCRIPTION_MAX).optional(),
  })
  .refine(
    (d) =>
      d.visibility !== undefined ||
      d.joinPolicy !== undefined ||
      d.name !== undefined ||
      d.mark !== undefined ||
      d.description !== undefined,
    { message: 'Nothing to update' }
  )

// Edit Org profile (name / mark / description) and visibility / join policy. Admin only.
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
        nextPolicy = defaultJoinPolicy(parsed.data.visibility)
      }

      // An explicit join-policy change must be valid for the resulting visibility.
      if (parsed.data.joinPolicy) {
        if (!isJoinPolicyValid(nextVis, parsed.data.joinPolicy)) {
          return {
            status: 400 as const,
            error: 'That join policy is not valid for this visibility',
          }
        }
        nextPolicy = parsed.data.joinPolicy
      }

      // Defense in depth — never persist an invalid pairing.
      if (!isJoinPolicyValid(nextVis, nextPolicy)) {
        nextPolicy = defaultJoinPolicy(nextVis)
      }

      // Profile fields. `undefined` means "not in this request" (leave as-is);
      // an explicit value (including '' for description) is a change.
      const curName = (org.name ?? '') as string
      const curMark = (org.mark ?? '') as string
      const curDescription = (org.description ?? '') as string
      const nextName = parsed.data.name ?? curName
      const nextMark = parsed.data.mark ?? curMark
      const nextDescription = parsed.data.description ?? curDescription

      // Collect only the fields that actually changed, so an unchanged PATCH is a no-op.
      const updates: Record<string, unknown> = {}
      if (nextVis !== curVis) updates.visibility = nextVis
      if (nextPolicy !== curPolicy) updates.joinPolicy = nextPolicy
      if (nextName !== curName) updates.name = nextName
      if (nextMark !== curMark) updates.mark = nextMark
      if (nextDescription !== curDescription) updates.description = nextDescription

      if (Object.keys(updates).length > 0) {
        tx.update(orgRef, updates)
      }
      return {
        status: 200 as const,
        body: {
          visibility: nextVis,
          joinPolicy: nextPolicy,
          name: nextName,
          mark: nextMark,
          description: nextDescription,
        },
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
