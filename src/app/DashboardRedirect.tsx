import { Navigate } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import type { UserRole } from '@/auth/schemas'
import { roleHomePath } from './roleHomePath'

// `/` used to render DashboardPage directly — one shared placeholder for
// every role. Now that each role has its own dedicated home
// (AdminHomePage, PractitionerHomePage, PatientHomePage), `/` no longer
// renders any content of its own — it just figures out which of those
// three the current user belongs on, and hands them off immediately.
//
// This also matters for RequireRole's existing "wrong role" fallback,
// which redirects to `/` (see RequireRole.tsx) — a patient who somehow
// lands on /admin gets bounced to `/`, which this component then sends
// on to /patient. No loop: RequireRole only ever redirects TO `/`, and
// this component only ever redirects AWAY from `/`, always toward the
// one destination that matches the user's own activeRole.
export function DashboardRedirect() {
  const { data: user } = useCurrentUser()

  // Defensive, not load-bearing — same reasoning as RequireRole's own
  // null check. This component is only ever reached from inside the
  // RequireAuth-guarded branch of the route tree, so `user` should
  // already be guaranteed non-null. Checking anyway costs nothing and
  // avoids a crash if that assumption is ever violated by a future
  // routing change.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={roleHomePath(user.activeRole as UserRole)} replace />
}