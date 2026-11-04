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
import { checkResetLink, resetPassword } from './api'
import { newPasswordSchema, type NewPasswordFormValues } from './newPasswordSchema'
import { failureText, formatLinkExpiry, isDeadLink } from './passwordResetRules'
import { useCurrentUser } from './useCurrentUser'
import { useLogout } from './useLogout'

// The page a password reset email links to — `/reset-password?token=…`
// (Phase 6, 2026-10-21). The same shape as the invitation's accept page:
//   1. The token is read from the address ONCE, then removed from it (an
//      address with a key to the account mustn't sit in the history, or be
//      sent to another site as a Referer).
//   2. The link is CHECKED before anything is typed (the person's choice):
//      POST /auth/reset-password/check — a pure read; a dead link is said at
//      once, with a way to ask for a new one.
//   3. The new password, typed twice; on success the backend has ended every
//      session of the account, and the sign-in page says so.
// No route guard (like the accept page): a signed-in visitor — a shared
// computer — is asked to log out first instead of being bounced away
// without a word.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const logout = useLogout()

  // useState's initialiser runs on the FIRST render only: the token
  // survives its removal from the address just below.
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const check = useQuery({
    queryKey: ['password-reset', 'check', token],
    queryFn: () => checkResetLink(token ?? ''),
    // Not while signed in (the page asks to log out first), not without a
    // token. Never retried (a 400 stays a 400), never refetched (the answer
    // is about a link that only gets older; the reset re-checks anyway).
    enabled: token !== null && !currentUser,
    retry: false,
    staleTime: Infinity,
  })

  const form = useForm<NewPasswordFormValues>({ resolver: zodResolver(newPasswordSchema) })
  const reset = useMutation({
    mutationFn: (password: string) => resetPassword(token ?? '', password),
    onSuccess: () =>
      void navigate('/login', {
        // replace: Back from the sign-in page doesn't reopen a spent link.
        replace: true,
        state: { email: check.data?.email, passwordReset: true },
      }),
  })

  if (currentUser) {
    return (
      <Notice heading="You're already signed in">
        <p className="text-sm text-muted-foreground">
          You're signed in as {currentUser.email}. To reset a password, log out, then open the
          link from your email again.
        </p>
        <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
          Log out
        </Button>
      </Notice>
    )
  }

  if (token === null) {
    return (
      <Notice heading="Open your reset link">
        <p className="text-sm text-muted-foreground">
          This page needs the link from your password reset email. Open it again from the email,
          or ask for a new one.
        </p>
        <NewLinkLinks />
      </Notice>
    )
  }

  // Dead — found by the check, or by the reset itself (the link expired, or
  // was used in another tab, while the form was open).
  const deadError = [check.error, reset.error].find(isDeadLink)
  if (deadError) {
    return (
      <Notice heading="This link can't be used">
        <p className="text-sm text-muted-foreground">
          {failureText(deadError)}. Links work for 1 hour, and only once — a newer request
          replaces an older link.
        </p>
        <NewLinkLinks />
      </Notice>
    )
  }

  if (check.isPending) {
    return (
      <p role="status" className="mx-auto mt-8 max-w-sm px-4 text-sm text-muted-foreground">
        Checking your link…
      </p>
    )
  }

  if (check.isError) {
    // Anything but a dead link: too many requests, the server, the network.
    return (
      <Notice heading="We couldn't check your link">
        <p role="alert" className="text-sm text-destructive">
          {failureText(check.error)}
        </p>
        <Button onClick={() => void check.refetch()}>Try again</Button>
      </Notice>
    )
  }

  const { email, expiresAt } = check.data
  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <form
        onSubmit={(e) => void form.handleSubmit(({ password }) => reset.mutate(password))(e)}
        className="space-y-4"
        noValidate
      >
        {/* Read-only, but there on purpose: a password manager saving the
            new password looks for a username in the same form
            (autoComplete="username") — the accept page does the same. */}
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" value={email} readOnly />
        </div>
        <PasswordField
          id="password"
          label="New password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm the new password"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        {/* A dead link replaces the page (above); this is for the rest. */}
        {reset.isError && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(reset.error)}
          </p>
        )}
        <Button type="submit" disabled={reset.isPending}>
          {reset.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        This link works until {formatLinkExpiry(expiresAt)}. Changing your password signs you out
        on every device.
      </p>
    </div>
  )
}

function PasswordField({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error: string | undefined } & ReturnType<
  ReturnType<typeof useForm<NewPasswordFormValues>>['register']
>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function NewLinkLinks() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <Link to="/forgot-password" className="font-medium underline underline-offset-4">
        Request a new link
      </Link>
      <Link to="/login" className="underline underline-offset-4">
        Back to log in
      </Link>
    </div>
  )
}

function Notice({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {children}
    </div>
  )
}