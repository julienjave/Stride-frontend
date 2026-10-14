import { useState } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { isOwnAssignedProgram } from '@/assigned-programs/permissions'
import { usePatientAssignedPrograms } from '@/assigned-programs/usePatientAssignedPrograms'
import type { AssignedProgramListItem } from '@/assigned-programs/types'
import { Button } from '@/components/ui/button'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { YoursBadge } from '@/common/YoursBadge'
import { programRowSummary, splitProgramsForPatientPage } from './patientPageRules'
import { PatientPageSection } from './PatientPageSection'

// The patient's programs — including those assigned by other practitioners
// on the care team (the Programs hub only shows your own). Mine carry the
// same "Yours" badge as on the hub; a colleague's says who assigned it, so
// you know whom to talk to before changing anything.
//
// CURRENT programs are always shown; PAST ones (completed, cancelled) wait
// behind "Show N past programs", under the current list — the record, one
// click away, not in the way (decided 2026-10-13 and 2026-10-14; the rules
// are in patientPageRules.ts). The checkbox is plain state: off on every
// visit, and on every other patient — PatientPage remounts its view per
// patient (its `key`).
//
// Each row opens the program's page, and "Assign a program" opens the
// assign form with this patient already chosen (both arrived with the
// assign + scheduling item, step 3a-1).
export function PatientProgramsSection({ patientId }: { patientId: number }) {
  const [showPast, setShowPast] = useState(false)
  const { data: programs, isLoading, isError } = usePatientAssignedPrograms(patientId)
  const { current, past } = splitProgramsForPatientPage(programs ?? [])

  return (
    <PatientPageSection
      title="Programs"
      action={
        <Button asChild size="sm">
          <Link to={`/practitioner/programs/assigned/new?patientId=${patientId}`}>
            Assign a program
          </Link>
        </Button>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading programs…</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn't load the programs. Try refreshing.</p>
      )}
      {/* Two different empty states: never had a program, or none NOW —
          "No programs assigned yet" would be untrue for the second, and
          the checkbox right under it says how many past ones there are. */}
      {programs && programs.length === 0 && (
        <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
      )}
      {programs && programs.length > 0 && current.length === 0 && (
        <p className="text-sm text-muted-foreground">No current program.</p>
      )}
      {current.length > 0 && <ProgramList label="Current programs" programs={current} />}
      <ShowHiddenToggle
        count={past.length}
        singular="past program"
        plural="past programs"
        checked={showPast}
        onChange={setShowPast}
      />
      {showPast && past.length > 0 && <ProgramList label="Past programs" programs={past} />}
    </PatientPageSection>
  )
}

// One list of program rows. Named (aria-label): with two lists in the
// section, a screen reader announces WHICH one it's entering ("Past
// programs, list, 2 items") — and tests can find each by name.
function ProgramList({
  label,
  programs,
}: {
  label: string
  programs: AssignedProgramListItem[]
}) {
  const { data: currentUser } = useCurrentUser()
  return (
    <ul aria-label={label} className="divide-y divide-border rounded-lg border">
      {programs.map((program) => {
        const isMine = currentUser ? isOwnAssignedProgram(program, currentUser) : false
        return (
          <li key={program.id}>
            {/* The whole row is the link: one large target, easy to hit
                on a phone, and its accessible name is the row's text. */}
            <Link
              to={`/practitioner/programs/assigned/${program.id}`}
              className="block space-y-1 px-4 py-3 hover:bg-muted"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">{program.title}</span>
                {isMine && <YoursBadge />}
              </span>
              <span className="block text-sm text-muted-foreground">
                {programRowSummary(program)}
              </span>
              {!isMine && program.assigner && (
                <span className="block text-xs text-muted-foreground">
                  Assigned by {program.assigner.firstName} {program.assigner.lastName}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}