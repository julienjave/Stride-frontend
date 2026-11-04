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
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
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
// The preview's load error: "Couldn't load what cancelling it would change."
const PREVIEW_WHAT = {
  complete: 'what completing it would change',
  cancel: 'what cancelling it would change',
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
  // After a "Try again" of the preview that worked, focus goes to the
  // dialog's title (which then says what closing does).
  const title = useRetryFocus<HTMLHeadingElement>(PREVIEW_WHAT[action], preview.isSuccess)

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
          <DialogTitle ref={title} tabIndex={-1} className="outline-none">
            {text?.title ?? GENERIC_TITLE[action]}
          </DialogTitle>
          {/* A failed preview: the load error, with "Try again" right here
              (before, "Close this and try again") — as the dialog's
              description (asChild: a <div>, since it holds a button). */}
          {preview.isError ? (
            <DialogDescription asChild>
              <div>
                <LoadError what={PREVIEW_WHAT[action]} queries={[preview]} />
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription>{text?.description ?? 'Checking what this would do…'}</DialogDescription>
          )}
        </DialogHeader>

        {closeMutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(
              closeMutation.error,
              "Couldn't do it. Check your connection and try again.",
            )}
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