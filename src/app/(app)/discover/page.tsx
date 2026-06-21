import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { adminFirestore } from '@/lib/firebase/admin'
import { CreateOrgButton } from '../orgs/_components/create-org-button'
import type { OrgItem } from '../orgs/_components/org-card'
import { DiscoverClient } from './_components/discover-client'
import type { DiscoverPaper } from './_components/discover-paper-card'

async function getPublicOrgs(): Promise<OrgItem[]> {
  const snap = await adminFirestore
    .collection('orgs')
    .where('visibility', '==', 'public')
    .get()

  return snap.docs
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: (data.name ?? '') as string,
        description: (data.description as string) || null,
        memberCount: (data.memberCount ?? 0) as number,
        joinPolicy: (data.joinPolicy ?? 'request') as OrgItem['joinPolicy'],
        createdAt: (data.createdAt?.toMillis?.() ?? 0) as number,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ createdAt: _createdAt, ...org }) => org)
}

// Placeholder recommendations until the public-org paper pool + keyword ranking
// land on the backend (see paper.md §5/§8). Wired to real public orgs so the
// "Join to read" links resolve. Remove once the real query exists.
const SAMPLE_PAPERS: Omit<DiscoverPaper, 'paperId' | 'sourceOrgs'>[] = [
  {
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar',
    year: 2017,
    synopsis:
      'Introduces the Transformer, a sequence model based solely on attention mechanisms.',
    keywords: 'transformers, attention, sequence modeling',
  },
  {
    title: 'Deep Residual Learning for Image Recognition',
    authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren',
    year: 2015,
    synopsis:
      'Residual connections that let very deep networks train without degradation.',
    keywords: 'computer vision, deep learning, residual networks',
  },
  {
    title: 'A Survey of Retrieval-Augmented Generation',
    authors: 'Patrick Lewis, Ethan Perez',
    year: 2023,
    synopsis:
      'Reviews methods that ground language models in retrieved external knowledge.',
    keywords: 'rag, retrieval, language models',
  },
  {
    title: 'Bayesian Methods for Hyperparameter Optimization',
    authors: 'Jasper Snoek, Hugo Larochelle, Ryan Adams',
    year: 2012,
    synopsis:
      'Frames hyperparameter tuning as Bayesian optimization over a Gaussian process.',
    keywords: 'optimization, bayesian, machine learning',
  },
]

function placeholderPapers(orgs: OrgItem[]): DiscoverPaper[] {
  if (orgs.length === 0) return []
  return SAMPLE_PAPERS.map((p, i) => {
    const org = orgs[i % orgs.length]
    return {
      ...p,
      paperId: `sample-${i}`,
      sourceOrgs: [{ id: org.id, name: org.name }],
    }
  })
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/api/auth/signout')

  const { tab } = await searchParams
  const initialTab = tab === 'papers' ? 'papers' : 'orgs'

  const orgs = await getPublicOrgs()
  const papers = placeholderPapers(orgs)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl font-normal">Discover</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Public research groups and papers to explore
            </p>
          </div>
          <CreateOrgButton />
        </div>
      </div>
      <DiscoverClient orgs={orgs} papers={papers} initialTab={initialTab} />
    </div>
  )
}
