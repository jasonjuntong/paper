import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'

const NAME_MAX = 60
const MARK_MAX = 2
const DESCRIPTION_MAX = 280

const CreateOrgSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(NAME_MAX),
    mark: z
      .string()
      .trim()
      .min(1, 'Mark is required')
      .max(MARK_MAX)
      .transform((m) => m.toUpperCase()),
    description: z.string().trim().max(DESCRIPTION_MAX).optional().default(''),
    visibility: z.enum(['public', 'private']),
    joinPolicy: z.enum(['open', 'request', 'invite']),
  })
  // Enforce the visibility ↔ join-policy invariant server-side (defense in depth):
  // public Orgs are open/request; private Orgs are invite-only.
  .refine(
    (d) =>
      d.visibility === 'public'
        ? d.joinPolicy === 'open' || d.joinPolicy === 'request'
        : d.joinPolicy === 'invite',
    { message: 'join policy is not valid for the chosen visibility', path: ['joinPolicy'] }
  )

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid org details', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, mark, description, visibility, joinPolicy } = parsed.data
  const now = new Date()

  const orgRef = adminFirestore.collection('orgs').doc()
  const memberRef = orgRef.collection('members').doc(session.uid)

  const batch = adminFirestore.batch()
  batch.set(orgRef, {
    name,
    mark,
    description,
    visibility,
    joinPolicy,
    adminId: session.uid,
    memberCount: 1,
    inviteCount: 0,
    requestCount: 0,
    createdAt: now,
  })
  batch.set(memberRef, {
    userId: session.uid,
    role: 'admin',
    joinedAt: now,
  })
  await batch.commit()

  return NextResponse.json({ orgId: orgRef.id }, { status: 201 })
}
