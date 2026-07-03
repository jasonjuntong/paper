export interface PaperMetadata {
  title: string
  authors: string
  year: string
  keywords: string
  synopsis: string
}

export type PaperMetadataDraft = Partial<PaperMetadata>

export interface ExistingPaperInfo {
  paperId: string
  title: string
  authors: string
  year: string
  keywords: string
  synopsis: string
}

export interface OrgRef {
  id: string
  name: string
}

export type InitResponse =
  | { status: 'ok'; draft: PaperMetadataDraft; existingPaperId: string | null }
  | { status: 'in-library'; paper: ExistingPaperInfo; entryId: string }
  | { status: 'in-org'; paper: ExistingPaperInfo; orgs: OrgRef[]; existingPaperId: string }

export type CommitResponse =
  | { status: 'ok'; entryId: string; paperId: string }
  | { status: 'in-library'; paper: ExistingPaperInfo; entryId: string }
  | { status: 'in-org'; paper: ExistingPaperInfo; orgs: OrgRef[]; existingPaperId: string }
  | { status: 'borderline'; paper: ExistingPaperInfo; existingPaperId: string }
