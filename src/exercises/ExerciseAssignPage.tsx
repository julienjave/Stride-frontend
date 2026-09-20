import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/api/client'
import { usePrograms } from '@/programs/usePrograms'
import { assignExerciseToProgram } from '@/programs/api'
import { canModifyProgram } from '@/programs/permissions'
import { useAssignedPrograms } from '@/assigned-programs/useAssignedPrograms'
import { assignExerciseToAssignedProgram } from '@/assigned-programs/api'

type AssignTarget = 'template' | 'assigned'

// Shown for EVERY exercise (shared library or own) — assigning an
// existing exercise into a program is a different capability from
// editing the exercise's own definition, per the design discussion.
// Deliberately reachable without an ownership check on the EXERCISE
// itself; the real gating that matters here is per-PROGRAM (see
// canModifyProgram below), not per-exercise.
export function ExerciseAssignPage() {
  const { id } = useParams<{ id: string }>()
  const exerciseId = Number(id)

  if (!id || Number.isNaN(exerciseId)) {
    return <p className="text-sm text-destructive">Invalid exercise.</p>
  }

  return <ExerciseAssignView exerciseId={exerciseId} />
}

function ExerciseAssignView({ exerciseId }: { exerciseId: number }) {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const [target, setTarget] = useState<AssignTarget>('template')
  const [selected, setSelected] = useState<{ id: number; title: string } | null>(
    null,
  )

  const { data: templates, isLoading: isLoadingTemplates, isError: isTemplatesError } =
    usePrograms()
  const {
    data: assignedPrograms,
    isLoading: isLoadingAssigned,
    isError: isAssignedError,
  } = useAssignedPrograms()

  // Templates aren't scoped server-side (GET /programs returns every
  // non-archived one system-wide) — filtered here to only the ones this
  // person could actually add to, so nothing in this list would just
  // 403 on confirm. Assigned programs need no equivalent filter: that
  // list is already properly scoped per role server-side.
  const ownTemplates = currentUser
    ? (templates ?? []).filter((template) =>
        canModifyProgram(template, currentUser),
      )
    : []

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('No program selected')
      }
      return target === 'template'
        ? assignExerciseToProgram(selected.id, exerciseId)
        : assignExerciseToAssignedProgram(selected.id, exerciseId)
    },
    onSuccess: () => {
      void navigate(`/practitioner/library/${exerciseId}`)
    },
  })

  const isLoading =
    target === 'template' ? isLoadingTemplates : isLoadingAssigned
  const isError = target === 'template' ? isTemplatesError : isAssignedError
  const items =
    target === 'template'
      ? ownTemplates.map((t) => ({ id: t.id, title: t.title }))
      : (assignedPrograms ?? []).map((p) => ({ id: p.id, title: p.title }))

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 className="text-xl font-semibold">Assign Exercise to</h1>

      {/* Two mutually-exclusive buttons rather than a single toggle
          switch — clearer at a glance which of the two modes is active,
          and avoids the ambiguity a bare on/off switch would have about
          which STATE maps to which list. */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={target === 'template' ? 'default' : 'outline'}
          aria-pressed={target === 'template'}
          onClick={() => setTarget('template')}
        >
          Template
        </Button>
        <Button
          type="button"
          variant={target === 'assigned' ? 'default' : 'outline'}
          aria-pressed={target === 'assigned'}
          onClick={() => setTarget('assigned')}
        >
          Assigned Program
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {target === 'template'
            ? "Couldn't load templates. Try refreshing."
            : "Couldn't load assigned programs. Try refreshing."}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {target === 'template'
            ? 'No templates available yet.'
            : 'No assigned programs available yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted"
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="outline">
        <Link to={`/practitioner/library/${exerciseId}`}>Back</Link>
      </Button>

      {/* Controlled by whether something is selected, rather than a
          separate boolean — selecting an item and opening the dialog
          are the same action, so one piece of state covers both. */}
      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to {selected?.title}?</DialogTitle>
            <DialogDescription>
              This adds the exercise to the end of {selected?.title}'s
              exercise list.
            </DialogDescription>
          </DialogHeader>

          {assignMutation.isError && (
            <p className="text-sm text-destructive">
              {assignMutation.error instanceof ApiError
                ? assignMutation.error.messages.join(', ')
                : 'Something went wrong'}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={assignMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            {/* Deliberately NOT a DialogClose — same reasoning as
                ArchiveExerciseButton: stays open on failure so the error
                message above remains visible, only closing (by leaving
                this page entirely, via navigate in onSuccess) once the
                request truly succeeds. */}
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assigning…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}