import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'

// Outlet renders whichever nested route actually matched — this component
// itself isn't a page, it's a gate that decides WHETHER the matched page
// gets to render at all. This is how a layout-style guard works in React
// Router's data-router model: wrap a group of routes, and every route
// inside that group passes through this check first.
export function RequireAuth() {
  const { data: user } = useCurrentUser()

  // By the time any route renders, App.tsx has already waited out the
  // initial /auth/me check (isLoading gate) — so `user` here is either a
  // real CurrentUser or null, never the "still checking" undefined state.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}