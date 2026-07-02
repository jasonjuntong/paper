import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'

const AccountSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short').max(100).optional(),
    notificationEmail: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.notificationEmail !== undefined, {
    message: 'Nothing to update',
  })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = AccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid account details', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, notificationEmail } = parsed.data
  const userRef = adminFirestore.collection('users').doc(session.uid)
  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    // Keep the Auth displayName and the user doc in sync.
    await adminAuth.updateUser(session.uid, { displayName: name })
    updates.name = name
  }
  if (notificationEmail !== undefined) {
    updates['notificationPrefs.email'] = notificationEmail
  }

  await userRef.update(updates)

  return NextResponse.json({ ok: true })
}
