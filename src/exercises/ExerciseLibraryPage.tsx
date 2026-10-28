import { useState } from 'react'
import { LoadError } from '@/common/LoadError'
import { useDebouncedValue } from '@/common/useDebouncedValue'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useExercises } from './useExercises'
import { ExerciseCard } from './ExerciseCard'
import { AddExerciseCard } from './AddExerciseCard'
import { GridSkeleton } from '@/common/Loading'

export function ExerciseLibraryPage() {
  // Raw, instant state the search input is actually bound to — kept
  // separate from the debounced value below so the input itself never
  // feels laggy, even though the QUERY it drives is deliberately delayed.
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)

  const exercises = useExercises({
    page,
    search: debouncedSearch,
    mine,
  })
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

  // Changing what's being searched/filtered while sitting on, say, page 3
  // could easily land on a page that no longer has enough results to
  // exist — resetting to page 1 whenever the search term or the mine
  // toggle changes avoids ever showing an empty page 3 of a 1-page result
  // set. Note this handler wraps the SETTERS, not a useEffect keyed on
  // debouncedSearch/mine — so page resets the moment the toggle is
  // clicked or typing changes, not only after the debounce delay elapses.
  function updateSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }

  function updateMine(value: boolean) {
    setMine(value)
    setPage(1)
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6 px-4">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        Exercise Library
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search by name or muscle…"
          aria-label="Search exercises"
          className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-xs"
        />

        {/* A plain native checkbox, not a shadcn/Radix component — same
            reasoning as ClinicsListPage's "Show deactivated clinics"
            toggle: no popover or keyboard-nav list to manage, so Radix's
            extra machinery buys nothing here. */}
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
          // isPlaceholderData is true while showing the PREVIOUS page's
          // results during a page/filter change (see useExercises' own
          // comment on keepPreviousData) — dimming the grid slightly is
          // a small, standard signal that what's showing is about to
          // change, without the jarring full-reload flash a plain
          // loading state would cause on every keystroke or page click.
          className={
            isPlaceholderData
              ? 'grid grid-cols-2 gap-4 opacity-60 transition-opacity sm:grid-cols-3 md:grid-cols-4'
              : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
          }
        >
          {/* Always first, regardless of search/filter/page — see
              AddExerciseCard's own comment. */}
          <AddExerciseCard />

          {data.data.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No exercises match your search.
            </p>
          )}

          {data.data.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
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