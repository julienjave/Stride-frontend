import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, verifyMfaCode } from './api'
import { currentUserQueryKey } from './useCurrentUser'
import { useSetupStatus } from './useSetupStatus'
import { forgetSignOutReason, wasSignedOutAfterStepUps } from './currentPassword'
import { destinationAfterSignIn } from './returnPath'
import {
  loginSchema,
  mfaCodeSchema,
  type LoginFormValues,
  type MfaCodeFormValues,
  type UserRole,
} from './schemas'
import { ApiError } from '@/api/client'
import { failureText } from '@/api/apiErrors'
import { SecondFactorField } from '@/two-factor/SecondFactorField'
import { codeRefusal } from '@/two-factor/twoFactorRules'

// A fourth state added to the original three: 'role-pending' sits between
// 'credentials' and either end state, for exactly the case the backend's
// 400 (with its new `roles` field) exists to support — a multi-role
// account that hasn't yet told us which role to log in as.
type LoginStep = 'credentials' | 'role-pending' | 'mfa-pending' | 'authenticated'

// A small, local helper — not exported, not reused elsewhere — for the one
// specific thing we need to detect: "did this failure come with a roles
// list attached?" Kept as its own function rather than inlined in the
// onError callback below, purely so that callback reads as one clear
// sentence rather than a nested condition full of casts.
function getMultiRoleOptions(error: unknown): UserRole[] | null {
  if (!(error instanceof ApiError)) return null
  if (error.statusCode !== 400) return null
  const { roles } = error.body
  if (!Array.isArray(roles)) return null
  return roles as UserRole[]
}

