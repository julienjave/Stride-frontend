import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
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
} from './schemas'
import { ApiError } from '@/api/client'

// The real state machine, as an actual TypeScript
// union — not a boolean bolted onto the component. A step can ONLY be one
// of these three named states, and TypeScript will complain if code tries
// to read MFA-step-only data while in the credentials step, etc. This is
// the same "make the illegal state unrepresentable" idea as the
// LoginResponse union in api.ts, just applied to UI state instead of an
// API response.
type LoginStep = 'credentials' | 'mfa-pending' | 'authenticated'

export function LoginPage() {
  const [step, setStep] = useState<LoginStep>('credentials')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const credentialsForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const mfaForm = useForm<MfaCodeFormValues>({
    resolver: zodResolver(mfaCodeSchema),
  })

  // useMutation (unlike useQuery) is for actions that CHANGE something on
  // the server, triggered by an event (a form submit) rather than fetched
  // automatically on render. It gives us isPending (disable the submit
  // button while in flight) and onSuccess/onError callbacks to react to
  // the result, without hand-rolling try/catch + useState for loading and
  // error tracking ourselves.
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      // 'mfaRequired' in result — NOT result.mfaRequired — because
      // CurrentUser doesn't declare that property at all (not even as
      // false); TypeScript's `in` operator narrows a union based on
      // property PRESENCE, which is exactly the check we need here, while
      // reading result.mfaRequired directly would be a compile error
      // (confirmed: TS2339, "Property does not exist on type CurrentUser").
      if ('mfaRequired' in result) {
        // Login succeeded, but the session isn't authenticated yet (see
        // api.ts's comment on LoginResponse) — move to the next step
        // rather than treating this as "done."
        setStep('mfa-pending')
        return
      }
      // No MFA on this account — login fully completed in one step.
      // setQueryData seeds the cache directly with data we already have,
      // rather than invalidateQueries (which would trigger a SECOND
      // network request to /auth/me we don't actually need — we already
      // have the exact same data right here in `result`).
      queryClient.setQueryData(currentUserQueryKey, result)
      setStep('authenticated')
      void navigate('/')
    },
  })

  const mfaMutation = useMutation({
    mutationFn: verifyMfaCode,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user)
      setStep('authenticated')
      void navigate('/')
    },
  })

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

        {loginMutation.isError && (
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
    </div>
  )
}