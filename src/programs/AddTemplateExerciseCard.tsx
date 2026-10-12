import { Link } from 'react-router'
import { Plus } from 'lucide-react'

interface AddTemplateExerciseCardProps {
  templateId: number
  // The workout the new exercise goes into, when the template has several
  // (each workout has its own Add card). It travels in the address,
  // `…/exercises/new?workoutId=58`, so the add page — and the library
  // picker it sends you through and back — knows where it goes. Absent for
  // a one-workout template: the link stays as it always was, and the
  // backend uses the only workout.
  workoutId?: number
  // "B · Strength", for the link's accessible name: every workout has an
  // Add card, and a screen-reader user listing the page's links would
  // otherwise hear "Add New Exercise" several times with nothing to tell
  // them apart. Not shown — the card sits under its workout's header.
  workoutLabel?: string
}

// Positioned LAST when its workout already has exercises, but FIRST when it
// has none — deliberately different from the exercise Library's own
// AddExerciseCard (always first regardless), per the design discussion.
// Positioning is handled by the caller (TemplateExerciseList), not this
// component, since it depends on how many OTHER cards exist.
export function AddTemplateExerciseCard({
  templateId,
  workoutId,
  workoutLabel,
}: AddTemplateExerciseCardProps) {
  const query = workoutId === undefined ? '' : `?workoutId=${workoutId}`
  return (
    <Link
      to={`/practitioner/programs/templates/${templateId}/exercises/new${query}`}
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