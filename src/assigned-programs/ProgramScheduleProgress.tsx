import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/common/calendarDate'
import { ProgramPageSection } from './ProgramPageSection'
import { RearrangeWeekSwitch } from './RearrangeWeekSwitch'
import { changeWindow, type ChangeWindow, type ScheduleChangeKind } from './scheduleChange'
import { ScheduleChangeForm } from './ScheduleChangeForm'
import { StateBadge } from './StateBadge'
import { arrangeWeeks, groupProgressByWeek, type FocusRole, type ProgressWeek } from './programProgress'
import { currentAndPlanned, describeVersion, type WorkoutNames } from './programSchedule'
import {
  DAY_STATE_BADGE,
  EXTRA_REASON_TEXT,
  WEEK_STATE_BADGE,
  attemptText,
  dayDetail,
  stretchNote,
  totalsText,
  upNextText,
  weekResult,
  weekTitle,
} from './progressText'
import type {
  AssignedProgramDetail,
  CountedWeek,
  DatedAttempt,
  ExtraSession,
  ScheduleSummary,
} from './types'

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
          <Totals summary={summary} />
          <Weeks summary={summary} startDate={program.startDate} today={today} names={names} />
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

function Totals({ summary }: { summary: ScheduleSummary }) {
  const { headline, parts } = totalsText(summary.totals)
  return (
    <div className="text-sm">
      <p className="font-medium">{headline}</p>
      {parts && <p className="text-muted-foreground">{parts}</p>}
    </div>
  )
}

// What the open week's heading says about it (programProgress.FocusRole).
const FOCUS_HEADING: Record<FocusRole, string> = {
  current: 'This week',
  last: 'Last week of the program',
  first: 'First week',
}

// The weeks, arranged as decided: the open week first, then earlier weeks
// (newest first), then later ones (soonest first) — each folded. Sessions
// outside every week (before the start, after the end) are listed apart.
function Weeks({
  summary,
  startDate,
  today,
  names,
}: {
  summary: ScheduleSummary
  startDate: string
  today: string
  names: WorkoutNames
}) {
  const { weeks, outside, outsideAttempts } = groupProgressByWeek(summary, startDate)
  const arranged = arrangeWeeks(weeks, today)
  if (!arranged) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{FOCUS_HEADING[arranged.focusRole]}</h3>
        <WeekDetails week={arranged.focus} today={today} names={names} open />
      </div>
      {arranged.earlier.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Earlier weeks</h3>
          {arranged.earlier.map((week) => (
            <WeekDetails key={week.programWeek} week={week} today={today} names={names} />
          ))}
        </div>
      )}
      {arranged.later.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Later weeks</h3>
          {arranged.later.map((week) => (
            <WeekDetails key={week.programWeek} week={week} today={today} names={names} />
          ))}
        </div>
      )}
      {(outside.length > 0 || outsideAttempts.length > 0) && (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Sessions outside the program's dates</h3>
          <ExtraList extras={outside} />
          <AttemptList attempts={outsideAttempts} />
        </div>
      )}
    </div>
  )
}

