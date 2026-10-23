import { useCurrentUser } from '@/auth/useCurrentUser'
import { roleLabel } from '@/auth/roleLabel'
import { userRoleSchema } from '@/auth/schemas'
import { useUser } from './useUser'
import { ProfileFields } from './ProfileFields'
import { AvatarUpload } from './AvatarUpload'
import { Link, useLocation } from 'react-router'
import { readNotice } from '@/common/readNotice'
import { MY_RECORDS_PATH } from '@/medical-files/medicalFilePaths'

// /profile — the logged-in user's own profile, for every role (design
// decisions §4). Reached from the account menu.
export function ProfilePage() {
  const { data: me } = useCurrentUser()

  // Defensive only: /profile sits inside RequireAuth, so a user exists.
  if (!me) {
    return null
  }

  return <ProfileView userId={me.id} activeRole={me.activeRole} />
}

// Split out so useUser() is only ever called with a real id — the same
// "no hook call with a placeholder id" split as ClinicEditView/UserEditView.
function ProfileView({ userId, activeRole }: { userId: number; activeRole: string }) {
  // The profile is loaded through GET /users/:id — the SAME query the
  // admin's user page uses — rather than read from the /auth/me data.
  // One shape, one cache entry per user, one save path (useSaveUser)
  // whichever page the edit came from. The cost is one extra request when
  // the page opens.
  const { data: user, isLoading, isError } = useUser(userId)
  // A one-line confirmation another page hands over ("Your password is
  // changed…", from /profile/password) — read defensively (readNotice).
  const notice = readNotice(useLocation().state)

  if (isLoading) {
    return <p className="mx-auto mt-12 max-w-lg px-4 text-sm text-muted-foreground">Loading profile…</p>
  }

  if (isError || !user) {
    return (
      <p className="mx-auto mt-12 max-w-lg px-4 text-sm text-destructive">
        Couldn't load your profile.
      </p>
    )
  }

  // Role names for the header, in the fixed admin → practitioner →
  // patient order used everywhere else.
  const roleNames = userRoleSchema.options
    .filter((role) => user.roles.includes(role))
    .map(roleLabel)
    .join(' · ')

  return (
    <div className="mx-auto mt-8 max-w-lg space-y-6 px-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">My profile</h1>
        <p className="text-sm text-muted-foreground">{roleNames}</p>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm"
        >
          {notice}
        </p>
      )}

      {/* A patient's way to their medical file from here (decisions §8):
          the records live in the profile AREA, on a page of their own. By
          the active role, like the account menu's item. */}
      {activeRole === 'patient' && (
        <section aria-labelledby="profile-records" className="space-y-2">
          <h2 id="profile-records" className="text-sm font-medium text-muted-foreground">
            Medical records
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <p className="text-sm">Your practitioners' notes about your care.</p>
            <Link to={MY_RECORDS_PATH} className="text-sm font-medium underline underline-offset-4">
              My records
            </Link>
          </div>
        </section>
      )}

      {/* The photo, with its Upload/Change/Remove buttons. It replaces the
          plain avatar this header used to show — one avatar per page, and
          it's the one you can act on. Your own photo is always yours to
          change, whatever your role. */}
      <AvatarUpload user={user} />

      {/* Only an admin may change a license number (§4). On your OWN
          profile that means: while your ACTIVE role is admin — the same
          rule the backend applies, so the page never offers an edit the
          server would refuse. */}
      <ProfileFields user={user} canEditLicense={activeRole === 'admin'} ownProfile />

      {/* Read-only here: clinic membership is managed by an admin, on the
          user page (UserClinicMemberships). */}
      <section aria-labelledby="profile-clinics" className="space-y-2">
        <h2 id="profile-clinics" className="text-sm font-medium text-muted-foreground">
          Clinics
        </h2>
        <div className="rounded-lg border px-4 py-3">
          {user.clinics.length > 0 ? (
            <ul className="space-y-1">
              {user.clinics.map((clinic) => (
                <li key={clinic.id}>{clinic.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">Not a member of any clinic</p>
          )}
        </div>
      </section>
    </div>
  )
}