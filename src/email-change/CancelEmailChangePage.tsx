import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cancelEmailChangeByLink } from './api'
import { useLinkToken } from './useLinkToken'
import { LinkPageLayout } from './LinkPageLayout'
import { failureText, isAlreadyConfirmed, isDeadLink } from './emailChangeRules'

// /cancel-email-change?token=… — the link in the notice sent to the OLD
// address ("someone asked to change your sign-in email", decisions §12).
// Under no route guard, and acting only on a button, like the confirm page.
//
// Whoever cancels from here may be the account's owner stopping someone who
// knows their password — so the page says plainly what to do next: reset the
// password. Cancelling twice answers the same (the backend writes nothing
// the second time).
export function CancelEmailChangePage() {
  const token = useLinkToken()
  const cancel = useMutation({ mutationFn: () => cancelEmailChangeByLink(token ?? '') })

  if (token === null) {
    return (
      <LinkPageLayout heading="Open your link">
        <p className="text-sm text-muted-foreground">
          This page needs the link from the email about a change of your sign-in address. Open
          it again from that email.
        </p>
      </LinkPageLayout>
    )
  }

  if (cancel.isSuccess) {
    return (
      <LinkPageLayout heading="The change is cancelled">
        <p role="status" className="text-sm text-muted-foreground">
          Your account keeps its current email address. If you didn't ask for this change,
          someone may know your password — reset it now.
        </p>
        <Link to="/forgot-password" className="text-sm font-medium underline underline-offset-4">
          Reset my password
        </Link>
      </LinkPageLayout>
    )
  }

  if (isDeadLink(cancel.error)) {
    return (
      <LinkPageLayout heading="This link can't be used">
        <p className="text-sm text-muted-foreground">
          {failureText(cancel.error)}. If you're worried about your account, reset your password.
        </p>
        <Link to="/forgot-password" className="text-sm font-medium underline underline-offset-4">
          Reset my password
        </Link>
      </LinkPageLayout>
    )
  }

  if (isAlreadyConfirmed(cancel.error)) {
    return (
      <LinkPageLayout heading="It's too late to cancel">
        <p className="text-sm text-muted-foreground">{failureText(cancel.error)}</p>
      </LinkPageLayout>
    )
  }

  return (
    <LinkPageLayout heading="Stop this change of email address?">
      <p className="text-sm text-muted-foreground">
        Someone signed in to your Stride account asked to change the address it signs in with.
        If it wasn't you, cancel the change, then reset your password.
      </p>
      {cancel.isError && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(cancel.error)}
        </p>
      )}
      <Button onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? 'Cancelling…' : 'Cancel the change'}
      </Button>
    </LinkPageLayout>
  )
}