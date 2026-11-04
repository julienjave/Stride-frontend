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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { currentUserQueryKey, useCurrentUser } from '@/auth/useCurrentUser'
import { fetchCurrentUser } from '@/auth/api'
import { confirmEmailChange } from './api'
import { useLinkToken } from './useLinkToken'
import { LinkPageLayout } from './LinkPageLayout'
import { CHANGE_EMAIL_PATH, failureText, isAddressTaken, isDeadLink } from './emailChangeRules'

// /confirm-email?token=… — the link emailed to the NEW address (decisions
// §12). Under no route guard: it may be opened on any device, signed in or
// not. It ACTS ONLY ON A BUTTON (the person's choice): mail scanners and
// link previews open links by themselves, and must not change anyone's
// email.
//
// Confirming signs the account out on every other device (the person's
// choice). This browser stays signed in only if it is signed in as the
// account — then "Back to my profile"; otherwise "Log in" with the new
// address filled in.
export function ConfirmEmailPage() {
  const token = useLinkToken()
  const queryClient = useQueryClient()
  const { data: me } = useCurrentUser()

  const confirm = useMutation({
    mutationFn: () => confirmEmailChange(token ?? ''),
    // Everything about "who am I and what is my email" is now stale: their
    // profile, the pending change — and who is signed in here. That last one
    // is READ AGAIN before the page says anything (returning the promise
    // keeps the mutation pending until then): the backend kept this
    // browser's session only if it is the account's, and only the fresh
    // answer can say which link to offer. Fetched explicitly — the
    // current-user query is disabled, so an invalidation wouldn't refetch it
    // — and only when someone IS signed in here: for a visitor, /auth/me is
    // a 401, which the app's global handler turns into a trip to sign-in.
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['email-change'] })
      if (me) {
        await queryClient
          .fetchQuery({ queryKey: currentUserQueryKey, queryFn: fetchCurrentUser, staleTime: 0 })
          .catch(() => undefined)
      }
    },
  })

  if (token === null) {
    return (
      <LinkPageLayout heading="Open your confirmation link">
        <p className="text-sm text-muted-foreground">
          This page needs the link we emailed to your new address. Open it again from that email.
        </p>
      </LinkPageLayout>
    )
  }

  if (confirm.isSuccess) {
    const { email } = confirm.data
    return (
      <LinkPageLayout heading="Your email address is changed">
        <p role="status" className="text-sm text-muted-foreground">
          You now sign in with <strong>{email}</strong>. You've been signed out on your other
          devices.
        </p>
        {me?.email === email ? (
          <Link to="/profile" className="text-sm font-medium underline underline-offset-4">
            Back to my profile
          </Link>
        ) : (
          <Link
            to="/login"
            state={{ email }}
            className="text-sm font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        )}
      </LinkPageLayout>
    )
  }

  if (isDeadLink(confirm.error)) {
    return (
      <LinkPageLayout heading="This link can't be used">
        <p className="text-sm text-muted-foreground">
          {failureText(confirm.error)}. Confirmation links work for 24 hours, and only once — a
          newer request replaces an older link.
        </p>
        <Link to={CHANGE_EMAIL_PATH} className="text-sm font-medium underline underline-offset-4">
          Ask for the change again
        </Link>
      </LinkPageLayout>
    )
  }

  // The link is good, but someone took the address since: nothing changed.
  if (isAddressTaken(confirm.error)) {
    return (
      <LinkPageLayout heading="This address can't be used">
        <p className="text-sm text-muted-foreground">{failureText(confirm.error)}.</p>
        <Link to={CHANGE_EMAIL_PATH} className="text-sm font-medium underline underline-offset-4">
          Choose another address
        </Link>
      </LinkPageLayout>
    )
  }

  return (
    <LinkPageLayout heading="Confirm your new email address">
      <p className="text-sm text-muted-foreground">
        This makes this address the one you sign in with, and signs you out on your other
        devices.
      </p>
      {confirm.isError && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(confirm.error)}
        </p>
      )}
      <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
        {confirm.isPending ? 'Confirming…' : 'Confirm my new address'}
      </Button>
    </LinkPageLayout>
  )
}