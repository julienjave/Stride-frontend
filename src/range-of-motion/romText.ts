import { formatDayMonth, localDateString } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import { ENTRY_TYPE_LABELS, type Audience } from '@/medical-files/medicalFileText'
import type { MedicalFileEntry } from '@/medical-files/types'
import type { CatalogueIndex } from './romRules'
import type { RomAssessment, RomMeasurement, RomMode, RomSide } from './types'

// The words of the range-of-motion screens, in one place, for the two
// audiences (the medical file's idea: medicalFileText.ts).

export const SIDE_LABELS: Record<RomSide, string> = { left: 'Left', right: 'Right' }
export const MODE_LABELS: Record<RomMode, string> = { active: 'Active', passive: 'Passive' }

// The record's introduction for the PATIENT — the PDF copy's own sentence
// (the backend's record-content.ts), so the screen and the download say the
// same thing about the typical value (decisions §36: shown to the patient,
// worded as a guide).
export const PATIENT_INTRO =
  'How far your joints moved when your care team measured them, in degrees. ' +
  'The typical value is a textbook guide, not a target: people differ, and ' +
  'your other side is often the better comparison.'

// A value, sign included: "126°", "−5°" (5° short of straight). A real
// minus sign (U+2212), not a hyphen: it is as wide as the plus, and a screen
// reader says "minus".
export function degreesText(degrees: number): string {
  return degrees < 0 ? `−${-degrees}°` : `${degrees}°`
}

// A card's heading: "Knee flexion · active".
export function cardTitle(name: string, mode: RomMode): string {
  return `${name} · ${mode}`
}

// The typical value beside a card or a form row. The patient reads that it
// is a guide every time (the PDF's rule: a number of degrees means little
// without it, and nothing should read as a target).
export function typicalText(typicalDegrees: number, audience: Audience): string {
  return audience === 'patient'
    ? `Typical: ${degreesText(typicalDegrees)} (a guide, not a target)`
    : `Typical ${degreesText(typicalDegrees)}`
}

// The change since the first value: an arrow and the size for the eye, and
// the same in words for a screen reader (an arrow is read as "upwards
// arrow" — or not at all).
export function changeText(degrees: number, since: string): { shown: string; spoken: string } {
  const day = formatDayMonth(since)
  if (degrees === 0) return { shown: `No change since ${day}`, spoken: `No change since ${day}` }
  const size = `${Math.abs(degrees)}°`
  return degrees > 0
    ? { shown: `↑ ${size} since ${day}`, spoken: `${size} more than on ${day}` }
    : { shown: `↓ ${size} since ${day}`, spoken: `${size} less than on ${day}` }
}

// --- ASSESSMENTS -------------------------------------------------------------

// "Measured October 27, 2026" — the clinical day (a DATE: formatted in UTC
// so it never shifts).
export function assessmentHeading(assessment: RomAssessment): string {
  return `Measured ${formatCalendarDate(assessment.measuredOn)}`
}

// "By Alex Chen · 4 values", and — when it was typed in on another day than
// it was measured — "recorded October 28, 2026" (that day in the VIEWER's
// zone: a moment — the seed's "measured four days ago, typed in the next
// day" shows it).
export function assessmentByline(assessment: RomAssessment): string {
  const count = assessment.measurements.length
  const parts = [
    `By ${assessment.author.firstName} ${assessment.author.lastName}`,
    count === 1 ? '1 value' : `${count} values`,
  ]
  if (localDateString(new Date(assessment.createdAt)) !== assessment.measuredOn) {
    parts.push(`recorded ${formatMomentDate(assessment.createdAt)}`)
  }
  return parts.join(' · ')
}

// The visit's note, named the way the medical file names it ("Progress
// note · March 4, 2031"). `notes`: the medical file, when it was read; a
// note it doesn't hold (or a file that wasn't read) is said, not hidden.
export function visitNoteText(entryId: number, notes: readonly MedicalFileEntry[] | undefined): string {
  const note = notes?.find((entry) => entry.id === entryId)
  return note === undefined
    ? 'Visit note: a note of the medical file'
    : `Visit note: ${ENTRY_TYPE_LABELS[note.entryType]} · ${formatMomentDate(note.createdAt)}`
}

// On an amendment: what it corrects (the original's day measured), and why.
export function assessmentAmendsText(
  amendment: RomAssessment,
  original: RomAssessment,
  audience: Audience,
): string {
  const verb = audience === 'patient' ? 'Corrects' : 'Amends'
  return `${verb} the measurements of ${formatCalendarDate(original.measuredOn)}: ${amendment.amendmentReason ?? ''}`
}

// On an earlier version: when it was replaced (= the next version's moment
// recorded) — the medical file's words.
export function replacedByText(replacedBy: RomAssessment): string {
  return `Amended on ${formatMomentDate(replacedBy.createdAt)}`
}

// One value in an assessment's list: "Knee flexion, right, active" — the
// PDF's label (the backend's measurementLabel), lower-case after the name.
export function measurementLabel(measurement: RomMeasurement, catalogue: CatalogueIndex): string {
  const name = catalogue.get(measurement.movement)?.name ?? measurement.movement
  return [name, measurement.side, measurement.mode].filter((part) => part !== null).join(', ')
}
// A home line's name: "Right knee flexion", "Neck flexion", and the mode
// only when it is the less usual one — "Right knee flexion · passive" (an
// active value is what a patient expects; passive is said).
export function trendLineLabel(name: string, side: RomSide | null, mode: RomMode): string {
  const base = side === null ? name : `${SIDE_LABELS[side]} ${name.charAt(0).toLowerCase()}${name.slice(1)}`
  return mode === 'passive' ? `${base} · passive` : base
}

// "and 2 more" under the home's lines.
export function moreLinesText(count: number): string {
  return `and ${count} more`
}