import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'

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
    // matters — either one "winning" lands in the same place.
    const state = location.state as { from?: string } | null
    return <Navigate to={state?.from ?? '/'} replace />
  }

  return <Outlet />
}