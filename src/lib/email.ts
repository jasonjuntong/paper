import { Resend } from 'resend'

// Shared server-side transactional email (Resend). Used by registration
// verification (USER-001) and, later, password reset (USER-003) and org
// notifications (ORG-023). Server-only — never import from client code.

let client: Resend | null = null

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    client = new Resend(key)
  }
  return client
}

// Verified sender. Override with EMAIL_FROM once a custom domain is set up in
// Resend; the shared onboarding sender works for local/dev.
const FROM = process.env.EMAIL_FROM ?? 'Scolar <onboarding@resend.dev>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const { error } = await getClient().emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Failed to send email: ${error.message}`)
}
