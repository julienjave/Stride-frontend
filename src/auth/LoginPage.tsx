import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, verifyMfaCode } from './api'
import { currentUserQueryKey } from './useCurrentUser'
import {
  loginSchema,
  mfaCodeSchema,
  type LoginFormValues,
  type MfaCodeFormValues,
  type UserRole,
} from './schemas'
import { ApiError } from '@/api/client'

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

  // location.state is typed as `unknown` by React Router (it can hold
  // literally anything a caller passed) — narrowing it here, once, rather
  // than casting inline at each of the three navigate() calls below.
  // Falls back to '/' when there's no preserved destination at all (the
  // common case: someone just visited /login directly, nothing to return
  // to).
  const state = location.state as { from?: string } | null
  const redirectTo = state?.from ?? '/'

  const credentialsForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

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
      void navigate(redirectTo)
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
      void navigate(redirectTo)
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
      <div className="mx-auto mt-24 max-w-sm space-y-4">
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
            {loginMutation.error instanceof ApiError
              ? loginMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}
      </div>
    )
  }

  if (step === 'mfa-pending') {
    return (
      <div className="mx-auto mt-24 max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Enter your 6-digit code</h1>
        <form
          onSubmit={(e) => void mfaForm.handleSubmit((values) => mfaMutation.mutate(values))(e)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-invalid={!!mfaForm.formState.errors.code}
              {...mfaForm.register('code')}
            />
            {mfaForm.formState.errors.code && (
              <p className="text-sm text-destructive">
                {mfaForm.formState.errors.code.message}
              </p>
            )}
          </div>

          {mfaMutation.isError && (
            <p className="text-sm text-destructive">
              {mfaMutation.error instanceof ApiError
                ? mfaMutation.error.messages.join(', ')
                : 'Something went wrong'}
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
    <div className="mx-auto mt-24 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Log in</h1>
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
        </div>

        {loginMutation.isError && !getMultiRoleOptions(loginMutation.error) && (
          <p className="text-sm text-destructive">
            {loginMutation.error instanceof ApiError
              ? loginMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  )
}