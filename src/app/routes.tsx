import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { DashboardPage } from '@/app/DashboardPage'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { RequireRole } from './RequireRole'
import { AdminPlaceholderPage } from './AdminPlaceholderPage'

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