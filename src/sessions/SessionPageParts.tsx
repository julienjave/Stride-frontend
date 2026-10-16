import type { ReactNode } from 'react'
import { Link } from 'react-router'
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
// telling "doesn't exist" from "not yours" would confirm it exists.
export function NotAvailable({ what }: { what: 'program' | 'session' }) {
  return (
    <>
      <p role="alert" className="text-sm">
        This {what} doesn't exist, or isn't yours.
      </p>
      <HomeLink />
    </>
  )
}

export function Loading() {
  return <p className="text-sm text-muted-foreground">Loading…</p>
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