import { type Ref, useState, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { localDateString } from '@/common/calendarDate'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { Card, CardContent } from '@/components/ui/card'
import { ProgramProgressBar } from '@/assigned-programs/ProgramProgressBar'
import { currentAndPlanned, describeVersion, workoutNames } from '@/assigned-programs/programSchedule'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { useActiveProgramSummaries } from '@/assigned-programs/useActiveProgramSummaries'
import { programRowSummary, splitProgramsForPatientPage } from '@/patients/patientPageRules'
import { Link } from 'react-router'
import { MakeUpList } from './MakeUpList'
import { programPagePath } from './programPagePath'
import { ViewProgramLink } from './ViewProgramLink'
import { todayRow } from './todayRow'
import { TodayRowView } from './TodayRowView'
import { ListSkeleton, Loading } from '@/common/Loading'

// The patient's Sessions tab — `/patient/sessions` (Phase 4, the Sessions
// hub, agreed 2026-10-17). Pass 1: one card per ACTIVE program — listed
// equally, in the home's order (activePrograms) — with its schedule, how far
// it has got, today's row (the home's own, todayRow) and EVERY missed
// session that can still be made up (MakeUpList); then the past programs,
// behind "Show N past programs". Each card and past row leads to the
// program's own page (pass 2, 2026-10-18: its weeks, its sessions, its
// exercises).
//
// The data is the home's (useActiveProgramSummaries — the same list and the
// same summary keys), so going from one screen to the other finds it cached.
export function SessionsHubPage() {
  // Today read ONCE, when the page opens (the home's rule): a page left open
  // past midnight keeps describing the day it opened on, rather than mixing
  // two days.
  const [today] = useState(() => localDateString())
  const { list, programs, summaries } = useActiveProgramSummaries(today)
  // Off on every visit (plain state, the patient page's rule): past
  // programs are history, not what the patient came for.
  const [showPast, setShowPast] = useState(false)
  // After a "Try again" of the list that worked, focus goes to the page's
  // heading — the frame's, on screen in every state.
  const heading = useRetryFocus<HTMLHeadingElement>('your programs', list.isSuccess)

  if (list.isPending) {
    return (
      <HubPage heading={heading}>
        <ListSkeleton label="Loading your programs…" rows={2} layout="cards" />
      </HubPage>
    )
  }
  if (list.isError) {
    return (
      <HubPage heading={heading}>
        <LoadError what="your programs" queries={[list]} />
      </HubPage>
    )
  }

  // Closed programs, the most recently ENDED first — the practitioner's
  // patient page's own rule and row words ("Completed · ended …"), so a
  // closed program reads the same on both sides.
  const { past } = splitProgramsForPatientPage(list.data)
  if (programs.length === 0 && past.length === 0) {
    return (
      <HubPage heading={heading}>
        <p className="text-sm text-muted-foreground">
          You don't have a program yet. When your practitioner assigns you one, it will show here.
        </p>
      </HubPage>
    )
  }

  return (
    <HubPage heading={heading}>
      <section aria-labelledby="hub-current" className="space-y-3">
        <h2 id="hub-current" className="text-lg font-semibold">
          Current programs
        </h2>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No current program.</p>
        ) : (
          <ul className="space-y-4">
            {/* useQueries answers in the order it was given the programs. */}
            {programs.map((program, index) => (
              <li key={program.id}>
                <ProgramCard program={program} summary={summaries[index]} today={today} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <ShowHiddenToggle
            count={past.length}
            singular="past program"
            plural="past programs"
            checked={showPast}
            onChange={setShowPast}
          />
          {showPast && (
            <ul aria-label="Past programs" className="divide-y rounded-lg border">
              {past.map((program) => (
                <li key={program.id} className="space-y-0.5 px-4 py-3">
                  {/* The title IS the link: a past program has nothing else
                      to do on its row. */}
                  <Link
                    to={programPagePath(program.id)}
                    className="font-medium underline underline-offset-4"
                  >
                    {program.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{programRowSummary(program)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </HubPage>
  )
}

function HubPage({ children, heading }: { children: ReactNode; heading: Ref<HTMLHeadingElement> }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        Sessions
      </h1>
      {children}
    </div>
  )
}

// One active program: who it's from and its schedule, then — once its
// summary has answered — its progress, today, and what can be made up.
function ProgramCard({
  program,
  summary,
  today,
}: {
  program: AssignedProgramListItem
  summary: UseQueryResult<ScheduleSummary>
  today: string
}) {
  // The schedule in force today ("Mon A · Wed B · Fri A") — the program
  // page's words for it (describeVersion). Before the start, the first one.
  const { current } = currentAndPlanned(program.schedules, today)
  // After a "Try again" of THIS card's summary that worked, focus goes to
  // its title (every card says "this program's sessions"; only the card
  // whose summary was asked again sees it come back).
  const heading = useRetryFocus<HTMLHeadingElement>("this program's sessions", summary.isSuccess)
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <h3 ref={heading} tabIndex={-1} className="font-semibold outline-none">
            {program.title}
          </h3>
          {program.assigner && (
            <p className="text-sm text-muted-foreground">
              From {program.assigner.firstName} {program.assigner.lastName}
            </p>
          )}
          {current && (
            <p className="text-sm text-muted-foreground">
              {describeVersion(current, workoutNames(program.workouts), program.startDate)}
            </p>
          )}
        </div>
        {summary.isPending && <Loading label="Loading this program's sessions…" />}
        {summary.isError && <LoadError what="this program's sessions" queries={[summary]} />}
        {summary.data && (
          <>
            <ProgramProgressBar title={program.title} summary={summary.data} />
            <ProgramToday program={program} summary={summary.data} today={today} />
            <MakeUpList program={program} summary={summary.data} today={today} headingLevel={4} />
          </>
        )}
        <ViewProgramLink program={program} />
      </CardContent>
    </Card>
  )
}

// The home's Today row for this program — with make-ups APART (they're in
// the list below, each with its button), so a make-up never shows twice.
// A day with nothing of its own says so in one line.
function ProgramToday({
  program,
  summary,
  today,
}: {
  program: AssignedProgramListItem
  summary: ScheduleSummary
  today: string
}) {
  const row = todayRow(program, summary, today, 'apart')
  if (row === null) {
    return (
      <div className="space-y-0.5">
        <p className="text-sm text-muted-foreground">Today</p>
        <p className="font-medium">Nothing scheduled today</p>
      </div>
    )
  }
  return <TodayRowView eyebrow="Today" programTitle={program.title} row={row} />
}