import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AssignedProgramDetail } from '@/assigned-programs/types'
import { cn } from '@/lib/utils'
import { ExerciseStep } from './ExerciseStep'
import { checklistProgressText } from './sessionText'
import { firstToDoIndex, photosFor } from './sessionRules'
import type { Session } from './types'
import { useUpdateSessionExercise } from './useUpdateSessionExercise'

// A running session, one exercise at a time (pass (b), decided 2026-10-16):
// "Exercise 2 of 5", the exercise, Previous / Next, and every exercise
// listed below to jump to (with what's done).
//
// Which exercise is shown is plain component state, not in the address:
// Previous / Next aren't pages — the phone's Back button should leave the
// session, not step back through exercises. It OPENS on the first exercise
// not done yet, so Resume lands where the patient stopped.
export function SessionPlayer({
  session,
  program,
}: {
  session: Session
  // For the photos only (the program's exercises carry them); undefined
  // while it loads or if it can't be read — the exercises still show.
  program: AssignedProgramDetail | undefined
}) {
  const exercises = session.exercises
  const [index, setIndex] = useState(() => firstToDoIndex(exercises))
  const { update, problem } = useUpdateSessionExercise(session.id)

  // Focus follows the exercise: after Next (or a jump from the list) a
  // keyboard or screen-reader user lands on the new exercise's NAME, read
  // out at once — instead of staying on a button whose page content changed
  // under it. Not on the first render: opening the page keeps the browser's
  // own focus.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (moved.current) headingRef.current?.focus()
  }, [index])

  function go(next: number) {
    moved.current = true
    setIndex(next)
  }

  // Never past the end (a checklist doesn't shrink while open, but a
  // remembered position must not read past it either way).
  const shown = Math.min(index, exercises.length - 1)
  const exercise = exercises[shown]
  const total = exercises.length

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold uppercase text-muted-foreground">
          Exercise {shown + 1} of {total}
        </p>
        <p className="text-sm text-muted-foreground">{checklistProgressText(exercises)}</p>
      </div>

      {/* The player's one message area: the last failed save (the change
          itself was undone on screen). */}
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}

      <ExerciseStep
        key={exercise.id}
        exercise={exercise}
        photos={photosFor(program, exercise.assignedProgramExerciseId)}
        headingRef={headingRef}
        save={(changes, failure) => update({ rowId: exercise.id, changes, failure })}
      />

      <nav aria-label="Exercises" className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => go(shown - 1)}
          disabled={shown === 0}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        {shown < total - 1 ? (
          <Button type="button" onClick={() => go(shown + 1)}>
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">That's the last exercise.</p>
        )}
      </nav>

      {/* The endings (pass (c)): Finish reviews before anything is final;
          Stop asks why. Both pages — a phone's Back returns here. */}
      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button asChild size="lg">
          <Link to={`/patient/sessions/${session.id}/finish`}>Finish session</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/patient/sessions/${session.id}/stop`}>Stop session</Link>
        </Button>
      </div>

      <section aria-labelledby="all-exercises" className="space-y-2">
        <h2 id="all-exercises" className="text-sm font-semibold uppercase text-muted-foreground">
          All exercises
        </h2>
        <ol className="divide-y rounded-lg border">
          {exercises.map((row, position) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => go(position)}
                // The one being shown, said to screen readers ("current
                // step") as well as drawn.
                aria-current={position === shown ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
                  position === shown && 'bg-muted',
                )}
              >
                <span>
                  {position + 1}. {row.name}
                </span>
                {/* In words, not a tick alone. */}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.completed ? 'Done' : 'To do'}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}