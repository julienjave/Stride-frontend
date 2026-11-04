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

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { userQueryKey } from '@/users/api'
import type { User } from '@/users/types'
import { resetUserMfa } from './api'
import { StepUpForm } from './StepUpForm'

// The "Two-factor sign-in" section of the ADMIN's user page (the person's
// choice, decisions §14): whether the account has it on and, when it does,
// "Reset two-factor sign-in" — the last resort for someone who lost both the
// phone and the recovery codes, or whose account got someone else's phone.
//
// The dialog says what happens before anything is sent, then asks for the
// ADMIN's own password (and their own code when THEIR account has two-factor
// on — the backend asks it, `adminHasMfa` decides whether the field shows).
// Never on the admin's own account: the backend refuses it, and the page
// says what to do instead.
export function ResetTwoFactorSection({
  user,
  isSelf,
  adminEmail,
  adminHasMfa,
}: {
  user: User
  isSelf: boolean
  adminEmail: string
  adminHasMfa: boolean
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const name = `${user.firstName} ${user.lastName}`

  return (
    <section aria-labelledby="two-factor-title" className="space-y-2 rounded-lg border px-4 py-3">
      <h2 id="two-factor-title" className="font-medium">
        Two-factor sign-in
      </h2>
      <p className="text-sm">{user.mfaEnabled ? 'On' : 'Off'}</p>
      {done && (
        <p role="status" className="text-sm">
          Two-factor sign-in is reset. {name} was signed out everywhere and told by email.
        </p>
      )}
      {user.mfaEnabled && isSelf && (
        <p className="text-sm text-muted-foreground">
          Your own two-factor sign-in is managed from your profile. Lost your phone? Use one of
          your recovery codes, or ask another admin.
        </p>
      )}
      {user.mfaEnabled && !isSelf && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Reset two-factor sign-in</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset {name}'s two-factor sign-in?</DialogTitle>
              <DialogDescription>
                This turns two-factor sign-in off for {name} and deletes their recovery codes. They
                are signed out everywhere and get an email. Signing in then asks for their password
                only; they can set it up again from their profile.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm">
              {adminHasMfa
                ? 'Confirm with your own password and a code from your app.'
                : 'Confirm with your own password.'}
            </p>
            <StepUpForm
              idPrefix="reset"
              withCode={adminHasMfa}
              email={adminEmail}
              submitLabel="Reset two-factor sign-in"
              pendingLabel="Resetting…"
              send={(values) => resetUserMfa(user.id, values.currentPassword, values.code)}
              onSuccess={() => {
                // The account's page now says Off (the 204 says what changed —
                // no request to ask again).
                queryClient.setQueryData<User>(userQueryKey(user.id), (old) =>
                  old ? { ...old, mfaEnabled: false } : old,
                )
                setOpen(false)
                setDone(true)
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}