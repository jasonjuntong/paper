import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiscoverClient } from './_components/discover-client'
import type { OrgItem } from './_components/org-card'

const MOCK_ALL: OrgItem[] = [
  {
    id: '1',
    name: 'ML Reading Group',
    description: 'Weekly discussions on machine learning papers, from theory to applications.',
    memberCount: 42,
    joinPolicy: 'open',
  },
  {
    id: '2',
    name: 'Computational Biology',
    description: 'Bridging computer science and biology through shared literature.',
    memberCount: 18,
    joinPolicy: 'request',
  },
  {
    id: '3',
    name: 'NLP Research Collective',
    description: null,
    memberCount: 91,
    joinPolicy: 'open',
  },
  {
    id: '4',
    name: 'Climate & Earth Systems',
    description: 'Papers on climate modeling, atmospheric science, and earth system dynamics.',
    memberCount: 27,
    joinPolicy: 'request',
  },
  {
    id: '5',
    name: 'Quantum Computing Papers',
    description: 'Curated reading list for quantum algorithms and hardware.',
    memberCount: 55,
    joinPolicy: 'open',
  },
  {
    id: '6',
    name: 'Robotics & Embodied AI',
    description: null,
    memberCount: 33,
    joinPolicy: 'invite',
  },
]

const MOCK_SUGGESTED: OrgItem[] = [MOCK_ALL[0], MOCK_ALL[2], MOCK_ALL[4]]

export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-normal">Discover orgs</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Find and join public research groups
            </p>
          </div>
          <Button>
            <Plus />
            Create org
          </Button>
        </div>
      </div>
      <DiscoverClient suggested={MOCK_SUGGESTED} all={MOCK_ALL} />
    </div>
  )
}
