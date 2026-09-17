import { useQuery } from '@tanstack/react-query'
import { fetchUser, userQueryKey } from './api'

// Same thin-wrapper shape as useClinic — parameterized by id, reading
// from (and, via setQueryData/invalidateQueries elsewhere, written to)
// the per-user cache entry userQueryKey(id) identifies.
export function useUser(id: number) {
  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: () => fetchUser(id),
  })
}