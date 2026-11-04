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

import { useForm, type Resolver, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useRefreshedCurrentUser } from '@/auth/useRefreshedCurrentUser'
import { failureText, hasMessage } from '@/api/apiErrors'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import {
  pendingEmailChangeQueryKey,
  usePendingEmailChange,
} from '@/email-change/usePendingEmailChange'
import { SecondFactorField } from '@/two-factor/SecondFactorField'
import { codeRefusal } from '@/two-factor/twoFactorRules'
import { changePassword } from './api'
import {
  changePasswordSchema,
  changePasswordWithCodeSchema,
  PASSWORD_CHANGED_NOTICE,
  type ChangePasswordFormValues,
} from './passwordChangeRules'
import { showSuccess } from '@/snackbars/snackbarStore'

// /profile/password — changing one's own password (decisions §13). Its own
// page, like the email change: room to say what happens, and a real form
// password managers understand. Reached from "Change" on the profile's
// Password row; back to the profile once done, with a line saying so.
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: me } = useCurrentUser()
  // A change of email waiting for its confirmation is CANCELLED by a new
  // password (the person's choice, as a reset does) — said before the
  // person sends, not discovered afterwards.
  const pendingEmail = usePendingEmailChange().data ?? null
  // Two-factor sign-in on: the step-up asks a code as well (decisions §14).
  // Read from the session's current user — RequireAuth waited for it — and
  // read AGAIN as the page opens: it may have been turned off on another
  // device since (useRefreshedCurrentUser).
  useRefreshedCurrentUser()
  const withCode = me?.mfaEnabled ?? false
  const form = useForm<ChangePasswordFormValues>({
    // One of two schemas, cast to the common shape (as in StepUpForm):
    // without the code, the object schema strips `mfaCode`.
    resolver: zodResolver(
      withCode ? changePasswordWithCodeSchema : changePasswordSchema,
    ) as Resolver<ChangePasswordFormValues>,
    defaultValues: { currentPassword: '', password: '', confirmPassword: '', mfaCode: '' },
  })

  const change = useMutation({
    // Passwords are sent exactly as typed — never trimmed.
    // The code only when the form asks it (trimmed by the schema).
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(values.currentPassword, values.password, withCode ? values.mfaCode : undefined),
    onSuccess: () => {
      // The backend cancelled any pending change of email in the same
      // transaction: the cache is told, so the profile's Email row doesn't
      // show a change that no longer exists (no request needed — the 204
      // already says it).
      queryClient.setQueryData(pendingEmailChangeQueryKey, null)
      // The confirmation is a snackbar (decisions §33), raised here and
      // drawn by the layout — it outlives this page, which unmounts as the
      // profile opens. replace: Back from the profile doesn't reopen a form
      // already sent.
      showSuccess(PASSWORD_CHANGED_NOTICE)
      void navigate('/profile', { replace: true })
    },
    // A wrong current password belongs to its field — said there, the field
    // cleared (whatever was typed is wrong) and focused. Anything else is
    // said under the form. (The backend's "must be different" refusal never
    // comes back from this page: the form checks it before sending.)
    onError: (error) => {
      if (hasMessage(error, 400, WRONG_PASSWORD_MESSAGE)) {
        form.resetField('currentPassword')
        form.setError('currentPassword', { message: WRONG_PASSWORD_MESSAGE }, { shouldFocus: true })
        return
      }
      // A refused code belongs to the code field — cleared and focused too.
      const refusal = withCode ? codeRefusal(error) : null
      if (refusal) {
        form.resetField('mfaCode')
        form.setError('mfaCode', { message: refusal }, { shouldFocus: true })
      }
    },
  })
  const atAField =
    hasMessage(change.error, 400, WRONG_PASSWORD_MESSAGE) ||
    (withCode && codeRefusal(change.error) !== null)
  const { errors } = form.formState

  return (
    <div className="mx-auto mt-8 max-w-lg space-y-4 px-4">
      <Link to="/profile" className="text-sm underline underline-offset-4">
        Back to my profile
      </Link>
      <h1 className="text-xl font-semibold">Change your password</h1>
      <p className="text-sm text-muted-foreground">
        Once it's changed, any other devices signed in to your account are signed out. This one
        stays signed in. We'll also send a message to your email address.
      </p>
      {pendingEmail && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm">
          Changing your password also cancels your change of email to{' '}
          <span className="font-medium wrap-break-word">{pendingEmail.newEmail}</span>, which is
          waiting for confirmation. You can ask for it again afterwards.
        </p>
      )}

      <form
        onSubmit={(e) => void form.handleSubmit((values) => change.mutate(values))(e)}
        className="space-y-4"
        noValidate
      >
        {/* For password managers: the account these passwords belong to,
            so the new one is saved under the right sign-in. Hidden from
            view and from screen readers. */}
        <input type="email" autoComplete="username" value={me?.email ?? ''} readOnly hidden />
        <PasswordField
          id="currentPassword"
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          registration={form.register('currentPassword')}
        />
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          registration={form.register('password')}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          registration={form.register('confirmPassword')}
        />
        {withCode && (
          <SecondFactorField
            error={errors.mfaCode?.message}
            registration={form.register('mfaCode')}
          />
        )}
        {change.isError && !atAField && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(change.error)}
          </p>
        )}
        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </div>
  )
}

// One labelled password input with its hint and its error, tied together
// for assistive technology (aria-describedby names both).
function PasswordField({
  id,
  label,
  autoComplete,
  hint,
  error,
  registration,
}: {
  id: 'currentPassword' | 'password' | 'confirmPassword'
  label: string
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  error?: string
  registration: UseFormRegisterReturn
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        {...registration}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}