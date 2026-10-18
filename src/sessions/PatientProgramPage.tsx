import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { addDays, localDateString } from '@/common/calendarDate'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { ProgramTotals, ProgramWeeks, type SessionLinkKind } from '@/assigned-programs/ProgramWeeks'
import { currentAndPlanned, describeVersion, workoutNames } from '@/assigned-programs/programSchedule'
import type { AssignedProgramDetail, AssignedProgramExercise, ScheduleSummary, ScheduledDay } from '@/assigned-programs/types'
import { SUMMARY_HORIZON_DAYS } from '@/assigned-programs/useActiveProgramSummaries'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { useAssignedProgramSummary } from '@/assigned-programs/useAssignedProgramSummary'
import { programRowSummary } from '@/patients/patientPageRules'
import { ExercisePhotoCarousel } from '@/programs/ExercisePhotoCarousel'
import { groupExercisesByWorkout } from '@/workouts/workoutGroups'
import { MakeUpList } from './MakeUpList'
import { makeUps } from './makeUpRules'
import { equipmentText, makeUpTodayLabel, sessionLinkLabel } from './programPageText'
import {
  fromProgramState,
  isPlainClick,
  readViewedSession,
  viewedSessionState,
} from './sessionReturn'
import { workoutLabel } from './todayRow'

// One of the patient's programs — `/patient/sessions/programs/:programId`
// (the Sessions hub's pass 2, agreed 2026-10-17). Active or past: what it
// is, what can still be made up, how it has gone week by week — each
// session it holds one tap away — and its exercises. Under
// `/patient/sessions/` so the Sessions tab stays highlighted (NavLink matches
// by prefix).
//
// The weeks are the PRACTITIONER's week list (ProgramWeeks, shared since
// 2026-10-18), given two slots only this page fills: "View session" and
// "Make it up today". Same days, same badges, same sentences on both sides.
export function PatientProgramPage() {
  const { programId: param } = useParams<{ programId: string }>()
  const programId = Number(param)
  if (!Number.isInteger(programId) || programId < 1) {
    return (
      <ProgramPage>
        <NotFound />
      </ProgramPage>
    )
  }
  return <ProgramView programId={programId} />
}

function ProgramView({ programId }: { programId: number }) {
  // Today read ONCE, when the page opens (the home's rule).
  const [today] = useState(() => localDateString())
  const program = useAssignedProgram(programId)
  // The hub's and the home's summary (same `through`): usually cached
  // already. Waits for the program, so a 404 asks nothing more.
  const summary = useAssignedProgramSummary(programId, today, {
    enabled: program.isSuccess,
    through: addDays(today, SUMMARY_HORIZON_DAYS),
  })

  if (program.isError) {
    return (
      <ProgramPage>
        {program.error instanceof ApiError && program.error.statusCode === 404 ? (
          <NotFound />
        ) : (
          <p role="alert" className="text-sm text-destructive">
            Couldn't load this program. Try refreshing the page.
          </p>
        )}
      </ProgramPage>
    )
  }
  if (!program.isSuccess) {
    return (
      <ProgramPage>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </ProgramPage>
    )
  }

  const data = program.data
  // Closed (completed or cancelled): history only — nothing to make up, no
  // buttons. (The backend would refuse a start anyway: a closed program is
  // read-only.)
  const isOpen = data.status === 'active'
  const names = workoutNames(data.workouts)
  // The schedule in force today — or, once the program is over, the last
  // one it had (currentAndPlanned's rule).
  const { current } = currentAndPlanned(data.schedules, today)

  return (
    <ProgramPage>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        {/* The practitioner page's row words: "June 2, 2031 – June 29,
            2031 · Active", "Cancelled · ended October 3 · ran from …". */}
        <p className="text-sm text-muted-foreground">{programRowSummary(data)}</p>
        {current && (
          <p className="text-sm text-muted-foreground">
            {describeVersion(current, names, data.startDate)}
          </p>
        )}
      </div>

      {summary.isPending && <p className="text-sm text-muted-foreground">Loading progress…</p>}
      {summary.isError && (
        <p className="text-sm text-destructive">Couldn't load the progress. Try refreshing.</p>
      )}
      {summary.data && (
        <>
          {isOpen && (
            <MakeUpList program={data} summary={summary.data} today={today} headingLevel={2} />
          )}
          <Progress program={data} summary={summary.data} today={today} isOpen={isOpen} />
        </>
      )}

      <Exercises program={data} />
    </ProgramPage>
  )
}

