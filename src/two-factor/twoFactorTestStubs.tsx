import { useCurrentUser } from '@/auth/useCurrentUser'
import { useUser } from '@/users/useUser'
import { TwoFactorRow } from './TwoFactorRow'

// The profile page, reduced to what the two-factor tests look at: its heading
// and the real Two-factor row (the confirmation is a snackbar, checked in the
// store — decisions §33) — fed like the real profile: from GET /users/:id (useUser), not from the current user (to see "On"/"Off"
// follow what the page did — the browser found the page told only the
// current user). Alone in its file: a module
// exporting a component exports only components (react-refresh lint rule).
export function ProfileStub() {
  const { data: me } = useCurrentUser()
  return (
    <div>
      <h1>My profile</h1>
      {me && <ProfileRow userId={me.id} />}
    </div>
  )
}

function ProfileRow({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)
  return user ? <TwoFactorRow mfaEnabled={user.mfaEnabled} /> : null
}