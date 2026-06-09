import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1' })

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
