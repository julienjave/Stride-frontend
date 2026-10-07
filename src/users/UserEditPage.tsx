import { useParams, Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { roleLabel } from '@/auth/roleLabel'
import { userRoleSchema } from '@/auth/schemas'
import { useUser } from './useUser'
import { ProfileFields } from './ProfileFields'
import { AvatarUpload } from './AvatarUpload'
import { UserClinicMemberships } from './UserClinicMemberships'
import { GrantRoleForm } from './GrantRoleForm'
import { DeactivateUserButton } from './DeactivateUserButton'
import { ReactivateUserButton } from './ReactivateUserButton'
import { InvitationStatus } from '@/invitations/InvitationStatus'

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
  const { data: me } = useCurrentUser()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }

  if (isError || !user) {
    return <p className="text-sm text-destructive">Couldn't load this user.</p>
  }

  // Display names in the fixed admin → practitioner → patient order, the
  // same as the profile page.
  const roleNames = userRoleSchema.options
    .filter((role) => user.roles.includes(role))
    .map(roleLabel)
    .join(' · ')

  return (
    <div className="mx-auto mt-12 max-w-lg space-y-6 px-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{roleNames}</p>
      </div>

      {/* An admin may set or remove anyone's photo (the backend allows
          self or admin). This page is admin-only (RequireRole), so no
          extra check is needed here — unlike canEditLicense below, there's
          no field-level rule narrower than the page's own. */}
      <AvatarUpload user={user} />

      {/* The same editable profile as /profile (design decisions §4) —
          this page was read-only since Phase 2, waiting for exactly this
          shared component. Email is shown there, read-only.

          canEditLicense comes from the viewer's ACTIVE role, like
          everywhere else. RequireRole already keeps non-admins off this
          page, but that guard is only a convenience (see RequireRole.tsx);
          asking the real question here keeps the component honest if the
          page is ever reused, and the backend enforces it regardless. */}
      <ProfileFields user={user} canEditLicense={me?.activeRole === 'admin'} />

      {/* Renders nothing for an account with no invitation history (the
          founding admin's, for one). */}
      <InvitationStatus
        userId={userId}
        userName={`${user.firstName} ${user.lastName}`}
        email={user.email}
        isActive={user.isActive}
      />

      <div className="rounded-lg border px-4">
        <UserClinicMemberships userId={userId} currentClinics={user.clinics} />
      </div>

      <div className="rounded-lg border px-4 py-3">
        <GrantRoleForm userId={userId} currentRoles={user.roles} />
      </div>

      {user.isActive ? (
        <DeactivateUserButton
          userId={userId}
          userName={`${user.firstName} ${user.lastName}`}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">This account is deactivated.</p>
          <ReactivateUserButton
            userId={userId}
            userName={`${user.firstName} ${user.lastName}`}
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/users" className="underline">
          Back to users
        </Link>
      </p>
    </div>
  )
}