import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadError } from '@/common/LoadError'
import { NativeSelect } from '@/common/NativeSelect'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useAddressFilters } from '@/common/useAddressFilters'
import { useUserListPage } from './useUsers'
import { ATTENTION_GROUPS, ATTENTION_KINDS, type AttentionKind } from './attention'
import {
  hasUserFilters,
  readUserListFilters,
  withFilter,
  writeUserListFilters,
  USER_LIST_ROLES,
  USER_LIST_STATUSES,
  type UserListFilters,
  type UserListRole,
  type UserListStatus,
} from './userListFilters'
import { ListSkeleton } from '@/common/Loading'
import { usePatientMerges } from '@/patient-merges/usePatientMerges'
import { useClinics } from '@/clinics/useClinics'

// URL scheme for this feature, mirroring clinics exactly: /admin/users
// (this page), /admin/users/new (create), /admin/users/:id (the edit view).
//
// Phase 6.5 (decided with the person 2026-10-29): search, role, clinic and
// account status beside "Show" (the admin home's "needs attention" groups,
// decisions §17), 25 accounts a page — GET /admin/users, which counts and
// pages on the server. Every filter lives in the ADDRESS
// (userListFilters.ts), so the home can link straight to a group, Back
// returns to the previous view, a reload keeps it, and a link can be shared
// — the audit log's reasons, and its mechanism (useAddressFilters).

// How long the search waits after the last keystroke before asking — the
// clinic directory's search waits the same.
const SEARCH_DELAY_MS = 300

const ROLE_LABELS: Record<UserListRole, string> = {
  admin: 'Admins',
  practitioner: 'Practitioners',
  patient: 'Patients',
}

const STATUS_LABELS: Record<UserListStatus, string> = {
  active: 'Active accounts',
  deactivated: 'Deactivated accounts',
  all: 'All accounts',
}

