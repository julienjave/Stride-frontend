import { useQuery } from '@tanstack/react-query'
import { fetchClinics, clinicsQueryKey } from './api'

// Same shape as useHealthCheck (common/useHealthCheck.ts) — a thin wrapper
// naming a specific useQuery call, rather than every consumer writing out
// { queryKey: clinicsQueryKey, queryFn: fetchClinics } by hand. Unlike
// useCurrentUser, this one needs none of that hook's special bootstrap-
// once machinery — the clinics list isn't read by half a dozen
// independent components on every render the way "who's logged in" is,
// so there's no shared-observer stampede to guard against here. A plain
// useQuery is the right amount of machinery for this.
export function useClinics() {
  return useQuery({
    queryKey: clinicsQueryKey,
    queryFn: fetchClinics,
  })
}