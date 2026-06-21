import { cn } from '@/lib/utils'

// Short badge mark for an org — initials of up to two words, else first two letters.
export function deriveOrgMark(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface OrgMarkProps extends React.ComponentProps<'span'> {
  /** Org name — used to derive the mark when `mark` is not provided. */
  name: string
  /** Pre-computed mark; falls back to deriving from `name`. */
  mark?: string
}

export function OrgMark({ name, mark, className, ...props }: OrgMarkProps) {
  return (
    <span
      style={{ background: 'oklch(0.918 0.004 106.937)' }}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-xs font-normal leading-none text-foreground/80',
        className,
      )}
      {...props}
    >
      {mark ?? deriveOrgMark(name)}
    </span>
  )
}
