import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { destinationAfterSignIn } from '@/auth/returnPath'

export function RequireGuest() {
  const { data: user } = useCurrentUser()
  const location = useLocation()

  if (user) {
    // MUST match the same fallback logic LoginPage itself uses (see its
    // own state.from read) — otherwise the two compete. The instant login
    // succeeds, BOTH LoginPage's onSuccess (navigate(redirectTo)) AND this
    // component (reacting to the same user-data change, since it's also
    // watching useCurrentUser()) try to redirect at roughly the same
    // moment. A real race, confirmed by test: without this, RequireGuest's
    // old hardcoded `to="/"` would sometimes win, silently discarding the
    // preserved destination even though LoginPage computed it correctly.
    // Making both agree on the same destination means the race no longer
    // matters — either one "winning" lands in the same place. Hence ONE
    // function for both, destinationAfterSignIn (returnPath.ts): when the
    // page's owner rule arrived (2026-11-02), a copy kept here would have
    // sent the next person to the previous person's page whenever this
    // side won — which is how the bug looked live.
    return <Navigate to={destinationAfterSignIn(location.state, user.id)} replace />
  }

  return <Outlet />
}