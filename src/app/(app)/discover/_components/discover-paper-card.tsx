import { PaperCard } from '@/components/paper-card'
import { OrgMark } from '@/components/org-mark'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type DiscoverPaper = {
  paperId: string
  title: string
  authors: string
  year: number | null
  synopsis: string
  keywords: string
  // Public org(s) this paper is discoverable through. The first is the
  // primary "Join to read" target.
  sourceOrgs: { id: string; name: string }[]
}

export function DiscoverPaperCard({ paper }: { paper: DiscoverPaper }) {
  const org = paper.sourceOrgs[0]

  // List access only: a non-member sees the metadata but not the content, so
  // the card routes to the source org to join rather than to the paper.
  return (
    <PaperCard
      href={`/orgs/${org.id}`}
      title={paper.title}
      authors={paper.authors}
      year={paper.year}
      synopsis={paper.synopsis}
      keywords={paper.keywords}
      footer={
        <Tooltip>
          <TooltipTrigger asChild>
            <OrgMark name={org.name} className="mt-4" />
          </TooltipTrigger>
          <TooltipContent>{org.name}</TooltipContent>
        </Tooltip>
      }
    />
  )
}