// One program week, folded or open: a native <details> / <summary>. The
// browser makes it keyboard-operable and tells screen readers whether it's
// expanded — no state, no script. `open` sets how it STARTS; the
// practitioner then opens and closes weeks freely (React re-applies `open`
// only if the prop itself changes).
//
// The chevron: a <summary> laid out with flex loses the browser's own
// triangle (found in Chromium — the folded weeks gave no hint they could
// open), so it draws its own. `group` on <details> + `group-open:rotate-90`
// on the icon: Tailwind's `open:` variant matches the [open] attribute,
// and `group-` applies it to a child — the chevron turns to point down
// when the week is open. aria-hidden: the <summary> already tells assistive
// technology whether it's expanded.
function WeekDetails({
  week,
  today,
  names,
  open = false,
}: {
  week: ProgressWeek
  today: string
  names: WorkoutNames
  open?: boolean
}) {
  return (
    <details open={open} className="group rounded-lg border">
      <summary className="flex cursor-pointer items-start gap-2 p-3">
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-medium">{weekTitle(week)}</span>
          <span className="text-sm text-muted-foreground">{weekResult(week)}</span>
        </span>
      </summary>
      <div className="space-y-3 border-t p-3 text-sm">
        {week.pauses.map((pause) => (
          <p key={pause.from} className="text-muted-foreground">
            Paused{' '}
            {pause.from === pause.to
              ? formatShortDate(pause.from)
              : `${formatShortDate(pause.from)} – ${formatShortDate(pause.to)}`}
          </p>
        ))}

        {week.days.length > 0 && (
          <ul className="space-y-2">
            {week.days.map((day) => {
              const detail = dayDetail(day, today)
              return (
                <li key={day.date} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p>
                      {formatShortDate(day.date)}
                      {day.date === today && ' (today)'}
                      {names.several && ` · ${names.labelOf(day.workoutId)}`}
                    </p>
                    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                    {/* The day's skipped / unfinished sessions, oldest first:
                        "Missed" + "Skipped (illness)" says both what counted
                        and what the patient told us. The session's id is its
                        key — two attempts on one day are two sessions. */}
                    {day.attempts.map((attempt) => (
                      <p key={attempt.sessionId} className="text-xs text-muted-foreground">
                        {attemptText(attempt)}
                      </p>
                    ))}
                  </div>
                  <StateBadge {...DAY_STATE_BADGE[day.state]} />
                </li>
              )
            })}
          </ul>
        )}

        {week.counted.map((stretch) => (
          <WeeklyCount key={stretch.start} stretch={stretch} week={week} names={names} />
        ))}

        {week.extras.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Extra sessions</p>
            <ExtraList extras={week.extras} />
          </div>
        )}

        {/* On a free day or during a pause — a day the lists above don't
            show, so the attempt gets its date. */}
        {week.attempts.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Sessions not completed</p>
            <AttemptList attempts={week.attempts} />
          </div>
        )}
      </div>
    </details>
  )
}

// An "N times a week" count inside a week: how many of its target were done,
// and which workout each slot needs (A, then B…), done or not yet.
function WeeklyCount({
  stretch,
  week,
  names,
}: {
  stretch: CountedWeek
  week: ProgressWeek
  names: WorkoutNames
}) {
  // A stretch shorter than its week gets a note (progressText.stretchNote).
  const isPartial = stretch.start !== week.start || stretch.end !== week.end
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p>
          {stretch.timesPerWeek}× a week: {stretch.done} of {stretch.target} done
        </p>
        {isPartial && <p className="text-xs text-muted-foreground">{stretchNote(stretch)}</p>}
        <ul className="text-xs text-muted-foreground">
          {stretch.workouts.map((slot, index) => (
            // The slot's position is its identity: the same workout can need
            // doing twice in one week (A, B, A), so the id isn't unique.
            <li key={index}>
              {names.several ? names.labelOf(slot.workoutId) : `Session ${index + 1}`}:{' '}
              {slot.sessionId === null ? 'not yet' : 'done'}
            </li>
          ))}
        </ul>
        {/* A weekly count has no days of its own, so its attempts carry
            their date: "Tue 10 Jun — Stopped (pain)". */}
        <AttemptList attempts={stretch.attempts} className="text-xs text-muted-foreground" />
      </div>
      <StateBadge {...WEEK_STATE_BADGE[stretch.state]} />
    </div>
  )
}

// Dated attempts, one per line — nothing at all when there are none (no
// empty <ul> for a screen reader to announce as "list, 0 items").
function AttemptList({
  attempts,
  className = 'space-y-1',
}: {
  attempts: readonly DatedAttempt[]
  className?: string
}) {
  if (attempts.length === 0) return null
  return (
    <ul className={className}>
      {attempts.map((attempt) => (
        <li key={attempt.sessionId}>
          {formatShortDate(attempt.date)} — {attemptText(attempt)}
        </li>
      ))}
    </ul>
  )
}

function ExtraList({ extras }: { extras: readonly ExtraSession[] }) {
  // Outside the program's dates there may be attempts and no extra session.
  if (extras.length === 0) return null
  return (
    <ul className="space-y-1">
      {extras.map((extra) => (
        <li key={extra.sessionId}>
          {formatShortDate(extra.date)} — {EXTRA_REASON_TEXT[extra.reason]}
        </li>
      ))}
    </ul>
  )
}