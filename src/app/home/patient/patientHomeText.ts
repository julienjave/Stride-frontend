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

import { formatShortDate } from '@/common/calendarDate'
import type { UpcomingItem } from './patientHomeRules'

// The patient home's words — written for the PATIENT (the practitioner
// page's progressText words the same facts for a practitioner). Pure, so
// every wording is a plain test. `locale` only for tests (the app passes
// nothing: the browser's language). Today's words (todayText, the late
// make-up note) moved to src/sessions/todayText.ts on 2026-10-17, when the
// Sessions hub became their second reader; Upcoming and the day's heading
// are the home's alone.

// --- UPCOMING --------------------------------------------------------------------

// One upcoming line, in parts — WHEN (a column of its own, so the eye runs
// down the dates), WHAT, and the day's WORKOUT apart (null when there's
// none to name), so the screen can keep "A · Mobility" on one line:
//   - a day:          "Fri 16 Oct"      / "Knee Rehab" / "A · Mobility"
//   - a week's rest:  "By Wed 21 Oct"   / "Lower Back Mobility: 2 more this week"
//   - a weekly start: "From Mon 19 Oct" / "Lower Back Mobility: 3× a week"
// The screen joins WHAT and WORKOUT with a colon, not a "·": the workout's
// own label already has one ("A · Mobility"), and a row of dots ran them
// together (found in the live check).
export interface UpcomingText {
  when: string
  what: string
  workout: string | null
}

export function upcomingText(
  item: UpcomingItem,
  title: string,
  label: string | null,
  locale?: string,
): UpcomingText {
  switch (item.kind) {
    case 'day':
      return { when: formatShortDate(item.date, locale), what: title, workout: label }
    case 'week_rest':
      return {
        when: `By ${formatShortDate(item.end, locale)}`,
        what: `${title}: ${item.remaining} more this week`,
        workout: null,
      }
    case 'week_start':
      return {
        when: `From ${formatShortDate(item.start, locale)}`,
        what: `${title}: ${item.timesPerWeek}× a week`,
        workout: null,
      }
  }
}

// --- THE DAY'S HEADING ---------------------------------------------------------

// "Thursday, October 15" — today's date in full under the Today heading.
export function longDate(date: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}