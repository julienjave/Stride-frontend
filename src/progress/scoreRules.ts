import { addDays, daysBetween } from '@/common/calendarDate'
import { isPatientReason } from '@/assigned-programs/progressText'
import type { ProgramSession } from './api'

// The progress charts' RULES (2026-10-18; decisions §6): which sessions a
// chart shows, where each sits on the time axis, which points a line joins.
// Pure — sessions and dates in, numbers out — so every rule is tested
// without drawing anything; ScoreChart only turns these numbers into SVG.

// The three scores a session can carry, all optional, all 0–10: pain before
// (the check-in), pain after and mobility after (the check-out).
export type ScoreKey = 'painBefore' | 'painAfter' | 'mobilityAfter'

// The fields these rules read — the list's row has more, and tests build
// sessions with only these.
export type ScoredSession = Pick<
  ProgramSession,
  'id' | 'localDate' | 'status' | 'endReason' | 'workoutId' | ScoreKey
>

// WAS THE QUESTION ASKED? The line rule below needs to tell "asked, not
// answered" (a GAP: decisions §6, "missing values leave gaps") from "never
// asked" (no gap — there was nothing to answer):
//   - pain before: asked at every START — a session in progress, completed,
//     stopped, or left open until the app closed it — and on a skip only when
//     PAIN is its reason (the skip page asks then, and only then);
//   - pain after, mobility after: asked at the CHECK-OUT — Finish (completed)
//     or Stop (incomplete with one of the patient's reasons). A session the
//     APP closed (left open, or its program closed) never reached a
//     check-out; a skip has none; one in progress hasn't reached it yet.
export function wasAsked(session: Pick<ScoredSession, 'status' | 'endReason'>, key: ScoreKey) {
  if (key === 'painBefore') {
    return session.status === 'skipped' ? session.endReason === 'pain' : true
  }
  if (session.status === 'completed') return true
  return (
    session.status === 'incomplete' &&
    session.endReason !== null &&
    isPatientReason(session.endReason)
  )
}

// Oldest first — the charts read left to right in time. By the session's
// day, then its id within a day (ids grow with creation: the backend's own
// tie-break, reversed). A copy: the cached list is never sorted in place.
export function oldestFirst<T extends Pick<ScoredSession, 'localDate' | 'id'>>(
  sessions: readonly T[],
): T[] {
  return [...sessions].sort((a, b) =>
    a.localDate === b.localDate ? a.id - b.id : a.localDate < b.localDate ? -1 : 1,
  )
}

// THE TIME AXIS. Twelve weeks at most by default (the person's choice,
// 2026-10-18): a long open-ended program would otherwise squeeze months
// of points into a phone's width. "Show all" widens it to the whole program.
export const RECENT_DAYS = 84

export interface ChartRange {
  from: string
  to: string
}

// From the program's start to its last day so far — today, or its end date
// once that has passed — and never short of its latest session: closing a
// program ends it YESTERDAY (closingEndDate) and closes a session opened
// today, so that session can sit one day past the end date. Null when the
// program hasn't started (nothing to draw). `canCut`: the whole span is
// longer than 12 weeks, so the "last 12 weeks / whole program" choice
// means something.
export function chartRange(
  program: { startDate: string; endDate: string | null },
  today: string,
  sessions: readonly Pick<ScoredSession, 'localDate'>[],
  showAll: boolean,
): { range: ChartRange; canCut: boolean } | null {
  // (`<` or `<=` alike: an end date of today IS today.)
  const lastDay = program.endDate !== null && program.endDate < today ? program.endDate : today
  const latest = sessions.reduce<string | null>(
    (max, s) => (max === null || s.localDate > max ? s.localDate : max),
    null,
  )
  const to = latest !== null && latest > lastDay ? latest : lastDay
  if (program.startDate > to) return null
  const canCut = daysBetween(program.startDate, to) + 1 > RECENT_DAYS
  const from = canCut && !showAll ? addDays(to, -(RECENT_DAYS - 1)) : program.startDate
  return { range: { from, to }, canCut }
}

export function inRange<T extends Pick<ScoredSession, 'localDate'>>(
  sessions: readonly T[],
  range: ChartRange,
): T[] {
  return sessions.filter((s) => s.localDate >= range.from && s.localDate <= range.to)
}

