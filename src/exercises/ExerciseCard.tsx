import { Link } from 'react-router'
import { Dumbbell } from 'lucide-react'
import type { ExerciseListItem } from './types'

interface ExerciseCardProps {
  exercise: ExerciseListItem
  // Defaults to the exercise's own detail page (the Library browse
  // context) — overridden by ExercisePickerPage, the second real
  // consumer of this same card, so picking an exercise navigates back
  // to wherever it was picked FOR instead of to the exercise's own page.
  href?: string
}

export function ExerciseCard({ exercise, href }: ExerciseCardProps) {
  return (
    <Link
      to={href ?? `/practitioner/library/${exercise.id}`}
      className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50"
    >
      {/* A placeholder icon, not a real thumbnail, for every card
          regardless of whether mediaUrls is populated — mediaUrls
          stores raw storage keys, not usable URLs (no presigned-URL
          conversion exists for exercises yet; avatars and clinic logos
          have one, exercises are still to do).
          Real thumbnails are the roadmap's own separate 🟡 "Exercise
          image upload" item, not part of this browse pass. */}
      <div
        className="flex h-24 items-center justify-center rounded-md bg-muted"
        aria-hidden="true"
      >
        <Dumbbell className="h-8 w-8 text-muted-foreground" />
      </div>

      <span className="font-medium leading-tight">{exercise.name}</span>

      {exercise.primaryMuscles.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {exercise.primaryMuscles.join(', ')}
        </span>
      )}

      {/* Omitted entirely (not "by —") for the shared api-sourced
          library, which has no author at all — a blank line would just
          be noise where there's nothing to say. */}
      {exercise.author && (
        <span className="text-xs text-muted-foreground">
          by {exercise.author.firstName} {exercise.author.lastName}
        </span>
      )}
    </Link>
  )
}