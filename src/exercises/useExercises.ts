import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchExercises, exercisesListQueryKey } from './api'
import type { FetchExercisesParams } from './api'

// placeholderData: keepPreviousData (the TanStack Query v5 replacement
// for v4's `keepPreviousData: true` option) means changing the search
// term, the mine toggle, or the page number shows the PREVIOUS page's
// results (slightly stale, greyed-out-able via isPlaceholderData) while
// the new request is in flight, rather than the whole grid flashing to a
// loading state and back on every change. For a list someone is actively
// typing into or paging through, that's a much smoother feel than a
// full reload each time.
//
// enabled defaults to true (every existing caller's behavior is
// unchanged) — added for ExercisePickerPage, which can't call this hook
// conditionally (React's rules of hooks) but shouldn't fetch anything
// when returnTo is missing and an error is about to show instead of the
// list at all.
export function useExercises(params: FetchExercisesParams, enabled = true) {
  return useQuery({
    queryKey: exercisesListQueryKey(params),
    queryFn: () => fetchExercises(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}