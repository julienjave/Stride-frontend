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
import { ApiError } from '@/api/client'
import { archiveExercise, exerciseQueryKey } from './api'

interface ArchiveExerciseButtonProps {
  exerciseId: number
  exerciseName: string
}

// Labeled "Delete" in the UI (per the design discussion — that's the
// word a practitioner actually thinks in, even though what happens
// underneath is an archive), but the dialog copy below is honest about
// what really happens: unlike DeactivateClinicButton's clinic (which
// has a real ReactivateClinicButton to undo it from), there is currently
// no unarchive endpoint for exercises at all. Claiming otherwise would
// be a real, checkable inaccuracy — confirmed by reading
// exercises.service.ts, not assumed from the clinics/users precedent.
export function ArchiveExerciseButton({
  exerciseId,
  exerciseName,
}: ArchiveExerciseButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const archiveMutation = useMutation({
    mutationFn: () => archiveExercise(exerciseId),
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
      // Same reasoning as every other editable field on this page —
      // 'exercises-list' is a distinct top-level key from
      // exerciseQueryKey(id), so this prefix invalidation can't touch
      // the entry setQueryData just wrote.
      void queryClient.invalidateQueries({ queryKey: ['exercises-list'] })
      setIsOpen(false)
      // The default library view only ever shows non-archived exercises
      // (isArchived: false) — staying on a now-vanished exercise's own
      // detail page would be a dead end.
      void navigate('/practitioner/library')
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {exerciseName}?</DialogTitle>
          <DialogDescription>
            This removes {exerciseName} from the exercise library. There is
            currently no way to restore it once deleted.
          </DialogDescription>
        </DialogHeader>

        {archiveMutation.isError && (
          <p className="text-sm text-destructive">
            {archiveMutation.error instanceof ApiError
              ? archiveMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={archiveMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          {/* Deliberately NOT a DialogClose — same reasoning as
              DeactivateClinicButton: this has to stay open on failure so
              the error message above stays visible, only closing via
              setIsOpen(false) in onSuccess once the mutation truly
              succeeds. */}
          <Button
            variant="destructive"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            {archiveMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}