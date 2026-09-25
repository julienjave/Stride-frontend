import { useQuery } from '@tanstack/react-query'
import { fetchClinic, clinicQueryKey } from './api'

// Same thin-wrapper shape as useClinics — the only difference is this one
// is parameterized by id, so it reads from (and can later be written to
// via setQueryData, see useSaveClinic) the per-clinic cache entry
// clinicQueryKey(id) identifies, rather than the shared list entry.
export function useClinic(id: number) {
  return useQuery({
    queryKey: clinicQueryKey(id),
    queryFn: () => fetchClinic(id),
  })
}