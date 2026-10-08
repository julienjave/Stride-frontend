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
import { ApiError } from '@/api/client'
import { invitationsQueryKey, listInvitations, revokeInvitation, sendInvitation } from './api'
import { formatExpiry } from './formatExpiry'
import type { InvitationSummary } from './types'

// Where an account's invitation stands, with what can be done about it.
// Props, not a route parameter: the admin user page uses it today, and the
// practitioner's patient page will too (the backend allows the patient's
// care team the same three calls).

interface InvitationStatusProps {
  userId: number
  // For the dialog and the "emailed to …" confirmation.
  userName: string
  email: string
  // A deactivated account can't be sent an invitation (the backend
  // answers 409), so the button isn't offered.
  isActive: boolean
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.messages.join(', ') : 'Something went wrong'
}

function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

// A pending invitation whose email never left (the mail server was
// unreachable when it was created). Only "pending" matters: once accepted,
// expired or revoked, whether its email went out no longer changes what
// can be done.
function emailFailed(invitation: InvitationSummary): boolean {
  return invitation.status === 'pending' && invitation.emailSentAt === null
}

// One sentence per status. The newest invitation IS the account's state:
// older ones are history (a resend revokes the previous one).
function describe(invitation: InvitationSummary): string {
  switch (invitation.status) {
    case 'pending':
      // The invitation exists either way; whether its email ever left is
      // recorded separately (emailSentAt). Saying "Sent" for one that
      // wasn't would hide the reason the person never got the link.
      return emailFailed(invitation)
        ? `Created by ${personName(invitation.invitedBy)}, but the email couldn't be sent, so the link hasn't reached them. Send it again.`
        : `Sent by ${personName(invitation.invitedBy)}. The link works until ${formatExpiry(invitation.expiresAt)}.`
    case 'accepted':
      return 'Accepted — the account is set up.'
    case 'expired':
      return `The invitation expired on ${formatExpiry(invitation.expiresAt)}. The account can't be used until a new one is sent.`
    case 'revoked':
      return invitation.revokedBy
        ? `The invitation was revoked by ${personName(invitation.revokedBy)}. The account can't be used until a new one is sent.`
        : "The invitation was revoked. The account can't be used until a new one is sent."
  }
}

const STATUS_LABELS: Record<InvitationSummary['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
}

export function InvitationStatus({ userId, userName, email, isActive }: InvitationStatusProps) {
  const queryClient = useQueryClient()
  const [isRevokeOpen, setIsRevokeOpen] = useState(false)

  const invitations = useQuery({
    queryKey: invitationsQueryKey(userId),
    queryFn: () => listInvitations(userId),
  })

  // Both actions change more than the one row they return (a resend also
  // closes the previous invitation), so the history is fetched again
  // rather than patched by hand: the server is the one that knows.
  const refreshHistory = () =>
    queryClient.invalidateQueries({ queryKey: invitationsQueryKey(userId) })

  const sendMutation = useMutation({
    mutationFn: () => sendInvitation(userId),
    onSuccess: () => void refreshHistory(),
  })

  const revokeMutation = useMutation({
    mutationFn: () => revokeInvitation(userId),
    onSuccess: () => {
      // reset() empties sendMutation.data: an "emailed to …" line from an
      // earlier send would describe an invitation that no longer works.
      sendMutation.reset()
      setIsRevokeOpen(false)
      void refreshHistory()
    },
  })

  if (invitations.isPending) {
    return <p className="text-sm text-muted-foreground">Loading invitation…</p>
  }

  if (invitations.isError) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load the invitation: {errorText(invitations.error)}
      </p>
    )
  }

  // No history at all: an account that never needed an invitation (the
  // founding admin, or one created before invitations existed). Nothing
  // to show, nothing to do.
  const latest = invitations.data[0]
  if (!latest) {
    return null
  }

  // What the last "send" returned, while it's still the current story —
  // used to say whether its email went out.
  const lastSent = sendMutation.data
  const isPending = latest.status === 'pending'
  // Pending: "send again" replaces the link. Expired / revoked: the only
  // way in. Accepted: the person has a password — the backend refuses.
  const canSend = latest.status !== 'accepted' && isActive

  return (
    <section aria-labelledby="invitation-heading" className="space-y-3 rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="invitation-heading" className="text-sm font-medium">
          Invitation
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {STATUS_LABELS[latest.status]}
        </span>
      </div>

      {/* Amber when the email never left: something to act on, though
          nothing is broken — the same box as the other "email couldn't be
          sent" messages. */}
      <p
        className={
          emailFailed(latest)
            ? 'rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm'
            : 'text-sm text-muted-foreground'
        }
      >
        {describe(latest)}
      </p>

      {latest.status !== 'accepted' && !isActive && (
        <p className="text-sm text-muted-foreground">
          Reactivate the account to send a new invitation.
        </p>
      )}

      {/* role="status": announced when it appears. Green when the email
          went out; amber, not red, when it didn't — the invitation exists,
          nothing is broken, the email just needs another try. The same
          two boxes as the create-user confirmation. */}
      {lastSent && (
        <p
          role="status"
          className={
            lastSent.emailSent
              ? 'rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm'
              : 'rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm'
          }
        >
          {lastSent.emailSent
            ? `A new invitation was emailed to ${email}.`
            : "A new invitation was created, but the email couldn't be sent. Try sending it again."}
        </p>
      )}

      {sendMutation.isError && (
        <p className="text-sm text-destructive">{errorText(sendMutation.error)}</p>
      )}

      {(canSend || isPending) && (
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending
                ? 'Sending…'
                : isPending
                  ? 'Send again'
                  : 'Send a new invitation'}
            </Button>
          )}

          {isPending && (
            <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Revoke
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke {userName}'s invitation?</DialogTitle>
                  {/* Says exactly what happens — and what doesn't (the
                      account stays) — rather than a vague "are you sure?". */}
                  <DialogDescription>
                    The link in the email stops working at once. The account stays, but can't be
                    used until a new invitation is sent.
                  </DialogDescription>
                </DialogHeader>

                {revokeMutation.isError && (
                  <p className="text-sm text-destructive">{errorText(revokeMutation.error)}</p>
                )}

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={revokeMutation.isPending}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={() => revokeMutation.mutate()}
                    disabled={revokeMutation.isPending}
                  >
                    {revokeMutation.isPending ? 'Revoking…' : 'Revoke invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </section>
  )
}