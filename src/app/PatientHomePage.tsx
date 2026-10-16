import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { readNotice } from '@/common/readNotice'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { Card, CardContent } from '@/components/ui/card'
import { MyProgramsSection, TodayAndUpcomingCard } from '@/app/home/patient/PatientHomeSections'
import { usePatientHome } from '@/app/home/patient/usePatientHome'
import { HomeGreeting } from './home/HomeGreeting'

// The patient's home (Phase 4, decisions §2) — the same structure as the
// other homes: greeting + avatar, a summary card (here Today and Upcoming,
// stacked — see TodayAndUpcomingCard), then the patient's programs.
//
// No shortcuts row yet: the patient's other sections (Sessions, Team,
// Messages) are still "Coming soon", and HomeShortcuts lists only sections
// with real pages — the persistent navigation already offers the rest.
export function PatientHomePage() {
  const { data: user } = useCurrentUser()
  // Today is read ONCE, when the page opens (the program page's rule): a
  // page left open past midnight keeps describing the day it opened on
  // rather than mixing two days; reopening it asks again. Lazy initial
  // state (a function), so the date isn't recomputed on every render.
  const [today] = useState(() => localDateString())
  const { list, programs, summaries } = usePatientHome(today)
  // The confirmation an ending hands over ("Session finished. Well done!"),
  // through navigation state — read defensively (readNotice).
  const notice = readNotice(useLocation().state)

  // Unreachable in practice — RequireAuth renders pages only with a user —
  // but a crash-proof guard costs nothing (the other homes' reasoning).
  if (!user) return null

  // Each program with ITS summary's query: useQueries answers in the order
  // it was given the programs.
  const entries = programs.map((program, index) => ({ program, summary: summaries[index] }))

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <HomeGreeting
        firstName={user.firstName}
        lastName={user.lastName}
        avatarUrl={user.avatarUrl}
      />

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm"
        >
          {notice}
        </p>
      )}

      {list.isPending ? (
        <Notice>Loading your programs…</Notice>
      ) : list.isError ? (
        <Notice>Couldn't load your programs. Try refreshing the page.</Notice>
      ) : entries.length === 0 ? (
        <Notice>
          You don't have a program yet. When your practitioner assigns you one, your sessions will
          show here.
        </Notice>
      ) : (
        <>
          <TodayAndUpcomingCard entries={entries} today={today} />
          <MyProgramsSection entries={entries} />
        </>
      )}
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}