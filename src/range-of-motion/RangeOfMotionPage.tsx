import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { LoadError } from '@/common/LoadError'
import { ListSkeleton } from '@/common/Loading'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { patientPagePath } from '@/medical-files/medicalFilePaths'
import { useMedicalFile } from '@/medical-files/useMedicalFile'
import { useUser } from '@/users/useUser'
import { MovementCards } from './MovementCards'
import { RomAssessmentList } from './RomAssessmentList'
import { romAssessmentPath } from './romPaths'
import { indexCatalogue, movementCards } from './romRules'
import { useMovementCatalogue, useRangeOfMotion } from './useRangeOfMotion'

// The practitioner's view of a patient's range of motion —
// `/practitioner/patients/:id/range-of-motion` (Phase 7, decisions §36). Its
// OWN page, reached from the patient page's link card (which loads nothing):
// opening it is the read the audit log records (ROM_VIEWED).
//
// Top to bottom: "Record an assessment"; a card per movement and mode (the
// latest values, the change, the typical value, the chart); then the
// assessments themselves, each with Amend on its latest version.
export function RangeOfMotionPage() {
  const { id } = useParams<{ id: string }>()
  const patientId = Number(id)
  if (!Number.isInteger(patientId) || patientId < 1) {
    return (
      <Page>
        <p className="text-sm text-destructive">Invalid patient.</p>
      </Page>
    )
  }
  // key: another patient (same route, new :id) is a fresh view.
  return <RangeOfMotionView key={patientId} patientId={patientId} />
}

function RangeOfMotionView({ patientId }: { patientId: number }) {
  const patient = useUser(patientId)
  const record = useRangeOfMotion(patientId)
  const catalogue = useMovementCatalogue()
  // The medical file, to NAME the visit note an assessment is linked to —
  // read only when one is (an audited read of the file: MEDICAL_FILE_VIEWED;
  // the page then shows the notes' type and day). Its failure costs only the
  // names ("a note of the medical file").
  const linked = record.data?.some((assessment) => assessment.medicalFileEntryId !== null) ?? false
  const notes = useMedicalFile(patientId, { enabled: linked })
  const loaded = record.isSuccess && catalogue.isSuccess
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the range of motion', loaded)
  // The catalogue indexed for look-ups (names, typical values, order).
  const index = catalogue.data ? indexCatalogue(catalogue.data) : undefined
  const name = patient.data ? `${patient.data.firstName} ${patient.data.lastName}` : null

  // Off the care team: the backend's 403 — a page that explains it, and
  // nothing about the patient (the medical file page's words).
  if (record.error instanceof ApiError && record.error.statusCode === 403) {
    return (
      <Page>
        <h1 className="text-xl font-semibold">You're not on this patient's care team</h1>
        <p className="text-sm text-muted-foreground">
          Only a patient's care team can open their range of motion.
        </p>
        <Link to="/practitioner/patients" className="text-sm font-medium underline">
          My patients
        </Link>
      </Page>
    )
  }

  return (
    <Page>
      <div className="space-y-3">
        <Link to={patientPagePath(patientId)} className="text-sm text-muted-foreground hover:underline">
          ← {name ?? 'Back to the patient'}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
              Range of motion
            </h1>
            {name && <p className="text-sm text-muted-foreground">{name}</p>}
          </div>
          <Button asChild>
            <Link to={romAssessmentPath(patientId)}>Record an assessment</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Measurements are never edited or deleted. To correct an assessment, amend it: the
          correction is added as a new version, and the original stays in the record. The typical
          value is a textbook guide — the other side is often the better comparison.
        </p>
      </div>

      {record.isError || catalogue.isError ? (
        <LoadError what="the range of motion" queries={[record, catalogue]} />
      ) : !record.isSuccess || !index ? (
        <ListSkeleton label="Loading the range of motion…" rows={2} layout="cards" />
      ) : record.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No measurements yet. Record the first assessment after measuring a joint.
        </p>
      ) : (
        <>
          <section aria-labelledby="rom-movements-heading" className="space-y-3">
            <h2 id="rom-movements-heading" className="text-lg font-semibold">
              Movements
            </h2>
            <MovementCards cards={movementCards(record.data, index)} audience="practitioner" />
          </section>
          <section aria-labelledby="rom-assessments-heading" className="space-y-3">
            <h2 id="rom-assessments-heading" className="text-lg font-semibold">
              Assessments
            </h2>
            <RomAssessmentList
              assessments={record.data}
              catalogue={index}
              notes={notes.data}
              audience="practitioner"
              headingLevel={3}
              amendHref={(assessment) => romAssessmentPath(patientId, { amends: assessment.id })}
            />
          </section>
        </>
      )}
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">{children}</div>
}