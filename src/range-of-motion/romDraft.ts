import { isCalendarDate } from '@/common/calendarDate'
import type { CatalogueIndex } from './romRules'
import { degreesText } from './romText'
import type {
  CatalogueMovement,
  NewRomAssessment,
  NewRomMeasurement,
  RomAssessment,
  RomMode,
  RomSide,
} from './types'

// The assessment form's rules — pure functions, tested on their own
// (romDraft.test.ts). The form is MOVEMENT ROWS (decisions §36, the person's
// choice): each row is a movement and a mode, with a Left and a Right box —
// or ONE box for a movement with no side (neck and trunk flexion /
// extension). Each filled box becomes one value of the request.

// --- LIMITS MIRRORED FROM THE BACKEND ----------------------------------------

// range-of-motion.schema.ts: ROM_NOTE_MAX_LENGTH and ROM_MEASUREMENTS_MAX;
// the reason's limit is the medical file's (AMENDMENT_REASON_MAX_LENGTH).
// The note and the reason are the fields' `maxLength` (the browser stops
// typing at the limit); the count is checked here.
export const NOTE_MAX_LENGTH = 200
export const MEASUREMENTS_MAX = 60
export const REASON_MAX_LENGTH = 500

// --- THE DRAFT ---------------------------------------------------------------

// A row's boxes: 'left' and 'right' for a sided movement, 'none' for the
// others. A row keeps all three, so switching its movement from a knee to
// the neck and back loses nothing typed; only the boxes the movement uses
// are shown and sent.
export type BoxKey = 'left' | 'right' | 'none'

export interface BoxDraft {
  degrees: string
  note: string
  // The note's field is behind a small button (decisions §36): most values
  // have none.
  noteOpen: boolean
}

export interface RowDraft {
  // A stable id for React's list and for the fields' ids — never the row's
  // position, which changes when a row above is removed.
  key: number
  movement: string
  mode: RomMode
  boxes: Record<BoxKey, BoxDraft>
}

export interface AssessmentDraft {
  measuredOn: string
  // The visit note's entry id as the select holds it ('' = none).
  noteId: string
  reason: string
  rows: RowDraft[]
}

export function emptyBox(): BoxDraft {
  return { degrees: '', note: '', noteOpen: false }
}

export function emptyRow(key: number): RowDraft {
  return {
    key,
    movement: '',
    mode: 'active',
    boxes: { left: emptyBox(), right: emptyBox(), none: emptyBox() },
  }
}

// A new assessment: today, the note given by the address (or none), one
// empty row to start typing in.
export function emptyDraft(today: string, noteId = ''): AssessmentDraft {
  return { measuredOn: today, noteId, reason: '', rows: [emptyRow(1)] }
}

// The key for a row added now: one more than the largest in use.
export function nextRowKey(draft: AssessmentDraft): number {
  return Math.max(0, ...draft.rows.map((row) => row.key)) + 1
}

// The boxes a movement uses, in the order they are shown. With no movement
// chosen yet, Left and Right (most movements have a side).
export function boxesOf(movement: CatalogueMovement | undefined): BoxKey[] {
  return movement === undefined || movement.sided ? ['left', 'right'] : ['none']
}

// The side a box stands for, as the API names it.
function sideOf(box: BoxKey): RomSide | undefined {
  return box === 'none' ? undefined : box
}

// An amendment starts as a copy of the version it corrects (a COMPLETE new
// version, the medical file's rule): one row per movement and mode, its
// values in their boxes, a note shown open. The reason starts empty — it is
// about this correction.
export function draftFrom(assessment: RomAssessment): AssessmentDraft {
  const rows: RowDraft[] = []
  for (const measurement of assessment.measurements) {
    let row = rows.find((r) => r.movement === measurement.movement && r.mode === measurement.mode)
    if (!row) {
      row = { ...emptyRow(rows.length + 1), movement: measurement.movement, mode: measurement.mode }
      rows.push(row)
    }
    row.boxes[measurement.side ?? 'none'] = {
      degrees: String(measurement.degrees),
      note: measurement.note ?? '',
      noteOpen: measurement.note !== null,
    }
  }
  return {
    measuredOn: assessment.measuredOn,
    noteId: assessment.medicalFileEntryId === null ? '' : String(assessment.medicalFileEntryId),
    reason: '',
    rows: rows.length > 0 ? rows : [emptyRow(1)],
  }
}

// --- THE FIELDS' IDS ---------------------------------------------------------

