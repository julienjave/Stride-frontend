import { useParams, Link } from 'react-router'
import { useUser } from './useUser'
import { UserClinicMemberships } from './UserClinicMemberships'

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)

  // Same "a route param is always a string, Number() on garbage gives
  // NaN rather than throwing" guard as ClinicEditPage — stands in for
  // "the URL was malformed" instead of calling useUser(NaN) and letting
  // it fail confusingly further down.
  if (!id || Number.isNaN(userId)) {
    return <p className="text-sm text-destructive">Invalid user.</p>
  }

  return <UserEditView userId={userId} />
}

// Split out from UserEditPage for the same reason ClinicEditView is split
// from ClinicEditPage: useUser() should only ever run with a confirmed-
// valid number, not a conditionally-called hook needing a fallback id.
function UserEditView({ userId }: { userId: number }) {
  const { data: user, isLoading, isError } = useUser(userId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }

  if (isError || !user) {
    return <p className="text-sm text-destructive">Couldn't load this user.</p>
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-sm text-muted-foreground">{user.roles.join(', ')}</p>
      </div>

      {/* Editing name/email and granting additional roles are separate,
          later roadmap items (see stride-frontend-roadmap.md) — this page
          deliberately shows that information read-only for now, rather
          than half-building an edit flow ahead of the piece actually
          being built this session: clinic membership. */}
      <div className="rounded-lg border px-4">
        <UserClinicMemberships userId={userId} currentClinics={user.clinics} />
      </div>

      {!user.isActive && (
        <p className="text-sm text-muted-foreground">This account is deactivated.</p>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/users" className="underline">
          Back to users
        </Link>
      </p>
    </div>
  )
}