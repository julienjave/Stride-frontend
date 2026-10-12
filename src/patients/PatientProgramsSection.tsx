import { Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { isOwnAssignedProgram } from '@/assigned-programs/permissions'
import { usePatientAssignedPrograms } from '@/assigned-programs/usePatientAssignedPrograms'
import { Button } from '@/components/ui/button'
import { YoursBadge } from '@/common/YoursBadge'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PROGRAM_STATUS_LABELS, sortProgramsForPatientPage } from './patientPageRules'
import { PatientPageSection } from './PatientPageSection'

// The patient's programs — ALL of them, including those assigned by other
// practitioners on the care team (the Programs hub only shows your own).
// Mine carry the same "Yours" badge as on the hub; a colleague's says who
// assigned it, so you know whom to talk to before changing anything.
//
// Each row opens the program's page, and "Assign a program" opens the
// assign form with this patient already chosen (both arrived with the
// assign + scheduling item, step 3a-1 — until then they'd have led to
// placeholders, which was decided against on 2026-10-08).
export function PatientProgramsSection({ patientId }: { patientId: number }) {
  const { data: currentUser } = useCurrentUser()
  const { data: programs, isLoading, isError } = usePatientAssignedPrograms(patientId)

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
      {programs && programs.length === 0 && (
        <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
      )}
      {programs && programs.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {sortProgramsForPatientPage(programs).map((program) => {
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
                    {/* Calendar dates (a `date` column), so formatCalendarDate
                        — never shifted by the viewer's time zone. */}
                    {program.endDate
                      ? `${formatCalendarDate(program.startDate)} – ${formatCalendarDate(program.endDate)}`
                      : `Started ${formatCalendarDate(program.startDate)}`}
                    {' · '}
                    {PROGRAM_STATUS_LABELS[program.status]}
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
      )}
    </PatientPageSection>
  )
}