// Every control has an id the page sets and a problem names — so a problem
// can be shown at its field and focus moved to it, with no table of refs.
export const MEASURED_ON_ID = 'rom-measured-on'
export const NOTE_SELECT_ID = 'rom-visit-note'
export const MEASUREMENTS_ID = 'rom-measurements'
export const REASON_ID = 'rom-reason'

export function movementFieldId(rowKey: number): string {
  return `rom-row-${rowKey}-movement`
}

export function boxFieldId(rowKey: number, box: BoxKey): string {
  return `rom-row-${rowKey}-${box}`
}

export function noteFieldId(rowKey: number, box: BoxKey): string {
  return `rom-row-${rowKey}-${box}-note`
}

// --- READING A BOX -----------------------------------------------------------

function isWritten(text: string): boolean {
  return /\S/.test(text)
}

// Whole degrees, signed: "95", "-5", "−5" (the minus sign a phone keyboard
// or a copy from this page gives), spaces around allowed. Anything else —
// "95.5", "95°", "ninety" — is not a value: null.
export function parseDegrees(text: string): number | null {
  const trimmed = text.trim().replace('−', '-')
  return /^-?\d{1,4}$/.test(trimmed) ? Number(trimmed) : null
}

// What a box holds that matters: a value typed, or a note.
function boxIsUsed(box: BoxDraft): boolean {
  return isWritten(box.degrees) || isWritten(box.note)
}

// --- CHECKING A DRAFT BEFORE SENDING ------------------------------------------

export interface DraftProblem {
  // The id of the control the message belongs to.
  field: string
  message: string
}

// Everything wrong with a draft, in the order of the form, so the page shows
// each message at its field and moves focus to the first. The backend checks
// the same rules (and more) — this only says it where the problem is, before
// a round trip. A row with nothing in it is simply ignored (the empty row the
// form starts with, or one added and not used). `original`: the version being
// amended.
export function draftProblems(
  draft: AssessmentDraft,
  catalogue: CatalogueIndex,
  today: string,
  original?: RomAssessment,
): DraftProblem[] {
  const problems: DraftProblem[] = []
  if (!isCalendarDate(draft.measuredOn)) {
    problems.push({ field: MEASURED_ON_ID, message: 'Enter the day the measurements were taken.' })
  } else if (draft.measuredOn > today) {
    problems.push({ field: MEASURED_ON_ID, message: "The measurement day can't be in the future." })
  }

  const seen = new Set<string>()
  let rowProblems = 0
  for (const row of draft.rows) {
    const movement = catalogue.get(row.movement)
    const boxes = boxesOf(movement)
    const used = boxes.filter((box) => boxIsUsed(row.boxes[box]))
    if (row.movement === '') {
      if (used.length > 0) {
        problems.push({ field: movementFieldId(row.key), message: 'Choose the movement.' })
        rowProblems++
      }
      continue
    }
    const pair = `${row.movement}|${row.mode}`
    if (seen.has(pair)) {
      problems.push({
        field: movementFieldId(row.key),
        message: 'This movement is already in another row with the same mode.',
      })
      rowProblems++
      continue
    }
    seen.add(pair)
    if (used.length === 0) {
      problems.push({ field: boxFieldId(row.key, boxes[0]), message: 'Enter a value, or remove the row.' })
      rowProblems++
      continue
    }
    for (const box of used) {
      const problem = boxProblem(row.boxes[box], movement)
      if (problem !== null) {
        problems.push({ field: boxFieldId(row.key, box), message: problem })
        rowProblems++
      }
    }
  }

  // Only once every row is right: "no value at all" and "too many" are about
  // the whole list, and a row's own message says more.
  if (rowProblems === 0) {
    const count = draft.rows.reduce((sum, row) => sum + valuesOf(row, catalogue).length, 0)
    if (count === 0) {
      problems.push({ field: MEASUREMENTS_ID, message: 'Enter at least one measurement.' })
    } else if (count > MEASUREMENTS_MAX) {
      problems.push({
        field: MEASUREMENTS_ID,
        message: `An assessment can hold at most ${MEASUREMENTS_MAX} values — record the rest in another one.`,
      })
    } else if (original && sameContent(draft, original, catalogue)) {
      // An amendment identical to what it corrects would add a version that
      // says nothing new — almost certainly Save pressed too early.
      problems.push({
        field: MEASUREMENTS_ID,
        message: 'Nothing has changed yet: correct the measurements before saving the amendment.',
      })
    }
  }
  if (original && !isWritten(draft.reason)) {
    problems.push({ field: REASON_ID, message: 'Say why you are amending these measurements.' })
  }
  return problems
}

