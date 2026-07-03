import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1' })

/**
 * Assembles the paper embedding input from RAW extracted metadata — never the
 * user's edited copy — so the same paper always embeds identically regardless of
 * who uploads it. Order and spacing are load-bearing: changing them changes every
 * embedding, so keep this byte-for-byte stable.
 */
export function buildPaperEmbeddingInput(em: {
  title: string
  synopsis: string
  keywords: string
}): string {
  return `${em.title} ${em.synopsis} ${em.keywords}`
}

export async function generatePaperEmbedding(text: string): Promise<number[]> {
  try {
    const result = await genai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: { outputDimensionality: 768 },
    })
    return result.embeddings?.[0]?.values ?? []
  } catch (err: unknown) {
    console.error('[gemini] generatePaperEmbedding failed:', err)
    return []
  }
}
