import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/auth/LoginPage'
import { DashboardRedirect } from '@/app/DashboardRedirect'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { RequireRole } from './RequireRole'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { setUnauthorizedHandler } from '@/api/client'
import { queryClient } from '@/api/queryClient'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { RouteErrorPage } from './RouteErrorPage'

// CODE SPLITTING (2026-10-15). Every PAGE is loaded on demand: its route
// says `lazy: page(() => import('…'), (module) => module.SomePage)`
// instead of `element: <SomePage />`.
//
// Why: a static `import` puts a module in the ONE file the browser
// downloads before showing anything. With every page imported here, a
// patient opening the app downloaded every admin and practitioner screen
// (and the drag-and-drop and photo-crop libraries only those screens use)
// — 1.6 MB. A dynamic `import()` is a split point: Vite builds that module,
// and everything only it needs, into a separate file, fetched the first
// time the route is visited and cached by the browser afterwards. Code
// several pages share goes into shared files automatically.
//
// What stays static — the SHELL every visit needs at once: the guards, the
// layout with the navigation, the redirect from `/`, the login page (the
// first screen of a signed-out visitor: waiting for another file there
// would only slow it down), and the tiny "Coming soon" placeholder.
//
// How React Router uses `lazy`: on a navigation to a route whose module
// isn't loaded yet, the router calls this function, waits for it, and only
// then renders the route — the current page stays on screen meanwhile (the
// layout shows a thin loading bar: NavigationProgress). The function
// returns the route's missing properties; `Component` (a component, not an
// element) is the lazy form of `element`.
//
// `page` exists so each route stays one line and TYPED: `pick` must return
// a component, so a misspelt export name is a compile error, not a blank
// page at runtime. Every route here must name a page by a string literal in
// `import()`: Vite can only split what it can read at build time.
function page<Module>(
  load: () => Promise<Module>,
  pick: (module: Module) => ComponentType,
) {
  return async () => ({ Component: pick(await load()) })
}

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
    // A ROOT route with no path: it matches every URL and renders its
    // children (no element = an <Outlet /> by default). It exists for two
    // things that must cover EVERY page:
    //   - hydrateFallbackElement: shown on the very first load while the
    //     first page's file is fetched (there's no previous page to keep
    //     on screen yet);
    //   - errorElement: shown when a route fails — above all a page file
    //     that can't be downloaded (offline, or a deploy replaced it: see
    //     staleChunkReload.ts) — instead of React Router's developer page.
    hydrateFallbackElement: (
      <p className="p-4 text-sm text-muted-foreground">Loading…</p>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      // Under NO guard. Not RequireGuest: a signed-in visitor (a shared
      // computer, or a practitioner testing their patient's link) would be
      // bounced to their own home without a word about the invitation — the
      // page instead tells them to log out first. Not RequireAuth: the person
      // accepting has no password yet, so no session.
      {
        path: '/accept-invitation',
        lazy: page(
          () => import('@/invitations/AcceptInvitationPage'),
          (module) => module.AcceptInvitationPage,
        ),
      },
      // The page a password reset email links to (Phase 6) — under no
      // guard, for the same reason as /accept-invitation: a signed-in
      // visitor is asked to log out first rather than bounced away.
      {
        path: '/reset-password',
        lazy: page(
          () => import('@/auth/ResetPasswordPage'),
          (module) => module.ResetPasswordPage,
        ),
      },
      {
        // Routes only a logged-OUT visitor should reach.
        element: <RequireGuest />,
        children: [
          { path: '/login', element: <LoginPage /> },
          // "Forgot your password?" — asking for a reset link (Phase 6).
          {
            path: '/forgot-password',
            lazy: page(
              () => import('@/auth/ForgotPasswordPage'),
              (module) => module.ForgotPasswordPage,
            ),
          },
          {
            path: '/register-clinic',
            lazy: page(
              () => import('@/auth/RegisterClinicPage'),
              (module) => module.RegisterClinicPage,
            ),
          },
        ],
      },
      {
        // Everything else requires a real session.
        element: <RequireAuth />,
        children: [
          {
            // AuthenticatedLayout sits BETWEEN RequireAuth and every actual
            // page route — it renders the persistent navigation (top bar,
            // phone tab bar, Settings and account menus), so it's visible no
            // matter which page below it actually matched.
            element: <AuthenticatedLayout />,
            children: [
              // `/` no longer renders content of its own — DashboardRedirect
              // immediately sends the user on to whichever of the three role
              // homes below actually matches their activeRole.
              { path: '/', element: <DashboardRedirect /> },
              // Shared by EVERY role (design decisions §4), so it sits beside
              // the RequireRole groups rather than inside one: any logged-in
              // user may open their own profile, whatever their active role.
              // Reached from the account menu.
              {
                path: '/profile',
                lazy: page(
                  () => import('@/users/ProfilePage'),
                  (module) => module.ProfilePage,
                ),
              },
              {
                // Nested one level further: authenticated AND the right role.
                // This is the pattern every future role-scoped section (admin
                // panel, practitioner core loop, etc.) will follow — a
                // RequireRole layer nested inside the RequireAuth one.
                element: <RequireRole allowedRoles={['admin']} />,
                children: [
                  {
                    path: '/admin',
                    lazy: page(
                      () => import('@/app/AdminHomePage'),
                      (module) => module.AdminHomePage,
                    ),
                  },
                  {
                    path: '/admin/clinics',
                    lazy: page(
                      () => import('@/clinics/ClinicsListPage'),
                      (module) => module.ClinicsListPage,
                    ),
                  },
                  {
                    path: '/admin/clinics/new',
                    lazy: page(
                      () => import('@/clinics/CreateClinicPage'),
                      (module) => module.CreateClinicPage,
                    ),
                  },
                  {
                    path: '/admin/clinics/:id',
                    lazy: page(
                      () => import('@/clinics/ClinicEditPage'),
                      (module) => module.ClinicEditPage,
                    ),
                  },
                  {
                    path: '/admin/users',
                    lazy: page(
                      () => import('@/users/UsersListPage'),
                      (module) => module.UsersListPage,
                    ),
                  },
                  {
                    path: '/admin/users/new',
                    lazy: page(
                      () => import('@/users/CreateUserPage'),
                      (module) => module.CreateUserPage,
                    ),
                  },
                  {
                    path: '/admin/users/:id',
                    lazy: page(
                      () => import('@/users/UserEditPage'),
                      (module) => module.UserEditPage,
                    ),
                  },
                ],
              },
              {
                // Same shape as the admin block above, just for a role with
                // exactly one route so far. Phase 3's roster/exercise-library/
                // template routes will land here as siblings of /practitioner.
                element: <RequireRole allowedRoles={['practitioner']} />,
                children: [
                  {
                    path: '/practitioner',
                    lazy: page(
                      () => import('@/app/PractitionerHomePage'),
                      (module) => module.PractitionerHomePage,
                    ),
                  },
                  {
                    path: '/practitioner/patients',
                    lazy: page(
                      () => import('@/patients/PatientsListPage'),
                      (module) => module.PatientsListPage,
                    ),
                  },
                  // "Add patient": search the clinic directory first, then
                  // invite if they're not there (decisions §3, roster design).
                  // Static segments ('add', 'invite') always win over the
                  // ':id' pattern below, whatever the order they're listed in
                  // — React Router ranks routes by how specific they are.
                  {
                    path: '/practitioner/patients/add',
                    lazy: page(
                      () => import('@/patients/AddPatientPage'),
                      (module) => module.AddPatientPage,
                    ),
                  },
                  {
                    path: '/practitioner/patients/invite',
                    lazy: page(
                      () => import('@/patients/InvitePatientPage'),
                      (module) => module.InvitePatientPage,
                    ),
                  },
                  // The patient page (care team only — see PatientPage).
                  {
                    path: '/practitioner/patients/:id',
                    lazy: page(
                      () => import('@/patients/PatientPage'),
                      (module) => module.PatientPage,
                    ),
                  },
                  // The patient's medical file (Phase 6, decisions §8): its
                  // own page — opening it is the audited read — and the page
                  // that writes an entry or (`?amends=`) an amendment.
                  {
                    path: '/practitioner/patients/:id/medical-file',
                    lazy: page(
                      () => import('@/medical-files/MedicalFilePage'),
                      (module) => module.MedicalFilePage,
                    ),
                  },
                  {
                    path: '/practitioner/patients/:id/medical-file/new',
                    lazy: page(
                      () => import('@/medical-files/MedicalFileEntryPage'),
                      (module) => module.MedicalFileEntryPage,
                    ),
                  },
                  {
                    path: '/practitioner/library',
                    lazy: page(
                      () => import('@/exercises/ExerciseLibraryPage'),
                      (module) => module.ExerciseLibraryPage,
                    ),
                  },
                  {
                    path: '/practitioner/library/pick',
                    lazy: page(
                      () => import('@/exercises/ExercisePickerPage'),
                      (module) => module.ExercisePickerPage,
                    ),
                  },
                  {
                    path: '/practitioner/library/new',
                    lazy: page(
                      () => import('@/exercises/NewExercisePage'),
                      (module) => module.NewExercisePage,
                    ),
                  },
                  {
                    path: '/practitioner/library/:id',
                    lazy: page(
                      () => import('@/exercises/ExerciseDetailPage'),
                      (module) => module.ExerciseDetailPage,
                    ),
                  },
                  {
                    path: '/practitioner/library/:id/photos',
                    lazy: page(
                      () => import('@/exercises/ExercisePhotosPage'),
                      (module) => module.ExercisePhotosPage,
                    ),
                  },
                  {
                    path: '/practitioner/library/:id/assign',
                    lazy: page(
                      () => import('@/exercises/ExerciseAssignPage'),
                      (module) => module.ExerciseAssignPage,
                    ),
                  },
                  {
                    path: '/practitioner/programs',
                    lazy: page(
                      () => import('@/programs/ProgramsPage'),
                      (module) => module.ProgramsPage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/templates/new',
                    lazy: page(
                      () => import('@/programs/NewTemplatePage'),
                      (module) => module.NewTemplatePage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/templates/:id/exercises/new',
                    lazy: page(
                      () => import('@/programs/NewProgramExercisePage'),
                      (module) => module.NewProgramExercisePage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/templates/:id/exercises/:templateExerciseId',
                    lazy: page(
                      () => import('@/programs/ProgramExercisePage'),
                      (module) => module.ProgramExercisePage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/templates/:id',
                    lazy: page(
                      () => import('@/programs/TemplateDetailPage'),
                      (module) => module.TemplateDetailPage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/assigned/new',
                    lazy: page(
                      () => import('@/assigned-programs/NewAssignedProgramPage'),
                      (module) => module.NewAssignedProgramPage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/assigned/:id',
                    lazy: page(
                      () => import('@/assigned-programs/AssignedProgramDetailPage'),
                      (module) => module.AssignedProgramDetailPage,
                    ),
                  },
                  // A program's exercises (step 3b-1b): adding one (through the
                  // library picker), and one exercise's prescription.
                  {
                    path: '/practitioner/programs/assigned/:id/exercises/new',
                    lazy: page(
                      () => import('@/assigned-programs/NewAssignedProgramExercisePage'),
                      (module) => module.NewAssignedProgramExercisePage,
                    ),
                  },
                  {
                    path: '/practitioner/programs/assigned/:id/exercises/:rowId',
                    lazy: page(
                      () => import('@/assigned-programs/AssignedProgramExercisePage'),
                      (module) => module.AssignedProgramExercisePage,
                    ),
                  },
                  // A program exercise's own photos (program-specific photos,
                  // 2026-10-17) — from the exercise page's "Manage this
                  // patient's photos".
                  {
                    path: '/practitioner/programs/assigned/:id/exercises/:rowId/photos',
                    lazy: page(
                      () => import('@/assigned-programs/ProgramExercisePhotosPage'),
                      (module) => module.ProgramExercisePhotosPage,
                    ),
                  },
                  // One session as the care team reads it, with "Mark as
                  // reviewed" — where the home's "For review" list leads (2026-10-19).
                  {
                    path: '/practitioner/sessions/:sessionId',
                    lazy: page(
                      () => import('@/alerts/SessionReviewPage'),
                      (module) => module.SessionReviewPage,
                    ),
                  },
                  // Messages (Phase 5): a LAYOUT route — the conversation list
                  // stays mounted beside whichever child is open (desktop),
                  // the index when none is, `:conversationId` for one. The
                  // child path is RELATIVE (no leading slash): it continues
                  // the parent's. The same three pages serve both roles.
                  {
                    path: '/practitioner/messages',
                    lazy: page(
                      () => import('@/messages/MessagesLayout'),
                      (module) => module.MessagesLayout,
                    ),
                    children: [
                      {
                        index: true,
                        lazy: page(
                          () => import('@/messages/MessagesIndexPage'),
                          (module) => module.MessagesIndexPage,
                        ),
                      },
                      {
                        path: ':conversationId',
                        lazy: page(
                          () => import('@/messages/ConversationPage'),
                          (module) => module.ConversationPage,
                        ),
                      },
                    ],
                  },
                ],
              },
              {
                // Same shape again, for Phase 4's patient-facing routes.
                element: <RequireRole allowedRoles={['patient']} />,
                children: [
                  {
                    path: '/patient',
                    lazy: page(
                      () => import('@/app/PatientHomePage'),
                      (module) => module.PatientHomePage,
                    ),
                  },
                  // The session flow (Phase 4, decided 2026-10-16): "before
                  // you start" for one program — nothing is written until
                  // Start — then the running session. React Router ranks a
                  // static segment above a dynamic one, so `start/…` is
                  // never read as a session id.
                  {
                    path: '/patient/sessions/start/:programId',
                    lazy: page(
                      () => import('@/sessions/StartSessionPage'),
                      (module) => module.StartSessionPage,
                    ),
                  },
                  {
                    path: '/patient/sessions/:sessionId',
                    lazy: page(
                      () => import('@/sessions/SessionPage'),
                      (module) => module.SessionPage,
                    ),
                  },
                  // Its endings (pass (c)) — ROUTES, not dialogs: a phone's
                  // Back button leaves them like any page, a reload keeps
                  // them. "Skip today" names a program (no session exists
                  // yet), like the start page.
                  {
                    path: '/patient/sessions/:sessionId/finish',
                    lazy: page(
                      () => import('@/sessions/FinishSessionPage'),
                      (module) => module.FinishSessionPage,
                    ),
                  },
                  {
                    path: '/patient/sessions/:sessionId/stop',
                    lazy: page(
                      () => import('@/sessions/StopSessionPage'),
                      (module) => module.StopSessionPage,
                    ),
                  },
                  {
                    path: '/patient/sessions/skip/:programId',
                    lazy: page(
                      () => import('@/sessions/SkipSessionPage'),
                      (module) => module.SkipSessionPage,
                    ),
                  },
                  // The Sessions hub (2026-10-17): the patient's programs,
                  // today, and every missed session they can still make up.
                  // React Router matches a path whole, so this never catches
                  // the flow's pages above (`/patient/sessions/…`).
                  {
                    path: '/patient/sessions',
                    lazy: page(
                      () => import('@/sessions/SessionsHubPage'),
                      (module) => module.SessionsHubPage,
                    ),
                  },
                  // One program, active or past (the hub's pass 2,
                  // 2026-10-18). `programs` is a static segment: React Router
                  // ranks it above `:sessionId`, so it's never read as one.
                  {
                    path: '/patient/sessions/programs/:programId',
                    lazy: page(
                      () => import('@/sessions/PatientProgramPage'),
                      (module) => module.PatientProgramPage,
                    ),
                  },
                  // My records (Phase 6, decisions §8): the patient's own
                  // medical file, read-only. Under `/profile/` — it lives in
                  // the profile area, not a tab — but in the PATIENT group:
                  // only a patient has a medical file of their own to read.
                  {
                    path: '/profile/records',
                    lazy: page(
                      () => import('@/medical-files/MyRecordsPage'),
                      (module) => module.MyRecordsPage,
                    ),
                  },
                  // My Team (2026-10-18): the patient's care team, and each
                  // current member's profile — under `/patient/team/` so the
                  // Team tab stays highlighted.
                  {
                    path: '/patient/team',
                    lazy: page(
                      () => import('@/team/MyTeamPage'),
                      (module) => module.MyTeamPage,
                    ),
                  },
                  {
                    path: '/patient/team/:practitionerId',
                    lazy: page(
                      () => import('@/team/PractitionerProfilePage'),
                      (module) => module.PractitionerProfilePage,
                    ),
                  },
                  // Messages — the practitioner's three pages, under the
                  // patient's prefix (see /practitioner/messages).
                  {
                    path: '/patient/messages',
                    lazy: page(
                      () => import('@/messages/MessagesLayout'),
                      (module) => module.MessagesLayout,
                    ),
                    children: [
                      {
                        index: true,
                        lazy: page(
                          () => import('@/messages/MessagesIndexPage'),
                          (module) => module.MessagesIndexPage,
                        ),
                      },
                      {
                        path: ':conversationId',
                        lazy: page(
                          () => import('@/messages/ConversationPage'),
                          (module) => module.ConversationPage,
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
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