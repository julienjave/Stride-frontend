import { useState } from 'react'
import { useParams } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { useRetryFocus } from '@/common/useRetryFocus'
import { ProgramAlertBanner } from '@/alerts/ProgramAlertBanner'
import { PainAndMobility } from '@/progress/PainAndMobility'
import { useUser } from '@/users/useUser'
import { ProgramExercisesSection } from './ProgramExercisesSection'
import { ProgramActions } from './ProgramActions'
import { ProgramDetailsSection } from './ProgramDetailsSection'
import { ProgramHeader } from './ProgramHeader'
import { ProgramScheduleProgress } from './ProgramScheduleProgress'
import { ProgramLoadFailed, ProgramNotAvailable } from './ProgramNotAvailable'
import { isProgramOpen } from './permissions'
import { programLock } from './programLock'
import { currentAndPlanned, workoutNames } from './programSchedule'
import { useAssignedProgram } from './useAssignedProgram'
import { useAssignedProgramSummary } from './useAssignedProgramSummary'
import { usePatientAssignedPrograms } from './usePatientAssignedPrograms'
import { Loading } from '@/common/Loading'

// The program page (/practitioner/programs/assigned/:id) — step 3a-2,
// built 2026-10-12/13 (decisions §5). Top to bottom: who and what (header,
// with Complete / Cancel, or "Assign again" once closed), the title and
// dates to edit on an open program (Details — step 3b-2), the schedule and
// how it has gone (Schedule & progress — with Change schedule / Pause /
// Resume and the "rearrange the week" switch), and the exercises —
// tailored on an open program (step 3b-1), read-only on a closed one.
export function AssignedProgramDetailPage() {
  const { id } = useParams<{ id: string }>()
  const programId = Number(id)

  if (!id || !Number.isInteger(programId) || programId < 1) {
    return <ProgramNotAvailable />
  }

  // key={programId}: going from one program to another (the "Continues …"
  // link — same route, new :id) mounts a FRESH view, so nothing — an open
  // week, a dialog later — carries over to the next program. The patient
  // page's rule (deep-dive §9.2).
  return <ProgramView key={programId} programId={programId} />
}

function ProgramView({ programId }: { programId: number }) {
  // The viewer's today, read ONCE when the page opens. Not on every render:
  // the summary's cache key holds it, so a value changing under the page
  // (past midnight) would fetch a new summary in the middle of reading.
  // Reopening the page gives the new day. useState's initialiser function
  // runs only on the first render — the standard way to compute a value once.
  const [today] = useState(() => localDateString())

  const { data: currentUser } = useCurrentUser()
  const programQuery = useAssignedProgram(programId)
  const { data: program, isLoading, error } = programQuery
  // Asked for only once the program is known to be visible: a 404 program
  // needs no summary (it would only 404 too).
  // …and not for a DELETED program: deleted because nothing happened in it,
  // so there's no progress to judge (the schedule module doesn't know about
  // deletion, and would show its weeks as if it were running).
  const summary = useAssignedProgramSummary(programId, today, {
    enabled: !!program && !program.isArchived,
  })
  // The patient's name, and their programs (for who assigned this one and
  // the "Continues" links) — both usually cached from the patient page.
  // `program?.patientId ?? 0` with `enabled`: hooks can't be called
  // conditionally, so the switch is an option; 0 is never fetched.
  const patientId = program?.patientId ?? 0
  const { data: patient } = useUser(patientId, { enabled: !!program })
  const { data: patientPrograms } = usePatientAssignedPrograms(patientId, { enabled: !!program })
  // After a "Try again" of the program that worked, focus goes to its title.
  const heading = useRetryFocus<HTMLHeadingElement>('this program', programQuery.isSuccess)

  if (isLoading) {
    return <Loading label="Loading the program…" className="mx-auto mt-8 max-w-2xl px-4" />
  }

  if (error) return <ProgramLoadFailed query={programQuery} what="this program" />

  if (!program || !currentUser) return null

  const names = workoutNames(program.workouts)
  const isPaused = currentAndPlanned(program.schedules, today).current?.type === 'paused'
  // Only an open program can change: the backend refuses every write on a
  // completed, cancelled or deleted one (409), so their controls aren't drawn.
  const isOpen = isProgramOpen(program)
  // …and only while its patient's account is active (decisions §22): a
  // deactivated patient's open program can still be CLOSED (ProgramActions,
  // gated by isOpen alone), but nothing else changes. The patient is read
  // above for the header anyway — no request of its own (useProgramLock is
  // for the pages that don't have it).
  const lock = programLock(program, patient?.isActive)
  const canChange = lock === null

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8 px-4">
      <ProgramHeader
        program={program}
        isPaused={isPaused}
        patient={
          patient
            ? {
                name: `${patient.firstName} ${patient.lastName}`,
                dateOfBirth: patient.patientProfile?.dateOfBirth ?? null,
                isActive: patient.isActive,
              }
            : null
        }
        patientPrograms={patientPrograms}
        myId={currentUser.id}
        headingRef={heading}
      />
      {/* "For review" (2026-10-19): this program's attendance alert, if
          the practitioner's list has one, with "Mark as reviewed". Only an
          open program can have one (a closed program isn't running). */}
      {isOpen && <ProgramAlertBanner programId={program.id} today={today} />}
      {isOpen && <ProgramActions programId={program.id} today={today} />}
      {/* Only a changeable program's title and dates can change; the
          header already shows them, and says why they can't. */}
      {canChange && <ProgramDetailsSection program={program} today={today} names={names} />}
      <ProgramScheduleProgress
        program={program}
        today={today}
        isOpen={isOpen}
        canChange={canChange}
        names={names}
        summary={summary.data}
        summaryLoading={summary.isLoading}
        summaryFailure={summary.isError ? summary : null}
      />
      {/* The patient's scores over time (2026-10-18) — the same charts as
          on the patient's own page. Not for a program deleted before any
          session: it has none (the section above says so). */}
      {!program.isArchived && (
        <PainAndMobility program={program} today={today} viewer="practitioner" headingLevel={2} />
      )}
      <ProgramExercisesSection program={program} canChange={canChange} today={today} />
    </div>
  )
}