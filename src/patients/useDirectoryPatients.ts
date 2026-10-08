import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { directoryPatientsQueryKey, fetchDirectoryPatients } from './api'

// The clinic directory, for one search term ('' = the default list).
//
// `placeholderData: keepPreviousData`: while the next search's results are
// on their way, keep showing the previous ones (TanStack Query marks them
// with `isPlaceholderData`, which the page uses to dim the list) instead of
// emptying the list and flashing "Loading…" on every keystroke that gets
// past the debounce. Same choice as the exercise library's search.
export function useDirectoryPatients(search: string) {
  return useQuery({
    queryKey: directoryPatientsQueryKey(search),
    queryFn: () => fetchDirectoryPatients(search),
    placeholderData: keepPreviousData,
  })
}