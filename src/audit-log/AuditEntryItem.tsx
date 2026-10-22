import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuditEntryDetails } from './AuditEntryDetails'
import { actionLabel, formatEntryMoment, KIND_LABEL } from './auditWording'
import type { AuditLogEntry, AuditPerson } from './types'

const fullName = (person: AuditPerson) => `${person.firstName} ${person.lastName}`

// One entry, as the person chose (2026-10-22): a line with WHEN · KIND ·
// AREA, the action in words, who acted → whom it is about, and the details
// behind a toggle.
//
// The toggle is a button with aria-expanded / aria-controls, not a native
// <details>: the medical file's notes do the same (deep-dive §2.2) — a
// closed <details> hides its content from the accessibility tree in some
// browsers and not in jsdom, so tests and real browsers would disagree.
export function AuditEntryItem({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const headingId = useId()
  const detailsId = useId()
  // A patient's own session, a sign-in: the entry is about the person who
  // acted — one name says it all.
  const otherPerson =
    entry.target !== null && entry.target.id !== entry.performer.id ? entry.target : null

  return (
    <li>
      <article aria-labelledby={headingId} className="space-y-1 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <time dateTime={entry.createdAt}>{formatEntryMoment(entry.createdAt)}</time>
          {' · '}
          <span className="rounded border px-1 font-medium uppercase tracking-wide">
            {KIND_LABEL[entry.kind]}
          </span>
          {' · '}
          {entry.area}
        </p>
        <h2 id={headingId} className="text-sm font-medium">
          {actionLabel(entry.action)}
        </h2>
        <p className="text-sm">
          {fullName(entry.performer)}
          {otherPerson && (
            <>
              {' '}
              {/* Seen as an arrow, heard as "about". */}
              <span aria-hidden="true">→</span>
              <span className="sr-only">about</span> {fullName(otherPerson)}
            </>
          )}
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          {open ? 'Hide details' : 'Details'}
        </Button>
        {open && (
          <div id={detailsId}>
            <AuditEntryDetails entry={entry} />
          </div>
        )}
      </article>
    </li>
  )
}