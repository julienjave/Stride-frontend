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
import type { SessionReview } from './types'

// The review page's words (2026-10-19), pure like alertText.ts.

// One review, as the care team reads it: "You — 19 October 2026" for my
// own, "Sam Okafor — 19 October 2026" for a colleague's. The DAY only (a
// review is "seen on that day"; the minute adds nothing), in the reader's
// own time zone — formatMomentDate takes the moment's local day.
export function reviewLine(review: SessionReview, myId: number, locale?: string): string {
  const who =
    review.practitioner.id === myId
      ? 'You'
      : `${review.practitioner.firstName} ${review.practitioner.lastName}`
  return `${who} — ${formatMomentDate(review.reviewedAt, locale)}`
}

// The note given when the session ended without being completed, labelled
// by how it ended (only a stop or a skip has an end note).
export function endNoteLabel(status: 'incomplete' | 'skipped'): string {
  return status === 'skipped' ? 'Their note when skipping' : 'Their note when stopping'
}

// An optional 0–10 answer: the number, or that it was asked and left blank
// (a question never asked isn't shown at all — wasAsked decides).
export function scoreText(value: number | null): string {
  return value === null ? 'Not answered' : `${value} out of 10`
}