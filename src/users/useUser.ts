import { useQuery } from '@tanstack/react-query'
import { fetchUser, userQueryKey } from './api'

// Same thin-wrapper shape as useClinic — parameterized by id, reading
// from (and, via setQueryData/invalidateQueries elsewhere, written to)
// the per-user cache entry userQueryKey(id) identifies.
// `enabled` (default true) lets a page switch the query off — the patient
// page does, the moment its practitioner leaves the care team, so the
// profile is never fetched again on the way out (see useLeaveCareTeam).
export function useUser(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: () => fetchUser(id),
    enabled,
  })
}