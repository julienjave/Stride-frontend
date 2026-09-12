import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import type { UserRole } from '@/auth/schemas'

interface RequireRoleProps {
  allowedRoles: UserRole[]
}

// IMPORTANT: this is a UX convenience,
// NOT a security boundary. It exists purely to avoid showing someone a
// screen that would just immediately fail server-side anyway (e.g. a
// practitioner landing on an admin-only page and seeing broken/empty
// content). The backend's own @Roles(...) guards are the REAL enforcement
// — this component could be deleted entirely and no actual authorization
// hole would open up, since every real endpoint still checks for itself.
export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { data: user } = useCurrentUser()

  // Defensive, not load-bearing: RequireRole is meant to be nested INSIDE
  // a RequireAuth-guarded branch of the route tree, so `user` should
  // already be guaranteed non-null by the time this runs. Checking again
  // costs nothing and protects against this component ever being used
  // standalone by mistake later.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.activeRole as UserRole)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}