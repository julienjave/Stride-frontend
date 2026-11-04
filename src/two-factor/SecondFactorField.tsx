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

import type { UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// The code field every step-up shows for an account with two-factor sign-in
// on (the email and password changes, new recovery codes, turning off, the
// admin's reset): a code from the app OR a recovery code — the backend takes
// both. Its hint says so; its error sits under it, both named by
// aria-describedby.
//
// Not `inputMode="numeric"`: a phone's number pad has no letters, and a
// recovery code has some. `autoComplete="one-time-code"` still lets a phone
// offer a code it received.
export function SecondFactorField({
  id = 'mfaCode',
  label = 'Two-factor code',
  hint = 'From your authenticator app, or one of your recovery codes.',
  error,
  registration,
}: {
  id?: string
  label?: string
  hint?: string
  error?: string
  registration: UseFormRegisterReturn
}) {
  const describedBy = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        autoComplete="one-time-code"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...registration}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}