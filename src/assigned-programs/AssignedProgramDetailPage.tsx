import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { localDateString } from '@/common/calendarDate'
import { ProgramAlertBanner } from '@/alerts/ProgramAlertBanner'
import { PainAndMobility } from '@/progress/PainAndMobility'
import { useUser } from '@/users/useUser'
import { ProgramExercisesSection } from './ProgramExercisesSection'
import { ProgramActions } from './ProgramActions'
import { ProgramDetailsSection } from './ProgramDetailsSection'
import { ProgramHeader } from './ProgramHeader'
import { ProgramScheduleProgress } from './ProgramScheduleProgress'
import { isProgramOpen } from './permissions'
import { currentAndPlanned, workoutNames } from './programSchedule'
import { useAssignedProgram } from './useAssignedProgram'
import { useAssignedProgramSummary } from './useAssignedProgramSummary'
import { usePatientAssignedPrograms } from './usePatientAssignedPrograms'

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
    return <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">Invalid program.</p>
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
  const { data: program, isLoading, error } = useAssignedProgram(programId)
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

  if (isLoading) {
    return (
      <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-muted-foreground">Loading program…</p>
    )
  }

  if (error) {
    return error instanceof ApiError && error.statusCode === 404 ? (
      <ProgramNotFound />
    ) : (
      <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this program. Try refreshing.
      </p>
    )
  }

  if (!program || !currentUser) return null

  const names = workoutNames(program.workouts)
  const isPaused = currentAndPlanned(program.schedules, today).current?.type === 'paused'
  // Only an open program can change: the backend refuses every write on a
  // completed, cancelled or deleted one (409), so their controls aren't drawn.
  const isOpen = isProgramOpen(program)

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8 px-4 pb-8">
      <ProgramHeader
        program={program}
        isPaused={isPaused}
        patient={
          patient
            ? {
                name: `${patient.firstName} ${patient.lastName}`,
                dateOfBirth: patient.patientProfile?.dateOfBirth ?? null,
              }
            : null
        }
        patientPrograms={patientPrograms}
        myId={currentUser.id}
      />
      {/* "For review" (2026-10-19): this program's attendance alert, if
          the practitioner's list has one, with "Mark as reviewed". Only an
          open program can have one (a closed program isn't running). */}
      {isOpen && <ProgramAlertBanner programId={program.id} today={today} />}
      {isOpen && <ProgramActions programId={program.id} today={today} />}
      {/* Only an open program's title and dates can change; the header
          already shows a closed one's. */}
      {isOpen && <ProgramDetailsSection program={program} today={today} names={names} />}
      <ProgramScheduleProgress
        program={program}
        today={today}
        isOpen={isOpen}
        names={names}
        summary={summary.data}
        summaryLoading={summary.isLoading}
        summaryFailed={summary.isError}
      />
      {/* The patient's scores over time (2026-10-18) — the same charts as
          on the patient's own page. Not for a program deleted before any
          session: it has none (the section above says so). */}
      {!program.isArchived && (
        <PainAndMobility program={program} today={today} viewer="practitioner" headingLevel={2} />
      )}
      <ProgramExercisesSection program={program} isOpen={isOpen} today={today} />
    </div>
  )
}

// A 404 means one of two things the backend deliberately doesn't tell
// apart: no such program, or a program of a patient whose care team I'm
// not on (row-level security makes it invisible, so it reads as "not
// found" — telling them apart would confirm that it exists). The page says
// both, honestly, and where to go. (The roadmap's Phase 6 item on "honest
// copy for the RLS 404s" — assigned_programs is one of the four.)
function ProgramNotFound() {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
      <h1 className="text-xl font-semibold">Program not found</h1>
      <p className="text-sm text-muted-foreground">
        This program doesn't exist, or it belongs to a patient whose care team you're not on. Only
        a patient's care team can open their programs.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link to="/practitioner/patients" className="font-medium underline">
          My patients
        </Link>
        <Link to="/practitioner/programs" className="font-medium underline">
          Programs
        </Link>
      </div>
    </div>
  )
}