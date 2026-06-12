export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatAuthors(raw: string): string {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return raw
  const words = parts[0].split(' ').filter(Boolean)
  const abbreviated =
    words.length >= 2
      ? `${words[0][0]}. ${words[words.length - 1]}`
      : parts[0]
  const extra = parts.length - 1
  return extra > 0 ? `${abbreviated} +${extra}` : abbreviated
}

export function formatKeywords(raw: string): string {
  return raw
    .split(',')
    .map((k) => `#${k.trim().toLowerCase().replace(/\s+/g, '-')}`)
    .filter((k) => k !== '#')
    .join(' ')
}
