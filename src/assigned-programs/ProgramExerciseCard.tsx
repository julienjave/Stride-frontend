import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { LoadError } from '@/common/LoadError'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { useRetryFocus } from '@/common/useRetryFocus'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { removalText } from './programExerciseRules'
import { useProgramWorkoutEditing, useRemovalPreview } from './useProgramWorkoutEditing'
import type { AssignedProgramExercise } from './types'

// A program exercise as the patient was given it: the program's own COPY
// (name, muscles, prescription, notes — copied when assigned), never the
// library's current version. Shared by every card below.
function ExerciseBody({ exercise }: { exercise: AssignedProgramExercise }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium">{exercise.name}</p>
      {exercise.primaryMuscles.length > 0 && (
        <p className="text-sm text-muted-foreground">{exercise.primaryMuscles.join(', ')}</p>
      )}
      <PrescriptionSummary prescription={exercise} />
      {exercise.notes && <p className="text-sm">{exercise.notes}</p>}
    </div>
  )
}

// The read-only card — a closed program's exercises, and the removed ones.
// `extra`: a line under the body (the removed list says when and where).
export function ProgramExerciseItem({
  exercise,
  extra,
}: {
  exercise: AssignedProgramExercise
  extra?: ReactNode
}) {
  return (
    <li className="space-y-1 rounded-lg border p-3">
      <ExerciseBody exercise={exercise} />
      {extra}
    </li>
  )
}

type RemoveMutation = ReturnType<typeof useProgramWorkoutEditing>['removeExercise']

interface SortableProgramExerciseCardProps {
  programId: number
  exercise: AssignedProgramExercise
  // From the list (WorkoutListEditor): the workout's label when there are
  // several, and the Move / Copy menu.
  workoutLabel?: string
  menu?: ReactNode
  remove: RemoveMutation
  // Set when removing this exercise would leave a workout the schedule uses
  // with nothing in it (emptiesScheduledWorkout) — the dialog warns.
  emptied: { label: string; several: boolean } | null
  // Another write is on its way (the editor's isBusy).
  disabled: boolean
}

// The editable card of an OPEN program: a body that opens the exercise's
// page (3b-1b), a drag handle, the menu, and Remove — which, unlike a
// template's, opens a confirmation that asks the backend what removing will
// do (decided 2026-10-13). The template card's layout
// (TemplateExerciseCard): handle and buttons are SIBLINGS of the body, so
// dnd-kit's listeners don't swallow their clicks.
export function SortableProgramExerciseCard({
  programId,
  exercise,
  workoutLabel,
  menu,
  remove,
  emptied,
  disabled,
}: SortableProgramExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const inWorkout = workoutLabel ? ` in workout ${workoutLabel}` : ''
  // The body links to the exercise's own page, where its prescription is
  // edited (step 3b-1b) — the template card's pattern (TemplateExerciseCard).
  // `returnTo` = this page's own address, so Done comes back here.
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const exerciseHref = `/practitioner/programs/assigned/${programId}/exercises/${exercise.id}?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <div ref={setNodeRef} style={style} className="relative rounded-lg border">
      {/* The padding leaves room for the handle (left) and the buttons
          (right), which sit OVER the card as siblings of the link — a
          button inside a link would be invalid HTML, and its clicks would
          follow the link. */}
      <Link
        to={exerciseHref}
        className={cn('block rounded-lg p-3 pl-8 hover:bg-muted', menu ? 'pr-18' : 'pr-10')}
      >
        <ExerciseBody exercise={exercise} />
      </Link>

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${exercise.name}${inWorkout}`}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-1 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="absolute right-1 top-3 flex gap-1">
        {menu}
        <RemoveExerciseButton
          programId={programId}
          exercise={exercise}
          workoutLabel={workoutLabel}
          remove={remove}
          emptied={emptied}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// Remove, behind a confirmation that says exactly what will happen —
// "deleted", or "kept in N sessions' records" — from the backend's answer
// (GET …/removal), asked each time the dialog opens. Until that answer is
// here the confirm button stays disabled: the dialog never asks to confirm
// something it can't describe (the closing dialogs' rule, ProgramActions).
//
// Nothing closes the dialog by hand on success: the exercise leaves the
// program, so its card — and the dialog inside it — unmounts. A snackbar
// then says what really happened (removedNotice, raised by the editor).
// The removal preview's load error: "Couldn't load what removing it would
// change."
const REMOVAL_PREVIEW_WHAT = 'what removing it would change'

function RemoveExerciseButton({
  programId,
  exercise,
  workoutLabel,
  remove,
  emptied,
  disabled,
}: Omit<SortableProgramExerciseCardProps, 'menu'>) {
  const [isOpen, setIsOpen] = useState(false)
  const preview = useRemovalPreview(programId, exercise.id, { enabled: isOpen })
  const text = preview.data ? removalText(preview.data, exercise.name, emptied) : null
  // After a "Try again" of the preview that worked, focus goes to the
  // dialog's title (which then says what removing does).
  const title = useRetryFocus<HTMLHeadingElement>(REMOVAL_PREVIEW_WHAT, preview.isSuccess)
  // The editor has ONE removal mutation for every card, and its state is
  // read here as this card's without checking which card it names: the
  // dialog is modal, so only one removal dialog is ever open, and closing it
  // resets the mutation (below) — no other card's dialog can open while a
  // removal is on its way or showing its failure. (A "is it mine?" check was
  // written first; the mutation run showed nothing could ever reach it.)
  const pending = remove.isPending

  // Closing the dialog (Keep it, Escape, outside click) clears the old
  // error, so it never reopens showing a previous attempt's failure.
  //
  // Focus: closed by hand, Radix gives it back to this Remove button. After
  // a SUCCESSFUL removal the card — dialog included — leaves the page, and
  // the list puts focus on the next exercise once it has (focusAfterRemoval
  // — WorkoutListEditor). Radix still tries to restore focus then, but to
  // this button, now detached from the page, which a browser can't focus:
  // nothing to prevent. (A ref telling the dialog not to restore was
  // written first; the mutation run showed it changed nothing — removed.)
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) remove.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            workoutLabel
              ? `Remove ${exercise.name} from workout ${workoutLabel}`
              : `Remove ${exercise.name} from program`
          }
          disabled={disabled}
          className="h-7 w-7"
          // Found by the list to put focus here after a neighbour is removed
          // (focusAfterRemoval — WorkoutListEditor).
          data-remove-exercise={exercise.id}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle ref={title} tabIndex={-1} className="outline-none">
            {text?.title ?? `Remove ${exercise.name}?`}
          </DialogTitle>
          {/* A failed preview: the load error, with "Try again" right here —
              before (2026-10-28), "Close this and try again". It IS the
              dialog's description (asChild: Radix points aria-describedby at
              this block, so it's read when the dialog opens), a <div>
              because the load error holds a button. */}
          {preview.isError ? (
            <DialogDescription asChild>
              <div>
                <LoadError what={REMOVAL_PREVIEW_WHAT} queries={[preview]} />
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription>{text?.description ?? 'Checking what this would do…'}</DialogDescription>
          )}
        </DialogHeader>

        {text?.warning && (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-sm">
            {text.warning}
          </p>
        )}

        {remove.isError && (
          <p role="alert" className="text-sm text-destructive">
            {describeFailure("Couldn't remove it", remove.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Keep it
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={!text || pending}
            onClick={() => remove.mutate({ exerciseRowId: exercise.id, name: exercise.name })}
          >
            {pending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}