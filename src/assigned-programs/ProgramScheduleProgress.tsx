import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/common/calendarDate'
import { ProgramPageSection } from './ProgramPageSection'
import { LateMakeUpsSetting } from './LateMakeUpsSetting'
import { RearrangeWeekSwitch } from './RearrangeWeekSwitch'
import { changeWindow, type ChangeWindow, type ScheduleChangeKind } from './scheduleChange'
import { ScheduleChangeForm } from './ScheduleChangeForm'
import { ProgramTotals, ProgramWeeks } from './ProgramWeeks'
import { currentAndPlanned, describeVersion, type WorkoutNames } from './programSchedule'
import { upNextText } from './progressText'
import type { AssignedProgramDetail, ScheduleSummary } from './types'

interface ProgramScheduleProgressProps {
  program: AssignedProgramDetail
  today: string
  // Whether the program can still change (active, not deleted) — decided
  // once, by the page, for every control on it.
  isOpen: boolean
  names: WorkoutNames
  // The summary query's state, passed down rather than fetched here: the
  // page owns the requests (it decides when the summary may be asked for).
  summary: ScheduleSummary | undefined
  summaryLoading: boolean
  summaryFailed: boolean
}

// "Schedule & progress" — the schedule as it stands, what changes later,
// what's next, and how the program has gone so far, week by week. Every
// judgement comes from the backend's schedule module (the summary); this
// component only arranges and words it.
export function ProgramScheduleProgress({
  program,
  today,
  isOpen,
  names,
  summary,
  summaryLoading,
  summaryFailed,
}: ProgramScheduleProgressProps) {
  const { current, planned } = currentAndPlanned(program.schedules, today)
  const isPaused = isPausedOn(program.schedules, today)
  // "since Mon 5 Oct" only when the schedule CHANGED: the first version
  // starts with the program, whose dates the header already shows.
  const changedOn =
    current && current !== program.schedules[0] ? formatShortDate(current.effectiveFrom) : null

  return (
    <ProgramPageSection title="Schedule & progress">
      {current && (
        <p className="text-sm">
          <span className="font-medium">Schedule: </span>
          {describeVersion(current, names, program.startDate)}
          {changedOn && <span className="text-muted-foreground"> (since {changedOn})</span>}
        </p>
      )}

      {planned.length > 0 && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Planned changes</p>
          <ul className="list-disc space-y-1 pl-5">
            {planned.map((version) => (
              <li key={version.id}>
                From {formatShortDate(version.effectiveFrom)}:{' '}
                {describeVersion(version, names, program.startDate)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && <ScheduleControls program={program} today={today} names={names} />}

      {isOpen && <RearrangeWeekSwitch programId={program.id} allowSwaps={program.allowSwaps} />}
      {/* The patient's other freedom with the schedule, beside the first
          (2026-10-16). Open programs only, like the switch: a closed one
          takes no new sessions. */}
      {isOpen && (
        <LateMakeUpsSetting programId={program.id} lateMakeUpDays={program.lateMakeUpDays} />
      )}

      {program.isArchived && (
        <p className="text-sm text-muted-foreground">
          Deleted before any session: there's no progress to show.
        </p>
      )}
      {summaryLoading && <p className="text-sm text-muted-foreground">Loading progress…</p>}
      {summaryFailed && (
        <p className="text-sm text-destructive">Couldn't load the progress. Try refreshing.</p>
      )}
      {summary && (
        <>
          {/* "Up next" only while the program can still be followed: a closed
              program has nothing next, and the header already says why. */}
          {isOpen && <UpNext summary={summary} today={today} names={names} isPaused={isPaused} />}
          <ProgramTotals summary={summary} />
          <ProgramWeeks summary={summary} startDate={program.startDate} today={today} names={names} />
        </>
      )}
    </ProgramPageSection>
  )
}

// The buttons that change the schedule, and the form they open in place.
//   - Running: "Change schedule" and "Pause".
//   - Paused today: "Resume" — a new schedule after the pause (the
//     editor starts from the schedule before it). No "Change schedule"
//     next to it: while paused, a schedule from some day IS a resume.
// A button shows only when some day is allowed for it (changeWindow): an
// open program whose end date has passed has none, and a one-day program
// can't be paused.
function ScheduleControls({
  program,
  today,
  names,
}: {
  program: AssignedProgramDetail
  today: string
  names: WorkoutNames
}) {
  // What was opened — the kind AND its allowed days — kept from the moment
  // of opening. Not re-derived from the program on each render: saving a
  // pause writes a paused program into the cache, after which "pause" is no
  // longer offered — a form shown only while its kind is offered would
  // vanish mid-save, before it could close itself (a test caught exactly
  // that: focus lost, and the form stuck "open" out of sight).
  const [editing, setEditing] = useState<{
    kind: ScheduleChangeKind
    allowed: ChangeWindow
  } | null>(null)
  const kinds = controlKinds(program.schedules, today)
  const offered = kinds.flatMap((kind) => {
    const allowed = changeWindow(program, today, kind)
    return allowed ? [{ kind, allowed }] : []
  })

  // FOCUS. The form replaces the buttons while it's open; when it closes,
  // the buttons come back — but the browser's focus was on a form element
  // that no longer exists, so it falls to the page's <body> and a keyboard
  // user has to start over from the top. So on closing, focus moves to a
  // button: the one that opened the form — or, after saving, the one that
  // fits the program AS SAVED (a pause turns "Pause" into "Resume").
  //
  // Decided from the SAVED program, not from what's on screen: the cache's
  // new program reaches this component a moment AFTER the form closes
  // (TanStack Query notifies its components asynchronously), so for one
  // render the old buttons are back — "Pause" included, about to vanish.
  // Focusing what's on screen then would put focus on a button that
  // disappears (a test caught that). So the target is chosen from the
  // answer, and focused only once that button exists.
  //
  // Refs, not state: they're about the DOM, and changing them must not
  // re-render anything.
  const buttons = useRef(new Map<ScheduleChangeKind, HTMLButtonElement>())
  const returnFocusTo = useRef<ScheduleChangeKind | null>(null)
  const shown = kinds.join()
  useEffect(() => {
    // After each render where the form closed or the buttons changed —
    // i.e. whenever the target button may have just appeared.
    if (editing !== null || returnFocusTo.current === null) return
    const target = buttons.current.get(returnFocusTo.current)
    if (!target) return
    target.focus()
    returnFocusTo.current = null
  }, [editing, shown])

  // `saved`: the program as the backend answered it — absent when the form
  // was dismissed (nothing changed).
  function close(saved?: AssignedProgramDetail) {
    const next = saved ? controlKinds(saved.schedules, today) : kinds
    returnFocusTo.current = editing && next.includes(editing.kind) ? editing.kind : next[0]
    setEditing(null)
  }

  if (editing) {
    return (
      <ScheduleChangeForm
        program={program}
        today={today}
        kind={editing.kind}
        allowed={editing.allowed}
        names={names}
        onClose={close}
      />
    )
  }
  if (offered.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {offered.map(({ kind, allowed }) => (
        <Button
          key={kind}
          // A callback ref: React calls it with the element when the button
          // appears, and with null when it goes.
          ref={(element) => {
            if (element) buttons.current.set(kind, element)
            else buttons.current.delete(kind)
          }}
          size="sm"
          variant="outline"
          onClick={() => setEditing({ kind, allowed })}
        >
          {CONTROL_LABEL[kind]}
        </Button>
      ))}
    </div>
  )
}

// Whether the program is paused on `today`: the version in force is a pause.
function isPausedOn(versions: AssignedProgramDetail['schedules'], today: string): boolean {
  return currentAndPlanned(versions, today).current?.type === 'paused'
}

// The buttons a program gets, by its schedule today.
function controlKinds(
  versions: AssignedProgramDetail['schedules'],
  today: string,
): ScheduleChangeKind[] {
  return isPausedOn(versions, today) ? ['resume'] : ['change', 'pause']
}

const CONTROL_LABEL = { change: 'Change schedule', pause: 'Pause', resume: 'Resume' } as const

function UpNext({
  summary,
  today,
  names,
  isPaused,
}: {
  summary: ScheduleSummary
  today: string
  names: WorkoutNames
  isPaused: boolean
}) {
  const next = summary.nextWorkout
  const text = upNextText(
    next,
    today,
    next && names.several ? names.labelOf(next.workoutId) : null,
  )
  // No next workout: the module says why only by its own rules (paused, or
  // nothing left within the days it covers) — the page says which.
  const fallback = isPaused
    ? 'Nothing while the program is paused.'
    : 'Nothing left to do in this program.'
  return (
    <p className="text-sm">
      <span className="font-medium">Up next: </span>
      {text ?? fallback}
    </p>
  )
}