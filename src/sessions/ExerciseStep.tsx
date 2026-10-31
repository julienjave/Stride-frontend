import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { ExercisePhotoCarousel } from '@/programs/ExercisePhotoCarousel'
import { ScoreScale } from './ScoreScale'
import { ExerciseTimer } from './timer/ExerciseTimer'
import type { Beeper } from './timer/beeper'
import { FEEDBACK_MAX_LENGTH, noteToSend } from './sessionRules'
import type { SessionExercise, SessionExerciseChanges } from './types'

// ONE exercise of a running session (pass (b), decided 2026-10-16: one at a
// time on a phone). Everything shown is the SESSION's copy — what this
// session was given when it started — except the photos, which are the
// program's (live from the library).
//
// It only DRAWS and reports: `save(changes, failure)` is the player's
// optimistic update. The timer (2026-10-31) is the one thing with a life of
// its own, and it saves nothing: a hold countdown when a duration is
// prescribed, a stopwatch otherwise — forgotten when the patient moves to
// another exercise (the `key` below restarts this component). The note keeps a DRAFT of its own (typing isn't
// saving); the page gives this component `key={exercise.id}`, so moving to
// another exercise starts a fresh draft.
export function ExerciseStep({
  exercise,
  photos,
  headingRef,
  save,
  beeper,
}: {
  exercise: SessionExercise
  photos: { url: string }[]
  // The heading, so the player can move focus to it when the exercise
  // changes (see SessionPlayer).
  headingRef: React.Ref<HTMLHeadingElement>
  save: (changes: SessionExerciseChanges, failure: string) => void
  // The timer's sound maker — the app's shared one unless a test passes a
  // fake (jsdom has no Web Audio).
  beeper?: Beeper
}) {
  const name = exercise.name

  return (
    <article aria-labelledby={`exercise-${exercise.id}`} className="space-y-5">
      <div className="space-y-1">
        <h2
          id={`exercise-${exercise.id}`}
          ref={headingRef}
          // Focusable by script only (-1: not a Tab stop) — where focus goes
          // when Next shows another exercise.
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          {name}
        </h2>
        <PrescriptionSummary prescription={exercise} className="text-sm" />
      </div>

      {photos.length > 0 && <ExercisePhotoCarousel images={photos} exerciseName={name} />}

      <section aria-label="How to do it" className="space-y-2">
        <ol className="list-decimal space-y-1 pl-5">
          {exercise.instructions.map((step, index) => (
            // Steps can repeat word for word; the position makes the key.
            <li key={index}>{step}</li>
          ))}
        </ol>
        {exercise.notes && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">From your practitioner: </span>
            {exercise.notes}
          </p>
        )}
        <Equipment exercise={exercise} />
      </section>

      {/* After the steps (read first, then do), before Done (tap when it's
          done). */}
      <ExerciseTimer exercise={exercise} beeper={beeper} />

      <DoneToggle
        done={exercise.completed}
        name={name}
        onToggle={(completed) =>
          save({ completed }, `Couldn't save “Done” for ${name}`)
        }
      />

      <section aria-label="How did it feel?" className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">How did it feel?</h3>
        <ScoreScale
          legend="How hard was it?"
          lowLabel="very easy"
          highLabel="very hard"
          min={1}
          value={exercise.difficultyRating}
          onChange={(difficultyRating) =>
            save({ difficultyRating }, `Couldn't save the difficulty for ${name}`)
          }
        />
        <NoteField
          saved={exercise.feedback}
          onSave={(feedback) => save({ feedback }, `Couldn't save your note for ${name}`)}
        />
      </section>
    </article>
  )
}

// A toggle BUTTON (aria-pressed), not a checkbox: one big tap target on a
// phone. Its name stays "Done" whether pressed or not — a screen reader
// says "Done, toggle button, pressed" — and the look follows the state: a
// filled button with a tick, or an outlined one with an empty circle. (A
// label that changed with the state would describe the opposite action half
// the time.)
function DoneToggle({
  done,
  name,
  onToggle,
}: {
  done: boolean
  name: string
  onToggle: (completed: boolean) => void
}) {
  return (
    <Button
      type="button"
      size="lg"
      variant={done ? 'default' : 'outline'}
      aria-pressed={done}
      // The exercise's name in the accessible name ("Done: Squat"): the "All
      // exercises" list and other pages say which exercise; the visible word
      // starts the name (voice control).
      aria-label={`Done: ${name}`}
      onClick={() => onToggle(!done)}
      className="w-full sm:w-auto"
    >
      {done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
      Done
    </Button>
  )
}

// The patient's note on this exercise, for their practitioner. A draft
// while typing; "Save note" sends it (trimmed — nothing written = no note,
// `null`) and is offered only when the draft differs from what is saved.
function NoteField({
  saved,
  onSave,
}: {
  saved: string | null
  onSave: (feedback: string | null) => void
}) {
  const [draft, setDraft] = useState(saved ?? '')
  const toSend = noteToSend(draft)
  const changed = toSend !== saved

  return (
    <div className="space-y-2">
      <Label htmlFor="exercise-note">Anything to tell your practitioner? (optional)</Label>
      <Textarea
        id="exercise-note"
        value={draft}
        maxLength={FEEDBACK_MAX_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!changed}
        onClick={() => onSave(toSend)}
      >
        {saved !== null && toSend === null ? 'Remove note' : 'Save note'}
      </Button>
    </div>
  )
}

// What the exercise works and needs, in one quiet line — only the parts it
// has ("Works: quadriceps, hamstrings · Equipment: band").
function Equipment({ exercise }: { exercise: SessionExercise }) {
  const parts = [
    exercise.primaryMuscles.length > 0 && `Works: ${exercise.primaryMuscles.join(', ')}`,
    exercise.equipment.length > 0 && `Equipment: ${exercise.equipment.join(', ')}`,
  ].filter((part): part is string => typeof part === 'string')
  if (parts.length === 0) return null
  return <p className="text-sm text-muted-foreground">{parts.join(' · ')}</p>
}