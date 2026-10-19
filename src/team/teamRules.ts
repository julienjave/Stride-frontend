import type { AssignedProgram } from '@/assigned-programs/types'
import { sortCareTeam, splitProgramsForPatientPage } from '@/patients/patientPageRules'
import type { MyCareTeamEntry } from './types'

// The rules of the patient's Team pages, as pure functions: plain data in,
// plain data out, tested without rendering anything. The pages only call
// them.

// The Team page's two lists, from the whole history the API sends.
//   current — every ACTIVE link (`isActive`: the backend's access rule, an
//             active period AND a shared clinic), longest-serving first —
//             the practitioner side's order (sortCareTeam).
//   past    — the people who USED to be on the team and aren't now: one row
//             per person, their most recent period. Someone who left and
//             came back is a current member, not also a "past member" — a
//             patient opening the history to find their own practitioner
//             listed there would wonder what changed.
export function splitTeam(entries: readonly MyCareTeamEntry[]): {
  current: MyCareTeamEntry[]
  past: MyCareTeamEntry[]
} {
  const sorted = sortCareTeam(entries)
  const current = sorted.filter((entry) => entry.isActive)
  const onTeamNow = new Set(current.map((entry) => entry.practitioner.id))
  const past: MyCareTeamEntry[] = []
  const listed = new Set<number>()
  // Ended links come most recently ended first (sortCareTeam), so the first
  // one met for a person is their latest period. No separate "is this link
  // active?" test: an active link's practitioner is in onTeamNow already.
  for (const entry of sorted) {
    const id = entry.practitioner.id
    if (onTeamNow.has(id) || listed.has(id)) continue
    listed.add(id)
    past.push(entry)
  }
  return { current, past }
}

// The link that makes this practitioner a CURRENT member, if any. The
// profile page is for current members only (decided 2026-10-18); a past
// member's address, a typo or someone never on the team all find nothing.
export function findTeamMember(
  entries: readonly MyCareTeamEntry[],
  practitionerId: number,
): MyCareTeamEntry | undefined {
  return entries.find((entry) => entry.isActive && entry.practitioner.id === practitionerId)
}

// "Programs from them": the patient's programs this practitioner assigned
// (`assignedBy`, the column itself — always set — rather than the joined
// `assigner` name, which is typed nullable), split and ordered like the
// Sessions hub's lists: current ones, then past ones most recently ended
// first.
export function programsFrom<T extends AssignedProgram>(
  programs: readonly T[],
  practitionerId: number,
): { current: T[]; past: T[] } {
  return splitProgramsForPatientPage(programs.filter((program) => program.assignedBy === practitionerId))
}

// A clinic's website as a link target, or null when it shouldn't be one.
// The backend accepts any text there (CreateClinicDto: a string ≤ 255), so:
//   - "https://…" / "http://…" — used as is;
//   - no scheme ("riverside.example", "www.x.com/contact") — https:// is
//     added, or the browser would read it as a path INSIDE Stride;
//   - any other scheme ("javascript:…", "mailto:…") — no link at all, the
//     text is shown plain. An href is executable in the javascript: case:
//     never build one from stored text without checking its scheme.
// A scheme is letters (then digits, + - .) followed by ":" — checked before
// the first "/", so "example.com/a:b" counts as scheme-less.
export function websiteHref(website: string): string | null {
  const value = website.trim()
  if (value === '') return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null
  return `https://${value}`
}