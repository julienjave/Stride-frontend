import { Link } from 'react-router'
import { Plus } from 'lucide-react'

interface AddWorkoutExerciseCardProps {
  // The template's or program's own page (`/practitioner/programs/
  // templates/12`, `/practitioner/programs/assigned/46`): its add page is
  // `${resourcePath}/exercises/new` (NewWorkoutExerciseView, either way).
  resourcePath: string
  // The workout the new exercise goes into, when there are several (each
  // workout has its own Add card). It travels in the address,
  // `…/exercises/new?workoutId=58`, so the add page — and the library
  // picker it sends you through and back — knows where it goes. Absent with
  // one workout: the link stays as it always was, and the backend uses the
  // only workout.
  workoutId?: number
  // "B · Strength", for the link's accessible name: every workout has an
  // Add card, and a screen-reader user listing the page's links would
  // otherwise hear "Add New Exercise" several times with nothing to tell
  // them apart. Not shown — the card sits under its workout's header.
  workoutLabel?: string
}

// The dashed "Add New Exercise" card at the end of a workout's list.
// Built for templates (AddTemplateExerciseCard, 3a-w); since step 3b-1b the
// program page uses it too, so it takes the resource's address instead of
// a template id — the only thing that differed.
//
// Positioned LAST when its workout already has exercises, but FIRST when it
// has none — deliberately different from the exercise Library's own
// AddExerciseCard (always first regardless), per the design discussion.
// Positioning is handled by the caller (WorkoutListEditor), not this
// component, since it depends on how many OTHER cards exist.
export function AddWorkoutExerciseCard({
  resourcePath,
  workoutId,
  workoutLabel,
}: AddWorkoutExerciseCardProps) {
  const query = workoutId === undefined ? '' : `?workoutId=${workoutId}`
  return (
    <Link
      to={`${resourcePath}/exercises/new${query}`}
      // An explicit name rather than a visually hidden " to workout B" span:
      // how the space at a hidden span's edge is counted differs between
      // tools (jsdom drops it: "Exerciseto"). The visible words START the
      // name, so a voice-control user saying "click Add New Exercise" still
      // matches it.
      aria-label={workoutLabel ? `Add New Exercise to workout ${workoutLabel}` : undefined}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground hover:bg-muted/50"
    >
      <div className="flex h-16 items-center justify-center">
        <Plus className="h-6 w-6" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium">Add New Exercise</span>
    </Link>
  )
}