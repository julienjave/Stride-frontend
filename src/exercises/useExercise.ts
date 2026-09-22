import { useQuery } from '@tanstack/react-query'
import { fetchExercise, exerciseQueryKey } from './api'

// Same thin-wrapper shape as useClinic — reads from (and, on the photos
// screen, gets written to via setQueryData after each upload/reorder/
// delete) the per-exercise cache entry exerciseQueryKey(id) identifies.
//
// enabled defaults to true (every existing caller's behavior is
// unchanged) — added for NewProgramExercisePage, which can't call this
// hook conditionally (React's rules of hooks) but genuinely shouldn't
// fetch anything until an exercise has actually been picked from the
// library. Passing enabled: false there, with some placeholder id,
// skips the request entirely rather than fetching data nothing needs yet.
export function useExercise(id: number, enabled = true) {
  return useQuery({
    queryKey: exerciseQueryKey(id),
    queryFn: () => fetchExercise(id),
    enabled,
  })
}