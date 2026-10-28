import { failureText } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import { attendanceLines } from './alertText'
import type { Alert, AttendanceAlert } from './types'
import { useAlerts } from './useAlerts'
import { useReviewProgramAlert } from './useReviewProgramAlert'

// The program page's "For review" banner (decided with the person
// 2026-10-19, after testing the list live: an attendance alert the patient
// never answers sat there forever). It shows THIS program's attendance
// alert, if the practitioner's list has one, with "Mark as reviewed":
//   - on the program page, not on the list's row — look at the weeks
//     first, then mark (and no row removed by an accidental tap);
//   - the review hides the alert from MY list until something new happens
//     (a new run of misses, inactivity added), or for 14 days — the server
//     decides, the banner only says so.
//
// It reads the same list as the home (useAlerts with the practitioner's
// `today`): usually cached already when the practitioner came from there.
// Quiet by design: nothing while the list loads, nothing if it can't be
// read — the program page has its own job, and the home says when the list
// is unavailable.
export function ProgramAlertBanner({ programId, today }: { programId: number; today: string }) {
  const alerts = useAlerts(today)
  const review = useReviewProgramAlert(programId, today)

  // After the review the alert leaves the list (refetched); the banner
  // says what happened instead of vanishing without a word. A status
  // region, so a screen reader announces it.
  if (review.isSuccess) {
    return (
      <p role="status" className="rounded-lg border px-4 py-3 text-sm">
        Marked as reviewed. It will be back on your list if something changes, or in 14 days.
      </p>
    )
  }

  // A TYPE PREDICATE (`item is AttendanceAlert`): the function's `true`
  // tells TypeScript the item found IS an attendance alert, so the one
  // check both finds it and narrows its type — no second check after.
  const alert = alerts.data?.find(
    (item: Alert): item is AttendanceAlert =>
      item.kind === 'attendance' && item.program.id === programId,
  )
  if (!alert) return null

  return (
    <section
      aria-labelledby="program-for-review"
      className="space-y-2 rounded-lg border border-amber-500/60 bg-amber-50 px-4 py-3 dark:bg-amber-950/30"
    >
      <h2 id="program-for-review" className="text-sm font-semibold">
        For review
      </h2>
      {attendanceLines(alert).map((line) => (
        <p key={line} className="text-sm">
          {line}
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" size="sm" disabled={review.isPending} onClick={() => review.mutate()}>
          {review.isPending ? 'Saving…' : 'Mark as reviewed'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Hidden from your list until something changes, or for 14 days.
        </p>
      </div>
      {review.isError && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(review.error, "Couldn't save. Try again.")}
        </p>
      )}
    </section>
  )
}