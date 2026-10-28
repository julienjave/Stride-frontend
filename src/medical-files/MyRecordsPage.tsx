import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { DownloadMyRecords } from '@/records-export/DownloadMyRecords'
import { MedicalFileEntryList } from './MedicalFileEntryList'
import { useMyMedicalFile } from './useMedicalFile'

// The patient's own medical file, read-only — "My records", `/profile/records`
// (Phase 6, decisions §2 and §8): in the profile area, not a tab — the
// records belong to the patient, and the tab bar is for what they do every
// day. Reached from the account menu and from the profile page.
//
// The whole file (HIPAA's right of access), in plain words: the same list as
// the practitioner's, with the patient's section names and "Corrects the
// entry of …" for an amendment. Opening it is recorded in the audit log like
// any read of the file — the patient's own included.
//
// Above the notes, "Download a copy" (decisions §20, pass 3): the whole
// record as a PDF — the notes, the programs and the sessions.
export function MyRecordsPage() {
  const file = useMyMedicalFile()
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('your records', file.isSuccess)

  return (
    <Page heading={heading}>
      {file.isError ? (
        <LoadError what="your records" queries={[file]} />
      ) : !file.isSuccess ? (
        <p className="text-sm text-muted-foreground">Loading your records…</p>
      ) : file.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your practitioners haven't written anything in your file yet.
        </p>
      ) : (
        <MedicalFileEntryList entries={file.data} audience="patient" />
      )}
    </Page>
  )
}

function Page({ children, heading }: { children: ReactNode; heading: Ref<HTMLHeadingElement> }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <div className="space-y-3">
        <Link to="/profile" className="text-sm text-muted-foreground hover:underline">
          ← My profile
        </Link>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          My records
        </h1>
        <p className="text-sm text-muted-foreground">
          The notes your practitioners write about your care: assessments, progress notes and
          summaries. A note is never changed afterwards — a correction is added as a new
          version, and the original stays visible.
        </p>
      </div>
      <DownloadMyRecords />
      {children}
    </div>
  )
}