import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { LoadError } from '@/common/LoadError'
import { NativeSelect } from '@/common/NativeSelect'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useUsers, useUsersNeedingAttention } from './useUsers'
import { ATTENTION_GROUPS, ATTENTION_KINDS, readAttention } from './attention'
import { ListSkeleton } from '@/common/Loading'
import { usePatientMerges } from '@/patient-merges/usePatientMerges'

// URL scheme for this feature, mirroring clinics exactly: /admin/users
// (this page), /admin/users/new (create, already built), /admin/users/:id
// (the edit view, built alongside this page — see UserEditPage.tsx).
//
// "Show" (decisions §17, 2026-10-24): every user, or one of the admin home's
// "needs attention" groups. The choice lives in the ADDRESS
// (`?attention=…`), not in component state, so the home can link straight to
// a group, Back returns to the previous view, and a reload keeps it — the
// same reasons as the audit log's filters.
export function UsersListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const attention = readAttention(searchParams)
  const showId = useId()

  // Off by default — findAll()'s own default matches (includeInactive
  // defaults to false server-side too), so an admin's normal browsing
  // view stays the same as before this feature existed.
  const [includeInactive, setIncludeInactive] = useState(false)
  // Only the list on screen is asked for: the whole list is switched off
  // while a group is shown, and the group's query does nothing without one.
  const everyone = useUsers(includeInactive, attention === null)
  const group = useUsersNeedingAttention(attention)
  const shown = attention === null ? everyone : group
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the users', shown.isSuccess)
  const users = shown.data
  // Which accounts were merged away (decisions §27, pass 4) — for their
  // "Merged" badge. A failure here costs only the badges: the list stays.
  const merges = usePatientMerges()
  const mergedAway = new Set((merges.data ?? []).map((merge) => merge.mergedId))

  function show(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === '') next.delete('attention')
    else next.set('attention', value)
    setSearchParams(next)
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl space-y-4 px-4">
      <div className="flex items-center justify-between">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Users
        </h1>
        <Button asChild>
          <Link to="/admin/users/new">Add user</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={showId} className="text-sm font-medium">
          Show
        </label>
        {/* A native select (themed option colours — NativeSelect): three
            fixed choices, nothing a custom listbox would add. */}
        <NativeSelect
          id={showId}
          className="w-auto"
          value={attention ?? ''}
          onChange={(event) => show(event.target.value)}
        >
          <option value="">All users</option>
          {ATTENTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ATTENTION_GROUPS[kind].title}
            </option>
          ))}
        </NativeSelect>
      </div>

      {attention === null ? (
        // A plain native checkbox, not a shadcn/Radix component — unlike
        // Select, a checkbox doesn't meaningfully benefit from Radix's
        // extra machinery (no popover, no keyboard-nav list to manage),
        // so there's no reason to block on fetching one for this.
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show deactivated users
        </label>
      ) : (
        // A group is about ACTIVE accounts by definition, so the
        // "deactivated" choice has no meaning here and isn't offered; the
        // rule is said instead.
        <p className="text-sm text-muted-foreground">{ATTENTION_GROUPS[attention].explanation}</p>
      )}

      {shown.isPending && <ListSkeleton label="Loading the users…" />}

      {/* "Try again" asks for this list only (decisions §15). */}
      {shown.isError && <LoadError what="the users" queries={[shown]} />}

      {users && users.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {attention === null ? 'No users yet.' : ATTENTION_GROUPS[attention].empty}
        </p>
      )}

      {users && users.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {users.map((user) => (
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
    </div>
  )
}