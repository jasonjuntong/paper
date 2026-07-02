import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminAuth } from '@/lib/firebase/admin'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const forgotSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

function resetPasswordEmailHtml(resetUrl: string): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <p style="font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#6b7280;margin:0 0 24px">Scolar</p>
    <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
    <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 24px">
      We received a request to reset your Scolar password. Click below to choose a new one. This link expires in 24 hours.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;padding:10px 20px;border-radius:8px">
      Reset password
    </a>
    <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:24px 0 0">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  </div>`
}

// Fully custom, Scolar-hosted password reset (USER-003). The Admin SDK mints a
// Firebase oobCode; we rewrite the link to our own /reset-password page and send
// a branded email via Resend — no Firebase-hosted page is ever shown.
//
// Enumeration protection (USER-004): the response is always `{ ok: true }`,
// regardless of whether the email is registered or the send fails, so a caller
// can never tell whether an account exists.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    // Malformed body isn't tied to account existence — still respond uniformly.
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  const { email } = parsed.data

  try {
    const link = await adminAuth.generatePasswordResetLink(email, { url: `${APP_URL}/login` })
    const oobCode = new URL(link).searchParams.get('oobCode')
    // Fall back to Firebase's link only if extraction somehow fails; normal path
    // always lands on our own /reset-password page.
    const resetUrl = oobCode ? `${APP_URL}/reset-password?code=${oobCode}` : link
    await sendEmail({
      to: email,
      subject: 'Reset your Scolar password',
      html: resetPasswordEmailHtml(resetUrl),
    })
  } catch (err) {
    // `auth/user-not-found` is expected and intentionally silent (enumeration
    // protection). Log anything else for server-side visibility only.
    if ((err as { code?: string }).code !== 'auth/user-not-found') {
      console.error('[auth/forgot-password] reset link/email failed:', err)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
