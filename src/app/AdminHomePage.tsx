import { useCurrentUser } from '@/auth/useCurrentUser'
import { HomeGreeting } from './home/HomeGreeting'
import { HomeSummaryCard, TodaySlot } from './home/HomeSummaryCard'
import { HomeShortcuts, type HomeShortcut } from './home/HomeShortcuts'
import { AdminMetricsSection } from './home/admin/AdminMetricsSection'
import { RecentActivitySection } from './home/admin/RecentActivitySection'

// The admin's two sections, both with real pages (list pages, which link on
// to their "new" forms).
const SHORTCUTS: HomeShortcut[] = [
  { label: 'Clinics', to: '/admin/clinics' },
  { label: 'Users', to: '/admin/users' },
]

// The admin's home page — the same structure as the practitioner's
// (decisions §3), built from the same shared pieces in ./home/:
//   1. Avatar + greeting
//   2. The summary card: today's date and time
//   3. Links into the sections
//   4. Metrics: accounts by role, clinics, invitations waiting, and who
//      needs attention (GET /admin/metrics)
//   5. Recent activity: the latest changes in the audit log
// 4 and 5 replaced two "Coming soon" slots of the card (Phase 6, decisions
// §17). They are sections UNDER the shortcuts, as the practitioner's "For
// review" is: content of varying length above the navigation would push it
// down the screen (the person's point, 2026-10-19).
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
      </HomeSummaryCard>

      <HomeShortcuts links={SHORTCUTS} />

      <AdminMetricsSection />
      <RecentActivitySection />
    </div>
  )
}