export function UsersListPage() {
  const [filters, show] = useAddressFilters(readUserListFilters, writeUserListFilters)
  const query = writeUserListFilters(filters).toString()
  const users = useUserListPage(query)
  const clinics = useClinics(true)
  // Which accounts were merged away (decisions §27, pass 4) — for their
  // "Merged" badge. A failure here costs only the badges: the list stays.
  const merges = usePatientMerges()
  const mergedAway = new Set((merges.data ?? []).map((merge) => merge.mergedId))
  const ids = { search: useId(), role: useId(), clinic: useId(), status: useId(), show: useId() }

  // After a "Try again" that worked, focus goes to the page's heading — not
  // while the previous page is still shown as a placeholder (TanStack
  // reports that as success).
  const heading = useRetryFocus<HTMLHeadingElement>(
    'the users',
    users.isSuccess && !users.isPlaceholderData,
  )

  // --- The search box -----------------------------------------------------
  //
  // What's TYPED is kept apart from what the address says: the box answers
  // every keystroke at once, the address (and so the request) changes only
  // once typing has paused for SEARCH_DELAY_MS — one request for "lopez",
  // not five — and REPLACES the history entry, so Back doesn't step through
  // every letter.
  //
  // `typed` is null when the box simply shows the address's search. When the
  // address's search changes for any other reason than this box (Back, a
  // link from the home), what was typed is dropped — unless it IS what the
  // address now says (the box's own commit), so a trailing space being typed
  // ("ana ") isn't trimmed away under the cursor. Adjusted during render
  // (React's "you might not need an effect"), like useAddressFilters' reset.
  const [typed, setTyped] = useState<string | null>(null)
  const [seenSearch, setSeenSearch] = useState(filters.search)
  if (filters.search !== seenSearch) {
    setSeenSearch(filters.search)
    if (typed !== null && typed.trim() !== filters.search) setTyped(null)
  }

  // The commit runs in a timer started by a keystroke — but must use the
  // filters as they are WHEN IT FIRES (a role chosen in between must stand).
  // A ref holds the latest; written in an effect, never during render.
  const latest = useRef({ filters, show })
  useEffect(() => {
    latest.current = { filters, show }
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  function typeSearch(value: string) {
    setTyped(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const { filters: now, show: showNow } = latest.current
      if (value.trim() !== now.search) {
        showNow(withFilter(now, { search: value.trim() }), { replace: true })
      }
    }, SEARCH_DELAY_MS)
  }

  // --- The other filters --------------------------------------------------

  // A group is about ACTIVE accounts by definition (attention-rules.ts), so
  // choosing one puts the status back to active — the status choice is
  // hidden while a group is shown.
  function showGroup(value: string) {
    const attention = ATTENTION_KINDS.find((kind) => kind === value) ?? null
    show(withFilter(filters, { attention, ...(attention ? { status: 'active' } : {}) }))
  }

  // The clinics to choose from: every clinic, deactivated ones said so (an
  // account can still belong to one). A clinic named by the address but not
  // in the list (gone, or the list didn't load) keeps an option of its own,
  // so the select never shows a choice that isn't the one in force.
  const clinicOptions = (clinics.data ?? []).map((clinic) => ({
    value: String(clinic.id),
    label: clinic.isActive ? clinic.name : `${clinic.name} (deactivated)`,
  }))
  if (
    filters.clinic !== null &&
    filters.clinic !== 'none' &&
    !clinicOptions.some((option) => option.value === filters.clinic)
  ) {
    clinicOptions.push({ value: filters.clinic, label: `Clinic ${filters.clinic}` })
  }

  const page = users.data
  // The group alone (nothing else narrowing it): an empty answer then gets the
  // group's own words ("Every patient has someone on their care team.").
  const groupOnly =
    filters.attention !== null && !hasOtherFilters(filters) ? filters.attention : null

  return (
    <div className="mx-auto mt-12 max-w-2xl space-y-4 px-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Users
        </h1>
        <Button asChild>
          <Link to="/admin/users/new">Add user</Link>
        </Button>
      </div>

      {/* role="search": a landmark — a screen reader can jump straight to the
          list's filters. Native selects (themed options — NativeSelect):
          a handful of fixed choices each, nothing a custom listbox adds. */}
      <div role="search" className="grid gap-3 sm:grid-cols-2">
        <Field id={ids.search} label="Search" className="sm:col-span-2">
          <Input
            id={ids.search}
            type="search"
            placeholder="Name or email"
            maxLength={100}
            value={typed ?? filters.search}
            onChange={(event) => typeSearch(event.target.value)}
          />
        </Field>
        <Field id={ids.role} label="Role">
          <NativeSelect
            id={ids.role}
            value={filters.role ?? ''}
            onChange={(event) =>
              show(
                withFilter(filters, {
                  role: USER_LIST_ROLES.find((role) => role === event.target.value) ?? null,
                }),
              )
            }
          >
            <option value="">Any role</option>
            {USER_LIST_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={ids.clinic} label="Clinic">
          <NativeSelect
            id={ids.clinic}
            value={filters.clinic ?? ''}
            onChange={(event) =>
              show(withFilter(filters, { clinic: event.target.value === '' ? null : event.target.value }))
            }
          >
            <option value="">Any clinic</option>
            <option value="none">No clinic</option>
            {clinicOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={ids.show} label="Show">
          <NativeSelect
            id={ids.show}
            value={filters.attention ?? ''}
            onChange={(event) => showGroup(event.target.value)}
          >
            <option value="">All users</option>
            {ATTENTION_KINDS.map((kind: AttentionKind) => (
              <option key={kind} value={kind}>
                {ATTENTION_GROUPS[kind].title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {filters.attention === null ? (
          <Field id={ids.status} label="Status">
            <NativeSelect
              id={ids.status}
              value={filters.status}
              onChange={(event) =>
                show(
                  withFilter(filters, {
                    status:
                      USER_LIST_STATUSES.find((status) => status === event.target.value) ??
                      'active',
                  }),
                )
              }
            >
              {USER_LIST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          // A group is about ACTIVE accounts by definition, so the status
          // choice has no meaning here and isn't offered; the rule is said
          // instead.
          <p className="self-end text-sm text-muted-foreground">
            {ATTENTION_GROUPS[filters.attention].explanation}
          </p>
        )}
      </div>

      {!page && users.isPending && <ListSkeleton label="Loading the users…" />}

      {/* "Try again" asks for this list only (decisions §15). Only when there
          is nothing to show: a refetch of the page on screen that fails keeps
          its rows. (A NEW page that fails has no rows of its own — TanStack
          drops the placeholder — so the error takes their place.) */}
      {users.isError && !page && <LoadError what="the users" queries={[users]} />}

      {page && (
        <>
          {/* A live region: a screen reader hears the new count after each
              filter change, without moving focus. */}
          <p role="status" className="text-sm text-muted-foreground">
            {page.meta.total === 1 ? '1 user' : `${page.meta.total} users`}
          </p>

          {page.meta.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              {groupOnly
                ? ATTENTION_GROUPS[groupOnly].empty
                : hasUserFilters(filters)
                  ? 'No users match these filters.'
                  : 'No users yet.'}
            </p>
          ) : page.data.length === 0 ? (
            // ?page=40 of a 3-page result: say so, and offer the way back.
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">There are no users on page {filters.page}.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => show({ ...filters, page: 1 })}
              >
                Go to page 1
              </Button>
            </div>
          ) : (
            <ul
              aria-busy={users.isPlaceholderData}
              className={`divide-y divide-border rounded-lg border ${users.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {page.data.map((user) => (
                <li key={user.id}>
                  <Link
                    to={`/admin/users/${user.id}`}
                    className="flex flex-col px-4 py-3 hover:bg-muted/50"
                  >
                    <span className="font-medium">
                      {user.firstName} {user.lastName}
                      {!user.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>
                      )}
                      {mergedAway.has(user.id) && (
                        <span className="ml-2 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                          Merged
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.roles.join(', ')}
                      {user.clinics.length > 0 &&
                        ` · ${user.clinics.map((clinic) => clinic.name).join(', ')}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {page.meta.totalPages > 1 && (
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
                Page {filters.page} of {page.meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filters.page >= page.meta.totalPages}
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

// Any filter besides the group? Then an empty answer is "no match", not the
// group's own "nobody needs this" words.
function hasOtherFilters(filters: UserListFilters): boolean {
  return hasUserFilters({ ...filters, attention: null })
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}