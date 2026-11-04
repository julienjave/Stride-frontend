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

import { wasAsked, type ScoredSession } from './scoreRules'

// The HOME's small pain trend (decisions §2: "a small trend of pain-after,
// with the latest value and a trend arrow"; the comparison chosen by the
// person, 2026-10-18). Pure, like the chart's rules.

// How many sessions the sparkline shows: enough for a shape, few enough
// for a line 96 px wide.
export const SPARK_SESSIONS = 8

// The sparkline's sessions: the last 8 that were ASKED pain after (a
// check-out happened), answered or not — so a blank one still breaks the
// little line, as on the full chart. In: oldest first.
export function sparkSessions<T extends ScoredSession>(sessions: readonly T[]): T[] {
  return sessions.filter((s) => wasAsked(s, 'painAfter')).slice(-SPARK_SESSIONS)
}

// The middle value — of an odd count the middle one, of an even count the
// mean of the two middle ones. A MEDIAN, not a mean: one unusually bad (or
// good) day moves a mean of three a lot and a median not at all, so the
// arrow follows the run of sessions, not the last one.
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export type TrendDirection = 'lower' | 'higher' | 'steady'

// THE ARROW: the median of the last 3 pain-after answers against the
// median of the (up to) 3 answers before them. Needs 4 answers at least
// (3 recent + 1 earlier) — fewer, and there's no "before" to compare with:
// null, no arrow. A difference under one point is "steady": on a 0–10
// scale of whole numbers, a half-point median shift is noise.
//
// Answers only — an unanswered check-out is no value and is left out (an
// arrow needs numbers; leaving one out invents none).
export function painAfterTrend(sessions: readonly ScoredSession[]): TrendDirection | null {
  const answers = sessions.flatMap((s) => (s.painAfter === null ? [] : [s.painAfter]))
  if (answers.length < 4) return null
  const recent = median(answers.slice(-3))
  const earlier = median(answers.slice(-6, -3))
  const change = recent - earlier
  if (change <= -1) return 'lower'
  if (change >= 1) return 'higher'
  return 'steady'
}