import { ChartColumn, History } from 'lucide-react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { HomeGreeting } from './home/HomeGreeting'
import { ComingSoonSlot, HomeSummaryCard, TodaySlot } from './home/HomeSummaryCard'
import { HomeShortcuts, type HomeShortcut } from './home/HomeShortcuts'

// The admin's two sections, both with real pages (list pages, which link on
// to their "new" forms).
const SHORTCUTS: HomeShortcut[] = [
  { label: 'Clinics', to: '/admin/clinics' },
  { label: 'Users', to: '/admin/users' },
]

// The admin's home page — the same structure as the practitioner's
// (decisions §3), built from the same shared pieces in ./home/:
//   1. Avatar + greeting
//   2. A card: today's date/time, plus two "coming soon" slots:
//      - Metrics: which numbers belong here (clinics, users by role, …)
//        and whether they need backend count endpoints is still open —
//        a Phase 6 item. Decided 2026-09-27: build the structure first.
//      - Activity: recent changes, from the audit log the backend already
//        records (GET /audit-logs) — goes with the Phase 6 audit log
//        viewer.
//   3. Links into the sections
// Replaces the earlier bare page (an "Admin" heading and two links).
export function AdminHomePage() {
  const { data: user } = useCurrentUser()

  // Defensive, not load-bearing — see PractitionerHomePage.
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
        <ComingSoonSlot label="Metrics" icon={ChartColumn} />
        <ComingSoonSlot label="Activity" icon={History} />
      </HomeSummaryCard>

      <HomeShortcuts links={SHORTCUTS} />
    </div>
  )
}