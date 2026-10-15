import { useState } from 'react'
import { ApiError } from '@/api/client'
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
import { closingText } from './closingText'
import { useClosingPreview, useCloseAssignedProgram } from './useProgramClosing'

// "Complete program" and "Cancel program" — shown only on an OPEN program
// (active, not deleted): the backend refuses closing anything else (409).
export function ProgramActions({ programId, today }: { programId: number; today: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <CloseProgramButton programId={programId} action="complete" today={today} />
      <CloseProgramButton programId={programId} action="cancel" today={today} />
    </div>
  )
}

const TRIGGER_LABEL = { complete: 'Complete program', cancel: 'Cancel program' } as const
// The dialog's title while the server's answer is on its way.
const GENERIC_TITLE = {
  complete: 'Complete this program?',
  cancel: 'Cancel this program?',
} as const

// One button and its confirmation. The dialog says exactly what will happen
// — "deletes it" or "it will end on Sun 11 Oct" — from the backend's answer
// (GET …/closing), asked each time the dialog opens. Until that answer is
// here, or if it can't be had, the confirm button stays disabled: the
// dialog never asks to confirm something it can't describe.
function CloseProgramButton({
  programId,
  action,
  today,
}: {
  programId: number
  action: 'cancel' | 'complete'
  today: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const preview = useClosingPreview(programId, today, { enabled: isOpen })
  const closeMutation = useCloseAssignedProgram(programId)

  // The backend's whole answer: the plan for THIS action, and how many
  // sessions in progress closing would stop (the same for both actions).
  const text = preview.data
    ? closingText(action, preview.data[action], preview.data.openSessions, today)
    : null

  // Closing the dialog (Keep it, Escape, outside click) clears an old error,
  // so it never reopens showing the previous attempt's failure.
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) closeMutation.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {TRIGGER_LABEL[action]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{text?.title ?? GENERIC_TITLE[action]}</DialogTitle>
          <DialogDescription>
            {text?.description ??
              (preview.isError
                ? "Couldn't check what this would do. Close this and try again."
                : 'Checking what this would do…')}
          </DialogDescription>
        </DialogHeader>

        {closeMutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {closeMutation.error instanceof ApiError
              ? closeMutation.error.messages.join(' ')
              : "Couldn't do it. Check your connection and try again."}
          </p>
        )}

        <DialogFooter>
          {/* Not "Cancel": in a dialog about cancelling a program, a
              "Cancel" button would mean two opposite things. */}
          <DialogClose asChild>
            <Button variant="outline" disabled={closeMutation.isPending}>
              Keep it
            </Button>
          </DialogClose>
          <Button
            variant={action === 'cancel' ? 'destructive' : 'default'}
            disabled={!text || closeMutation.isPending}
            onClick={() => closeMutation.mutate({ action, today })}
          >
            {closeMutation.isPending ? text?.pending : (text?.confirm ?? TRIGGER_LABEL[action])}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}