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