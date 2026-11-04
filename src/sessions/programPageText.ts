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
import type { SessionLinkKind } from '@/assigned-programs/ProgramWeeks'
import { missedSession } from './todayText'

// The patient's program page's own words (2026-10-18). Everything else on
// the page is worded where the practitioner's page words it (progressText —
// the same days, the same badges). Pure (programPageText.test.ts); `locale`
// only for tests.

// The name of a "View session" link: the visible words first (voice control
// — "click View session"), then which session. Two links on one day (the
// session that counted and one stopped before it) must not share a name.
export function sessionLinkLabel(date: string, kind: SessionLinkKind, locale?: string): string {
  const day = formatShortDate(date, locale)
  switch (kind) {
    case 'counted':
      return `View session of ${day}`
    case 'stopped':
      return `View session of ${day} (stopped)`
    case 'extra':
      return `View session of ${day} (extra)`
  }
}

// "Equipment: band, chair" — or null with none (no empty label).
export function equipmentText(equipment: readonly string[]): string | null {
  return equipment.length === 0 ? null : `Equipment: ${equipment.join(', ')}`
}

// The name of a missed day's "Make it up today": the visible words, then the
// session by its date and workout — the hub's own words for it
// (missedSession): "Make it up today: B · Strength from Wed, Oct 14".
export function makeUpTodayLabel(date: string, label: string | null, locale?: string): string {
  return `Make it up today: ${missedSession(date, label, locale)}`
}