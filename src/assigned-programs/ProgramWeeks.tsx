/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatShortDate } from '@/common/calendarDate'
import { StateBadge } from './StateBadge'
import {
  arrangeWeeks,
  daySessionId,
  groupProgressByWeek,
  type FocusRole,
  type ProgressWeek,
} from './programProgress'
import type { WorkoutNames } from './programSchedule'
import {
  DAY_STATE_BADGE,
  EXTRA_REASON_TEXT,
  WEEK_STATE_BADGE,
  attemptText,
  dayDetail,
  stretchNote,
  totalsText,
  weekResult,
  weekTitle,
} from './progressText'
import type { CountedWeek, DatedAttempt, ExtraSession, ScheduleSummary, ScheduledDay } from './types'

// A program's weeks, week by week — every day with its badge and sentence,
// every weekly count with its slots, the extras and the sessions not
// completed. Moved out of the practitioner's "Schedule & progress"
// (ProgramScheduleProgress) on 2026-10-18, when the patient's program page
// became its second reader: both sides read the same days in the same
// words, from the same summary.
//
// Two optional SLOTS let a screen add what only it offers, without a second
// copy of the list:
//   - `sessionLink(sessionId, date, kind)` — drawn wherever a session exists:
//     the one that COUNTED (fulfilled a day, filled a weekly slot), an EXTRA,
//     a STOPPED one (the patient's "View session"; skips have nothing to show
//     — no link). `kind` lets two links of one day get different names;
//   - `dayAction(day)` — something to DO about a day (the patient's "Make it
//     up today" on a missed day).
// The practitioner's page passes neither, and renders exactly as before.
export type SessionLinkKind = 'counted' | 'extra' | 'stopped'

export interface WeekSlots {
  sessionLink?: (sessionId: number, date: string, kind: SessionLinkKind) => ReactNode
  dayAction?: (day: ScheduledDay) => ReactNode
}

// The program's totals: "4 of 12 sessions done" and what's behind it ("1
// made up · 1 missed …") — totalsText's words. Moved with the weeks: both
// pages show them above the weeks.
export function ProgramTotals({ summary }: { summary: ScheduleSummary }) {
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
//
// `openWeekOf` (2026-10-18): a day whose week starts OPEN too — the patient's
// program page, back from a session, reopens the week the patient was in
// (sessionReturn.ts). Absent: only the focus week is open, as before.
export function ProgramWeeks({
  summary,
  startDate,
  today,
  names,
  sessionLink,
  dayAction,
  openWeekOf,
}: {
  summary: ScheduleSummary
  startDate: string
  today: string
  names: WorkoutNames
  openWeekOf?: string
} & WeekSlots) {
  // Calendar days as 'YYYY-MM-DD' compare as strings (calendarDate.ts).
  const holds = (week: ProgressWeek) =>
    openWeekOf !== undefined && week.start <= openWeekOf && openWeekOf <= week.end
  const slots: WeekSlots = { sessionLink, dayAction }
  const { weeks, outside, outsideAttempts } = groupProgressByWeek(summary, startDate)
  const arranged = arrangeWeeks(weeks, today)
  if (!arranged) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{FOCUS_HEADING[arranged.focusRole]}</h3>
        <WeekDetails week={arranged.focus} today={today} names={names} slots={slots} open />
      </div>
      {arranged.earlier.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Earlier weeks</h3>
          {arranged.earlier.map((week) => (
            <WeekDetails
              key={week.programWeek}
              week={week}
              today={today}
              names={names}
              slots={slots}
              open={holds(week)}
            />
          ))}
        </div>
      )}
      {arranged.later.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Later weeks</h3>
          {arranged.later.map((week) => (
            <WeekDetails
              key={week.programWeek}
              week={week}
              today={today}
              names={names}
              slots={slots}
              open={holds(week)}
            />
          ))}
        </div>
      )}
      {(outside.length > 0 || outsideAttempts.length > 0) && (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold">Sessions outside the program's dates</h3>
          <ExtraList extras={outside} sessionLink={sessionLink} />
          <AttemptList attempts={outsideAttempts} sessionLink={sessionLink} />
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
  slots,
  open = false,
}: {
  week: ProgressWeek
  today: string
  names: WorkoutNames
  slots: WeekSlots
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
              // The session that fulfilled the day — on the day, or the one
              // that made it up, did it early, or swapped (daySessionId).
              const sessionId = daySessionId(day)
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
                        {/* A stopped session holds its ticks; a skip holds
                            nothing to show. */}
                        {attempt.status === 'incomplete' &&
                          slots.sessionLink?.(attempt.sessionId, day.date, 'stopped')}
                      </p>
                    ))}
                    {sessionId !== null && slots.sessionLink?.(sessionId, day.date, 'counted')}
                    {slots.dayAction?.(day)}
                  </div>
                  <StateBadge {...DAY_STATE_BADGE[day.state]} />
                </li>
              )
            })}
          </ul>
        )}

        {week.counted.map((stretch) => (
          <WeeklyCount
            key={stretch.start}
            stretch={stretch}
            week={week}
            names={names}
            sessionLink={slots.sessionLink}
          />
        ))}

        {week.extras.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Extra sessions</p>
            <ExtraList extras={week.extras} sessionLink={slots.sessionLink} />
          </div>
        )}

        {/* On a free day or during a pause — a day the lists above don't
            show, so the attempt gets its date. */}
        {week.attempts.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium">Sessions not completed</p>
            <AttemptList attempts={week.attempts} sessionLink={slots.sessionLink} />
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
  sessionLink,
}: {
  stretch: CountedWeek
  week: ProgressWeek
  names: WorkoutNames
  sessionLink: WeekSlots['sessionLink']
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
              {/* A filled slot always has its day (the summary dates it). */}
              {slot.sessionId !== null &&
                slot.date !== null &&
                sessionLink?.(slot.sessionId, slot.date, 'counted')}
            </li>
          ))}
        </ul>
        {/* A weekly count has no days of its own, so its attempts carry
            their date: "Tue 10 Jun — Stopped (pain)". */}
        <AttemptList
          attempts={stretch.attempts}
          sessionLink={sessionLink}
          className="text-xs text-muted-foreground"
        />
      </div>
      <StateBadge {...WEEK_STATE_BADGE[stretch.state]} />
    </div>
  )
}

// Dated attempts, one per line — nothing at all when there are none (no
// empty <ul> for a screen reader to announce as "list, 0 items").
function AttemptList({
  attempts,
  sessionLink,
  className = 'space-y-1',
}: {
  attempts: readonly DatedAttempt[]
  sessionLink: WeekSlots['sessionLink']
  className?: string
}) {
  if (attempts.length === 0) return null
  return (
    <ul className={className}>
      {attempts.map((attempt) => (
        <li key={attempt.sessionId}>
          {formatShortDate(attempt.date)} — {attemptText(attempt)}
          {attempt.status === 'incomplete' &&
            sessionLink?.(attempt.sessionId, attempt.date, 'stopped')}
        </li>
      ))}
    </ul>
  )
}

function ExtraList({
  extras,
  sessionLink,
}: {
  extras: readonly ExtraSession[]
  sessionLink: WeekSlots['sessionLink']
}) {
  // Outside the program's dates there may be attempts and no extra session.
  if (extras.length === 0) return null
  return (
    <ul className="space-y-1">
      {extras.map((extra) => (
        <li key={extra.sessionId}>
          {formatShortDate(extra.date)} — {EXTRA_REASON_TEXT[extra.reason]}
          {sessionLink?.(extra.sessionId, extra.date, 'extra')}
        </li>
      ))}
    </ul>
  )
}