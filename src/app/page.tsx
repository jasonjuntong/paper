import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { LogoutButton } from './_components/logout-button'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">Signed in as {session.email}</p>
        <LogoutButton />
      </div>
    </main>
  )
}
