import { Mail, ListTodo } from 'lucide-react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { HomeGreeting } from './home/HomeGreeting'
import { ComingSoonSlot, HomeSummaryCard, TodaySlot } from './home/HomeSummaryCard'
import { HomeShortcuts, type HomeShortcut } from './home/HomeShortcuts'

// Links into the three sections that have real pages. "My Profile" used
// to be here too; it moved to the account menu with the shared layout
// (design decisions §1). Messages stays absent: it has no feature yet, and
// the persistent navigation already offers its "Coming soon" page.
//
// A module-level constant, not built inside the component: it never
// changes, so there's no reason to create a new array on every render.
const SHORTCUTS: HomeShortcut[] = [
  { label: 'My Patients', to: '/practitioner/patients' },
  { label: 'Exercise Library', to: '/practitioner/library' },
  { label: 'Programs', to: '/practitioner/programs' },
]

// The practitioner's home page. Three areas, top to bottom, built from the
// shared pieces in ./home/ (the same structure as the admin home, and
// later the patient home — decisions §2–§3):
//   1. Avatar + greeting
//   2. A card: today's date/time, plus two "coming soon" slots —
//      messaging notifications (Phase 5) and a to-do list (automatic alerts
//      once session data exists, decisions §3)
//   3. Links into the sections
export function PractitionerHomePage() {
  const { data: user } = useCurrentUser()

  // Defensive, not load-bearing — same reasoning RequireRole and
  // DashboardRedirect already use elsewhere. RequireAuth only ever
  // renders <Outlet /> (which is what eventually renders this page)
  // once `user` is truthy, so this branch should be unreachable in
  // practice. Checking anyway costs nothing and avoids a crash if a
  // future routing change ever violates that assumption.
  if (!user) {
    return null
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <HomeGreeting
        firstName={user.firstName}
        lastName={user.lastName}
        avatarUrl={user.avatarUrl}
      />

      <HomeSummaryCard>
        <TodaySlot />
        <ComingSoonSlot label="Messages" icon={Mail} />
        <ComingSoonSlot label="To-do" icon={ListTodo} />
      </HomeSummaryCard>

      <HomeShortcuts links={SHORTCUTS} />
    </div>
  )
}