import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { failureText, hasMessage } from '@/api/apiErrors'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import {
  pendingEmailChangeQueryKey,
  usePendingEmailChange,
} from '@/email-change/usePendingEmailChange'
import { changePassword } from './api'
import {
  changePasswordSchema,
  PASSWORD_CHANGED_NOTICE,
  type ChangePasswordFormValues,
} from './passwordChangeRules'

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
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  const change = useMutation({
    // Passwords are sent exactly as typed — never trimmed.
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(values.currentPassword, values.password),
    onSuccess: () => {
      // The backend cancelled any pending change of email in the same
      // transaction: the cache is told, so the profile's Email row doesn't
      // show a change that no longer exists (no request needed — the 204
      // already says it).
      queryClient.setQueryData(pendingEmailChangeQueryKey, null)
      // replace: Back from the profile doesn't reopen a form already sent.
      void navigate('/profile', { replace: true, state: { notice: PASSWORD_CHANGED_NOTICE } })
    },
    // A wrong current password belongs to its field — said there, the field
    // cleared (whatever was typed is wrong) and focused. Anything else is
    // said under the form. (The backend's "must be different" refusal never
    // comes back from this page: the form checks it before sending.)
    onError: (error) => {
      if (hasMessage(error, 400, WRONG_PASSWORD_MESSAGE)) {
        form.resetField('currentPassword')
        form.setError('currentPassword', { message: WRONG_PASSWORD_MESSAGE }, { shouldFocus: true })
      }
    },
  })
  const wrongPassword = hasMessage(change.error, 400, WRONG_PASSWORD_MESSAGE)
  const { errors } = form.formState

  return (
    <div className="mx-auto mt-8 max-w-lg space-y-4 px-4 pb-8">
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
        {change.isError && !wrongPassword && (
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
  id: keyof ChangePasswordFormValues
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