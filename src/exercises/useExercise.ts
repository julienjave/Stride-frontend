import { useQuery } from '@tanstack/react-query'
import { fetchExercise, exerciseQueryKey } from './api'

// Same thin-wrapper shape as useClinic — reads from (and, on the photos
// screen, gets written to via setQueryData after each upload/reorder/
// delete) the per-exercise cache entry exerciseQueryKey(id) identifies.
export function useExercise(id: number) {
  return useQuery({
    queryKey: exerciseQueryKey(id),
    queryFn: () => fetchExercise(id),
  })
}