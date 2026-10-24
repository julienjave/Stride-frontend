import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentDateTime } from '@/app/useCurrentDateTime'

// The summary card under every home page's greeting, and the "slots" that
// go in it. Each role fills the card with its own slots (decisions §2–§3):
//   practitioner: Today · Messages · For review
//   admin:        Today (its metrics and activity are sections of their own)
//   patient:      Today · Upcoming · … (Phase 4)
// The card only lays them out; what goes in it is the page's decision.
// This is "composition": instead of one component with a prop for every
// role's variation, small pieces the page assembles — so adding the patient
// home later means writing a new arrangement, not editing this file.

export function HomeSummaryCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      {/* One equal-width column per slot, whatever their number:
          grid-flow-col places each child in a new COLUMN (instead of a new
          row), and auto-cols-fr makes every such column the same width (1
          "fraction" of the space each). The alternative, grid-cols-3,
          hard-codes the count — and it can't be built from a variable
          (`grid-cols-${n}`) either: Tailwind generates only the class
          names it finds written out in full in the source, so a
          constructed name would silently have no CSS. */}
      <CardContent className="grid auto-cols-fr grid-flow-col gap-4 text-center">
        {children}
      </CardContent>
    </Card>
  )
}

// Today's date and time, updated every minute (useCurrentDateTime).
export function TodaySlot() {
  const now = useCurrentDateTime()

  // Intl.DateTimeFormat with explicit options, rather than the
  // zero-argument toLocaleDateString()/toLocaleTimeString() — those
  // produce a format that varies by browser/OS in ways that are hard to
  // predict or test against. Passing `undefined` as the locale still
  // respects the visitor's own browser locale; only the OPTIONS (which
  // fields, what format) are pinned down explicitly.
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now)

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase text-muted-foreground">Today</span>
      <span className="font-medium">{dateLabel}</span>
      <span className="text-sm text-muted-foreground">{timeLabel}</span>
    </div>
  )
}