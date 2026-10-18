import type { AssignedProgramListItem, ScheduleSummary } from './types'

// A patient's programs, as the PATIENT's screens show them — which are
// active, and how far along each one is. Moved here from the patient home's
// rules (src/app/home/patient/) on 2026-10-17, when the Sessions hub became
// their second reader: a rule shared by two screens lives with the feature
// it is about (programs), not inside one of its readers — the same move
// todayStatus made into src/sessions/ on 2026-10-16. Pure: plain values in,
// plain values out (patientPrograms.test.ts).

// --- WHICH PROGRAMS --------------------------------------------------------------

// The programs that still ask something: the ACTIVE ones (a completed or
// cancelled program asks nothing any more; it stays on the record — the
// Sessions hub lists it apart, as a past program). Several are listed
// EQUALLY (decisions §2: no "primary" program), so the order is plain and
// stable: the one that started first, then by id (two started the same day
// keep the order they were assigned). The home and the hub use this one
// order, so a patient finds their programs in the same place on both.
// `filter` returns a new array, so sorting it never touches the cached list.
export function activePrograms(
  programs: readonly AssignedProgramListItem[],
): AssignedProgramListItem[] {
  return programs
    .filter((program) => program.status === 'active')
    .sort((a, b) =>
      a.startDate === b.startDate ? a.id - b.id : a.startDate < b.startDate ? -1 : 1,
    )
}

// --- A PROGRAM'S PROGRESS -------------------------------------------------------

// The fraction a progress bar shows: sessions fulfilled (done on the day,
// made up — on time or late —, done early, swapped: the same five totalsText
// counts as done) out of the program's whole target. null for an open-ended
// program, which has no total (decisions §5: a count, not a bar) — and for a
// target of 0, where a bar would divide by zero.
export function progressFraction(
  totals: ScheduleSummary['totals'],
): { fulfilled: number; expected: number } | null {
  if (totals.expected === null || totals.expected === 0) return null
  return {
    fulfilled:
      totals.done + totals.madeUp + totals.madeUpLate + totals.doneEarly + totals.swapped,
    expected: totals.expected,
  }
}