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
import { useLeaveCareTeam } from './useLeaveCareTeam'

interface LeaveCareTeamButtonProps {
  patientId: number
  patientFirstName: string
  patientLastName: string
  myId: number
  // True when I'm the patient's only current practitioner: the dialog says
  // so, because leaving would leave NOBODY with access to their record.
  isOnlyMember: boolean
  // Called once I've left (the page navigates back to the roster).
  onLeft: () => void
}

// "Leave care team" on my own row. Behind a confirmation, because it takes
// away my access to the patient's clinical record at once. The dialog says
// what happens AND what doesn't: the history keeps the fact that I was on
// the team (links are ended, never deleted), and I can rejoin.
export function LeaveCareTeamButton({
  patientId,
  patientFirstName,
  patientLastName,
  myId,
  isOnlyMember,
  onLeft,
}: LeaveCareTeamButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const leaveMutation = useLeaveCareTeam(patientId, myId, onLeft)

  // Closing (Cancel, Escape, outside click) clears an old error, so the
  // dialog never reopens showing the previous attempt's failure.
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) leaveMutation.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Leave care team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Leave {patientFirstName} {patientLastName}'s care team?
          </DialogTitle>
          <DialogDescription>
            You'll lose access to {patientFirstName}'s clinical record: programs, sessions, medical
            files and messages. The care team's history keeps a record that you were on it, and you
            can add {patientFirstName} to your patients again later.
          </DialogDescription>
        </DialogHeader>

        {isOnlyMember && (
          <p className="rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm">
            You're the only practitioner on {patientFirstName}'s care team. After you leave, no
            practitioner will have access to their record until someone joins.
          </p>
        )}

        {leaveMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(leaveMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={leaveMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
          >
            {leaveMutation.isPending ? 'Leaving…' : 'Leave care team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}