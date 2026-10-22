import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cancelPendingEmailChange } from './api'
import { usePendingEmailChange, pendingEmailChangeQueryKey } from './usePendingEmailChange'
import { CHANGE_EMAIL_PATH, failureText, formatLinkExpiry } from './emailChangeRules'

// The Email row of the person's OWN profile (decisions §12): the address,
// "Change" (its own page, /profile/email), and — while a change waits for
// its confirmation — a notice under the address with Cancel and "Change to
// another address". Laid out like the profile's other rows (label above
// value, the action on the right).
//
// Only on /profile: changing an email is self-service, so the admin's user
// page and the practitioner's patient page show the plain read-only row
// (ProfileFields decides).
export function EmailRow({ email }: { email: string }) {
  const queryClient = useQueryClient()
  const pending = usePendingEmailChange()
  const cancel = useMutation({
    mutationFn: cancelPendingEmailChange,
    // A 204 means nothing is waiting any more — exactly what the cache is
    // told (no second request to ask what the answer already says).
    onSuccess: () => queryClient.setQueryData(pendingEmailChangeQueryKey, null),
  })
  const waiting = pending.data ?? null

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="wrap-break-word">{email}</p>
        </div>
        {/* A link, not a button: it opens a page. Named "Change Email" like
            the other rows' "Edit Phone" — a page of "Change" buttons
            couldn't be told apart. */}
        {!waiting && (
          <Button asChild variant="ghost" size="sm">
            <Link to={CHANGE_EMAIL_PATH} aria-label="Change Email">
              Change
            </Link>
          </Button>
        )}
      </div>

      {waiting && (
        <div className="space-y-2 rounded-md border border-dashed px-3 py-2">
          <p className="text-sm">
            Waiting for confirmation of{' '}
            <span className="font-medium wrap-break-word">{waiting.newEmail}</span>. Open the
            link we sent there before {formatLinkExpiry(waiting.expiresAt)}. Until then, you
            sign in with your current address.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel the change'}
            </Button>
            <Link
              to={CHANGE_EMAIL_PATH}
              className="text-sm underline underline-offset-4"
            >
              Change to another address
            </Link>
          </div>
          {cancel.isError && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(cancel.error)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}