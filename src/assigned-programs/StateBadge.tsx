import { cn } from '@/lib/utils'
import type { Tone } from './progressText'

// The tone's colours: a light tint of the colour behind the normal text
// colour, so the WORD stays readable in both themes (the same tints as the
// app's green and amber notices). The colour only repeats what the word
// says (progressText.ts: never colour alone).
const TONE_CLASSES: Record<Tone, string> = {
  good: 'border-green-600/30 bg-green-600/10',
  bad: 'border-destructive/40 bg-destructive/10',
  pending: 'border-amber-600/40 bg-amber-500/10',
  neutral: 'border-border bg-muted',
}

// A small pill with a state's word: "Done", "Missed", "In progress"…
export function StateBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        // shrink-0 + whitespace-nowrap: beside a long line, the LINE wraps,
        // never the badge (the YoursBadge rule).
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  )
}