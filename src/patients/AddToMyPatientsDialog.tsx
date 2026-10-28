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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useJoinCareTeam } from './useJoinCareTeam'

// The backend's limit (AddCareTeamMemberDto: @MaxLength(255), the column's
// varchar(255)). As `maxLength` on the textarea, the browser simply stops
// accepting characters past it — no error message needed for a limit the
// person can't exceed.
const REASON_MAX_LENGTH = 255

interface AddToMyPatientsDialogProps {
  patientId: number
  patientFirstName: string
  patientLastName: string
  // Called once the join has succeeded AND the lists are refreshed, so the
  // page can confirm it ("Jo Novak is now in your patients").
  onAdded: () => void
}

// "Add to my patients" on a directory row: a confirmation, because joining
// a care team is a deliberate, recorded act (decisions §3) — it opens the
// patient's clinical record to me, is written to the audit log, and the
// patient sees it on their Team page. The dialog says exactly that, in
// plain words, instead of a vague "Are you sure?": the practitioner
// should know what clicking does before they click.
//
// It's the SAME action as "Join care team" on the patient page (decisions
// §3, roster design, 2026-10-08) — named from the practitioner's list
// here, from the patient's team there — and the description below names
// both, so the two labels are understood as one thing.
export function AddToMyPatientsDialog({
  patientId,
  patientFirstName,
  patientLastName,
  onAdded,
}: AddToMyPatientsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')

  // On success: close, then let the page confirm. Given to the HOOK, not to
  // mutate() — on success the row unmounts this very dialog, and a
  // mutate() callback only runs while its component is mounted (see
  // useJoinCareTeam: it works today because of timing, which this doesn't
  // rely on). Closing an unmounted dialog is harmless: React ignores a
  // state update for a component that's gone.
  const joinMutation = useJoinCareTeam(patientId, () => {
    setIsOpen(false)
    setReason('')
    onAdded()
  })

  const fullName = `${patientFirstName} ${patientLastName}`

  // Cancel, Escape and a click outside all close the dialog through here,
  // so each time it opens again it starts clean: no reason left from last
  // time, and no old error message.
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setReason('')
      joinMutation.reset()
    }
  }

  function confirm() {
    joinMutation.mutate(reason)
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Add to my patients
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {fullName} to your patients?</DialogTitle>
          <DialogDescription>
            You'll join {patientFirstName}'s care team, which gives you access to their clinical
            record: programs, sessions, medical files and messages. This is recorded, and{' '}
            {patientFirstName} can see who is on their care team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor={`care-team-reason-${patientId}`}>Reason (optional)</Label>
          <Textarea
            // The id includes the patient's id: a results list can hold
            // several of these dialogs, and ids must be unique on a page
            // (only the open one is in the DOM, but unique ids are free).
            id={`care-team-reason-${patientId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            placeholder="e.g. First assessment, or covering for a colleague"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Shown in {patientFirstName}'s care-team history.
          </p>
        </div>

        {joinMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(joinMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={joinMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={confirm} disabled={joinMutation.isPending}>
            {joinMutation.isPending ? 'Adding…' : 'Add to my patients'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}