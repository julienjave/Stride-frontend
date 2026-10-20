import { useState } from 'react'
import { Link } from 'react-router'
import { formatShortDate } from '@/common/calendarDate'
import { UserAvatar } from '@/common/UserAvatar'
import { sessionStatusText } from '@/sessions/sessionText'
import { alertLinkLabel, attendanceLines, sessionReasonsText } from './alertText'
import type { Alert } from './types'
import { useAlerts } from './useAlerts'

// How many rows show before "Show all N" — a home page is a summary; a
// long caseload's list shouldn't push everything else off the screen.
export const FOR_REVIEW_FIRST_ROWS = 5

// The practitioner home's "For review" list (decided 2026-10-19, decisions
// §3 — first called "To-do"): under the shortcuts (moved there the same
// day, the person's point: a list of varying length above them pushed the
// navigation down; the card's count still links straight here), the alerts
// in the backend's order — attendance first
// (an ongoing situation), then sessions to review, newest first. Each row
// says who, which program, what happened, and leads where the answer is:
//   - attendance → the program page (its weeks show the missed days, and
//     its banner has "Mark as reviewed");
//   - a session → its review page (scores, ratings, notes, "Mark as
//     reviewed").
export function ForReviewSection({ today }: { today: string }) {
  const alerts = useAlerts(today)
  const [showAll, setShowAll] = useState(false)

  return (
    // id="review": the target of the card slot's "#review" link. scroll-mt
    // keeps the heading clear of the sticky top bar after the jump.
    <section id="review" aria-labelledby="review-heading" className="scroll-mt-20 space-y-3">
      <div className="space-y-1">
        <h2 id="review-heading" className="text-lg font-semibold">
          For review
        </h2>
        <p className="text-sm text-muted-foreground">
          Your patients who have stopped coming, and sessions of the last 14 days to look at.
        </p>
      </div>
      {alerts.isPending && <p className="text-sm text-muted-foreground">Loading what's for review…</p>}
      {alerts.isError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn't load what's for review. Try refreshing the page.
        </p>
      )}
      {alerts.isSuccess && alerts.data.length === 0 && (
        <p className="text-sm">You're all caught up.</p>
      )}
      {alerts.isSuccess && alerts.data.length > 0 && (
        <>
          <ul aria-label="For review" className="divide-y rounded-lg border">
            {(showAll ? alerts.data : alerts.data.slice(0, FOR_REVIEW_FIRST_ROWS)).map((alert) => (
              <ReviewRow key={rowKey(alert)} alert={alert} />
            ))}
          </ul>
          {alerts.data.length > FOR_REVIEW_FIRST_ROWS && (
            // A real button that says what it will do; aria-expanded tells a
            // screen reader the list it controls is folded or not.
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className="text-sm underline underline-offset-4"
            >
              {showAll ? 'Show fewer' : `Show all ${alerts.data.length}`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// React's `key`: unique among the rows and stable across refetches. A
// program has at most one attendance row, a session one review row — so
// kind + id is unique (a program and a session may share a number).
function rowKey(alert: Alert): string {
  return alert.kind === 'session' ? `session-${alert.session.id}` : `program-${alert.program.id}`
}

function ReviewRow({ alert }: { alert: Alert }) {
  const name = `${alert.patient.firstName} ${alert.patient.lastName}`
  const lines =
    alert.kind === 'attendance'
      ? attendanceLines(alert)
      : [
          `${formatShortDate(alert.session.localDate)} · ${sessionStatusText(alert.session)}`,
          sessionReasonsText(alert),
        ].filter((line): line is string => line !== null)
  const to =
    alert.kind === 'session'
      ? `/practitioner/sessions/${alert.session.id}`
      : `/practitioner/programs/assigned/${alert.program.id}`

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <UserAvatar
        firstName={alert.patient.firstName}
        lastName={alert.patient.lastName}
        avatarUrl={alert.patient.avatarUrl}
        className="size-9 shrink-0 text-xs"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{alert.program.title}</p>
        {lines.map((line) => (
          <p key={line} className="text-sm">
            {line}
          </p>
        ))}
      </div>
      <Link
        to={to}
        aria-label={alertLinkLabel(alert)}
        className="shrink-0 text-sm font-medium underline underline-offset-4"
      >
        {alert.kind === 'session' ? 'Review' : 'View program'}
      </Link>
    </li>
  )
}