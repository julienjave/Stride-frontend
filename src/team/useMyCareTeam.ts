import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { fetchMyCareTeam, myCareTeamQueryKey } from './api'

// The logged-in patient's care team — the list page and the profile page
// read the SAME query, so opening a profile from the list finds it cached
// (no second request, no loading flash). The id comes from /auth/me; until
// it's known the query waits (`enabled`) instead of asking for "undefined".
// In practice the patient's pages render only once /auth/me has answered
// (RequireRole), so `enabled` is a safety net, not a path a test can reach.
export function useMyCareTeam() {
  const { data: me } = useCurrentUser()
  const patientId = me?.id
  return useQuery({
    queryKey: myCareTeamQueryKey(patientId ?? 0),
    queryFn: () => fetchMyCareTeam(patientId ?? 0),
    enabled: patientId !== undefined,
  })
}