// The totals, then the weeks — each session reachable, each missed day that
// can still be made up offering it on its own row.
function Progress({
  program,
  summary,
  today,
  isOpen,
}: {
  program: AssignedProgramDetail
  summary: ScheduleSummary
  today: string
  isOpen: boolean
}) {
  // The days "Make it up today" can be offered on: the same list the "To
  // make up" section shows (makeUps), and only when nothing blocks today —
  // a blocked button belongs where its reason is said (that section).
  const { offers, blocked } = makeUps(summary, today)
  const offered = new Set(isOpen && blocked === null ? offers.map((offer) => offer.forDay) : [])

  // THE ROUND TRIP (2026-10-18 — sessionReturn.ts). Back from a session, this
  // entry's state says which one was viewed: its week opens again
  // (`openWeekOf`) and focus goes back to its link, where a keyboard or
  // screen-reader user left off — otherwise focus would start again at the
  // top of the page. Looked up in this section (a ref, not the whole
  // document), after the render that drew the weeks: an effect runs once
  // React has put the elements on the page. Keyed by the session's id, so a
  // later re-render (a refetch) doesn't move focus again.
  const location = useLocation()
  const navigate = useNavigate()
  const viewed = readViewedSession(location.state)
  const viewedId = viewed?.sessionId
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (viewedId === undefined) return
    sectionRef.current?.querySelector<HTMLElement>(`[data-session-link="${viewedId}"]`)?.focus()
  }, [viewedId])

  function sessionLink(sessionId: number, date: string, kind: SessionLinkKind) {
    return (
      <Link
        to={`/patient/sessions/${sessionId}`}
        // On the SESSION's entry: where it was opened from.
        state={fromProgramState(program.id)}
        // How the return finds this link again.
        data-session-link={sessionId}
        aria-label={sessionLinkLabel(date, kind)}
        className="ml-2 text-xs underline underline-offset-4"
        onClick={(event) => {
          // On THIS page's entry, just before leaving: which session, from
          // which week. `replace` rewrites the current entry (no new one);
          // the link then pushes the session on top of it. A click that
          // opens a new tab leaves this page as it is: nothing to note.
          if (!isPlainClick(event)) return
          void navigate(location.pathname, {
            replace: true,
            state: viewedSessionState({ sessionId, date }),
          })
        }}
      >
        View session
      </Link>
    )
  }

  function dayAction(day: ScheduledDay) {
    if (!offered.has(day.date)) return null
    return (
      <Button asChild size="sm" variant="outline" className="mt-1">
        <Link
          to={`/patient/sessions/start/${program.id}?for=${day.date}`}
          aria-label={makeUpTodayLabel(day.date, workoutLabel(program, day.workoutId))}
        >
          Make it up today
        </Link>
      </Button>
    )
  }

  return (
    <section ref={sectionRef} aria-labelledby="program-progress" className="space-y-3">
      <h2 id="program-progress" className="text-lg font-semibold">
        Progress
      </h2>
      <ProgramTotals summary={summary} />
      <ProgramWeeks
        summary={summary}
        startDate={program.startDate}
        today={today}
        names={workoutNames(program.workouts)}
        sessionLink={sessionLink}
        dayAction={dayAction}
        openWeekOf={viewed?.date}
      />
    </section>
  )
}

// The program's exercises, read-only, workout by workout (the person's
// choice, 2026-10-17): what each asks, and — opened — its photos, steps,
// the practitioner's note and the equipment. Folded (<details>): a phone
// shows the list first; the browser handles opening, keyboard included.
function Exercises({ program }: { program: AssignedProgramDetail }) {
  const groups = groupExercisesByWorkout(program.workouts, program.exercises)
  const several = groups.length > 1
  return (
    <section aria-labelledby="program-exercises" className="space-y-3">
      <h2 id="program-exercises" className="text-lg font-semibold">
        Exercises
      </h2>
      {groups.map((group) => (
        <div key={group.workout.id} className="space-y-2">
          {/* The workout's name only when there are several to tell apart. */}
          {several && <h3 className="text-sm font-semibold">{group.label}</h3>}
          {group.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises at the moment.</p>
          ) : (
            <ul className="space-y-2">
              {group.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <ExerciseDetails exercise={exercise} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

function ExerciseDetails({ exercise }: { exercise: AssignedProgramExercise }) {
  const equipment = equipmentText(exercise.equipment)
  return (
    // The weeks' folding look (ProgramWeeks): a flex <summary> loses the
    // browser's triangle, so it draws the app's chevron, turned when open
    // (`group` + `group-open:`) — the two lists on one page fold alike.
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer items-start gap-2 p-3">
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        {/* A <div>: PrescriptionSummary is a <p>, which can't sit in a
            <span>. */}
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{exercise.name}</p>
          <PrescriptionSummary prescription={exercise} className="text-sm text-muted-foreground" />
        </div>
      </summary>
      <div className="space-y-3 border-t p-3 text-sm">
        {/* The photos the patient sees — the library's or the program's own,
            as the practitioner chose (`images` — 2026-10-17). */}
        {exercise.images.length > 0 && (
          <ExercisePhotoCarousel images={exercise.images} exerciseName={exercise.name} />
        )}
        <ol className="list-decimal space-y-1 pl-5">
          {exercise.instructions.map((step, index) => (
            // Steps can repeat word for word; the position makes the key.
            <li key={index}>{step}</li>
          ))}
        </ol>
        {exercise.notes && (
          <p className="rounded-md bg-muted px-3 py-2">
            <span className="font-medium">From your practitioner: </span>
            {exercise.notes}
          </p>
        )}
        {equipment && <p className="text-muted-foreground">{equipment}</p>}
      </div>
    </details>
  )
}

function ProgramPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      {children}
      <Link to="/patient/sessions" className="block text-sm underline underline-offset-4">
        Back to Sessions
      </Link>
    </div>
  )
}

// A 404 says both things it can mean (row security hides another patient's
// program — telling "doesn't exist" from "not yours" would confirm it
// exists): the session flow's wording.
function NotFound() {
  return (
    <p role="alert" className="text-sm">
      This program doesn't exist, or isn't yours.
    </p>
  )
}