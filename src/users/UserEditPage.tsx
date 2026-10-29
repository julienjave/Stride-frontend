import { useParams, Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
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
import { CareTeamSection } from '@/patients/CareTeamSection'
import { ResetTwoFactorSection } from '@/two-factor/ResetTwoFactorSection'
import { RecordsExportLinksSection } from '@/records-export/RecordsExportLinksSection'
import { ComplaintReviewsSection } from '@/complaint-reviews/ComplaintReviewsSection'
import { LegalDisclosuresSection } from '@/legal-disclosures/LegalDisclosuresSection'
import { Loading } from '@/common/Loading'

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)

  // Same "a route param is always a string, Number() on garbage gives
  // NaN rather than throwing" guard as ClinicEditPage — stands in for
  // "the URL was malformed" instead of calling useUser(NaN) and letting
  // it fail confusingly further down.
  // (Malformed: it can't be a user — the 404's page, without asking.)
  if (!id || Number.isNaN(userId)) {
    return <RecordNotFound noun="user" links={WAYS_OUT} />
  }

  return <UserEditView userId={userId} />
}

// Where to go when this page can't show its user (RecordNotFound).
const WAYS_OUT: [{ to: string; label: string }] = [{ to: '/admin/users', label: 'Users' }]

// Split out from UserEditPage for the same reason ClinicEditView is split
// from ClinicEditPage: useUser() should only ever run with a confirmed-
// valid number, not a conditionally-called hook needing a fallback id.
function UserEditView({ userId }: { userId: number }) {
  const userQuery = useUser(userId)
  const { data: user, isLoading } = userQuery
  const { data: me } = useCurrentUser()
  // After a "Try again" that worked, focus goes to the user's name.
  const heading = useRetryFocus<HTMLHeadingElement>('this user', userQuery.isSuccess)

  if (isLoading) {
    return <Loading label="Loading the user…" />
  }

  // A 404: "User not found" (no such account — accounts are never deleted,
  // so: a wrong or made-up address); anything else: the load error.
  if (userQuery.isError || !user) {
    return <RecordLoadFailed queries={[userQuery]} what="this user" noun="user" links={WAYS_OUT} />
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
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
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

      {/* Whether the account has two-factor sign-in on and, when it does,
          the admin's reset (decisions §14) — never on the admin's own
          account. `me` is always there on this page (RequireAuth waited). */}
      {me && (
        <ResetTwoFactorSection
          user={user}
          isSelf={me.id === user.id}
          adminEmail={me.email}
          adminHasMfa={me.mfaEnabled}
        />
      )}

      {/* A patient's care team, with an admin's permissions: add any
          practitioner of the patient's clinics, end any current link
          (the backend allows both to admins — decided 2026-10-09). The
          same component as the practitioner's patient page; only the
          props differ. No onLeft: an admin doesn't lose access by ending
          a link. `me` is always there on this page (RequireAuth waited for
          it); the check just satisfies the type. */}
      {user.roles.includes('patient') && me && (
        <CareTeamSection
          patientId={userId}
          patientFirstName={user.firstName}
          patientLastName={user.lastName}
          myId={me.id}
          canAdd
          canEndAny
          patientActive={user.isActive}
        />
      )}

      {/* A copy of a patient's health record, emailed as a download link
          (decisions §20) — for ANY patient, active or not: a deactivated
          one can't sign in to download it themselves, and an active one may
          ask the clinic anyway. The admin never sees the record itself. */}
      {user.roles.includes('patient') && (
        <RecordsExportLinksSection
          patientId={userId}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
        />
      )}

      {/* A complaint review (decisions §25, pass 2): a time-boxed, reasoned
          access to copies of THIS patient's record — the only way an admin
          sees one (no standing access, decisions §16). `me`: copies are for
          the admin who opened the review. */}
      {user.roles.includes('patient') && me && (
        <ComplaintReviewsSection
          patientId={userId}
          firstName={user.firstName}
          lastName={user.lastName}
          myId={me.id}
        />
      )}

      {/* A legal disclosure (decisions §25, pass 3): when the law requires
          the clinic to give THIS patient's record to someone outside it — one
          stamped copy of what the order covers, recorded, listed for the
          patient. For any patient, active or not (an order doesn't wait for a
          reactivation). */}
      {user.roles.includes('patient') && me && (
        <LegalDisclosuresSection
          patientId={userId}
          firstName={user.firstName}
          lastName={user.lastName}
          myId={me.id}
        />
      )}

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
          roles={user.roles}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">This account is deactivated.</p>
          <ReactivateUserButton
            userId={userId}
            userName={`${user.firstName} ${user.lastName}`}
            roles={user.roles}
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