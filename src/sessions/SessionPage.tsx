import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { localDateString } from '@/common/calendarDate'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { workoutNames } from '@/assigned-programs/programSchedule'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { cn } from '@/lib/utils'
import { HomeLink, Loading, NotAvailable, Page } from './SessionPageParts'
import { SessionPlayer } from './SessionPlayer'
import { isRunnable } from './sessionRules'
import {
  checklistProgressText,
  sessionStatusText,
  startedText,
} from './sessionText'
import type { Session } from './types'
import { useSession } from './useSession'

// One session — `/patient/sessions/:sessionId` (Phase 4, decided
// 2026-10-16). Reached from the start page (right after starting) and from
// the home's Resume.
//
// Built in passes: (a) the session — its program and workout, its state,
// the check-in, its checklist; (b) doing it: while the session can still be
// done (open, of today — isRunnable), the checklist becomes the PLAYER, one
// exercise at a time (SessionPlayer); otherwise the read-only list stays.
// Finish, Stop and Skip arrive with pass (c).
//
// The checklist is the SESSION's copy (names, prescriptions — taken when it
// started, steps 3b-0 / D-2), not the program's current one: this page
// shows what this session was given. The program is read only for its
// title and workout names.
export function SessionPage() {
  const { sessionId: param } = useParams<{ sessionId: string }>()
  const sessionId = Number(param)
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return (
      <Page>
        <NotAvailable what="session" />
      </Page>
    )
  }
  return <SessionView sessionId={sessionId} />
}

function SessionView({ sessionId }: { sessionId: number }) {
  const [today] = useState(() => localDateString())
  const session = useSession(sessionId)
  // The program for its title and workout names — asked once the session
  // says which program (a dependent query: `enabled` waits for the id).
  const programId = session.data?.assignedProgramId ?? 0
  const program = useAssignedProgram(programId, { enabled: session.isSuccess })

  if (session.isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }
  if (session.isError) {
    return (
      <Page>
        {session.error instanceof ApiError && session.error.statusCode === 404 ? (
          <NotAvailable what="session" />
        ) : (
          <>
            <p role="alert" className="text-sm text-destructive">
              Couldn't load this session. Try refreshing the page.
            </p>
            <HomeLink />
          </>
        )}
      </Page>
    )
  }

  // While the program loads (or if it can't be read), the page still shows
  // the session: its own data is all it needs; the title waits.
  const title = program.data?.title ?? 'Your session'
  const names = program.data ? workoutNames(program.data.workouts) : null
  const workoutLabel = names?.several ? names.labelOf(session.data.workoutId) : null

  return (
    <Page>
      <SessionHeader session={session.data} title={title} workoutLabel={workoutLabel} today={today} />
      {isRunnable(session.data, today) && session.data.exercises.length > 0 ? (
        <SessionPlayer session={session.data} program={program.data} />
      ) : (
        <Checklist session={session.data} />
      )}
      <HomeLink />
    </Page>
  )
}

function SessionHeader({
  session,
  title,
  workoutLabel,
  today,
}: {
  session: Session
  title: string
  workoutLabel: string | null
  today: string
}) {
  const started = startedText(session, today)
  // Open, but from an earlier day: it can no longer be finished (a session
  // completes only on its own day — Phase 4 step 1); the program's next
  // Start closes it as "not finished".
  const leftOpen = session.status === 'in_progress' && session.localDate < today

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">{title}</h1>
      {workoutLabel && <p className="font-medium">{workoutLabel}</p>}
      <p className="text-sm text-muted-foreground">
        {[sessionStatusText(session), started].filter((part) => part !== null).join(' · ')}
      </p>
      {session.painBefore !== null && (
        <p className="text-sm text-muted-foreground">
          Pain when you started: {session.painBefore} out of 10
        </p>
      )}
      {leftOpen && (
        <p className="text-sm">
          This session was left open. It can no longer be finished, and will be kept as not
          finished.{' '}
          <Link to={`/patient/sessions/${session.id}/stop`} className="underline underline-offset-4">
            Stop it now
          </Link>
        </p>
      )}
    </div>
  )
}

function Checklist({ session }: { session: Session }) {
  return (
    <section aria-labelledby="session-exercises" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="session-exercises" className="text-sm font-semibold uppercase text-muted-foreground">
          Exercises
        </h2>
        <p className="text-sm text-muted-foreground">{checklistProgressText(session.exercises)}</p>
      </div>
      <ol className="divide-y rounded-lg border">
        {session.exercises.map((exercise) => (
          <li key={exercise.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="space-y-0.5">
              <p className="font-medium">{exercise.name}</p>
              <PrescriptionSummary prescription={exercise} className="text-sm" />
            </div>
            {/* The state in WORDS, not a tick alone — colour or an icon by
                itself says nothing to a screen reader. */}
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-xs',
                exercise.completed
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {exercise.completed ? 'Done' : 'To do'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}