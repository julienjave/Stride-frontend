import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { type FailedQuery, LoadFailure } from '@/common/LoadError'
import { NotAvailable } from '@/common/NotAvailable'

// The practitioner's pages of ONE assigned program — the program page, its
// exercise page, its "add an exercise" page and its photos page — all start
// by reading the program, so they share what they say when that read fails
// (Phase 6, "Honest empty / error states", 2026-10-23). Before, the program
// page had a heading and links; the other three a bare sentence and no way
// out.
//
// A 404 means one of two things the backend deliberately doesn't tell
// apart: no such program, or a program of a patient whose care team I'm not
// on (row-level security makes it invisible, so it reads as "not found" —
// telling them apart would confirm that it exists). The page says both, and
// the rule behind the second, without saying which applies.

function Column({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl px-4">{children}</div>
}

function ProgramNotAvailableBody() {
  return (
    <NotAvailable
      title="Program not available"
      links={[
        { to: '/practitioner/patients', label: 'My patients' },
        { to: '/practitioner/programs', label: 'Programs' },
      ]}
    >
      This program doesn't exist, or it belongs to a patient whose care team you're not on. Only a
      patient's care team can open their programs.
    </NotAvailable>
  )
}

// Also for an address whose id isn't a number: it can't be a program, and
// saying so in the same words reveals nothing a typed id couldn't.
export function ProgramNotAvailable() {
  return (
    <Column>
      <ProgramNotAvailableBody />
    </Column>
  )
}

// The program's read failed: "not available" for a 404, otherwise the load
// error with "Try again". `what` names what the page was showing ("this
// program", "this exercise", "these photos").
export function ProgramLoadFailed({ query, what }: { query: FailedQuery; what: string }) {
  return (
    <Column>
      <LoadFailure queries={[query]} what={what} notAvailable={<ProgramNotAvailableBody />}>
        <Link to="/practitioner/patients" className="block text-sm underline underline-offset-4">
          My patients
        </Link>
      </LoadFailure>
    </Column>
  )
}