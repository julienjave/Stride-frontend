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
import { Link, useSearchParams } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { useDebouncedValue } from '@/common/useDebouncedValue'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useExercises } from './useExercises'
import { ExerciseCard } from './ExerciseCard'
import { localPath, pickerReturnHref } from './pickerReturnHref'
import { GridSkeleton } from '@/common/Loading'

// A genuinely reusable "pick an exercise" page — not scoped to templates
// specifically, and not a modal (see the design discussion: this app's
// other multi-step flows are all real navigation between real routes,
// nothing needed to change here since picking happens before any other
// field gets filled in, so there's nothing to lose by navigating away).
// Deliberately its own page rather than a mode of ExerciseLibraryPage —
// touching that page's own tested logic to add a "picking" branch would
// be real risk for a small win; some duplication of its search/
// pagination UI here is the accepted cost (the actual DATA FETCHING,
// useExercises, is already 100% shared regardless).
//
// Driven by a `returnTo` query param rather than knowing anything about
// templates or assigned programs itself: picking an exercise navigates
// back to `returnTo` with `exerciseId={picked}` added to its query, so any
// future caller (assigned-program exercise creation, confirmed as a second
// real consumer) can reuse this exact page with zero changes here.
// `returnTo` may carry its own query (`?workoutId=58`), and comes from the
// address bar, so both links are built by pickerReturnHref / localPath,
// which keep it a path on this site (see that file).
export function ExercisePickerPage() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)

  const exercises = useExercises(
    {
      page,
      search: debouncedSearch,
      mine,
    },
    returnTo != null,
  )
  const { data, isLoading, isError, isPlaceholderData } = exercises
  // After a "Try again" that worked, focus goes to the page's heading (the
  // list has none of its own). NOT `isSuccess` alone: during a retry the
  // previous results stay on screen as placeholder data (useExercises'
  // keepPreviousData), and TanStack reports that as success — the answer
  // isn't in yet.
  const heading = useRetryFocus<HTMLHeadingElement>(
    'the exercises',
    exercises.isSuccess && !isPlaceholderData,
  )

  function updateSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  function updateMine(value: boolean) {
    setMine(value)
    setPage(1)
  }

  // Defensive — every real link to this page includes returnTo, but a
  // hand-edited or stale URL shouldn't silently strand someone with no
  // way back.
  if (!returnTo) {
    return (
      <p className="mx-auto mt-12 max-w-sm px-4 text-sm text-destructive">
        No return destination specified.
      </p>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6 px-4">
      <div className="flex items-center justify-between">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Select an Exercise
        </h1>
        <Link to={localPath(returnTo)} className="text-sm text-muted-foreground underline">
          Cancel
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search by name or muscle…"
          aria-label="Search exercises"
          className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => updateMine(e.target.checked)}
          />
          Only my exercises
        </label>
      </div>

      {isLoading && <GridSkeleton label="Loading exercises…" />}

      {isError && <LoadError what="the exercises" queries={[exercises]} />}

      {data && (
        <div
          className={
            isPlaceholderData
              ? 'grid grid-cols-2 gap-4 opacity-60 transition-opacity sm:grid-cols-3 md:grid-cols-4'
              : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
          }
        >
          {data.data.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No exercises match your search.
            </p>
          )}

          {data.data.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              href={pickerReturnHref(returnTo, exercise.id)}
            />
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(data.meta.totalPages, p + 1))
            }
            disabled={page >= data.meta.totalPages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}