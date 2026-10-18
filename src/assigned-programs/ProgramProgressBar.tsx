import { progressFraction } from './patientPrograms'
import { totalsText } from './progressText'
import type { ScheduleSummary } from './types'

// How a program is going, for the PATIENT — "4 of 12 sessions done" with a
// bar when it has an end date, "5 sessions done" when it's open-ended (no
// total, so no bar — decisions §5). The home's "My programs" and the
// Sessions hub's program cards both show it (moved out of the home's
// sections on 2026-10-17, with its second reader).
export function ProgramProgressBar({
  title,
  summary,
}: {
  title: string
  summary: ScheduleSummary
}) {
  const { headline } = totalsText(summary.totals)
  const fraction = progressFraction(summary.totals)
  return (
    <div className="space-y-1">
      <p className="text-sm">{headline}</p>
      {fraction && (
        // role="progressbar" with its values: a screen reader announces
        // "Knee Rehab progress, 33%" — the bar's look alone says nothing
        // to it. The headline above says the same in words, so the bar
        // only repeats it (never colour or length alone).
        <div
          role="progressbar"
          aria-label={`${title} progress`}
          aria-valuemin={0}
          aria-valuemax={fraction.expected}
          aria-valuenow={fraction.fulfilled}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            // A width computed from data can't be a Tailwind class (classes
            // must be written out in full in the source), so it's a style.
            // Capped at 100%: extra sessions never push the bar past full.
            style={{ width: `${Math.min(100, (fraction.fulfilled / fraction.expected) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}