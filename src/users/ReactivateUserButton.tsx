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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { failureText } from '@/api/apiErrors'
import { reactivateUser, userQueryKey } from './api'
import { refreshAttention } from './attention'

interface ReactivateUserButtonProps {
  userId: number
  userName: string
  // The account's roles: a practitioner's care-team links, ended by the
  // deactivation, don't come back — the dialog says so.
  roles: string[]
}

// Only ever rendered when the user is currently deactivated (see
// UserEditPage). No isSelf guard needed the way DeactivateUserButton has
// one — reactivating your OWN account isn't the dangerous direction (you
// can't be viewing this page as a deactivated admin in the first place,
// since deactivation signs you out immediately).
export function ReactivateUserButton({ userId, userName, roles }: ReactivateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative state" reasoning as
      // DeactivateUserButton — reactivate() returns the complete updated
      // user, so this goes straight into the cache.
      queryClient.setQueryData(userQueryKey(userId), updated)
      // Prefix match, not exact — same reasoning as DeactivateUserButton:
      // this user needs to disappear from the include-inactive list and
      // (re)appear in the active-only one, and 'users-list' is a
      // deliberately separate top-level key from userQueryKey(userId).
      // refreshAttention makes that prefix match AND marks the admin home's
      // numbers stale (an active account again changes the counts).
      void refreshAttention(queryClient)
      setIsOpen(false)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Reactivate user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate {userName}?</DialogTitle>
          <DialogDescription>
            This restores {userName}'s access — they'll be able to log in again with their
            existing password, and everything from before (medical history, programs,
            messages) is still attached to this same account.
          </DialogDescription>
        </DialogHeader>

        {roles.includes('practitioner') && (
          <p className="text-sm text-muted-foreground">
            Their care-team links ended when the account was deactivated, and don't come back:
            add them to their patients' care teams again where they're needed.
          </p>
        )}

        {reactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(reactivateMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={reactivateMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
          >
            {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}