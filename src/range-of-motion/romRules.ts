import { daysBetween } from '@/common/calendarDate'
import type {
  CatalogueMovement,
  MovementCatalogue,
  RomAssessment,
  RomMode,
  RomSide,
} from './types'

// Range of motion's rules for SHOWING a record — pure functions, tested on
// their own (romRules.test.ts), the shape of every *Rules.ts here. The
// form's rules are in romDraft.ts.

// --- THE CATALOGUE, INDEXED --------------------------------------------------

// The catalogue as the screens look things up in it: a movement's details by
// code, and its POSITION in examination order (for sorting). Built once per
// render from the API's answer.
export interface CatalogueIndex {
  get: (movement: string) => CatalogueMovement | undefined
  order: (movement: string) => number
}

export function indexCatalogue(catalogue: MovementCatalogue): CatalogueIndex {
  const movements = catalogue.joints.flatMap((joint) => joint.movements)
  const byCode = new Map(movements.map((movement) => [movement.movement, movement]))
  const position = new Map(movements.map((movement, index) => [movement.movement, index]))
  return {
    get: (code) => byCode.get(code),
    // A code the catalogue doesn't know (a backend newer than this page)
    // sorts last rather than throwing.
    order: (code) => position.get(code) ?? movements.length,
  }
}

// --- ASSESSMENTS: EACH ONE AND ITS EARLIER VERSIONS ---------------------------

// An assessment as the list shows it — the medical file's "note" idea
// (medicalFileRules' groupIntoNotes): the LATEST version, and the versions
// it replaced, newest first, following amendsId down the chain.
export interface AssessmentVersions {
  latest: RomAssessment
  earlier: RomAssessment[]
}

// The record → its assessments, newest MEASURED first (a clinician reads a
// record by the day things happened), then newest recorded, then id — the
// backend's order, applied to each chain's LATEST version: an amendment may
// move the day, and the assessment then moves with it. The walk stops at an
// id it doesn't have and after as many steps as there are versions (a
// broken chain mustn't loop or throw — the database makes both impossible).
export function groupIntoAssessments(assessments: readonly RomAssessment[]): AssessmentVersions[] {
  const byId = new Map(assessments.map((assessment) => [assessment.id, assessment]))
  return assessments
    .filter((assessment) => assessment.amendedById === null)
    .map((latest) => {
      const earlier: RomAssessment[] = []
      let current = latest
      while (current.amendsId !== null && earlier.length < assessments.length) {
        const previous = byId.get(current.amendsId)
        if (!previous) break
        earlier.push(previous)
        current = previous
      }
      return { latest, earlier }
    })
    .sort(
      (a, b) =>
        b.latest.measuredOn.localeCompare(a.latest.measuredOn) ||
        b.latest.createdAt.localeCompare(a.latest.createdAt) ||
        b.latest.id - a.latest.id,
    )
}

// --- THE MOVEMENT CARDS ------------------------------------------------------

// One value on a card's chart: the day it was measured, and the value.
// `assessmentId` keys it (two assessments on one day are two points).
export interface RomPoint {
  assessmentId: number
  measuredOn: string
  degrees: number
}

// One line of a card: a side (null for an unsided movement), its values
// OLDEST first.
export interface RomSeries {
  side: RomSide | null
  points: RomPoint[]
}

// A card: one movement in one mode ("Knee flexion · active"). `series`:
// left before right (or the one unsided line).
export interface MovementCard {
  movement: CatalogueMovement
  mode: RomMode
  series: RomSeries[]
}

// The cards of a record (decisions §36, the person's choice: a card per
// movement measured, per mode). ONLY the latest version of each assessment
// feeds them — a corrected value is a mistake, not a measurement. Cards in
// examination order, active before passive; points oldest first (by day,
// then by when recorded). A movement the catalogue doesn't know is left
// out: there is no name or typical value to show it with.
export function movementCards(
  assessments: readonly RomAssessment[],
  catalogue: CatalogueIndex,
): MovementCard[] {
  const latest = assessments
    .filter((assessment) => assessment.amendedById === null)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.createdAt.localeCompare(b.createdAt))
  const cards = new Map<string, MovementCard>()
  for (const assessment of latest) {
    for (const measurement of assessment.measurements) {
      const movement = catalogue.get(measurement.movement)
      if (!movement) continue
      const key = `${measurement.movement}|${measurement.mode}`
      let card = cards.get(key)
      if (!card) {
        card = { movement, mode: measurement.mode, series: [] }
        cards.set(key, card)
      }
      let series = card.series.find((line) => line.side === measurement.side)
      if (!series) {
        series = { side: measurement.side, points: [] }
        card.series.push(series)
      }
      series.points.push({
        assessmentId: assessment.id,
        measuredOn: assessment.measuredOn,
        degrees: measurement.degrees,
      })
    }
  }
  const sideOrder = (side: RomSide | null) => (side === 'right' ? 1 : 0)
  return [...cards.values()]
    .map((card) => ({ ...card, series: card.series.sort((a, b) => sideOrder(a.side) - sideOrder(b.side)) }))
    .sort(
      (a, b) =>
        catalogue.order(a.movement.movement) - catalogue.order(b.movement.movement) ||
        (a.mode === b.mode ? 0 : a.mode === 'active' ? -1 : 1),
    )
}

