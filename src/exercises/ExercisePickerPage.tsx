import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useDebouncedValue } from '@/common/useDebouncedValue'
import { useExercises } from './useExercises'
import { ExerciseCard } from './ExerciseCard'
import { localPath, pickerReturnHref } from './pickerReturnHref'

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

  const { data, isLoading, isError, isPlaceholderData } = useExercises(
    {
      page,
      search: debouncedSearch,
      mine,
    },
    returnTo != null,
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
        <h1 className="text-xl font-semibold">Select an Exercise</h1>
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

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading exercises…</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Couldn't load exercises. Try refreshing.
        </p>
      )}

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