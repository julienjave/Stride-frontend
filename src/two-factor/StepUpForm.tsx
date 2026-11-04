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
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { failureText, hasMessage } from '@/api/apiErrors'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import { SecondFactorField } from './SecondFactorField'
import { codeRefusal, startSetupSchema, stepUpSchema } from './twoFactorRules'

// The values a step-up form sends — the code only when the form asks one.
export interface StepUpValues {
  currentPassword: string
  code?: string
}

// "Prove it's you again" (the step-up — decisions §12–§14): the current
// password, and — `withCode` — a second factor (an app code or a recovery
// code). Used by the two-factor page (start set-up: password only; new
// codes and turning off: both) and the admin's reset (the ADMIN's own
// password, and their code when their account has two-factor on).
//
// It owns its request (`send`), so it can put each refusal where it
// belongs: a wrong password at the password field (cleared — whatever was
// typed is wrong — and focused), a refused code at the code field (the
// same), anything else under the form.
export function StepUpForm<T>({
  idPrefix,
  withCode,
  email,
  submitLabel,
  pendingLabel,
  send,
  onSuccess,
}: {
  // Each form's ids are its own (a page may hold two of these forms).
  idPrefix: string
  withCode: boolean
  // For password managers: the account the password belongs to.
  email: string
  submitLabel: string
  pendingLabel: string
  send: (values: StepUpValues) => Promise<T>
  onSuccess: (result: T) => void
}) {
  // One of two schemas, cast to the common shape: without the code, the
  // object schema strips `code` (Zod drops keys it doesn't know).
  const form = useForm<StepUpValues>({
    resolver: zodResolver(withCode ? stepUpSchema : startSetupSchema) as Resolver<StepUpValues>,
    defaultValues: { currentPassword: '', code: '' },
  })
  const mutation = useMutation({
    mutationFn: send,
    onSuccess,
    onError: (error) => {
      if (hasMessage(error, 400, WRONG_PASSWORD_MESSAGE)) {
        form.resetField('currentPassword')
        form.setError('currentPassword', { message: WRONG_PASSWORD_MESSAGE }, { shouldFocus: true })
        return
      }
      const refusal = withCode ? codeRefusal(error) : null
      if (refusal) {
        form.resetField('code')
        form.setError('code', { message: refusal }, { shouldFocus: true })
      }
    },
  })
  const atAField =
    hasMessage(mutation.error, 400, WRONG_PASSWORD_MESSAGE) ||
    (withCode && codeRefusal(mutation.error) !== null)
  const { errors } = form.formState
  const passwordId = `${idPrefix}-currentPassword`

  return (
    <form
      onSubmit={(e) => void form.handleSubmit((values) => mutation.mutate(values))(e)}
      className="space-y-3"
      noValidate
    >
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <div className="space-y-1">
        <Label htmlFor={passwordId}>Current password</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          aria-describedby={errors.currentPassword ? `${passwordId}-error` : undefined}
          {...form.register('currentPassword')}
        />
        {errors.currentPassword && (
          <p id={`${passwordId}-error`} className="text-sm text-destructive">
            {errors.currentPassword.message}
          </p>
        )}
      </div>
      {withCode && (
        <SecondFactorField
          id={`${idPrefix}-code`}
          error={errors.code?.message}
          registration={form.register('code')}
        />
      )}
      {mutation.isError && !atAField && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(mutation.error)}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}