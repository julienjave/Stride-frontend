import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { localDateString } from '@/common/calendarDate'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { workoutNames } from '@/assigned-programs/programSchedule'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { useAssignedProgramSummary } from '@/assigned-programs/useAssignedProgramSummary'
import type { AssignedProgramDetail } from '@/assigned-programs/types'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { ScoreScale } from './ScoreScale'
import { HomeLink, Loading, NotAvailable, Page } from './SessionPageParts'
import { nothingToStartText, startContextText } from './sessionText'
import { startChoice, workoutExercises, type StartableStatus } from './startRules'
import { useStartSession } from './useStartSession'

// "Before you start" — `/patient/sessions/start/:programId` (Phase 4,
// decided 2026-10-16). The home's Start button leads here; NOTHING is
// written until the patient presses "Start session": POST /sessions opens
// the session at once, so a tap just to look, then leaving, would otherwise
// leave an open session the practitioner later sees as "not finished".
//
// The address names only the PROGRAM. Which workout today asks for is
// worked out here again, by the home's own rule (startChoice → todayStatus),
// so an old or edited link can never start the wrong workout:
//   - start  → the workout, its exercises, the optional pain question;
//   - resume → a session of today is already open: straight to it
//              (`replace` — Back then skips this page);
//   - none   → why there's nothing to start, and the way home.
export function StartSessionPage() {
  const { programId: param } = useParams<{ programId: string }>()
  const programId = Number(param)
  if (!Number.isInteger(programId) || programId < 1) {
    return (
      <Page>
        <NotAvailable what="program" />
      </Page>
    )
  }
  return <StartSessionView programId={programId} />
}

function StartSessionView({ programId }: { programId: number }) {
  // Today read ONCE, when the page opens (the home's rule): the session is
  // filed under this day, the one the page showed.
  const [today] = useState(() => localDateString())
  const program = useAssignedProgram(programId)
  // The summary waits for the program: no second request for a program
  // that answered 404.
  const summary = useAssignedProgramSummary(programId, today, {
    enabled: program.isSuccess,
    fresh: true,
  })

  // Errors first (either request), then "still loading" until BOTH have
  // answered — checked as `isSuccess` on each, which is also what lets
  // TypeScript know `data` is there below (a combined condition doesn't
  // narrow each query's type).
  if (program.isError || summary.isError) {
    const error = program.error ?? summary.error
    return (
      <Page>
        {error instanceof ApiError && error.statusCode === 404 ? (
          <NotAvailable what="program" />
        ) : (
          <>
            <p role="alert" className="text-sm text-destructive">
              Couldn't load this program. Try refreshing the page.
            </p>
            <HomeLink />
          </>
        )}
      </Page>
    )
  }
  // The DECISION waits for this visit's own answer (`isFetchedAfterMount`),
  // never a cached one — found in the live check: a summary cached while a
  // session was open sent the patient back to that session after it was
  // stopped. Only the FIRST answer is waited for: a later background refetch
  // (the window regaining focus) updates the page in place, rather than
  // unmounting the form and losing what the patient chose.
  if (!program.isSuccess || !summary.isSuccess || !summary.isFetchedAfterMount) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }

  const choice = startChoice(summary.data, today)
  if (choice.kind === 'resume') {
    return <Navigate to={`/patient/sessions/${choice.sessionId}`} replace />
  }
  if (choice.kind === 'none') {
    return (
      <Page>
        <h1 className="text-xl font-semibold">{program.data.title}</h1>
        <p>{nothingToStartText(choice.status)}</p>
        <HomeLink />
      </Page>
    )
  }
  return (
    <StartForm
      program={program.data}
      workoutId={choice.workoutId}
      status={choice.status}
      today={today}
    />
  )
}

function StartForm({
  program,
  workoutId,
  status,
  today,
}: {
  program: AssignedProgramDetail
  workoutId: number
  status: StartableStatus
  today: string
}) {
  const navigate = useNavigate()
  const [painBefore, setPainBefore] = useState<number | null>(null)
  // After starting: the session page, REPLACING this one in the history —
  // Back from the session then goes home, not to a "start" page whose
  // session already exists (pressing Start again would be refused).
  const start = useStartSession((session) => {
    void navigate(`/patient/sessions/${session.id}`, { replace: true })
  })

  const names = workoutNames(program.workouts)
  const exercises = workoutExercises(program.exercises, workoutId)

  function onStart() {
    start.mutate({
      assignedProgramId: program.id,
      localDate: today,
      workoutId,
      // A late make-up names the day it makes up (the backend checks it
      // against the summary it offered); every other start sends nothing.
      ...(status.kind === 'late_make_up' ? { countsFor: status.forDay } : {}),
      // Only an answer is sent: left out = not answered (decisions §6).
      ...(painBefore === null ? {} : { painBefore }),
    })
  }

  return (
    <Page>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Start your session</h1>
        <p className="font-medium">
          {program.title}
          {/* The workout only when there are several to tell apart. */}
          {names.several && `: ${names.labelOf(workoutId)}`}
        </p>
        <p className="text-sm text-muted-foreground">{startContextText(status)}</p>
      </div>

      <section aria-labelledby="start-exercises" className="space-y-2">
        <h2 id="start-exercises" className="text-sm font-semibold uppercase text-muted-foreground">
          {exercises.length === 1 ? '1 exercise' : `${exercises.length} exercises`}
        </h2>
        {exercises.length === 0 ? (
          // The backend would refuse to start it (an emptied workout) — say
          // so now, with no button that can only fail.
          <p className="text-sm">
            This workout has no exercises at the moment. Ask your practitioner to check your
            program.
          </p>
        ) : (
          <ol className="divide-y rounded-lg border">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="space-y-0.5 px-4 py-3">
                <p className="font-medium">{exercise.name}</p>
                <PrescriptionSummary prescription={exercise} className="text-sm" />
              </li>
            ))}
          </ol>
        )}
      </section>

      {exercises.length > 0 && (
        <>
          {/* The check-in: ONE question (decisions §6 — asking before a
              session delays its start). */}
          <ScoreScale
            legend="How much pain do you have right now?"
            lowLabel="no pain"
            highLabel="worst pain imaginable"
            value={painBefore}
            onChange={setPainBefore}
            disabled={start.isPending}
          />

          {start.isError && (
            <p role="alert" className="text-sm text-destructive">
              {describeFailure("Couldn't start the session", start.error)}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onStart} disabled={start.isPending}>
              {start.isPending ? 'Starting…' : 'Start session'}
            </Button>
            <HomeLink />
          </div>
        </>
      )}
      {exercises.length === 0 && <HomeLink />}
    </Page>
  )
}