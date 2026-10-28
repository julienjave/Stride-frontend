import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { type FailedQuery, LoadFailure } from '@/common/LoadError'
import { Loading as SharedLoading } from '@/common/Loading'
import { NotAvailable as NotAvailablePage } from '@/common/NotAvailable'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { END_NOTE_MAX_LENGTH } from './sessionRules'

// The pieces every session-flow page shares (the start, session, finish,
// stop and skip pages) — written once since pass (c) brought the third,
// fourth and fifth copies.

// The page's column: phone-first, the same width as the patient home.
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">{children}</div>
}

export function HomeLink() {
  return (
    <Link to="/patient" className="text-sm underline underline-offset-4">
      Back to home
    </Link>
  )
}

// A 404 says both things it can mean, without telling them apart — row
// security makes another patient's program or session invisible, and
// telling "doesn't exist" from "not yours" would confirm it exists. The
// shared shape (`common/NotAvailable`), in the patient's words; the ways out
// are the patient's two places for their programs: home and Sessions.
export function NotAvailable({ what }: { what: 'program' | 'session' }) {
  return (
    <NotAvailablePage
      title={what === 'program' ? 'Program not available' : 'Session not available'}
      links={[
        { to: '/patient', label: 'Back to home' },
        { to: '/patient/sessions', label: 'Your sessions' },
      ]}
    >
      This {what} doesn't exist, or it isn't one of yours.
    </NotAvailablePage>
  )
}

// What a session-flow page shows when its request(s) failed (the six pages
// each wrote it out before, 2026-10-23): "not available" for a 404, else
// the load error with "Try again" and the way home — LoadFailure decides.
export function LoadFailed({
  what,
  queries,
}: {
  what: 'program' | 'session'
  queries: readonly FailedQuery[]
}) {
  return (
    <LoadFailure queries={queries} what={`this ${what}`} notAvailable={<NotAvailable what={what} />}>
      <HomeLink />
    </LoadFailure>
  )
}

// The session pages' loading state: the shared one (`common/Loading.tsx` —
// nothing for 200 ms, then "Loading…" in a status region).
export function Loading() {
  return <SharedLoading />
}

// The optional note beside a reason (≤ 500 — the column is varchar(500)).
// Shared by the Stop and Skip pages.
export function EndNoteField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="end-note">Anything to add? (optional)</Label>
      <Textarea
        id="end-note"
        value={value}
        maxLength={END_NOTE_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        disabled={disabled}
      />
    </div>
  )
}