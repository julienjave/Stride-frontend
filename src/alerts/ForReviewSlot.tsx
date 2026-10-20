import { ClipboardCheck } from 'lucide-react'
import { alertCountText } from './alertText'
import { useAlerts } from './useAlerts'

// The home card's "For review" slot (2026-10-19 — first called "To-do";
// renamed the same day with the person: "To-do" promised tasks, and the
// roadmap keeps that name for a task list the practitioner manages), replacing
// its "Coming soon": how many things need a look, as a link down to the list
// (the For review section, id "review"). Same look as the card's other slots (TodaySlot,
// ComingSoonSlot in app/home/HomeSummaryCard.tsx): icon, small label,
// value.
//
// The same query as the section (useAlerts with the same `today`): one
// request feeds both. While it loads the slot shows nothing in its value
// line rather than a number that would jump; on an error it says so in
// words — the section below explains.
export function ForReviewSlot({ today }: { today: string }) {
  const alerts = useAlerts(today)
  return (
    <div className="flex flex-col items-center gap-1">
      <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
      <span className="text-xs uppercase text-muted-foreground">For review</span>
      {alerts.isSuccess && (
        // A plain <a>, not React Router's <Link>: "#review" is a spot on THIS
        // page — the browser scrolls to the element with that id (and moves
        // the reading position there), no navigation involved.
        <a href="#review" className="text-sm font-medium underline-offset-4 hover:underline">
          {alertCountText(alerts.data.length)}
        </a>
      )}
      {alerts.isError && <span className="text-sm text-muted-foreground">Unavailable</span>}
    </div>
  )
}