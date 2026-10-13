import { ChevronRight } from 'lucide-react'
import { formatShortDate } from '@/common/calendarDate'
import { ProgramPageSection } from './ProgramPageSection'
import { StateBadge } from './StateBadge'
import { arrangeWeeks, groupProgressByWeek, type FocusRole, type ProgressWeek } from './programProgress'
import { currentAndPlanned, describeVersion, type WorkoutNames } from './programSchedule'
import {
  DAY_STATE_BADGE,
  EXTRA_REASON_TEXT,
  WEEK_STATE_BADGE,
  dayDetail,
  stretchNote,
  totalsText,
  upNextText,
  weekResult,
  weekTitle,
} from './progressText'
import type { AssignedProgramDetail, CountedWeek, ExtraSession, ScheduleSummary } from './types'

interface ProgramScheduleProgressProps {
  program: AssignedProgramDetail
  today: string
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
  names,
  summary,
  summaryLoading,
  summaryFailed,
}: ProgramScheduleProgressProps) {
  const { current, planned } = currentAndPlanned(program.schedules, today)
  const isOpen = program.status === 'active' && !program.isArchived
  const isPaused = current?.type === 'paused'
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
  const { weeks, outside } = groupProgressByWeek(summary, startDate)
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
      {outside.length > 0 && (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Sessions outside the program's dates</h3>
          <ExtraList extras={outside} />
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
      </div>
      <StateBadge {...WEEK_STATE_BADGE[stretch.state]} />
    </div>
  )
}

function ExtraList({ extras }: { extras: readonly ExtraSession[] }) {
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