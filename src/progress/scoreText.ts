import { formatShortDate } from '@/common/calendarDate'
import { sessionStatusText } from '@/sessions/sessionText'
import type { TrendDirection } from './painTrendRules'
import { latestAnswered, type ScoreKey, type ScoredSession } from './scoreRules'

// The progress charts' WORDS (2026-10-18), apart from the drawing so each
// sentence is tested on its own (scoreText.test.ts). `locale` only so tests
// can pin the dates; the app passes nothing (the browser's language).

// Who is reading: the patient about their own sessions ("you"), or the care
// team about the patient's. Only the empty sentences differ.
export type ScoreViewer = 'patient' | 'practitioner'

// A series' name in the legend, the end labels and the readout.
export const SCORE_LABEL: Record<ScoreKey, string> = {
  painBefore: 'Before',
  painAfter: 'After',
  mobilityAfter: 'Mobility',
}

// The scale, said once under each chart's heading — the axis numbers alone
// don't say which end is good, and the two scales run opposite ways
// (decisions §6: why mobility has a chart of its own).
export const SCALE_TEXT = {
  pain: '0 = no pain, 10 = worst pain',
  mobility: '0 = could hardly move, 10 = moved freely',
} as const

function sessionsWord(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}

// THE SUMMARY under each chart's heading — also the chart's accessible name
// (a screen reader hears the gist of the picture, and the table has the
// rest). The count, then the latest answers:
//   "8 sessions with a pain score. Latest (Thu 11 Jun): 4 before, 2 after."
// When the latest "before" and "after" come from different sessions (the
// last check-out wasn't answered), each gets its own date — a reader must
// never take two numbers for one session's when they aren't.
export function painSummaryText(sessions: readonly ScoredSession[], locale?: string): string {
  const scored = sessions.filter((s) => s.painBefore !== null || s.painAfter !== null)
  const count = `${sessionsWord(scored.length)} with a pain score.`
  const before = latestAnswered(sessions, 'painBefore')
  const after = latestAnswered(sessions, 'painAfter')
  if (before && after && before.id === after.id) {
    return `${count} Latest (${formatShortDate(after.localDate, locale)}): ${after.painBefore} before, ${after.painAfter} after.`
  }
  const parts = [
    before && `latest before: ${before.painBefore} (${formatShortDate(before.localDate, locale)})`,
    after && `latest after: ${after.painAfter} (${formatShortDate(after.localDate, locale)})`,
  ].filter((part) => part !== null)
  if (parts.length === 0) return count
  const latest = parts.join(', ')
  return `${count} ${latest.charAt(0).toUpperCase()}${latest.slice(1)}.`
}

//   "7 sessions with a mobility score. Latest (Thu 11 Jun): 7."
export function mobilitySummaryText(sessions: readonly ScoredSession[], locale?: string): string {
  const scored = sessions.filter((s) => s.mobilityAfter !== null)
  const latest = latestAnswered(sessions, 'mobilityAfter')
  const count = `${sessionsWord(scored.length)} with a mobility score.`
  return latest
    ? `${count} Latest (${formatShortDate(latest.localDate, locale)}): ${latest.mobilityAfter}.`
    : count
}

// A program with no session at all yet (or one that hasn't started).
export function noSessionsText(viewer: ScoreViewer): string {
  return viewer === 'patient'
    ? 'Your pain and mobility scores will show here after your first session.'
    : 'No sessions yet.'
}

// A chart with nothing to draw. Never a nudge to answer (decisions §6: the
// scores are optional and the app never nags) — the patient's sentence
// says where the questions are asked, and that they're optional. `cut`:
// the program HAS answers, just not in the last 12 weeks shown.
export function noScoresText(
  chart: 'pain' | 'mobility',
  viewer: ScoreViewer,
  cut: boolean,
): string {
  const what = chart === 'pain' ? 'pain scores' : 'mobility scores'
  if (cut) return `No ${what} in the last 12 weeks. Show the whole program to see earlier ones.`
  if (viewer === 'practitioner') return `No ${what} yet: the patient hasn't recorded any in this program.`
  return chart === 'pain'
    ? 'No pain scores yet. Each session asks how much it hurts before and after — answering is always optional.'
    : 'No mobility scores yet. Each session asks how freely you moved, at the end — answering is always optional.'
}

// The readout's first line, naming the session:
//   "Thu 11 Jun · A · Mobility" — and how it ended when it wasn't completed
//   ("· Stopped (pain)", "· Skipped (pain)", "· In progress"), the same
// words as the session page and the weeks (sessionStatusText).
export function sessionLineText(
  session: Pick<ScoredSession, 'localDate' | 'status' | 'endReason'>,
  workout: string | null,
  locale?: string,
): string {
  const parts = [formatShortDate(session.localDate, locale)]
  if (workout) parts.push(workout)
  if (session.status !== 'completed') parts.push(sessionStatusText(session))
  return parts.join(' · ')
}

// One score in the readout and the table: the number, or why there's none.
// "Not answered": asked, left blank. "—": never asked (a skip has no
// check-out) — the table's convention for "nothing belongs here".
export function scoreValueText(value: number | null, asked: boolean): string {
  if (value !== null) return String(value)
  return asked ? 'Not answered' : '—'
}
// --- THE HOME'S SMALL TREND (painTrendRules.ts) ---------------------------------------

// "Pain after sessions: 2 (Fri 16 Oct)" — the latest answer and its day.
export function latestPainAfterText(
  session: Pick<ScoredSession, 'localDate' | 'painAfter'>,
  locale?: string,
): string {
  return `Pain after sessions: ${session.painAfter} (${formatShortDate(session.localDate, locale)})`
}

// The arrow and its words. The WORDS carry the meaning — an arrow alone is
// ambiguous for pain (down is good) and invisible to a screen reader (the
// arrow is hidden from it). "Your last 3 sessions": what the rule compares
// (painAfterTrend — against the ones before).
export const TREND_TEXT: Record<TrendDirection, { arrow: string; words: string }> = {
  lower: { arrow: '↓', words: 'lower over your last 3 sessions' },
  higher: { arrow: '↑', words: 'higher over your last 3 sessions' },
  steady: { arrow: '→', words: 'steady over your last 3 sessions' },
}