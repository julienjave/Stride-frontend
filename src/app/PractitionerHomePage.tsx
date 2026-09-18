import { Link } from 'react-router'
import { Mail, ListTodo } from 'lucide-react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentDateTime } from './useCurrentDateTime'

// The practitioner's real home page, replacing the bare placeholder from
// the routing skeleton. Three areas, top to bottom:
//   1. Avatar (initials only — see the comment below) + greeting
//   2. A card: today's date/time, plus two visibly-disabled "coming
//      soon" slots (messaging notifications, a future to-do list) whose
//      real data doesn't exist yet
//   3. Navigation into the four Phase-3 sections that DO have real
//      (if still placeholder) destinations today
export function PractitionerHomePage() {
  const { data: user } = useCurrentUser()
  const now = useCurrentDateTime()

  // Defensive, not load-bearing — same reasoning RequireRole and
  // DashboardRedirect already use elsewhere. RequireAuth only ever
  // renders <Outlet /> (which is what eventually renders this page)
  // once `user` is truthy, so this branch should be unreachable in
  // practice. Checking anyway costs nothing and avoids a crash if a
  // future routing change ever violates that assumption.
  if (!user) {
    return null
  }

  // Initials-only avatar, not a photo — avatarPath is currently just a
  // raw internal storage key, not a usable URL (see users/types.ts's own
  // comment on this). Real photo support is deliberately Phase 6 work,
  // mirroring the same signed-URL infrastructure Clinic.logoUrl already
  // has. Swapping in a real <img> here becomes a small change once that
  // exists — this isn't a shortcut that needs revisiting today.
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()

  // Intl.DateTimeFormat with explicit options, rather than the
  // zero-argument toLocaleDateString()/toLocaleTimeString() — those
  // produce a format that varies by browser/OS in ways that are hard to
  // predict or test against. Passing `undefined` as the locale still
  // respects the visitor's own browser locale; only the OPTIONS
  // (which fields, what format) are pinned down explicitly.
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now)

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      {/* Area 1: avatar + greeting */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium"
          // Decorative — the greeting text right next to it already
          // conveys "this is you," so a screen reader announcing the
          // initials separately would just be noise.
          aria-hidden="true"
        >
          {initials}
        </div>
        <h1 className="text-xl font-semibold">Hello {user.firstName},</h1>
      </div>

      {/* Area 2: today / messaging (not yet built) / to-do (not yet built) */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase text-muted-foreground">
              Today
            </span>
            <span className="font-medium">{dateLabel}</span>
            <span className="text-sm text-muted-foreground">{timeLabel}</span>
          </div>

          {/* Visibly disabled, not hidden — the "coming soon" text is
              real content (readable by a screen reader), not something
              conveyed by dimmed styling alone. Messaging has no frontend
              at all yet (Phase 5), so this can't be a real link today. */}
          <div className="flex flex-col items-center gap-1 opacity-50">
            <Mail className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs uppercase text-muted-foreground">
              Messages
            </span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>

          {/* Same treatment for the to-do idea — explicitly flagged as a
              later idea, not a Phase 3 item, so no data model exists for
              it at all yet. */}
          <div className="flex flex-col items-center gap-1 opacity-50">
            <ListTodo className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs uppercase text-muted-foreground">
              To-do
            </span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </CardContent>
      </Card>

      {/* Area 3: navigation into the four Phase-3 sections. Each target
          route exists and renders a real (if still placeholder) page —
          see MyProfilePage, PatientsListPage, ExerciseLibraryPage, and
          ProgramsPage. Messaging is deliberately absent here too, for
          the same reason as the card slot above. */}
      <nav className="grid grid-cols-2 gap-2">
        <Link
          to="/practitioner/profile"
          className="rounded-lg border p-3 text-center hover:bg-muted"
        >
          My Profile
        </Link>
        <Link
          to="/practitioner/patients"
          className="rounded-lg border p-3 text-center hover:bg-muted"
        >
          My Patients
        </Link>
        <Link
          to="/practitioner/library"
          className="rounded-lg border p-3 text-center hover:bg-muted"
        >
          Exercise Library
        </Link>
        <Link
          to="/practitioner/programs"
          className="rounded-lg border p-3 text-center hover:bg-muted"
        >
          Programs
        </Link>
      </nav>
    </div>
  )
}