import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { AddPaperButton } from '@/components/add-paper-button'
import { Greeting } from '@/components/greeting'
import { SectionCards } from '@/components/section-cards'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const firstName = session.name?.split(' ')[0] ?? null

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <Greeting firstName={firstName} />
          <p className="text-muted-foreground font-mono text-xs">
            4 new papers across your orgs today · synced 2 min ago
          </p>
        </div>
        <AddPaperButton />
      </div>
      <SectionCards />
    </div>
  )
}
