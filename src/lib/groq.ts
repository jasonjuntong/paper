import Groq from 'groq-sdk'
import type { PaperMetadataDraft } from '@/types/paper'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function extractPaperMetadata(pages: string[]): Promise<PaperMetadataDraft> {
  const text = pages.join('\n\n')
  const prompt = `Extract metadata from this academic paper text. Return ONLY valid JSON with these fields:
- title: the paper's full title
- authors: all authors comma-separated (e.g. "Smith, J., Jones, A.")
- year: publication year as a 4-digit string (e.g. "2023")
- keywords: keywords or topics comma-separated
- synopsis: a 2-3 sentence summary of the paper's contribution

Paper text:
${text.slice(0, 12000)}`

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
    const raw = response.choices[0].message.content ?? ''
    const json = JSON.parse(raw)
    return {
      title: json.title ?? '',
      authors: json.authors ?? '',
      year: json.year ?? '',
      keywords: json.keywords ?? '',
      synopsis: json.synopsis ?? '',
    }
  } catch (err) {
    console.error('[groq] extractPaperMetadata failed:', err)
    return {}
  }
}
