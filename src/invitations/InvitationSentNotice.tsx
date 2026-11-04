/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { failureText } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sendInvitation } from './api'
import { formatExpiry } from './formatExpiry'
import type { CreatedUserInvitation } from './types'
import { refreshAttention } from '@/users/attention'

interface InvitationSentNoticeProps {
  // The account just created, whose invitation this reports.
  userId: number
  // The invitation POST /users answered with: its `emailSent` says whether
  // the email actually went out.
  invitation: CreatedUserInvitation
  // The first line — what was created, in the caller's words ("Created Jo
  // Novak (…) as patient." for an admin, "Invited Jo Novak." for a
  // practitioner). Everything after it is the same for both.
  children: ReactNode
}

// The confirmation shown after creating an account (admin "Add a user",
// practitioner "Invite a new patient"): green when the invitation email was
// sent, amber with "Send the invitation again" when it couldn't be. Moved
// out of CreateUserPage on 2026-10-08 so both forms share it — including
// the resend logic, which is the part worth not writing twice.
//
// The CALLER must give it `key={userId}`. A key tells React "this is a
// different thing": when the next account is created, React throws this
// component away and mounts a fresh one, so its state (the resent
// invitation, the resend error) starts over by construction. Without the
// key, React would reuse this instance for the next account and show the
// PREVIOUS account's resend result. (CreateUserPage used to clear that
// state by hand with `resendMutation.reset()`; the key replaces that.)
export function InvitationSentNotice({
  userId,
  invitation: createdInvitation,
  children,
}: InvitationSentNoticeProps) {
  // Starts as the invitation the account was created with, and is replaced
  // by the new one after "Send again" — its emailSent says whether THAT
  // attempt worked. Copying a prop into state is normally a trap (the
  // state ignores later prop changes); here it's exactly the intent, and
  // the key above makes a new account a new component anyway.
  const [invitation, setInvitation] = useState(createdInvitation)

  // Only offered when the email failed: the account and its invitation
  // exist either way, so the fix is sending a new one — not creating the
  // account again (that would be a 409, email already taken).
  const queryClient = useQueryClient()
  const resendMutation = useMutation({
    mutationFn: () => sendInvitation(userId),
    onSuccess: (sent) => {
      setInvitation({
        id: sent.id,
        status: sent.status,
        expiresAt: sent.expiresAt,
        emailSent: sent.emailSent,
      })
      // The account was on the admin home's "Invitations to send again"
      // (its email had failed); a new invitation may take it off.
      void refreshAttention(queryClient)
    },
  })

  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border p-3 text-sm',
        invitation.emailSent
          ? 'space-y-1 border-green-600/30 bg-green-600/10'
          : 'space-y-2 border-amber-600/40 bg-amber-500/10',
      )}
    >
      <p>{children}</p>
      {invitation.emailSent ? (
        <p>
          We emailed them an invitation to choose their password. The link works until{' '}
          {formatExpiry(invitation.expiresAt)}.
        </p>
      ) : (
        <>
          <p>
            The invitation email could not be sent. The account exists — send the invitation again
            so they can choose their password.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
          >
            {resendMutation.isPending ? 'Sending…' : 'Send the invitation again'}
          </Button>
          {resendMutation.isError && (
            <p className="text-destructive">
              {failureText(resendMutation.error)}
            </p>
          )}
        </>
      )}
    </div>
  )
}