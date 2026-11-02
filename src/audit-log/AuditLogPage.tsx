import { Button } from '@/components/ui/button'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useUsers } from '@/users/useUsers'
import { AuditEntryItem } from './AuditEntryItem'
import { AuditLogFiltersPanel } from './AuditLogFiltersPanel'
import { hasFilters, rangeProblem, toQuery } from './auditFilters'
import { useAuditActions, useAuditLog } from './useAuditLog'
import { useFiltersInAddress } from './useFiltersInAddress'
import { ListSkeleton } from '@/common/Loading'

// /admin/audit-log — the audit trail, newest first (decisions §11). Every
// filter lives in the address (auditFilters.ts, useFiltersInAddress.ts): the
// page READS its state from it and WRITES each change back, so Back, a reload
// and a shared link all show the same view. Admins only (the route's guard,
// and the backend's).
export function AuditLogPage() {
  const [filters, show] = useFiltersInAddress()
  const problem = rangeProblem(filters)
  const log = useAuditLog(toQuery(filters), problem === null)
  const actions = useAuditActions()
  // Everyone, deactivated accounts too: they appear in the log.
  const people = useUsers(true)

  const data = log.data
  // After a "Try again" that worked, focus goes to the page's heading. Not
  // `isSuccess` alone: during a retry the previous results stay on screen as
  // placeholder data (useAuditLog), which TanStack reports as success.
  const heading = useRetryFocus<HTMLHeadingElement>(
    'the audit log',
    log.isSuccess && !log.isPlaceholderData,
  )

  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-4 px-4">
      <div className="space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Audit log
        </h1>
        <p className="text-sm text-muted-foreground">
          Every change, sign-in, and view of a patient’s clinical data, newest first. Entries can’t
          be edited or deleted.
        </p>
      </div>

      <AuditLogFiltersPanel
        filters={filters}
        onChange={show}
        actions={actions.data}
        people={people.data}
      />

      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : log.isError ? (
        <LoadError what="the audit log" queries={[log]} />
      ) : !data ? (
        <ListSkeleton label="Loading the audit log…" rows={5} />
      ) : (
        <>
          {/* A live region: a screen reader hears the new count after each
              filter change, without moving focus. */}
          <p role="status" className="text-sm text-muted-foreground">
            {data.meta.total === 1 ? '1 entry' : `${data.meta.total} entries`}
          </p>

          {data.meta.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              {hasFilters(filters)
                ? 'No entries match these filters.'
                : 'Nothing has been recorded yet.'}
            </p>
          ) : data.data.length === 0 ? (
            // ?page=40 of a 3-page result: say so, and offer the way back.
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">There are no entries on page {filters.page}.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => show({ ...filters, page: 1 })}>
                Go to page 1
              </Button>
            </div>
          ) : (
            <ul
              aria-busy={log.isPlaceholderData}
              className={`divide-y divide-border rounded-lg border ${log.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data.data.map((entry) => (
                <AuditEntryItem key={entry.id} entry={entry} />
              ))}
            </ul>
          )}

          {data.meta.totalPages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => show({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page} of {data.meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filters.page >= data.meta.totalPages}
                onClick={() => show({ ...filters, page: filters.page + 1 })}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}