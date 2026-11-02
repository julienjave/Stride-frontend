import { useState } from 'react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { ForReviewSection } from '@/alerts/ForReviewSection'
import { ForReviewSlot } from '@/alerts/ForReviewSlot'
import { localDateString } from '@/common/calendarDate'
import { MessagesSlot } from '@/messages/MessagesSlot'
import { HomeGreeting } from './home/HomeGreeting'
import { HomeSummaryCard, TodaySlot } from './home/HomeSummaryCard'
import { HomeShortcuts, type HomeShortcut } from './home/HomeShortcuts'

// Links into the three sections that have real pages. "My Profile" used
// to be here too; it moved to the account menu with the shared layout
// (design decisions §1). No Messages shortcut (Phase 5): the card's
// Messages slot right above already links there, with the unread count.
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
//   2. A card: today's date/time, unread messages (Phase 5) and how many
//      things are for review (2026-10-19)
//   3. Links into the sections
//   4. The "For review" list: patients who have stopped coming, sessions to
//      look at (decisions §3). BELOW the links (the person's point, after
//      testing it live): the links have a fixed height, the list doesn't —
//      above them, it pushed the navigation down by a different amount on
//      every visit. The card's count links straight to it.
export function PractitionerHomePage() {
  const { data: user } = useCurrentUser()
  // The practitioner's calendar day, fixed for this visit: it is part of
  // the alerts' question (GET /alerts?today=) and of their cache key, and
  // the slot and the section must ask the SAME question to share one answer.
  // useState's initializer runs once, so a render after midnight doesn't
  // silently switch to tomorrow's list.
  const [today] = useState(() => localDateString())

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
        userId={user.id}
        firstName={user.firstName}
        lastName={user.lastName}
        avatarUrl={user.avatarUrl}
      />

      <HomeSummaryCard>
        <TodaySlot />
        <MessagesSlot />
        <ForReviewSlot today={today} />
      </HomeSummaryCard>

      <HomeShortcuts links={SHORTCUTS} />

      <ForReviewSection today={today} />
    </div>
  )
}