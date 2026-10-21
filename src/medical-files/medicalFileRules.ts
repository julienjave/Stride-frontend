import { SECTIONS, type EntryType, type MedicalFileEntry, type NewMedicalFileEntry } from './types'

// The medical file's rules on the screen side — pure functions, tested on
// their own (medicalFileRules.test.ts), the shape of every *Rules.ts here.

// --- LIMITS MIRRORED FROM THE BACKEND ----------------------------------------

// medical-files.schema.ts: MEDICAL_FILE_SECTION_MAX_LENGTH and
// AMENDMENT_REASON_MAX_LENGTH. Mirrored as the fields' `maxLength`: the
// browser then stops typing (and cuts a paste) at the limit, so no draft can
// exceed it and no message is needed — the backend checks again anyway. (An
// amendment starts from a stored version, which is within the limit too.)
export const SECTION_MAX_LENGTH = 10_000
export const REASON_MAX_LENGTH = 500

// --- NOTES: AN ENTRY AND ITS EARLIER VERSIONS ---------------------------------

// A "note" as the list shows it (decisions §8, the person's choice): the
// LATEST version on top, the versions it replaced folded under it.
//   - latest: an entry nobody has amended (amendedById === null);
//   - earlier: the versions before it, newest first — following amendsId
//     down the chain (an entry is amended at most once, so it IS a chain).
export interface Note {
  latest: MedicalFileEntry
  earlier: MedicalFileEntry[]
}

// The file (newest first, as the backend sends it) → its notes, in the same
// order: a corrected note sits where its latest version was written. One
// pass to index the entries by id, then each chain is walked through the
// index. The walk stops at an id it doesn't have (can't happen with the
// whole file, but a broken chain mustn't loop or throw) and after as many
// steps as there are entries (no chain is longer — a guard against a cycle
// the database already makes impossible).
export function groupIntoNotes(entries: MedicalFileEntry[]): Note[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  return entries
    .filter((entry) => entry.amendedById === null)
    .map((latest) => {
      const earlier: MedicalFileEntry[] = []
      let current = latest
      while (current.amendsId !== null && earlier.length < entries.length) {
        const previous = byId.get(current.amendsId)
        if (!previous) break
        earlier.push(previous)
        current = previous
      }
      return { latest, earlier }
    })
}

// --- THE FORM'S DRAFT --------------------------------------------------------

// What the entry page edits: plain strings, as typed. `entryType` is '' until
// one is chosen (a new entry has no type; an amendment starts with the
// original's).
export interface EntryDraft {
  entryType: EntryType | ''
  subjective: string
  objective: string
  assessment: string
  plan: string
  reason: string
}

export function emptyDraft(): EntryDraft {
  return { entryType: '', subjective: '', objective: '', assessment: '', plan: '', reason: '' }
}

// An amendment starts as a copy of the version it corrects — the
// practitioner changes what was wrong and keeps the rest (an amendment is a
// COMPLETE new version, not a patch). Absent sections become ''. The reason
// starts empty: it's about this correction, not the original.
export function draftFrom(entry: MedicalFileEntry): EntryDraft {
  return {
    entryType: entry.entryType,
    subjective: entry.subjective ?? '',
    objective: entry.objective ?? '',
    assessment: entry.assessment ?? '',
    plan: entry.plan ?? '',
    reason: '',
  }
}

// "Holds something visible" — the backend's `\S` test, so a section of
// spaces or line breaks counts as not written, on both sides.
function isWritten(text: string): boolean {
  return /\S/.test(text)
}

// What a section will be stored as: trimmed at its edges (inner line breaks
// kept), or nothing.
function stored(text: string): string | undefined {
  return isWritten(text) ? text.trim() : undefined
}

// --- CHECKING A DRAFT BEFORE SENDING ------------------------------------------

export type DraftField = 'entryType' | 'sections' | 'reason'
export interface DraftProblem {
  field: DraftField
  message: string
}

// Everything wrong with a draft, in the order of the form, so the page can
// show each message at its field and move focus to the first. The backend
// checks the same rules — this only saves a round trip and says it where
// the problem is. `original` is the version being amended (absent for a new
// entry).
export function draftProblems(
  draft: EntryDraft,
  original?: MedicalFileEntry,
): DraftProblem[] {
  const problems: DraftProblem[] = []
  if (draft.entryType === '') {
    problems.push({ field: 'entryType', message: 'Choose the type of entry.' })
  }
  if (!SECTIONS.some((section) => isWritten(draft[section]))) {
    problems.push({
      field: 'sections',
      message: 'Write at least one section: Subjective, Objective, Assessment or Plan.',
    })
  }
  if (original) {
    // An amendment identical to what it corrects would add a version that
    // says nothing new — almost certainly Save pressed too early. Checked
    // before the reason: the sections come first on the form, and focus goes
    // to the FIRST problem.
    if (sameContent(draft, original)) {
      problems.push({
        field: 'sections',
        message: 'Nothing has changed yet: correct the entry before saving the amendment.',
      })
    }
    if (!isWritten(draft.reason)) {
      problems.push({ field: 'reason', message: 'Say why you are amending this entry.' })
    }
  }
  return problems
}

// Whether the draft would store exactly what `entry` holds — the type, and
// each section as it would be stored (trimmed, blank = absent).
function sameContent(draft: EntryDraft, entry: MedicalFileEntry): boolean {
  return (
    draft.entryType === entry.entryType &&
    SECTIONS.every((section) => (stored(draft[section]) ?? null) === entry[section])
  )
}

// --- THE REQUEST -------------------------------------------------------------

// The POST body for a CHECKED draft (draftProblems found nothing — so the
// type is chosen). Sections not written are LEFT OUT rather than sent as ''
// (the backend refuses a blank section) or null. An amendment carries the
// version it corrects and the trimmed reason; a new entry carries neither.
export function entryBody(
  draft: EntryDraft & { entryType: EntryType },
  patientId: number,
  amendsId?: number,
): NewMedicalFileEntry {
  const body: NewMedicalFileEntry = { patientId, entryType: draft.entryType }
  for (const section of SECTIONS) {
    const text = stored(draft[section])
    if (text !== undefined) body[section] = text
  }
  if (amendsId !== undefined) {
    body.amendsId = amendsId
    body.amendmentReason = draft.reason.trim()
  }
  return body
}