import { useCurrentUser } from '@/auth/useCurrentUser'
import { isOwnAssignedProgram } from '@/assigned-programs/permissions'
import { usePatientAssignedPrograms } from '@/assigned-programs/usePatientAssignedPrograms'
import { YoursBadge } from '@/common/YoursBadge'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PROGRAM_STATUS_LABELS, sortProgramsForPatientPage } from './patientPageRules'
import { PatientPageSection } from './PatientPageSection'

// The patient's programs — ALL of them, including those assigned by other
// practitioners on the care team (the Programs hub only shows your own).
// Mine carry the same "Yours" badge as on the hub; a colleague's says who
// assigned it, so you know whom to talk to before changing anything.
//
// Rows aren't links yet: the assigned-program page is still a placeholder,
// built with the assign + scheduling item — and so is "Assign a program"
// (decided 2026-10-08: no buttons leading to "Coming soon").
export function PatientProgramsSection({ patientId }: { patientId: number }) {
  const { data: currentUser } = useCurrentUser()
  const { data: programs, isLoading, isError } = usePatientAssignedPrograms(patientId)

  return (
    <PatientPageSection title="Programs">
      {isLoading && <p className="text-sm text-muted-foreground">Loading programs…</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn't load the programs. Try refreshing.</p>
      )}
      {programs && programs.length === 0 && (
        <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
      )}
      {programs && programs.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {sortProgramsForPatientPage(programs).map((program) => {
            const isMine = currentUser ? isOwnAssignedProgram(program, currentUser) : false
            return (
              <li key={program.id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{program.title}</p>
                  {isMine && <YoursBadge />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {/* Calendar dates (a `date` column), so formatCalendarDate
                      — never shifted by the viewer's time zone. */}
                  {program.endDate
                    ? `${formatCalendarDate(program.startDate)} – ${formatCalendarDate(program.endDate)}`
                    : `Started ${formatCalendarDate(program.startDate)}`}
                  {' · '}
                  {PROGRAM_STATUS_LABELS[program.status]}
                </p>
                {!isMine && program.assigner && (
                  <p className="text-xs text-muted-foreground">
                    Assigned by {program.assigner.firstName} {program.assigner.lastName}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </PatientPageSection>
  )
}