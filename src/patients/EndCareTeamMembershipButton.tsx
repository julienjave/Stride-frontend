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
import { failureText } from '@/api/apiErrors'
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
import { useEndCareTeamMembership } from './useCareTeamChange'

interface EndCareTeamMembershipButtonProps {
  patientId: number
  patientFirstName: string
  patientLastName: string
  practitioner: { id: number; firstName: string; lastName: string }
  // True when this is the patient's only current practitioner.
  isOnlyMember: boolean
}

// "End" on any current care-team row — for an ADMIN (the backend lets an
// admin end anyone's link; a practitioner only their own, which is "Leave
// care team" instead). Worded for someone ending ANOTHER person's access:
// what it does to that practitioner, and that the history keeps it.
export function EndCareTeamMembershipButton({
  patientId,
  patientFirstName,
  patientLastName,
  practitioner,
  isOnlyMember,
}: EndCareTeamMembershipButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Closing on success without resetting the mutation (it is still
  // finishing) — same reasoning as AddCareTeamMemberDialog.
  const endMutation = useEndCareTeamMembership(patientId, practitioner.id, () => setIsOpen(false))

  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) endMutation.reset()
  }

  const practitionerName = `${practitioner.firstName} ${practitioner.lastName}`

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`End ${practitionerName}'s membership`}>
          End
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Remove {practitionerName} from {patientFirstName} {patientLastName}'s care team?
          </DialogTitle>
          <DialogDescription>
            This ends {practitioner.firstName}'s access to {patientFirstName}'s clinical record:
            programs, sessions, medical files and messages. The care team's history keeps a record
            that they were on it.
          </DialogDescription>
        </DialogHeader>

        {isOnlyMember && (
          <p className="rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm">
            {practitioner.firstName} is the only practitioner on {patientFirstName}'s care team.
            Afterwards, no practitioner will have access to their record until someone is added.
          </p>
        )}

        {endMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(endMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={endMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => endMutation.mutate()}
            disabled={endMutation.isPending}
          >
            {endMutation.isPending ? 'Ending…' : 'End membership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}