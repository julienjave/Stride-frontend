import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveFile } from '@/common/saveFile'
import { downloadWithLink } from './api'
import {
  attemptsLeftText,
  browserTimeZone,
  dateOfBirthError,
  downloadFailureText,
  FALLBACK_FILE_NAME,
  linkRefusal,
  UNUSABLE_WARNINGS,
} from './recordsExportRules'

// The page the records email links to — `/records-download?token=…`
// (decisions §20, pass 3). PUBLIC: the patient may be unable to sign in
// (that's why the clinic emailed them). The token and the date of birth
// are the proof; nothing here needs a session.
//
// The same shape as the other pages an email links to (the invitation, the
// password reset), with one deliberate difference: NOTHING is sent when the
// page opens. Those pages check their link on load; this one waits for the
// button. Mail scanners — the services that open every link in an email to
// check it for malware, before the person reads it — would otherwise reach
// the server first. A check costs nothing; here, the first request that
// gets through spends the link (one download) or counts a wrong date. So
// the page asks for the date of birth, and only a press sends it.
//
// Not behind a guard, like the reset page — but unlike it, a signed-in
// visitor isn't asked to log out: downloading through a link changes no
// account and uses no session, so whoever is signed in doesn't matter.
export function RecordsDownloadPage() {
  // useState's initialiser runs on the FIRST render only: the token survives
  // its removal from the address just below. Why remove it: until it's used,
  // the link is a key to a health record, and an address left in the bar
  // ends up in the browser's history (a shared computer) and bookmarks.
  // replace: true rewrites the current history entry, so Back doesn't bring
  // it back either. The cost: a reload says "open the link again" — the
  // email's link keeps working until it is used.
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const [dateOfBirth, setDateOfBirth] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const download = useMutation({
    mutationFn: (date: string) =>
      downloadWithLink({ token: token ?? '', dateOfBirth: date, timeZone: browserTimeZone() }),
    onSuccess: ({ blob, fileName }) => saveFile(blob, fileName ?? FALLBACK_FILE_NAME),
  })

  if (token === null) {
    return (
      <Notice heading="Open your download link">
        <p className="text-sm text-muted-foreground">
          This page needs the link from the email your clinic sent. Open it again from the email.
        </p>
      </Notice>
    )
  }

  // Done: the link is spent, so the form would only earn a "used" refusal.
  if (download.isSuccess) {
    return (
      <Notice heading="Your record was downloaded">
        <p role="status" className="text-sm text-muted-foreground">
          Saved as {download.data.fileName ?? FALLBACK_FILE_NAME}. Look in your downloads.
        </p>
        <p className="text-sm text-muted-foreground">
          This link has now been used. If you need another copy, ask your clinic for a new link.
        </p>
      </Notice>
    )
  }

  // A final answer about the LINK replaces the form: trying again can't
  // change it. The heading is the one the app's other link pages use; the
  // backend's message says why and names the next step; `reason` — never
  // the English — picks a warning to add when someone else may have the link.
  const refusal = linkRefusal(download.error)
  if (refusal?.kind === 'not_valid') {
    return (
      <Notice heading="This link isn't valid">
        <p className="text-sm text-muted-foreground">
          {refusal.message}. Check that you opened the whole link from the email — some mail
          programs cut long links. If it still doesn't work, ask your clinic for a new one.
        </p>
      </Notice>
    )
  }
  if (refusal?.kind === 'unusable') {
    const warning = refusal.reason ? UNUSABLE_WARNINGS[refusal.reason] : undefined
    return (
      <Notice heading="This link can't be used">
        <p className="text-sm text-muted-foreground">{refusal.message}</p>
        {warning && <p className="text-sm">{warning}</p>}
      </Notice>
    )
  }

  // The page's own check first (a date chosen); the backend checks the rest.
  // noValidate on the form: the browser's own bubbles would show instead of
  // the app's message, in the browser's language and style.
  function submit(event: FormEvent) {
    event.preventDefault()
    const error = dateOfBirthError(dateOfBirth)
    setFieldError(error)
    if (error === null) download.mutate(dateOfBirth)
  }

  const describedBy = fieldError ? 'dateOfBirth-error' : undefined
  return (
    <div className="mx-auto mt-8 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">Download your health record</h1>
      <p className="text-sm text-muted-foreground">
        Your clinic sent you this link to download a copy of your health record — your medical
        file, programs and sessions, as a PDF. To check it's you, enter your date of birth.
      </p>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          {/* type="date": the browser's own date picker, and a value always
              in YYYY-MM-DD whatever the language shows — the format the
              backend compares. autoComplete="bday": the browser may offer
              the date it knows. */}
          <Input
            id="dateOfBirth"
            type="date"
            autoComplete="bday"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            aria-invalid={fieldError !== null}
            aria-describedby={describedBy}
          />
          {fieldError && (
            <p id="dateOfBirth-error" className="text-sm text-destructive">
              {fieldError}
            </p>
          )}
        </div>
        {/* A wrong date: the backend's words, and how many tries remain —
            the limit is no secret (the email states it), and someone who
            mistyped deserves to know before the last one. */}
        {refusal?.kind === 'wrong_date' ? (
          <p role="alert" className="text-sm text-destructive">
            {refusal.message}{' '}
            {refusal.attemptsLeft !== null && attemptsLeftText(refusal.attemptsLeft)}
          </p>
        ) : (
          download.isError && (
            <p role="alert" className="text-sm text-destructive">
              {downloadFailureText(download.error)}
            </p>
          )
        )}
        <Button type="submit" disabled={download.isPending}>
          {download.isPending ? 'Preparing your copy…' : 'Download my records'}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        The link works once. Dates in the copy are written in this device's time zone.
      </p>
    </div>
  )
}

// The page's frame for every "no form" case: a heading, then what explains it.
function Notice({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {children}
    </div>
  )
}