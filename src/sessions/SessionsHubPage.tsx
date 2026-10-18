import { useState, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { localDateString } from '@/common/calendarDate'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { Card, CardContent } from '@/components/ui/card'
import { ProgramProgressBar } from '@/assigned-programs/ProgramProgressBar'
import { currentAndPlanned, describeVersion, workoutNames } from '@/assigned-programs/programSchedule'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { useActiveProgramSummaries } from '@/assigned-programs/useActiveProgramSummaries'
import { programRowSummary, splitProgramsForPatientPage } from '@/patients/patientPageRules'
import { MakeUpList } from './MakeUpList'
import { todayRow } from './todayRow'
import { TodayRowView } from './TodayRowView'

// The patient's Sessions tab — `/patient/sessions` (Phase 4, the Sessions
// hub, agreed 2026-10-17). Pass 1: one card per ACTIVE program — listed
// equally, in the home's order (activePrograms) — with its schedule, how far
// it has got, today's row (the home's own, todayRow) and EVERY missed
// session that can still be made up (MakeUpList); then the past programs,
// behind "Show N past programs". Pass 2 adds each program's own page (its
// weeks, its sessions, its exercises), which the cards and past rows will
// link to.
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

  if (list.isPending) {
    return (
      <HubPage>
        <p className="text-sm text-muted-foreground">Loading your programs…</p>
      </HubPage>
    )
  }
  if (list.isError) {
    return (
      <HubPage>
        <p role="alert" className="text-sm text-destructive">
          Couldn't load your programs. Try refreshing the page.
        </p>
      </HubPage>
    )
  }

  // Closed programs, the most recently ENDED first — the practitioner's
  // patient page's own rule and row words ("Completed · ended …"), so a
  // closed program reads the same on both sides.
  const { past } = splitProgramsForPatientPage(list.data)
  if (programs.length === 0 && past.length === 0) {
    return (
      <HubPage>
        <p className="text-sm text-muted-foreground">
          You don't have a program yet. When your practitioner assigns you one, it will show here.
        </p>
      </HubPage>
    )
  }

  return (
    <HubPage>
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
                  <p className="font-medium">{program.title}</p>
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

function HubPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <h1 className="text-2xl font-semibold">Sessions</h1>
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
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <h3 className="font-semibold">{program.title}</h3>
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
        {summary.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
        {summary.isError && (
          <p className="text-sm text-destructive">Couldn't load this program's sessions. Try refreshing.</p>
        )}
        {summary.data && (
          <>
            <ProgramProgressBar title={program.title} summary={summary.data} />
            <ProgramToday program={program} summary={summary.data} today={today} />
            <MakeUpList program={program} summary={summary.data} today={today} headingLevel={4} />
          </>
        )}
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