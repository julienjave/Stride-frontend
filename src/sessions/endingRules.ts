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

import { noteToSend } from './sessionRules'
import type {
  CompleteSessionInput,
  PatientEndReason,
  SkipSessionInput,
  StopSessionInput,
} from './types'

// What each ending SENDS, from what the patient left on the page (pass (c)).
// Pure (endingRules.test.ts). One rule for all three: only ANSWERS are sent —
// a score not chosen (null), a text left empty — so the stored record says
// "not answered", never "0" or "" (decisions §6: all optional). Texts are
// trimmed; blank is nothing (the backend refuses a blank note or feedback).

// The answers a page holds: scores (null = not chosen) and texts (drafts).
export interface CheckOut {
  painAfter: number | null
  mobilityAfter: number | null
}

export function completeBody(checkOut: CheckOut, feedback: string): CompleteSessionInput {
  const sessionFeedback = noteToSend(feedback)
  return {
    ...scores(checkOut),
    ...(sessionFeedback === null ? {} : { sessionFeedback }),
  }
}

export function stopBody(
  reason: PatientEndReason,
  noteDraft: string,
  checkOut: CheckOut,
): StopSessionInput {
  const note = noteToSend(noteDraft)
  return { reason, ...(note === null ? {} : { note }), ...scores(checkOut) }
}

// A pain level only with the reason "pain" — even if one was chosen before
// the patient changed their reason (the backend refuses it otherwise, and it
// would mean nothing: "skipped, no time — 7/10").
export function skipBody(
  assignedProgramId: number,
  localDate: string,
  reason: PatientEndReason,
  noteDraft: string,
  painBefore: number | null,
): SkipSessionInput {
  const note = noteToSend(noteDraft)
  return {
    assignedProgramId,
    localDate,
    reason,
    ...(note === null ? {} : { note }),
    ...(reason === 'pain' && painBefore !== null ? { painBefore } : {}),
  }
}

function scores({ painAfter, mobilityAfter }: CheckOut) {
  return {
    ...(painAfter === null ? {} : { painAfter }),
    ...(mobilityAfter === null ? {} : { mobilityAfter }),
  }
}