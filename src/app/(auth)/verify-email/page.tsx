import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { VerifyEmailConfirm } from '@/components/auth/verify-email-confirm'

export const metadata: Metadata = { title: 'Check your email — Scolar' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  // Arriving from the verification email link (?code=<oobCode>) — confirm it.
  if (code) {
    return <VerifyEmailConfirm code={code} />
  }

  // Default landing shown right after registration.
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Check your inbox</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification link to your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Click the link to activate your account, then come back to sign in. Check your spam
          folder if you don&apos;t see it within a few minutes.
        </p>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
