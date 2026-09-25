import { Link } from 'react-router'
import { Mail, ListTodo } from 'lucide-react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { UserAvatar } from '@/common/UserAvatar'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentDateTime } from './useCurrentDateTime'

// The practitioner's real home page, replacing the bare placeholder from
// the routing skeleton. Three areas, top to bottom:
//   1. Avatar (initials only — see UserAvatar) + greeting
//   2. A card: today's date/time, plus two visibly-disabled "coming
//      soon" slots (messaging notifications, a future to-do list) whose
//      real data doesn't exist yet
//   3. Links into the three sections that have real pages today
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
        {/* Shared with the account menu — see UserAvatar for why it's
            initials rather than a photo, and why it's aria-hidden. */}
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          className="size-12 text-sm"
        />
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

      {/* Area 3: links into the sections with real pages. "My Profile"
          used to be here too; it moved to the account menu with the
          shared layout (design decisions §1), which made this copy
          redundant. Messaging stays absent: it has no feature yet, and
          the persistent navigation already offers its "Coming soon"
          page. aria-label distinguishes this landmark from the layout's
          own "Sections" navigation. One column on phones, three side by
          side from `sm` up. */}
      <nav aria-label="Shortcuts" className="grid gap-2 sm:grid-cols-3">
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