import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { RegisterClinicPage } from '@/auth/RegisterClinicPage'
import { DashboardRedirect } from '@/app/DashboardRedirect'
import { ClinicsListPage } from '@/clinics/ClinicsListPage'
import { CreateClinicPage } from '@/clinics/CreateClinicPage'
import { ClinicEditPage } from '@/clinics/ClinicEditPage'
import { CreateUserPage } from '@/users/CreateUserPage'
import { UsersListPage } from '@/users/UsersListPage'
import { UserEditPage } from '@/users/UserEditPage'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { RequireRole } from './RequireRole'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { AdminHomePage } from './AdminHomePage'
import { PractitionerHomePage } from './PractitionerHomePage'
import { PatientHomePage } from './PatientHomePage'
import { MyProfilePage } from '@/users/MyProfilePage'
import { PatientsListPage } from '@/patients/PatientsListPage'
import { ExerciseLibraryPage } from '@/exercises/ExerciseLibraryPage'
import { ExerciseDetailPage } from '@/exercises/ExerciseDetailPage'
import { NewExercisePage } from '@/exercises/NewExercisePage'
import { ExercisePhotosPage } from '@/exercises/ExercisePhotosPage'
import { ExerciseAssignPage } from '@/exercises/ExerciseAssignPage'
import { ProgramsPage } from '@/programs/ProgramsPage'
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
      {
        // AuthenticatedLayout sits BETWEEN RequireAuth and every actual
        // page route — it's the one place the role switcher and logout
        // button render, so they're visible no matter which page below
        // it actually matched. This layer didn't exist before each role
        // had its own home page; it used to be fine for that chrome to
        // live directly on the single shared DashboardPage, since that
        // WAS the only authenticated page every user saw first.
        element: <AuthenticatedLayout />,
        children: [
          // `/` no longer renders content of its own — DashboardRedirect
          // immediately sends the user on to whichever of the three role
          // homes below actually matches their activeRole.
          { path: '/', element: <DashboardRedirect /> },
          {
            // Nested one level further: authenticated AND the right role.
            // This is the pattern every future role-scoped section (admin
            // panel, practitioner core loop, etc.) will follow — a
            // RequireRole layer nested inside the RequireAuth one.
            element: <RequireRole allowedRoles={['admin']} />,
            children: [
              { path: '/admin', element: <AdminHomePage /> },
              { path: '/admin/clinics', element: <ClinicsListPage /> },
              { path: '/admin/clinics/new', element: <CreateClinicPage /> },
              { path: '/admin/clinics/:id', element: <ClinicEditPage /> },
              { path: '/admin/users', element: <UsersListPage /> },
              { path: '/admin/users/new', element: <CreateUserPage /> },
              { path: '/admin/users/:id', element: <UserEditPage /> },
            ],
          },
          {
            // Same shape as the admin block above, just for a role with
            // exactly one route so far. Phase 3's roster/exercise-library/
            // template routes will land here as siblings of /practitioner.
            element: <RequireRole allowedRoles={['practitioner']} />,
            children: [
              { path: '/practitioner', element: <PractitionerHomePage /> },
              { path: '/practitioner/profile', element: <MyProfilePage /> },
              {
                path: '/practitioner/patients',
                element: <PatientsListPage />,
              },
              {
                path: '/practitioner/library',
                element: <ExerciseLibraryPage />,
              },
              {
                path: '/practitioner/library/new',
                element: <NewExercisePage />,
              },
              {
                path: '/practitioner/library/:id',
                element: <ExerciseDetailPage />,
              },
              {
                path: '/practitioner/library/:id/photos',
                element: <ExercisePhotosPage />,
              },
              {
                path: '/practitioner/library/:id/assign',
                element: <ExerciseAssignPage />,
              },
              { path: '/practitioner/programs', element: <ProgramsPage /> },
            ],
          },
          {
            // Same shape again, for Phase 4's patient-facing routes.
            element: <RequireRole allowedRoles={['patient']} />,
            children: [{ path: '/patient', element: <PatientHomePage /> }],
          },
        ],
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