import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { RegisterClinicPage } from '@/auth/RegisterClinicPage'
import { DashboardPage } from '@/app/DashboardPage'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { RequireRole } from './RequireRole'
import { AdminPlaceholderPage } from './AdminPlaceholderPage'
import { setUnauthorizedHandler } from '@/api/client'
import { queryClient } from '@/api/queryClient'
import { currentUserQueryKey } from '@/auth/useCurrentUser'

// createBrowserRouter takes a plain array describing every route as data
// (path + which component renders there), rather than the older pattern of
// writing <Route> elements as JSX children. This "data router" style is
// what unlocks React Router's more advanced features we'll actually need
// later — loaders/actions that can run BEFORE a route renders.
//
// A route with an `element` but no `path` acts as a LAYOUT for its
// `children` — it renders unconditionally, and whichever child route
// actually matches the URL shows up wherever that layout puts its
// <Outlet />. That's the mechanism the guards below rely on: each guard
// IS the layout element for a group of routes, deciding whether the
// matched child ever gets to render at all.
export const router = createBrowserRouter([
  {
    // Routes only a logged-OUT visitor should reach.
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/register-clinic', element: <RegisterClinicPage /> },
    ],
  },
  {
    // Everything else requires a real session.
    element: <RequireAuth />,
    children: [
      { path: '/', element: <DashboardPage /> },
      {
        // Nested one level further: authenticated AND the right role.
        // This is the pattern every future role-scoped section (admin
        // panel, practitioner core loop, etc.) will follow — a
        // RequireRole layer nested inside the RequireAuth one.
        element: <RequireRole allowedRoles={['admin']} />,
        children: [{ path: '/admin', element: <AdminPlaceholderPage /> }],
      },
    ],
  },
])

// This is the composition root for the mid-session 401 handler —
// client.ts stays a plain module with no knowledge of React Router or the
// query cache; this is the one place that wires the two together, right
// where the router itself already lives.
setUnauthorizedHandler((currentPath) => {
  // Without this, the CACHED current-user data would still say "logged
  // in" even though the session just expired server-side — RequireGuest
  // would then immediately bounce the user straight back out of /login,
  // since it would see stale, still-truthy user data. Clearing this
  // FIRST is what lets /login actually render once we navigate there.
  queryClient.setQueryData(currentUserQueryKey, null)
  // router.navigate is React Router's own documented way to navigate
  // imperatively from OUTSIDE a React component/hook — exactly what's
  // needed here, since client.ts's handler runs from a plain fetch
  // call, nowhere near a component. The state shape (`{ from }`) matches
  // RequireAuth's own redirect exactly, so LoginPage only needs to handle
  // ONE shape regardless of which of the two triggered it.
  void router.navigate('/login', { state: { from: currentPath } })
})