import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'

// The mirror image of RequireAuth: prevents an already-logged-in user from
// landing on /login or /register (e.g. via browser back button, or a
// bookmark) and seeing a form that would be confusing to interact with
// while already authenticated.
export function RequireGuest() {
  const { data: user } = useCurrentUser()

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}