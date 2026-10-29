import { Link } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { NO_FILTERS, writeFilters } from '@/audit-log/auditFilters'
import { actionLabel, formatEntryMoment } from '@/audit-log/auditWording'
import type { AuditLogEntry, AuditPerson } from '@/audit-log/types'
import { ListSkeleton } from '@/common/Loading'
import { useRecentChanges } from './useAdminHome'

// The audit log page filtered the same way: "See all" leads to exactly the
// list these rows were the start of. writeFilters gives the page's own
// address names (?kind=change), so the link can't drift from what the page
// reads.
const SEE_ALL_CHANGES = `/admin/audit-log?${writeFilters({ ...NO_FILTERS, kind: 'change' })}`

const fullName = (person: AuditPerson) => `${person.firstName} ${person.lastName}`

// The admin home's "Recent activity" section (decisions §17): the five
// newest changes, in the audit log's own words — a summary, so no details
// toggle; each row's full entry is one click away in the log.
export function RecentActivitySection() {
  // Refetched every minute while the tab is visible (useAdminHome.ts).
  const changes = useRecentChanges()
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('recent activity', changes.isSuccess)

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <div className="space-y-1">
        <h2 ref={heading} tabIndex={-1} id="activity-heading" className="text-lg font-semibold outline-none">
          Recent activity
        </h2>
        <p className="text-sm text-muted-foreground">
          The latest changes recorded in the audit log.
        </p>
      </div>

      {changes.isPending && <ListSkeleton label="Loading recent activity…" />}
      {/* Only when there is nothing to show: a minute's refresh that fails
          keeps the last rows on screen, and the freshness bar says so
          (AdminHomeFreshness) — the rows shouldn't vanish for a blip. */}
      {changes.isError && !changes.data && (
        <LoadError what="recent activity" queries={[changes]} />
      )}
      {changes.data && changes.data.data.length === 0 && (
        <p className="text-sm">No changes recorded yet.</p>
      )}
      {changes.data && changes.data.data.length > 0 && (
        <ul aria-label="Recent activity" className="divide-y rounded-lg border">
          {changes.data.data.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {/* Shown whatever the request's state: the log itself is always there
          to open, even when this summary couldn't load. */}
      <Link to={SEE_ALL_CHANGES} className="inline-block text-sm underline underline-offset-4">
        See all changes
      </Link>
    </section>
  )
}

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  // As in the audit log (AuditEntryItem): an entry about the person who
  // acted needs one name, not "Ada Admin → Ada Admin".
  const otherPerson =
    entry.target !== null && entry.target.id !== entry.performer.id ? entry.target : null

  return (
    <li className="space-y-0.5 px-4 py-3">
      <p className="text-sm font-medium">{actionLabel(entry.action)}</p>
      <p className="text-sm">
        {fullName(entry.performer)}
        {otherPerson && (
          <>
            {' '}
            {/* Seen as an arrow, heard as "about". */}
            <span aria-hidden="true">→</span>
            <span className="sr-only">about</span> {fullName(otherPerson)}
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        <time dateTime={entry.createdAt}>{formatEntryMoment(entry.createdAt)}</time>
      </p>
    </li>
  )
}