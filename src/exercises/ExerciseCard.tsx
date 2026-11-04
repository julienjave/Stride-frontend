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
  // Remembers WHICH url failed (UserAvatar's pattern): when the list is
  // fetched again with another URL — the next hour's signature, or a new
  // cover — it no longer equals failedUrl and gets a fresh try, with no
  // effect needed to reset a boolean.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showPhoto = exercise.coverUrl !== null && exercise.coverUrl !== failedUrl

  return (
    <Link
      to={href ?? `/practitioner/library/${exercise.id}`}
      className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50"
    >
      {/* The thumbnail: the exercise's cover photo (its first), or a
          dumbbell when it has none or the photo couldn't load (a URL that
          expired in a tab left open, storage down) — never the browser's
          broken-image icon.
          - The FRAME has a fixed height whatever happens inside it, so
            the grid doesn't jump when the photos arrive (no layout shift);
            the muted background shows while one downloads.
          - object-contain: the whole photo, scaled to fit, plain bands
            where its shape differs from the frame's — a start or end
            position with a foot or a hand cropped off would mislead (the
            photo carousel's choice too).
          - alt="": the photo repeats what the name right below says, so
            a screen reader would only read the name twice; the frame is
            hidden from it either way.
          - loading="lazy": cards below the screen download their photo
            only when scrolled near. decoding="async": decoding a big photo
            doesn't hold up drawing the rest of the page.
          - The URL stays the same for the whole hour (the backend's
            getCacheablePresignedUrl), so a refetched list hands React the
            same `src` and the browser serves the photo from its cache. */}
      <div
        className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-muted"
        aria-hidden="true"
      >
        {showPhoto ? (
          <img
            src={exercise.coverUrl ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
            onError={() => setFailedUrl(exercise.coverUrl)}
          />
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
        )}
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