// The change a side shows: its latest value minus its FIRST (decisions §36:
// "↑ 16° since Oct 10"). Null with a single value, or when every value is
// of one day (two visits that day): "since Oct 31" on Oct 31 says nothing.
export function changeSinceFirst(series: RomSeries): { degrees: number; since: string } | null {
  const first = series.points[0]
  const last = series.points.at(-1)
  if (!first || !last || first.measuredOn === last.measuredOn) return null
  return { degrees: last.degrees - first.degrees, since: first.measuredOn }
}

// --- THE CHART'S SCALES ------------------------------------------------------

// The days a card's chart spans: its first value's day to its last.
export function cardRange(card: MovementCard): { from: string; to: string } {
  const days = card.series.flatMap((series) => series.points.map((point) => point.measuredOn)).sort()
  return { from: days[0], to: days[days.length - 1] }
}

// WHERE EACH POINT SITS, in days from `from` — a DATED axis (the progress
// charts' rule: an empty month shows as empty space). A point sits in the
// middle of its day's band; two of one line on one day (two visits) share
// the band at its thirds. Keyed by assessment id.
export function pointPositions(points: readonly RomPoint[], from: string): Map<number, number> {
  const perDay = new Map<string, number[]>()
  for (const point of points) {
    const ids = perDay.get(point.measuredOn) ?? []
    ids.push(point.assessmentId)
    perDay.set(point.measuredOn, ids)
  }
  const positions = new Map<number, number>()
  for (const [day, ids] of perDay) {
    const band = daysBetween(from, day)
    ids.forEach((id, k) => positions.set(id, band + (k + 1) / (ids.length + 1)))
  }
  return positions
}

// The degrees axis: the values and the typical value, with 5° of room on
// each side, rounded OUT to tens — round labels, no point on the frame.
// NOT from 0: a knee going from 110° to 126° drawn on 0–140° is a flat line
// (seen live, 2026-10-31); the change is what the chart is for. A knee
// extension measured 0° with a typical 0° spans −10° to 10°, so 0 shows.
export function degreeScale(card: MovementCard): { low: number; high: number } {
  const values = card.series.flatMap((series) => series.points.map((point) => point.degrees))
  const all = [card.movement.typicalDegrees, ...values]
  return {
    low: Math.floor((Math.min(...all) - 5) / 10) * 10,
    high: Math.ceil((Math.max(...all) + 5) / 10) * 10,
  }
}
// --- THE HOME'S GLANCE ------------------------------------------------------

// One line of the patient home's "Range of motion" (2026-11-01, the person's
// choice: the latest visit's movements): a movement, a mode and a side
// measured at the LATEST visit, with that side's whole series (for the
// sparkline and the change since the first value).
export interface TrendLine {
  key: string
  card: MovementCard
  series: RomSeries
}

// At most this many lines on the home; the rest is "and N more" (My records
// has them all).
export const HOME_TREND_LINES = 3

// The latest visit (the newest MEASURED assessment, its latest version — the
// list's own order) and one line per value it holds, in its order (catalogue,
// side, mode — the backend's). Null when nothing has been measured. A value
// whose movement the page doesn't know has no card, so no line.
export function latestVisitLines(
  assessments: readonly RomAssessment[],
  catalogue: CatalogueIndex,
): { measuredOn: string; lines: TrendLine[] } | null {
  const [newest] = groupIntoAssessments(assessments)
  if (!newest) return null
  const cards = movementCards(assessments, catalogue)
  const lines = newest.latest.measurements.flatMap((measurement) => {
    const card = cards.find((c) => c.movement.movement === measurement.movement && c.mode === measurement.mode)
    const series = card?.series.find((s) => s.side === measurement.side)
    return card && series
      ? [{ key: `${measurement.movement}|${measurement.side ?? 'none'}|${measurement.mode}`, card, series }]
      : []
  })
  return { measuredOn: newest.latest.measuredOn, lines }
}