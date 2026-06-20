import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { getSession } from '@/lib/session'
import { adminAuth, adminFirestore } from '@/lib/firebase/admin'
import { Card } from '@/components/ui/card'
import { JoinOrgButton } from './_components/join-org-button'
import { OrgTabs } from './_components/org-tabs'
import { OrgManage } from './_components/org-manage'

type Visibility = 'public' | 'private'
type JoinPolicy = 'open' | 'request' | 'invite'
type Role = 'admin' | 'member'

// How many rows we render inline per tab. The true totals live in the tab
// counts, so a long list is summarised with a "+N more" line.
const MEMBER_PREVIEW = 50
const PAPER_PREVIEW = 50
const MEMBER_CAP = 1000

const POLICY_LABEL: Record<JoinPolicy, string> = {
  open: 'open · anyone can join',
  request: 'by request',
  invite: 'invite-only',
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatISO(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toISOString().slice(0, 10)
}

function relativeFromNow(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function Pill({
  children,
  emphasis,
}: {
  children: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <span
      className={`shrink-0 rounded-[3px] bg-pill px-1.5 py-px font-mono text-xs ${
        emphasis ? 'text-foreground/80' : 'text-muted-foreground'
      }`}
    >
      {children}
    </span>
  )
}

function RoleBadge({ role }: { role: Role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-pill px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground" />
        Admin
      </span>
    )
  }
  return (
    <span className="rounded-[3px] bg-pill px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      Member
    </span>
  )
}

type Member = {
  uid: string
  name: string
  handle: string
  role: Role
  joinedAt: number
  sharedCount: number
}

type SharedPaper = {
  paperId: string
  title: string
  authors: string
  year: number
}

// TEMP: mock members so the roster table renders populated. Remove once real
// membership data exists.
const MOCK_MEMBERS: Member[] = [
  { uid: 'mock-1', name: 'Luca Marchetti', handle: 'lmarchetti', role: 'member', joinedAt: Date.parse('2026-03-15'), sharedCount: 22 },
  { uid: 'mock-2', name: 'Ashish Vaswani', handle: 'avaswani', role: 'member', joinedAt: Date.parse('2026-04-02'), sharedCount: 14 },
  { uid: 'mock-3', name: 'Yui Okuda', handle: 'yokuda', role: 'member', joinedAt: Date.parse('2026-05-19'), sharedCount: 9 },
  { uid: 'mock-4', name: 'Frances Park', handle: 'fpark', role: 'member', joinedAt: Date.parse('2026-06-08'), sharedCount: 11 },
  { uid: 'mock-5', name: 'Carolina Brookes', handle: 'cbrookes', role: 'member', joinedAt: Date.parse('2026-07-21'), sharedCount: 6 },
  { uid: 'mock-6', name: 'Daniel Mwangi', handle: 'dmwangi', role: 'member', joinedAt: Date.parse('2026-08-30'), sharedCount: 8 },
  { uid: 'mock-7', name: 'Naomi Berg', handle: 'nberg', role: 'member', joinedAt: Date.parse('2026-09-04'), sharedCount: 4 },
  { uid: 'mock-8', name: 'Saira Iqbal', handle: 'siqbal', role: 'member', joinedAt: Date.parse('2026-09-19'), sharedCount: 5 },
]

type Profile = { name: string; handle: string }

async function resolveProfiles(uids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>()
  if (uids.length === 0) return map
  // getUsers accepts at most 100 identifiers per call.
  for (let i = 0; i < uids.length; i += 100) {
    const batch = uids.slice(i, i + 100).map((uid) => ({ uid }))
    const { users } = await adminAuth.getUsers(batch)
    for (const u of users) {
      const handle =
        u.email?.split('@')[0] ||
        (u.displayName ?? '').toLowerCase().replace(/\s+/g, '')
      map.set(u.uid, {
        name: u.displayName || handle || 'Member',
        handle: handle || u.uid.slice(0, 8),
      })
    }
  }
  return map
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const { orgId } = await params

  const orgRef = adminFirestore.collection('orgs').doc(orgId)
  const [orgSnap, viewerSnap] = await Promise.all([
    orgRef.get(),
    orgRef.collection('members').doc(session.uid).get(),
  ])

  if (!orgSnap.exists) notFound()
  const org = orgSnap.data()!

  const name = (org.name ?? '') as string
  const mark =
    ((org.mark as string | undefined) ?? '').trim() ||
    name.slice(0, 2).toUpperCase()
  const description = (org.description as string) || ''
  const visibility = (org.visibility ?? 'public') as Visibility
  const joinPolicy = (org.joinPolicy ?? 'request') as JoinPolicy
  const memberCount = (org.memberCount ?? 0) as number
  const inviteCount = (org.inviteCount ?? 0) as number
  const requestCount = (org.requestCount ?? 0) as number
  const createdAt = (org.createdAt?.toMillis?.() ?? 0) as number
  const deletedAt = (org.deletedAt?.toMillis?.() ?? 0) as number

  const viewerRole: Role | null = viewerSnap.exists
    ? ((viewerSnap.data()!.role ?? 'member') as Role)
    : null
  const isMember = viewerRole !== null
  const isAdmin = viewerRole === 'admin'

  // Private Orgs are not discoverable — only members may view the page.
  if (visibility === 'private' && !isMember) notFound()

  // Ghost Mode — the Org has been deleted; all features are sealed off.
  if (deletedAt) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6">
        <Link
          href="/discover"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Discover
        </Link>
        <Card className="items-center gap-2 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-pill font-mono text-lg font-semibold text-muted-foreground">
            {mark}
          </span>
          <h1 className="font-serif text-xl font-normal">{name}</h1>
          <p className="text-sm text-muted-foreground">
            This org was deleted {relativeFromNow(deletedAt)} by the admin.
          </p>
        </Card>
      </div>
    )
  }

  // The roster and shared papers are member-only views.
  let members: Member[] = []
  let papers: SharedPaper[] = []
  let paperCount = 0
  if (isMember) {
    const membersRef = orgRef.collection('members')
    const sharedRef = orgRef.collection('sharedPapers')
    const [memberSnap, sharedSnap, paperCountSnap] = await Promise.all([
      membersRef.orderBy('joinedAt', 'asc').limit(MEMBER_PREVIEW).get(),
      sharedRef.limit(PAPER_PREVIEW).get(),
      sharedRef.count().get(),
    ])

    const profiles = await resolveProfiles(memberSnap.docs.map((d) => d.id))
    members = memberSnap.docs.map((d) => {
      const data = d.data()
      const profile = profiles.get(d.id)
      return {
        uid: d.id,
        name: profile?.name ?? 'Member',
        handle: profile?.handle ?? d.id.slice(0, 8),
        role: (data.role ?? 'member') as Role,
        joinedAt: (data.joinedAt?.toMillis?.() ?? 0) as number,
        sharedCount: 0,
      }
    })
    // TEMP: pad the roster with mock members so the table looks populated.
    members = [...members, ...MOCK_MEMBERS]
    // Surface the admin first, then by join order.
    members.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
      return a.joinedAt - b.joinedAt
    })

    paperCount = paperCountSnap.data().count
    // sharedPapers doc id is the paperId; display fields live on the global
    // paper doc — batch them in a single getAll round trip.
    const paperIds = sharedSnap.docs.map((d) => d.id)
    if (paperIds.length > 0) {
      const paperDocs = await adminFirestore.getAll(
        ...paperIds.map((id) => adminFirestore.collection('papers').doc(id))
      )
      papers = paperDocs
        .filter((d) => d.exists)
        .map((d) => {
          const data = d.data()!
          return {
            paperId: d.id,
            title: (data.title ?? 'Untitled') as string,
            authors: (data.authors ?? '') as string,
            year: (data.year ?? 0) as number,
          }
        })
    }
  }

  // Cap projection — every pending path counts toward the 1000 ceiling.
  const effectiveCount = memberCount + inviteCount + requestCount
  const atCapacity = effectiveCount >= MEMBER_CAP
  const canJoin = !isMember && visibility === 'public' && joinPolicy !== 'invite'

  // For a `request` Org, reflect a standing join request the viewer already has.
  let alreadyRequested = false
  if (canJoin && joinPolicy === 'request') {
    const reqSnap = await orgRef
      .collection('joinRequests')
      .doc(session.uid)
      .get()
    alreadyRequested = reqSnap.exists
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 lg:px-6">
      <Link
        href={isMember ? '/orgs' : '/discover'}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {isMember ? 'Your orgs' : 'Discover'}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-pill font-mono text-xl font-semibold leading-none text-foreground/80">
            {mark}
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-normal leading-tight">
                {name}
              </h1>
              {isAdmin ? (
                <Pill emphasis>Admin</Pill>
              ) : isMember ? (
                <Pill emphasis>Member</Pill>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill>{visibility}</Pill>
              <Pill>{POLICY_LABEL[joinPolicy]}</Pill>
              {createdAt > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  · created {formatDate(createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {canJoin && (
          <JoinOrgButton
            orgId={orgId}
            policy={joinPolicy}
            atCapacity={atCapacity}
            alreadyRequested={alreadyRequested}
          />
        )}
      </div>

      {/* Description */}
      {description ? (
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/80">
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No description.</p>
      )}

      {/* Tabs — member experience only */}
      {isMember && (
        <OrgTabs
          paperCount={paperCount}
          memberCount={members.length}
          papers={
            papers.length > 0 ? (
              <Card className="gap-0 divide-y py-0">
                {papers.map((p) => (
                  <div key={p.paperId} className="flex flex-col gap-1 px-4 py-3">
                    <span className="text-sm">{p.title}</span>
                    {(p.authors || p.year > 0) && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.authors}
                        {p.authors && p.year > 0 ? ' · ' : ''}
                        {p.year > 0 ? p.year : ''}
                      </span>
                    )}
                  </div>
                ))}
                {paperCount > papers.length && (
                  <p className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    +{paperCount - papers.length} more
                  </p>
                )}
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">
                No papers shared to this org yet.
              </p>
            )
          }
          members={
            <div className="flex flex-col gap-3">
              <Card className="gap-0 divide-y py-0">
                {/* Column headers */}
                <div className="flex items-center gap-4 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <div className="flex min-w-0 basis-3/5 items-center gap-3">
                    <span className="size-9 shrink-0" aria-hidden />
                    <span className="flex-1">Member</span>
                  </div>
                  <span className="hidden flex-1 whitespace-nowrap text-center sm:inline">
                    Joined
                  </span>
                  <span className="hidden flex-1 whitespace-nowrap text-center sm:inline">
                    Shared
                  </span>
                  <span className="flex-1 text-center">Role</span>
                  <span className="flex-1" aria-hidden />
                </div>
                {members.map((m) => (
                  <div key={m.uid} className="flex items-center gap-4 px-4 py-3">
                    {/* Member (avatar + name + handle) — half the table width */}
                    <div className="flex min-w-0 basis-3/5 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pill font-mono text-xs font-semibold text-foreground/80">
                        {initials(m.name)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="truncate">{m.name}</span>
                          {m.uid === session.uid && (
                            <span className="shrink-0 rounded-[3px] bg-foreground px-1 py-px font-mono text-[10px] uppercase tracking-wider text-background">
                              You
                            </span>
                          )}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          @{m.handle}
                        </span>
                      </div>
                    </div>

                    {/* Joined */}
                    <span className="hidden flex-1 whitespace-nowrap text-center font-mono text-xs tabular-nums text-muted-foreground sm:inline">
                      {m.joinedAt > 0 ? formatISO(m.joinedAt) : '—'}
                    </span>
                    {/* Shared Paper */}
                    <span className="hidden flex-1 whitespace-nowrap text-center font-mono text-xs tabular-nums text-muted-foreground sm:inline">
                      {m.sharedCount}
                    </span>
                    {/* Role */}
                    <div className="flex flex-1 justify-center">
                      <RoleBadge role={m.role} />
                    </div>
                    {/* Actions */}
                    <div className="flex flex-1 justify-end">
                      <button
                        type="button"
                        aria-label="Member actions"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
              {memberCount > members.length && (
                <p className="font-mono text-xs text-muted-foreground">
                  +{memberCount - members.length} more
                </p>
              )}
            </div>
          }
          manage={
            isAdmin ? (
              <OrgManage
                orgId={orgId}
                visibility={visibility}
                joinPolicy={joinPolicy}
                inviteCount={inviteCount}
              />
            ) : undefined
          }
        />
      )}
    </div>
  )
}
