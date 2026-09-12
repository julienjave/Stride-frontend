import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'

export function RequireAuth() {
  const { data: user } = useCurrentUser()
  const location = useLocation()

  if (!user) {
    // state.from is read by LoginPage after a successful login, so someone
    // who tried to visit e.g. /admin directly while logged out lands back
    // on /admin afterward — not always dumped at the dashboard regardless
    // of where they were actually headed. Storing pathname + search (a
    // plain string) rather than the whole location OBJECT keeps this
    // simple and matches exactly what the mid-session 401 handler (in
    // app/routes.tsx, outside React entirely) can produce too — one
    // shared shape, from two different trigger points.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <Outlet />
}