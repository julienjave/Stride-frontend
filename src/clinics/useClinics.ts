import { useQuery } from '@tanstack/react-query'
import { fetchClinics, clinicsListQueryKey } from './api'

// Same shape as useHealthCheck (common/useHealthCheck.ts) — a thin wrapper
// naming a specific useQuery call, rather than every consumer writing out
// { queryKey: clinicsListQueryKey(...), queryFn: ... } by hand. Unlike
// useCurrentUser, this one needs none of that hook's special bootstrap-
// once machinery — the clinics list isn't read by half a dozen
// independent components on every render the way "who's logged in" is,
// so there's no shared-observer stampede to guard against here. A plain
// useQuery is the right amount of machinery for this.
//
// includeInactive is part of the query key (see usersListQueryKey's
// identical reasoning) — without that, toggling "show deactivated
// clinics" would read whatever the other mode last cached.
export function useClinics(includeInactive = false) {
  return useQuery({
    queryKey: clinicsListQueryKey(includeInactive),
    queryFn: () => fetchClinics(includeInactive),
  })
}