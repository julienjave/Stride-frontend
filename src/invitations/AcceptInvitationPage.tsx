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

import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { failureText } from '@/api/apiErrors'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useLogout } from '@/auth/useLogout'
import { acceptInvitation, lookupInvitation } from './api'
import { formatExpiry } from './formatExpiry'
import { acceptInvitationSchema, type AcceptInvitationFormValues } from './schemas'
import type { UnusableReason } from './types'
import { Loading } from '@/common/Loading'

// The page an invitation email links to: /accept-invitation?token=…
// The person has no password yet, so no session — this page is public,
// reached OUTSIDE both route guards (see routes.tsx for why not inside
// RequireGuest).

const UNUSABLE_REASONS: readonly string[] = ['accepted', 'revoked', 'expired', 'deactivated']

// "This link can't be used" — as opposed to "something went wrong". The
// backend answers 404 for a link that doesn't exist and 410 Gone (with a
// `reason`) for one that did but no longer works. Both are final: trying
// again can't help, so the page shows the backend's message — written for
// the person, and the one place that wording lives — plus a next step
// chosen from `reason`, never by parsing the English text.
interface Refusal {
  message: string
  reason: UnusableReason | null
}

function getRefusal(error: unknown): Refusal | null {
  if (!(error instanceof ApiError)) return null
  if (error.statusCode !== 404 && error.statusCode !== 410) return null
  const { reason } = error.body
  return {
    message: failureText(error),
    // body fields are `unknown` (see ApiError): narrowed against the known
    // list, so a value this page doesn't know about just means "no
    // particular next step" instead of being trusted blindly.
    reason:
      typeof reason === 'string' && UNUSABLE_REASONS.includes(reason)
        ? (reason as UnusableReason)
        : null,
  }
}

// "Acme Clinic", "Acme Clinic and Beta Physio", "A, B, and C".
// Intl.ListFormat knows each language's rules for joining a list; 'en'
// because the result sits inside an English sentence (unlike the expiry
// date, whose FORMAT follows the viewer's locale).
const clinicList = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

export function AcceptInvitationPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const logoutMutation = useLogout()

  // --- The token: read once, then removed from the address bar ---
  //
  // useState's initializer runs on the first render only, so the token is
  // captured before the effect below takes it out of the URL. Why take it
  // out: an unused invitation link is a key to someone's account, and a
  // URL left in the address bar ends up in the browser's history (a shared
  // computer) and in bookmarks. replace: true rewrites the CURRENT history
  // entry instead of adding one, so even Back doesn't bring it back.
  // The cost: a reload shows "open the link from your email again" — the
  // email's link keeps working until the invitation is accepted.
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  useEffect(() => {
    if (searchParams.has('token')) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // --- Who is this invitation for? ---
  //
  // A POST (the token goes in the body, never a URL), but a READ — so
  // useQuery, not useMutation: it runs by itself when the page opens, and
  // its loading/error/data states are exactly what the page renders from.
  // The token is part of the key: a different token is a different answer.
  const lookup = useQuery({
    queryKey: ['invitations', 'lookup', token],
    queryFn: () => lookupInvitation(token ?? ''),
    // Not while someone is signed in (the page asks them to log out
    // first), and never without a token.
    enabled: token !== null && !currentUser,
    // 404 and 410 are final answers, and the endpoint allows 10 calls a
    // minute: retrying would only spend that allowance. A failure shows a
    // "Try again" button instead — a retry the person chooses.
    retry: false,
    // The answer doesn't change while the page is open; never refetch it
    // behind the person's back (e.g. when the window regains focus).
    staleTime: Infinity,
  })

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    // No automatic login (decisions §3, same as password reset): the
    // person signs in on the real sign-in form, which is where password
    // managers offer to save a new password. The email is passed along
    // so it's already filled in. replace: true — Back shouldn't return to
    // an invitation that's now used.
    onSuccess: () => {
      void navigate('/login', {
        replace: true,
        state: { email: lookup.data?.email, passwordSet: true },
      })
    },
  })

  // --- What to show, first match wins ---

  // Signed in as someone (perhaps someone else, on a shared computer):
  // accepting would set a password on an account that isn't the one in
  // use. Logging out lands on the sign-in page — and the token is already
  // out of the URL — so the person reopens the link from their email.
  if (currentUser) {
    return (
      <Notice heading="You're already signed in">
        <p className="text-sm text-muted-foreground">
          You're signed in as {currentUser.email}. To accept an invitation, log out, then open
          the link from your invitation email again.
        </p>
        <Button onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
          Log out
        </Button>
      </Notice>
    )
  }

  if (token === null) {
    return (
      <Notice heading="Open your invitation link">
        <p className="text-sm text-muted-foreground">
          This page needs the link from your invitation email. Open it again from the email.
        </p>
      </Notice>
    )
  }

  // A refusal can come from the lookup (the link was already dead) or
  // from accepting (it died while the page was open — expired, or replaced
  // by a newer invitation). Either way, the same screen.
  const refusal = getRefusal(lookup.error) ?? getRefusal(acceptMutation.error)
  if (refusal) {
    return (
      <Notice heading="This invitation can't be used">
        <p className="text-sm text-muted-foreground">{refusal.message}</p>
        {refusal.reason === 'accepted' && (
          <p className="text-sm">
            <Link to="/login" className="underline">
              Go to log in
            </Link>
          </p>
        )}
      </Notice>
    )
  }

  if (lookup.isPending) {
    return <Loading className="mx-auto mt-8 max-w-sm px-4" />
  }

  // Any other failure (network down, server error, too many attempts):
  // not a verdict on the link, so offer to try again.
  if (lookup.isError) {
    return (
      <Notice heading="We couldn't load your invitation">
        <p className="text-sm text-destructive">
          {failureText(lookup.error)}
        </p>
        <Button onClick={() => void lookup.refetch()}>Try again</Button>
      </Notice>
    )
  }

  const invitation = lookup.data
  const where =
    invitation.clinicNames.length > 0 ? ` at ${clinicList.format(invitation.clinicNames)}` : ''

  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">Welcome to Stride, {invitation.firstName}</h1>
      <p className="text-sm text-muted-foreground">
        Your account{where} is ready. Choose a password to finish setting it up.
      </p>
      <form
        onSubmit={(e) =>
          void form.handleSubmit(({ password }) => acceptMutation.mutate({ token, password }))(e)
        }
        className="space-y-4"
        noValidate
      >
        {/* Read-only, but there on purpose: a password manager saving a
            new password looks for a username field in the same form
            (autoComplete="username"). Without it, the saved password
            would have no account name attached. */}
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" value={invitation.email} readOnly />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Refusals never reach here (they replace the whole page above);
            this is for the rest — too many attempts, a server error. */}
        {acceptMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(acceptMutation.error)}
          </p>
        )}

        <Button type="submit" disabled={acceptMutation.isPending}>
          {acceptMutation.isPending ? 'Setting password…' : 'Set password'}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        This invitation expires on {formatExpiry(invitation.expiresAt)}.
      </p>
    </div>
  )
}

// The page's frame for every "can't show the form" case: a heading, then
// whatever explains it.
function Notice({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {children}
    </div>
  )
}