export function LoginPage() {
  const [step, setStep] = useState<LoginStep>('credentials')
  const [roleOptions, setRoleOptions] = useState<UserRole[]>([])
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const location = useLocation()
  const setupStatus = useSetupStatus()

  // location.state is typed as `unknown` by React Router (it can hold
  // literally anything a caller passed) — narrowed here, once, for the
  // fields this page shows.
  //
  // `email` and `passwordSet` come from the accept-invitation page, after
  // the person chose their first password: the email is filled in for
  // them, and a line confirms the password was set. `passwordReset` (with
  // `email`) comes from the reset page (Phase 6); `email` alone from the
  // forgot page's "Back to log in".
  // (`from` — where to go after signing in — and its owner, `fromUserId`,
  // are read by destinationAfterSignIn() in returnPath.ts.)
  const state = location.state as {
    email?: string
    passwordSet?: boolean
    passwordReset?: boolean
  } | null

  // Signed out by the server after 5 wrong passwords or codes in a row
  // (decisions §16): remembered by the app's 401 handler — read once, when
  // the page opens (a pure read, in the initialiser), then forgotten (in an
  // effect), so a later visit doesn't repeat it.
  const [stepUpSignOut] = useState(wasSignedOutAfterStepUps)
  useEffect(() => {
    forgetSignOutReason()
  }, [])

  const credentialsForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // defaultValues are read once, when the form is created — the right
    // moment, since the state arrives with the navigation to this page.
    defaultValues: { email: state?.email ?? '' },
  })

  // The email as typed right now — for "Forgot your password?".
  const typedEmail = useWatch({ control: credentialsForm.control, name: 'email' })

  const mfaForm = useForm<MfaCodeFormValues>({
    resolver: zodResolver(mfaCodeSchema),
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      if ('mfaRequired' in result) {
        setStep('mfa-pending')
        return
      }
      queryClient.setQueryData(currentUserQueryKey, result)
      setStep('authenticated')
      // The remembered page if it's this person's (or nobody's), else home.
      void navigate(destinationAfterSignIn(location.state, result.id))
    },
    // onError runs whenever the mutation's promise rejects — which,
    // for an ApiError, means any non-2xx response. This is the one place
    // we check for the specific "multiple roles" shape and branch the UI
    // accordingly, rather than letting it fall through to the generic
    // error message every other failure gets.
    onError: (error) => {
      const roles = getMultiRoleOptions(error)
      if (roles) {
        setRoleOptions(roles)
        setStep('role-pending')
      }
      // Any other error (wrong password, throttled, etc.) needs no extra
      // handling here — loginMutation.isError/.error, read directly in the
      // JSX below, already covers displaying it.
    },
  })

  const mfaMutation = useMutation({
    mutationFn: verifyMfaCode,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user)
      setStep('authenticated')
      void navigate(destinationAfterSignIn(location.state, user.id))
    },
    // A refused code: the field is cleared (whatever was typed is wrong)
    // and focused, ready for the next one.
    onError: (error) => {
      if (codeRefusal(error)) {
        mfaForm.resetField('code')
        mfaForm.setFocus('code')
      }
    },
  })

  // Called when the user clicks one of the role buttons. We deliberately
  // don't ask them to retype email/password — credentialsForm still holds
  // those values internally (RHF doesn't discard them just because we
  // stopped rendering its inputs), and getValues() reads them back without
  // triggering validation or a re-render.
  function submitWithRole(role: UserRole) {
    loginMutation.mutate({ ...credentialsForm.getValues(), role })
  }

  if (step === 'role-pending') {
    return (
      <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
        <h1 className="text-xl font-semibold">Which role do you want to log in as?</h1>
        <div className="flex flex-col gap-2">
          {roleOptions.map((role) => (
            <Button
              key={role}
              onClick={() => submitWithRole(role)}
              disabled={loginMutation.isPending}
            >
              {role}
            </Button>
          ))}
        </div>
        {loginMutation.isError && !getMultiRoleOptions(loginMutation.error) && (
          <p className="text-sm text-destructive">
            {failureText(loginMutation.error)}
          </p>
        )}
      </div>
    )
  }

  if (step === 'mfa-pending') {
    // A refused code is said AT the field (it's about what was typed); any
    // other failure (an expired sign-in step, throttling) under the form.
    const refusal = codeRefusal(mfaMutation.error)
    return (
      <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
        <h1 className="text-xl font-semibold">Enter your two-factor code</h1>
        <form
          onSubmit={(e) => void mfaForm.handleSubmit((values) => mfaMutation.mutate(values))(e)}
          className="space-y-4"
          noValidate
        >
          {/* The same field as every step-up (no number pad: a recovery
              code has letters), with the hint the person chose: how to get
              in without the phone (decisions §14). */}
          <SecondFactorField
            id="code"
            label="Authentication code"
            hint="From your authenticator app. Lost your phone? Enter one of your recovery codes instead."
            error={mfaForm.formState.errors.code?.message ?? refusal ?? undefined}
            registration={mfaForm.register('code')}
          />

          {mfaMutation.isError && !refusal && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(mfaMutation.error)}
            </p>
          )}

          <Button type="submit" disabled={mfaMutation.isPending}>
            {mfaMutation.isPending ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      {/* role="status": announced by screen readers when the page opens. */}
      {state?.passwordSet && (
        <p role="status" className="text-sm text-muted-foreground">
          Your password is set. Log in to continue.
        </p>
      )}
      {/* After a reset the backend ended every session of the account — so
          a sign-out on another device is explained here. */}
      {state?.passwordReset && (
        <p role="status" className="text-sm text-muted-foreground">
          Your password has been changed, and you've been signed out on every device. Log in
          with your new password.
        </p>
      )}
      {/* The step-up's sign-out: this session was ended by the server, in the
          middle of a change — the person must learn why, or it looks like a
          bug. The other devices are still signed in. */}
      {stepUpSignOut && (
        <p role="status" className="text-sm text-muted-foreground">
          You were signed out after 5 wrong attempts to confirm a change. Log in again to continue.
        </p>
      )}
      <form
        onSubmit={(e) => void credentialsForm.handleSubmit((values) => loginMutation.mutate(values))(e)}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!credentialsForm.formState.errors.email}
            {...credentialsForm.register('email')}
          />
          {credentialsForm.formState.errors.email && (
            <p className="text-sm text-destructive">
              {credentialsForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!credentialsForm.formState.errors.password}
            {...credentialsForm.register('password')}
          />
          {credentialsForm.formState.errors.password && (
            <p className="text-sm text-destructive">
              {credentialsForm.formState.errors.password.message}
            </p>
          )}
          {/* The address typed so far goes along (navigation state, not the
              URL — an address in a query string lands in history and logs),
              so the forgot page opens with it filled in. */}
          <p className="text-sm">
            <Link
              to="/forgot-password"
              state={{ email: typedEmail.trim() }}
              className="underline underline-offset-4"
            >
              Forgot your password?
            </Link>
          </p>
        </div>

        {loginMutation.isError && !getMultiRoleOptions(loginMutation.error) && (
          <p className="text-sm text-destructive">
            {failureText(loginMutation.error)}
          </p>
        )}

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      {/* No "Register" link: accounts are created by a clinic, and the
          person receives an invitation email to choose their password
          (public self-registration was removed). */}
      <p className="text-sm text-muted-foreground">
        No account yet? Your clinic creates it and emails you an invitation.
      </p>
      {/* Only on a brand-new install: once the first clinic and admin exist,
          the setup page would refuse anyway (the backend answers 403), so
          the link would lead nowhere. `=== false`, not `!setupComplete`:
          while the answer is loading, or if asking failed, data is
          undefined — and an UNKNOWN status shows no link rather than
          guessing. */}
      {setupStatus.data?.setupComplete === false && (
        <p className="text-sm text-muted-foreground">
          First time?{' '}
          <Link to="/register-clinic" className="underline">
            Set up Stride
          </Link>
        </p>
      )}
    </div>
  )
}