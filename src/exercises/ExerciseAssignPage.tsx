import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { LoadError } from '@/common/LoadError'
import { RecordNotFound } from '@/common/RecordNotFound'
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
} from '@/components/ui/dialog'
import { failureText } from '@/api/apiErrors'
import { usePrograms } from '@/programs/usePrograms'
import { assignExerciseToProgram } from '@/programs/api'
import { canModifyProgram } from '@/programs/permissions'
import { useAssignedPrograms } from '@/assigned-programs/useAssignedPrograms'
import { assignExerciseToAssignedProgram } from '@/assigned-programs/api'
import { ListSkeleton } from '@/common/Loading'

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

  // (An id that isn't a number can't be an exercise: the 404's page of the
  // other exercise pages.)
  if (!id || Number.isNaN(exerciseId)) {
    return (
      <RecordNotFound noun="exercise" links={[{ to: '/practitioner/library', label: 'Exercise Library' }]} />
    )
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

  const templatesQuery = usePrograms()
  const assignedQuery = useAssignedPrograms()
  const { data: templates } = templatesQuery
  const { data: assignedPrograms } = assignedQuery

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

  // The list on screen is the chosen one's: its loading state, its failure
  // (and "Try again" asks only it again), and — after a retry that worked —
  // focus on the page's heading.
  const shownQuery = target === 'template' ? templatesQuery : assignedQuery
  const { isLoading, isError } = shownQuery
  const what = target === 'template' ? 'the templates' : 'the assigned programs'
  const heading = useRetryFocus<HTMLHeadingElement>(what, shownQuery.isSuccess)
  const items =
    target === 'template'
      ? ownTemplates.map((t) => ({ id: t.id, title: t.title }))
      : (assignedPrograms ?? []).map((p) => ({ id: p.id, title: p.title }))

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        Assign Exercise to
      </h1>

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
        <ListSkeleton label={`Loading ${what}…`} layout="cards" />
      ) : isError ? (
        <LoadError what={what} queries={[shownQuery]} />
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
            {/* Where it really goes (step 3b-1b): no workout is named from
                here, so the backend puts it at the end of the FIRST one —
                "the end of the exercise list" was exact only with one
                workout. The lists this page reads carry no workouts, so the
                sentence names the rule, and where to choose instead. */}
            <DialogDescription>
              This adds the exercise at the end of {selected?.title}'s first
              workout. To add it to another workout, use that workout's Add
              card on the {target === 'template' ? 'template' : 'program'}'s page.
            </DialogDescription>
          </DialogHeader>

          {assignMutation.isError && (
            <p className="text-sm text-destructive">
              {failureText(assignMutation.error)}
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