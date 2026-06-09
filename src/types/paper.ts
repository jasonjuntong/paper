export interface PaperMetadata {
  title: string
  authors: string
  year: string
  keywords: string
  synopsis: string
}

export type PaperMetadataDraft = Partial<PaperMetadata>

export type InitResponse =
  | { status: 'duplicate'; message: string }
  | { status: 'ok'; draft: PaperMetadataDraft }

export type CommitResponse =
  | { status: 'duplicate'; message: string }
  | { status: 'ok'; entryId: string; paperId: string }
