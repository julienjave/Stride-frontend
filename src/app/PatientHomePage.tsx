import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { readNotice } from '@/common/readNotice'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { Card, CardContent } from '@/components/ui/card'
import { MyProgramsSection, TodayAndUpcomingCard } from '@/app/home/patient/PatientHomeSections'
import { useActiveProgramSummaries } from '@/assigned-programs/useActiveProgramSummaries'
import { HomeGreeting } from './home/HomeGreeting'
import { LinesSkeleton } from '@/common/Loading'

// The patient's home (Phase 4, decisions §2) — the same structure as the
// other homes: greeting + avatar, a summary card (here Today and Upcoming,
// stacked — see TodayAndUpcomingCard), then the patient's programs.
//
// No shortcuts row: the patient's tab bar has only three other sections
// (Sessions, Team, Messages), always in view — a row repeating them would
// add nothing.
export function PatientHomePage() {
  const { data: user } = useCurrentUser()
  // Today is read ONCE, when the page opens (the program page's rule): a
  // page left open past midnight keeps describing the day it opened on
  // rather than mixing two days; reopening it asks again. Lazy initial
  // state (a function), so the date isn't recomputed on every render.
  const [today] = useState(() => localDateString())
  const { list, programs, summaries } = useActiveProgramSummaries(today)
  // The confirmation an ending hands over ("Session finished. Well done!"),
  // through navigation state — read defensively (readNotice).
  const notice = readNotice(useLocation().state)
  // After a "Try again" of the list that worked, focus goes to the page's
  // heading (the greeting): whatever came back — the Today card, or "You
  // don't have a program yet" — follows it.
  const heading = useRetryFocus<HTMLHeadingElement>('your programs', list.isSuccess)

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
        headingRef={heading}
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
        <Card>
          <CardContent>
            <LinesSkeleton label="Loading your programs…" lines={3} />
          </CardContent>
        </Card>
      ) : list.isError ? (
        <Card>
          <CardContent>
            <LoadError what="your programs" queries={[list]} />
          </CardContent>
        </Card>
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