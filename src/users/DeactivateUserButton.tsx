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
import { useNavigate } from 'react-router'
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
import { useCurrentUser } from '@/auth/useCurrentUser'
import { deactivateUser, userQueryKey } from './api'
import { refreshAttention } from './attention'

interface DeactivateUserButtonProps {
  userId: number
  userName: string
  // The account's roles: what a deactivation does to care-team links
  // depends on them (decided 2026-10-25), and the dialog says it.
  roles: string[]
}

// Only ever rendered when the user is currently active (see UserEditPage,
// which renders ReactivateUserButton instead once isActive is false).
// Unlike clinics, this one DOES have a real reactivate path — see
// UsersService.reactivate() and ReactivateUserButton — because a
// returning patient or practitioner needing their old account (and its
// history) back is a real, expected scenario in a healthcare app, not an
// edge case worth leaving unsolved the way the clinic gap still is.
export function DeactivateUserButton({ userId, userName, roles }: DeactivateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  // The backend's DELETE /users/:id deliberately ALLOWS isSelf (see
  // users.controller.ts's comment: "Self ... deactivating their own
  // account"), because that route is meant to ALSO serve a person
  // deactivating their own account from their own settings someday. But
  // THIS button lives on the admin's user-management page, reached by
  // browsing a list of OTHER people — an admin's own row can show up in
  // that same list. Without this guard, one misclick would lock the
  // admin out of their own account with no reactivate route to undo it.
  // The backend permission being broader than this ONE call site should
  // use is exactly why the guard belongs here, in the UI, not as an
  // argument for loosening it: a different future feature (self-service
  // deactivation from a settings page) can and should still use the same
  // route.
  const isSelf = currentUser?.id === userId
  const isPractitioner = roles.includes('practitioner')
  const isPatient = roles.includes('patient')

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateUser(userId),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative state" reasoning as
      // DeactivateClinicButton — softDelete() returns the complete
      // updated user (roles/profile/clinics included), so this can go
      // straight into the cache with no extra round trip.
      queryClient.setQueryData(userQueryKey(userId), updated)
      // NOT exact: true here, deliberately — there are TWO cached list
      // variants (active-only and include-inactive; see
      // usersListQueryKey), and a deactivation needs to invalidate BOTH
      // (this user should vanish from one, appear in the other). A
      // prefix match on 'users-list' does that safely, without touching
      // userQueryKey(userId) — they're different top-level keys
      // specifically so this kind of prefix invalidation can't collide
      // with it the way it would have if they shared one 'users' prefix.
      // refreshAttention makes that prefix match AND marks the admin home's
      // numbers stale: one deactivated account changes the counts, and a
      // practitioner's links ending can leave patients with nobody.
      void refreshAttention(queryClient)
      // Every care team too: a practitioner's links have just ended on the
      // server, on as many patients' teams as they were on — the cache
      // doesn't know which, so the whole ['care-team'] prefix is marked
      // stale (only the teams on screen are fetched again).
      void queryClient.invalidateQueries({ queryKey: ['care-team'] })
      setIsOpen(false)
      // findAll() filters to isActive: true, so this user is about to
      // vanish from the list — staying on their own now-orphaned edit
      // page would be a dead end, same reasoning as clinics.
      void navigate('/admin/users')
    },
  })

  if (isSelf) {
    return (
      <p className="text-sm text-muted-foreground">
        You can't deactivate your own account from here.
      </p>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Deactivate user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {userName}?</DialogTitle>
          {/* Same honest, specific copy as DeactivateClinicButton — not
              vague "are you sure?" text. */}
          <DialogDescription>
            This signs {userName} out immediately and blocks them from logging back in,
            until an admin reactivates the account from here.
          </DialogDescription>
        </DialogHeader>

        {/* What happens to care-team links (2026-10-25). A practitioner who
            can't sign in treats nobody: the server ends their links. A
            patient keeps their care team: deactivating isn't a discharge,
            and the team must still read the file. An account with both
            roles gets both sentences — each is about one side of it. */}
        {(isPractitioner || isPatient) && (
          <div className="space-y-2 text-sm text-muted-foreground">
            {isPractitioner && (
              <p>
                Their current care-team links end too. Reactivating the account doesn't
                restore them.
              </p>
            )}
            {isPatient && <p>Their care team keeps access to their records.</p>}
          </div>
        )}

        {deactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(deactivateMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={deactivateMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => deactivateMutation.mutate()}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}