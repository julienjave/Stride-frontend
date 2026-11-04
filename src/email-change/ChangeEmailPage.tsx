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

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useRefreshedCurrentUser } from '@/auth/useRefreshedCurrentUser'
import { SecondFactorField } from '@/two-factor/SecondFactorField'
import { codeRefusal } from '@/two-factor/twoFactorRules'
import { requestEmailChange } from './api'
import { pendingEmailChangeQueryKey } from './usePendingEmailChange'
import {
  changeEmailSchema,
  changeEmailWithCodeSchema,
  failureText,
  hasMessage,
  SAME_EMAIL_MESSAGE,
  WRONG_PASSWORD_MESSAGE,
  type ChangeEmailFormValues,
} from './emailChangeRules'

// /profile/email — asking to change the sign-in address (decisions §12; its
// own page, the person's choice: room to say what happens next, and a real
// form password managers understand). Reached from "Change" on the profile's
// Email row; back to the profile once sent, where the row shows the change
// waiting.
export function ChangeEmailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: me } = useCurrentUser()
  // Two-factor sign-in on: the step-up asks a code as well (decisions §14) —
  // read AGAIN as the page opens: it may have been turned off on another
  // device since (useRefreshedCurrentUser).
  useRefreshedCurrentUser()
  const withCode = me?.mfaEnabled ?? false
  const form = useForm<ChangeEmailFormValues>({
    // One of two schemas, cast to the common shape (as in StepUpForm).
    resolver: zodResolver(
      withCode ? changeEmailWithCodeSchema : changeEmailSchema,
    ) as Resolver<ChangeEmailFormValues>,
    defaultValues: { newEmail: '', currentPassword: '', mfaCode: '' },
  })

  const request = useMutation({
    // The values as the schema PARSED them (zodResolver hands those to the
    // submit handler): the address already trimmed.
    mutationFn: (values: ChangeEmailFormValues) =>
      requestEmailChange(
        values.newEmail,
        values.currentPassword,
        withCode ? values.mfaCode : undefined,
      ),
    onSuccess: ({ pending }) => {
      // The answer IS the pending change: written into the cache, so the
      // profile shows it at once, without another request.
      queryClient.setQueryData(pendingEmailChangeQueryKey, pending)
      // replace: Back from the profile doesn't reopen a form already sent.
      void navigate('/profile', { replace: true })
    },
    // Two refusals belong to a field — said there, focus moved to it; the
    // password is cleared (whatever was typed is wrong). Anything else is
    // said under the form.
    onError: (error) => {
      if (hasMessage(error, 400, WRONG_PASSWORD_MESSAGE)) {
        form.resetField('currentPassword')
        form.setError('currentPassword', { message: WRONG_PASSWORD_MESSAGE }, { shouldFocus: true })
      } else if (hasMessage(error, 400, SAME_EMAIL_MESSAGE)) {
        form.setError('newEmail', { message: SAME_EMAIL_MESSAGE }, { shouldFocus: true })
      } else {
        // A refused code belongs to the code field — cleared and focused.
        const refusal = withCode ? codeRefusal(error) : null
        if (refusal) {
          form.resetField('mfaCode')
          form.setError('mfaCode', { message: refusal }, { shouldFocus: true })
        }
      }
    },
  })
  const fieldError =
    hasMessage(request.error, 400, WRONG_PASSWORD_MESSAGE) ||
    hasMessage(request.error, 400, SAME_EMAIL_MESSAGE) ||
    (withCode && codeRefusal(request.error) !== null)
  const { errors } = form.formState

  return (
    <div className="mx-auto mt-8 max-w-lg space-y-4 px-4">
      <Link to="/profile" className="text-sm underline underline-offset-4">
        Back to my profile
      </Link>
      <h1 className="text-xl font-semibold">Change your email address</h1>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          We'll send a link to the new address. Your email changes only when you open it, within
          24 hours — until then you sign in with {me ? <strong>{me.email}</strong> : 'your current address'}.
        </p>
        <p>
          Your current address gets a message too, with a way to stop the change. Once it's done,
          you're signed out on your other devices.
        </p>
      </div>

      <form
        onSubmit={(e) => void form.handleSubmit((values) => request.mutate(values))(e)}
        className="space-y-4"
        noValidate
      >
        {/* For password managers: the account this password belongs to.
            Hidden from view and from screen readers — the sentence above
            already says it. */}
        <input
          type="email"
          autoComplete="username"
          value={me?.email ?? ''}
          readOnly
          hidden
        />
        <div className="space-y-1">
          <Label htmlFor="newEmail">New email address</Label>
          <Input
            id="newEmail"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.newEmail}
            aria-describedby={errors.newEmail ? 'newEmail-error' : undefined}
            {...form.register('newEmail')}
          />
          {errors.newEmail && (
            <p id="newEmail-error" className="text-sm text-destructive">
              {errors.newEmail.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
            {...form.register('currentPassword')}
          />
          {errors.currentPassword && (
            <p id="currentPassword-error" className="text-sm text-destructive">
              {errors.currentPassword.message}
            </p>
          )}
        </div>
        {withCode && (
          <SecondFactorField
            error={errors.mfaCode?.message}
            registration={form.register('mfaCode')}
          />
        )}
        {request.isError && !fieldError && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(request.error)}
          </p>
        )}
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Sending…' : 'Send the confirmation link'}
        </Button>
      </form>
    </div>
  )
}