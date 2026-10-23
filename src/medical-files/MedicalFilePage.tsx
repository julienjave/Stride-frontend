import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { LoadError } from '@/common/LoadError'
import { readNotice } from '@/common/readNotice'
import { Button } from '@/components/ui/button'
import { useUser } from '@/users/useUser'
import { MedicalFileEntryList } from './MedicalFileEntryList'
import { medicalFileEntryPath, patientPagePath } from './medicalFilePaths'
import { useMedicalFile } from './useMedicalFile'

// The practitioner's view of a patient's medical file —
// `/practitioner/patients/:id/medical-file` (Phase 6, decisions §8). Its OWN
// page, reached from the patient page's link card: opening it is the one
// read the audit log records (MEDICAL_FILE_VIEWED), and only when someone
// came to read it.
//
// The notes, newest first, each with its earlier versions folded under it;
// "Add an entry" and, on each note's latest version, "Amend" — both lead to
// the entry page.
export function MedicalFilePage() {
  const { id } = useParams<{ id: string }>()
  const patientId = Number(id)
  if (!Number.isInteger(patientId) || patientId < 1) {
    return (
      <Page>
        <p className="text-sm text-destructive">Invalid patient.</p>
      </Page>
    )
  }
  // key: another patient's file (same route, new :id) is a fresh view.
  return <MedicalFileView key={patientId} patientId={patientId} />
}

function MedicalFileView({ patientId }: { patientId: number }) {
  const notice = readNotice(useLocation().state)
  // The patient's name for the header and the way back — the same query as
  // the patient page, usually cached by the time this page opens.
  const patient = useUser(patientId)
  const file = useMedicalFile(patientId)
  const name = patient.data ? `${patient.data.firstName} ${patient.data.lastName}` : null

  // Off the care team: the backend's 403 (the list's own check) — a page
  // that explains it, and nothing about the patient.
  if (file.error instanceof ApiError && file.error.statusCode === 403) {
    return (
      <Page>
        <h1 className="text-xl font-semibold">You're not on this patient's care team</h1>
        <p className="text-sm text-muted-foreground">
          Only a patient's care team can open their medical file.
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
            <h1 className="text-xl font-semibold">Medical file</h1>
            {name && <p className="text-sm text-muted-foreground">{name}</p>}
          </div>
          <Button asChild>
            <Link to={medicalFileEntryPath(patientId)}>Add an entry</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Entries are never edited or deleted. To correct one, amend it: the correction is
          added as a new version, and the original stays in the file.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm">
          {notice}
        </p>
      )}

      {file.isError ? (
        <LoadError what="the medical file" queries={[file]} />
      ) : !file.isSuccess ? (
        <p className="text-sm text-muted-foreground">Loading the medical file…</p>
      ) : file.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entries yet. The first one is usually the initial assessment.
        </p>
      ) : (
        <MedicalFileEntryList
          entries={file.data}
          audience="practitioner"
          amendHref={(entry) => medicalFileEntryPath(patientId, entry.id)}
        />
      )}
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">{children}</div>
}