import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { DashboardPage } from '@/app/DashboardPage'

// createBrowserRouter takes a plain array describing every route as data
// (path + which component renders there), rather than the older pattern of
// writing <Route> elements as JSX children. This "data router" style is
// what unlocks React Router's more advanced features we'll actually need
// later — loaders/actions that can run BEFORE a route renders (useful for
// route guards: redirect to /login before the guarded page ever mounts,
// rather than rendering it first and bailing out inside a useEffect).
//
// This tree is intentionally minimal right now — two placeholder pages,
// no guards, no nesting. We'll grow it as Phase 1 continues: a guarded
// layout wrapping role-specific routes, a catch-all redirect, etc.
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
])