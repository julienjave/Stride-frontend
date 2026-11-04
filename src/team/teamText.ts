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

import { formatMomentDate } from '@/common/formatMomentDate'
import type { MyCareTeamEntry } from './types'

// The words of the patient's Team pages, from the data they describe. Dates
// here are MOMENTS (startedAt / endsAt are timestamps — the instant a link
// began or ends), so formatMomentDate: shown in the patient's own time zone.
// `locale` only so tests can pin the format.

// When this practitioner has been — or was — on the patient's team. The
// cases follow the backend's meaning of the two fields (decisions §3):
//   active, no end date   → "On your team since October 8, 2026"
//   active, an end date   → "…, until October 25, 2026" — an end planned in
//                           advance (e.g. cover). Worded as the date only:
//                           the data says WHEN it ends, not why.
//   ended, with its date  → "On your team from … to …"
//   ended, no date        → "… (ended)": a link still open on paper but no
//                           longer giving access — they don't share a
//                           clinic any more (`isActive` false).
export function memberPeriodText(entry: MyCareTeamEntry, locale?: string): string {
  const since = formatMomentDate(entry.startedAt, locale)
  if (entry.isActive) {
    return entry.endsAt
      ? `On your team since ${since}, until ${formatMomentDate(entry.endsAt, locale)}`
      : `On your team since ${since}`
  }
  return entry.endsAt
    ? `On your team from ${since} to ${formatMomentDate(entry.endsAt, locale)}`
    : `On your team from ${since} (ended)`
}

// "Added by Sam Okafor" — the accountability decisions §3 promises the
// patient: joining is immediate and needs no approval, so the patient sees
// who gave someone access. Only when someone ELSE did it: a practitioner who
// joined themselves is already named on the card, and a link with no
// creator is one of the day-one links made when care teams were introduced
// (created_by NULL) — nobody to name.
export function addedByText(entry: MyCareTeamEntry): string | null {
  const { createdBy, practitioner } = entry
  if (createdBy === null || createdBy.id === practitioner.id) return null
  return `Added by ${createdBy.firstName} ${createdBy.lastName}`
}

// Its mirror for a past member: "Ended by Avery Admin" when someone other
// than the practitioner ended it (an admin, or the clinic membership being
// removed). Nothing for an active link, nor when they left themselves.
export function endedByText(entry: MyCareTeamEntry): string | null {
  const { endedBy, practitioner } = entry
  if (entry.isActive || endedBy === null || endedBy.id === practitioner.id) return null
  return `Ended by ${endedBy.firstName} ${endedBy.lastName}`
}

// "Knee rehabilitation · Post-surgery" — one line on the list's card; null
// when there are none, so the card draws no empty line.
export function specialtiesText(specialties: readonly string[]): string | null {
  return specialties.length === 0 ? null : specialties.join(' · ')
}