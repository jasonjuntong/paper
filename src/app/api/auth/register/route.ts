import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { HandleTakenError, handleSchema, normalizeHandle } from '@/lib/handles'
import { reserveHandleInTransaction } from '@/lib/handles.server'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  handle: handleSchema,
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <p style="font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#6b7280;margin:0 0 24px">Scolar</p>
    <h1 style="font-size:20px;margin:0 0 12px">Verify your email</h1>
    <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 24px">
      Hi ${name}, confirm your email address to activate your Scolar account.
    </p>
    <a href="${verifyUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;padding:10px 20px;border-radius:8px">
      Verify email
    </a>
    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:24px 0 0">
      If you didn't create a Scolar account, you can safely ignore this email.
    </p>
  </div>`
}

// Registration follows the strict order in user.md#handle so a handle is never
// persisted until every precondition passes:
//   1. Validate inputs.
//   2. Create the Firebase Auth user. Duplicate email → silent success (no
//      handle written) so registration never reveals whether an email exists
//      (enumeration protection, USER-004).
//   3. Reserve /handles/{handle} + write the user doc in one transaction,
//      re-checking availability inside it to catch races.
//   4. On race-loss, delete the just-created Auth user so no orphaned account
//      or handle reservation is left behind; surface "handle already taken".
//   5. Send the verification email server-side via Resend.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const { name, handle, email, password } = parsed.data

  // Step 2 — create the Auth user. Duplicate email returns the same response as
  // a genuine registration; no handle is written.
  let uid: string
  try {
    const user = await adminAuth.createUser({ email, password, displayName: name })
    uid = user.uid
  } catch (err) {
    if ((err as { code?: string }).code === 'auth/email-already-exists') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    console.error('[auth/register] createUser failed:', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }

  // Step 3 — reserve the handle and write the user doc atomically.
  try {
    await adminFirestore.runTransaction(async (tx) => {
      await reserveHandleInTransaction(tx, handle, uid)
      const userRef = adminFirestore.collection('users').doc(uid)
      tx.set(userRef, {
        name,
        handle,
        handleLower: normalizeHandle(handle),
        email,
        notificationPrefs: { email: true },
        keywordProfile: {},
        createdAt: FieldValue.serverTimestamp(),
      })
    })
  } catch (err) {
    // Step 4 — the transaction is all-or-nothing, so on any failure nothing is
    // committed; delete the orphaned Auth user before returning.
    await adminAuth
      .deleteUser(uid)
      .catch((delErr) => console.error('[auth/register] cleanup deleteUser failed:', delErr))

    if (err instanceof HandleTakenError) {
      return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
    }
    console.error('[auth/register] reservation failed:', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }

  // Step 5 — send the verification email. The link lands on our own
  // /verify-email?code= page (mirrors the reset-password flow). The account is
  // already created and the handle permanently reserved, so a send failure is
  // logged but not rolled back — the user can request a resend.
  try {
    const fbLink = await adminAuth.generateEmailVerificationLink(email, {
      url: `${APP_URL}/login`,
    })
    const oobCode = new URL(fbLink).searchParams.get('oobCode')
    const verifyUrl = oobCode ? `${APP_URL}/verify-email?code=${oobCode}` : fbLink
    await sendEmail({
      to: email,
      subject: 'Verify your Scolar email',
      html: verificationEmailHtml(name, verifyUrl),
    })
  } catch (err) {
    console.error('[auth/register] verification email failed:', err)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
