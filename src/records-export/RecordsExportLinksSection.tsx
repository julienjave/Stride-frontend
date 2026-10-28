import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { failureText } from '@/api/apiErrors'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { cn } from '@/lib/utils'
import { listRecordsExportLinks, recordsExportLinksQueryKey, sendRecordsExportLink } from './api'
import {
  DATE_OF_BIRTH_ATTEMPTS,
  describeLink,
  formatLinkMoment,
  LINK_VALIDITY_HOURS,
} from './recordsExportRules'
import { ListSkeleton } from '@/common/Loading'

// The admin's "Email a download link" on a patient's user page (decisions
// §20, pass 3) — for a patient who can't sign in (deactivated, or never
// chose a password) and asks the clinic for their record. Offered on EVERY
// patient (the person's choice: people ask without checking whether they
// could download it themselves; the email tells those who can).
//
// The admin never sees the record (decisions §16): the link goes to the
// patient's own address, and the date of birth is asked before the
// download. What the admin sees is the links: when each was sent, whether
// its email left, and what became of it.

interface RecordsExportLinksSectionProps {
  patientId: number
  firstName: string
  lastName: string
  // The address on the account — where the link goes. Not editable here: an
  // email change is the account holder's own (decisions §12).
  email: string
}

const GREEN_BOX = 'rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm'
// Amber, not red, when the email didn't leave: the link exists, nothing is
// broken, another one just needs sending — the same box as the invitations'.
const AMBER_BOX = 'rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm'

export function RecordsExportLinksSection({
  patientId,
  firstName,
  lastName,
  email,
}: RecordsExportLinksSectionProps) {
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const links = useQuery({
    queryKey: recordsExportLinksQueryKey(patientId),
    queryFn: () => listRecordsExportLinks(patientId),
  })
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the links sent', links.isSuccess)

  // Sending changes more than the row it returns (the open link, if any, is
  // closed as "replaced"), so the list is fetched again rather than patched
  // by hand: the server is the one that knows. Also after a refusal — the
  // 409 ("another link was sent at the same moment") is exactly the case
  // where the list on screen is out of date.
  const refreshLinks = () =>
    queryClient.invalidateQueries({ queryKey: recordsExportLinksQueryKey(patientId) })
  const send = useMutation({
    mutationFn: () => sendRecordsExportLink(patientId),
    onSuccess: () => {
      setIsConfirmOpen(false)
      void refreshLinks()
    },
    onError: () => void refreshLinks(),
  })

  const name = `${firstName} ${lastName}`
  const openLink = links.data?.find((link) => link.status === 'open')
  const lastSent = send.data

  return (
    <section
      aria-labelledby="records-export-heading"
      className="space-y-3 rounded-lg border px-4 py-3"
    >
      <h2 ref={heading} tabIndex={-1} id="records-export-heading" className="text-sm font-medium outline-none">
        Health record copy
      </h2>
      <p className="text-sm text-muted-foreground">
        Email {firstName} a link to download their health record — their medical file, programs and
        sessions, as a PDF. The link works once, for {LINK_VALIDITY_HOURS} hours, and asks for their
        date of birth first.
      </p>

      {/* What the last send did, while it's still the current story: green
          when the email left, amber when it didn't. role="status": read out
          when it appears. */}
      {lastSent && (
        <p role="status" className={lastSent.emailSent ? GREEN_BOX : AMBER_BOX}>
          {lastSent.emailSent
            ? `A download link was emailed to ${email}. It works until ${formatLinkMoment(lastSent.expiresAt)}.`
            : "A link was created, but the email couldn't be sent. Try sending another link."}
        </p>
      )}

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open)
          // A refusal shown in the dialog belongs to that attempt: opening
          // it again starts clean.
          if (open) send.reset()
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Email a download link
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {name} a download link?</DialogTitle>
            {/* Says exactly where it goes and what it does — and, when
                there is one, which link stops working — rather than a vague
                "are you sure?". */}
            <DialogDescription>
              It goes to {email}, the address on the account. It works once, for{' '}
              {LINK_VALIDITY_HOURS} hours, and asks for {firstName}'s date of birth before the
              download — {DATE_OF_BIRTH_ATTEMPTS} wrong dates lock it.
            </DialogDescription>
          </DialogHeader>
          {openLink && (
            <p className="text-sm">
              The link sent on {formatLinkMoment(openLink.createdAt)} stops working.
            </p>
          )}
          {send.isError && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(send.error)}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={send.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={() => send.mutate()} disabled={send.isPending}>
              {send.isPending ? 'Sending…' : 'Send the link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {links.isError ? (
        <LoadError what="the links sent" queries={[links]} />
      ) : !links.isSuccess ? (
        <ListSkeleton label="Loading the links sent…" rows={2} />
      ) : links.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No link has been sent yet.</p>
      ) : (
        // Newest first, as the backend lists them: the first is the one
        // that matters now, the rest are history.
        <ul aria-label="Links sent" className="space-y-2">
          {links.data.map((link) => {
            const { label, text, needsAction } = describeLink(link)
            return (
              <li
                key={link.id}
                className={cn('space-y-1', needsAction ? AMBER_BOX : 'text-sm')}
              >
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{label}</span>
                <p className={needsAction ? undefined : 'text-muted-foreground'}>{text}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}