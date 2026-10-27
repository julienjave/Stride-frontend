import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { saveFile } from '@/common/saveFile'
import { downloadMyRecords } from './api'
import { browserTimeZone, downloadFailureText, FALLBACK_FILE_NAME } from './recordsExportRules'

// "Download my records" on My records (decisions §20, pass 3): a copy of the
// patient's whole health record — the medical file, the programs, the
// sessions — as ONE PDF, made on request and never stored (HIPAA's right of
// access: a copy, in a form the patient can keep or hand to another clinic).
//
// A MUTATION, not a query, although it reads: it runs only when pressed,
// every press is a new copy (the backend audits each one as
// RECORDS_EXPORTED), and nothing is cached — a health record shouldn't sit
// in the app's memory after it was saved.
//
// On its own section, above the notes, and shown whatever the notes' list
// does (still loading, failed, empty): the copy holds more than the notes,
// and comes from a request of its own.
export function DownloadMyRecords() {
  const download = useMutation({
    mutationFn: () => downloadMyRecords(browserTimeZone()),
    onSuccess: ({ blob, fileName }) => saveFile(blob, fileName ?? FALLBACK_FILE_NAME),
  })

  return (
    <section
      aria-labelledby="download-records-heading"
      className="space-y-3 rounded-lg border px-4 py-3"
    >
      <h2 id="download-records-heading" className="text-sm font-medium">
        Download a copy
      </h2>
      <p className="text-sm text-muted-foreground">
        Your whole record as a PDF — these notes, your programs and your sessions — to keep, or to
        give to another clinic. Dates are written in your device's time zone.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => download.mutate()}
        disabled={download.isPending}
      >
        {download.isPending ? 'Preparing your copy…' : 'Download my records'}
      </Button>
      {/* role="status" / "alert": announced when they appear. The file name
          says where to look: browsers save without asking, and a phone shows
          the download only in a corner. */}
      {download.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          Downloaded as {download.data.fileName ?? FALLBACK_FILE_NAME}. Look in your downloads.
        </p>
      )}
      {download.isError && (
        <p role="alert" className="text-sm text-destructive">
          {downloadFailureText(download.error)}
        </p>
      )}
    </section>
  )
}