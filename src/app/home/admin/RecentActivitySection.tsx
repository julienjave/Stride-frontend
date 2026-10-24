import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { auditLogQueryKey, fetchAuditLog } from '@/audit-log/api'
import { NO_FILTERS, writeFilters, type AuditLogQuery } from '@/audit-log/auditFilters'
import { actionLabel, formatEntryMoment } from '@/audit-log/auditWording'
import type { AuditLogEntry, AuditPerson } from '@/audit-log/types'

// How many changes the home shows; the audit log has the rest.
export const RECENT_ACTIVITY_ROWS = 5

// The request: page 1 of the CHANGES only (the person's choice, 2026-10-24:
// sign-ins and record views would fill five rows on their own), newest
// first — the backend's order. Built as the audit log's own query (same
// names, same key prefix ['audit-log', …]), so nothing new is needed on the
// backend and anything that refreshes the audit log refreshes this too.
const RECENT_CHANGES_QUERY: AuditLogQuery = {
  page: '1',
  limit: String(RECENT_ACTIVITY_ROWS),
  kind: 'change',
}

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
  const changes = useQuery({
    queryKey: auditLogQueryKey(RECENT_CHANGES_QUERY),
    queryFn: () => fetchAuditLog(RECENT_CHANGES_QUERY),
  })

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <div className="space-y-1">
        <h2 id="activity-heading" className="text-lg font-semibold">
          Recent activity
        </h2>
        <p className="text-sm text-muted-foreground">
          The latest changes recorded in the audit log.
        </p>
      </div>

      {changes.isPending && (
        <p className="text-sm text-muted-foreground">Loading recent activity…</p>
      )}
      {changes.isError && <LoadError what="recent activity" queries={[changes]} />}
      {changes.isSuccess && changes.data.data.length === 0 && (
        <p className="text-sm">No changes recorded yet.</p>
      )}
      {changes.isSuccess && changes.data.data.length > 0 && (
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