// One used box's problem, or null. A note with no value says what it lacks.
function boxProblem(box: BoxDraft, movement: CatalogueMovement | undefined): string | null {
  if (!isWritten(box.degrees)) return 'Enter the value this note is about.'
  const degrees = parseDegrees(box.degrees)
  if (degrees === null) return 'Enter whole degrees, like 95 or -5.'
  if (movement && (degrees < movement.lowestDegrees || degrees > movement.highestDegrees)) {
    return `Enter a value between ${degreesText(movement.lowestDegrees)} and ${degreesText(movement.highestDegrees)}.`
  }
  return null
}

// --- THE REQUEST -------------------------------------------------------------

// A row's values, as the request sends them, each with the id of the box it
// came from. Only the boxes its movement uses, only those with a value; a
// note trimmed, or left out when blank.
function valuesOf(row: RowDraft, catalogue: CatalogueIndex): { value: NewRomMeasurement; field: string }[] {
  const movement = catalogue.get(row.movement)
  if (!movement) return []
  return boxesOf(movement).flatMap((box) => {
    const degrees = parseDegrees(row.boxes[box].degrees)
    if (degrees === null) return []
    const value: NewRomMeasurement = { movement: row.movement, mode: row.mode, degrees }
    const side = sideOf(box)
    if (side !== undefined) value.side = side
    const note = row.boxes[box].note.trim()
    if (note !== '') value.note = note
    return [{ value, field: boxFieldId(row.key, box) }]
  })
}

// The POST body for a CHECKED draft, and — for each value, by its position in
// `measurements` — the id of the box it came from: the backend names a
// refused value by that position ("measurements.3.…"), and the page shows
// the message at the box (serverProblems).
export function assessmentBody(
  draft: AssessmentDraft,
  catalogue: CatalogueIndex,
  patientId: number,
  amendsId?: number,
): { body: NewRomAssessment; sources: string[] } {
  const values = draft.rows.flatMap((row) => valuesOf(row, catalogue))
  const body: NewRomAssessment = {
    patientId,
    measuredOn: draft.measuredOn,
    measurements: values.map((v) => v.value),
  }
  if (draft.noteId !== '') body.medicalFileEntryId = Number(draft.noteId)
  if (amendsId !== undefined) {
    body.amendsId = amendsId
    body.amendmentReason = draft.reason.trim()
  }
  return { body, sources: values.map((v) => v.field) }
}

// Whether the draft would store exactly what `original` holds: the day, the
// note, and the same values (in any order — a row moved isn't a change).
function sameContent(draft: AssessmentDraft, original: RomAssessment, catalogue: CatalogueIndex): boolean {
  const { body } = assessmentBody(draft, catalogue, original.patientId)
  // A value as a comparable line — sent (side / note absent) or stored
  // (side / note null) alike.
  type Comparable = Pick<NewRomMeasurement, 'movement' | 'mode' | 'degrees'> & {
    side?: RomSide | null
    note?: string | null
  }
  const values = (list: readonly Comparable[]) =>
    list
      .map((m) => JSON.stringify([m.movement, m.side ?? null, m.mode, m.degrees, m.note ?? null]))
      .sort()
      .join('\n')
  return (
    body.measuredOn === original.measuredOn &&
    (body.medicalFileEntryId ?? null) === original.medicalFileEntryId &&
    values(body.measurements) === values(original.measurements)
  )
}

// --- THE BACKEND'S REFUSALS, BACK AT THEIR BOX --------------------------------

// A 400's messages split in two: the ones about ONE value — the DTO prefixes
// them with its path, "measurements.3.Knee flexion must be between -90° and
// 200°" — become problems at the box that value came from (`sources`, from
// assessmentBody); every other message stays general, said above Save.
export function serverProblems(
  messages: readonly string[],
  sources: readonly string[],
): { problems: DraftProblem[]; general: string[] } {
  const problems: DraftProblem[] = []
  const general: string[] = []
  for (const message of messages) {
    const match = /^measurements\.(\d+)\.(.+)$/.exec(message)
    const field = match ? sources[Number(match[1])] : undefined
    if (match && field !== undefined) problems.push({ field, message: `${match[2]}.` })
    else general.push(message)
  }
  return { problems, general }
}