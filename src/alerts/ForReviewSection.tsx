import { type RefObject, useState } from 'react'
import { Link } from 'react-router'
import { formatShortDate } from '@/common/calendarDate'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { UserAvatar } from '@/common/UserAvatar'
import { sessionStatusText } from '@/sessions/sessionText'
import { failureText } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import {
  alertLinkLabel,
  attendanceLines,
  joinLinkLabel,
  joinPeriodText,
  joinReviewLabel,
  joinText,
  sessionReasonsText,
} from './alertText'
import type { Alert, CareTeamJoinAlert } from './types'
import { useAlerts } from './useAlerts'
import { useReviewCareTeamJoin } from './useReviewCareTeamJoin'
import { ListSkeleton } from '@/common/Loading'

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
//     reviewed");
//   - a colleague who joined a patient's care team (2026-10-28, decisions
//     §25) → "Mark as reviewed" right in the row (there is nothing more to
//     read), and a link to the patient's page, where the care team is.
export function ForReviewSection({ today }: { today: string }) {
  const alerts = useAlerts(today)
  const [showAll, setShowAll] = useState(false)
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>("what's for review", alerts.isSuccess)
  // Said after a join notice is marked reviewed — its row (and the button that
  // had focus) leaves the list, so focus goes to the heading and this polite
  // status says what happened.
  const [reviewedNote, setReviewedNote] = useState('')

  return (
    // id="review": the target of the card slot's "#review" link. scroll-mt
    // keeps the heading clear of the sticky top bar after the jump.
    <section id="review" aria-labelledby="review-heading" className="scroll-mt-20 space-y-3">
      <div className="space-y-1">
        <h2 ref={heading} tabIndex={-1} id="review-heading" className="text-lg font-semibold outline-none">
          For review
        </h2>
        <p className="text-sm text-muted-foreground">
          Your patients who have stopped coming, sessions of the last 14 days to look at, and
          colleagues who joined their care teams.
        </p>
        <p role="status" className="sr-only">
          {reviewedNote}
        </p>
      </div>
      {alerts.isPending && <ListSkeleton label="Loading what's for review…" rows={2} />}
      {alerts.isError && <LoadError what="what's for review" queries={[alerts]} />}
      {alerts.isSuccess && alerts.data.length === 0 && (
        <p className="text-sm">You're all caught up.</p>
      )}
      {alerts.isSuccess && alerts.data.length > 0 && (
        <>
          <ul aria-label="For review" className="divide-y rounded-lg border">
            {(showAll ? alerts.data : alerts.data.slice(0, FOR_REVIEW_FIRST_ROWS)).map((alert) => (
              <ReviewRow
                key={rowKey(alert)}
                alert={alert}
                heading={heading}
                onReviewed={setReviewedNote}
              />
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
// program has at most one attendance row, a session one review row, a link one
// join row — so kind + id is unique (a program and a session may share a
// number).
function rowKey(alert: Alert): string {
  switch (alert.kind) {
    case 'session':
      return `session-${alert.session.id}`
    case 'attendance':
      return `program-${alert.program.id}`
    case 'care_team_join':
      return `join-${alert.link.id}`
  }
}

function ReviewRow({
  alert,
  heading,
  onReviewed,
}: {
  alert: Alert
  heading: RefObject<HTMLHeadingElement | null>
  onReviewed: (note: string) => void
}) {
  if (alert.kind === 'care_team_join') {
    return <JoinRow alert={alert} heading={heading} onReviewed={onReviewed} />
  }
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
// A colleague joined the care team: who, by whom, when — and "Mark as
// reviewed" in place. A failure is said in the row (`failureText`, the app's
// one wording rule); after success, focus moves to the section's heading
// BEFORE the row leaves (its button would take focus with it), and the
// section's status says what was done.
function JoinRow({
  alert,
  heading,
  onReviewed,
}: {
  alert: CareTeamJoinAlert
  heading: RefObject<HTMLHeadingElement | null>
  onReviewed: (note: string) => void
}) {
  const review = useReviewCareTeamJoin(alert.link.id)
  const name = `${alert.patient.firstName} ${alert.patient.lastName}`
  // "Now", read ONCE when the row appears (a lazy initial state, not a call
  // during render — rendering must not depend on the clock): it only decides
  // "left" vs "until", which a page open for a while needn't re-decide.
  const [now] = useState(() => new Date())

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <UserAvatar
        firstName={alert.patient.firstName}
        lastName={alert.patient.lastName}
        avatarUrl={alert.patient.avatarUrl}
        className="size-9 shrink-0 text-xs"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{name}</p>
        <p className="text-sm">{joinText(alert)}</p>
        <p className="text-sm text-muted-foreground">{joinPeriodText(alert, now)}</p>
        {review.isError && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(review.error)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            aria-label={joinReviewLabel(alert)}
            disabled={review.isPending}
            onClick={() =>
              review.mutate(undefined, {
                onSuccess: () => {
                  heading.current?.focus()
                  onReviewed(`Marked as reviewed: ${joinText(alert)} of ${name}.`)
                },
              })
            }
          >
            {review.isPending ? 'Marking…' : 'Mark as reviewed'}
          </Button>
          <Link
            to={`/practitioner/patients/${alert.patient.id}`}
            aria-label={joinLinkLabel(alert)}
            className="text-sm font-medium underline underline-offset-4"
          >
            View care team
          </Link>
        </div>
      </div>
    </li>
  )
}