// The number of day BANDS on the axis: every day from `from` to `to`, both
// included.
export function dayCount(range: ChartRange): number {
  return daysBetween(range.from, range.to) + 1
}

// WHERE EACH SESSION SITS, in days from the range's first day. A DATED axis
// (one band per calendar day), not one slot per session: a week without
// sessions then shows as empty space — the time really passed. Each session
// sits inside its day's band, at the middle when it's alone; two on one day
// (stopped, then started again) share the band at its thirds, side by side
// instead of on top of each other. In: sessions oldest first.
export function dayPositions(
  sessions: readonly Pick<ScoredSession, 'id' | 'localDate'>[],
  from: string,
): Map<number, number> {
  const perDay = new Map<string, number[]>()
  for (const session of sessions) {
    const ids = perDay.get(session.localDate) ?? []
    ids.push(session.id)
    perDay.set(session.localDate, ids)
  }
  const positions = new Map<number, number>()
  for (const [date, ids] of perDay) {
    const band = daysBetween(from, date)
    ids.forEach((id, k) => positions.set(id, band + (k + 1) / (ids.length + 1)))
  }
  return positions
}

export interface ScorePoint<T extends ScoredSession = ScoredSession> {
  session: T
  x: number
  value: number
}

// THE LINES. A line joins a series' answers in time order, and BREAKS at a
// session that was asked and didn't answer — the gap shows "no answer
// here" instead of drawing a slope nobody reported (nothing is
// interpolated, decisions §6). A session that was never asked (a skip for
// illness, a check-out that hasn't happened) is no reason to break: it
// is skipped over. A run of one is a lone dot. In: sessions oldest first,
// with their positions (dayPositions).
export function lineRuns<T extends ScoredSession>(
  sessions: readonly T[],
  key: ScoreKey,
  positions: ReadonlyMap<number, number>,
): ScorePoint<T>[][] {
  const runs: ScorePoint<T>[][] = []
  let run: ScorePoint<T>[] = []
  for (const session of sessions) {
    if (!wasAsked(session, key)) continue
    const value = session[key]
    if (value === null) {
      if (run.length > 0) runs.push(run)
      run = []
      continue
    }
    run.push({ session, x: positions.get(session.id) ?? 0, value })
  }
  if (run.length > 0) runs.push(run)
  return runs
}

// A chart's SESSIONS: the ones asked at least one of its questions (the
// pain chart: either pain; the mobility chart: mobility). They are what the
// crosshair steps through — an unanswered one included, so the readout can
// say "not answered" rather than pretending the session didn't happen.
export function askedSessions<T extends ScoredSession>(
  sessions: readonly T[],
  keys: readonly ScoreKey[],
): T[] {
  return sessions.filter((session) => keys.some((key) => wasAsked(session, key)))
}

// Whether any of these sessions answered any of the keys — a chart with no
// answer at all shows its empty sentence instead of an empty frame.
export function hasAnswer(sessions: readonly ScoredSession[], keys: readonly ScoreKey[]): boolean {
  return sessions.some((session) => keys.some((key) => session[key] !== null))
}

// The most recent session that answered `key`, or null. In: oldest first.
export function latestAnswered<T extends ScoredSession>(
  sessions: readonly T[],
  key: ScoreKey,
): T | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i][key] !== null) return sessions[i]
  }
  return null
}

// The x axis's dates: at most `max`, spread evenly from the first day to the
// last, both always included — a phone has room for about four labels.
// Fewer days than that: every day. Rounded to whole days (a label names a
// day); the rounding can't make two the same, since the spacing is over one
// day whenever there are more days than labels.
export function dateTicks(range: ChartRange, max: number): string[] {
  const days = dayCount(range)
  // (At days === max both branches give every day; below it, the spread
  // would round two labels onto one day — hence this branch.)
  if (days <= max) return Array.from({ length: days }, (_, i) => addDays(range.from, i))
  return Array.from({ length: max }, (_, i) =>
    addDays(range.from, Math.round((i * (days - 1)) / (max - 1))),
  )
}

// The crosshair's target: the index of the x nearest to `x` (the pointer's
// position, in the same day units). A tie goes to the earlier point. -1 for
// no points. In: xs in increasing order (dayPositions over sessions oldest
// first).
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1
  for (let i = 0; i < xs.length; i++) {
    if (best === -1 || Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i
  }
  return best
}