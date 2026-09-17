import { useQuery } from '@tanstack/react-query'
import { fetchUsers, usersQueryKey } from './api'

// Same thin-wrapper shape as useClinics — a plain useQuery is the right
// amount of machinery here (no shared-observer stampede to guard against,
// unlike useCurrentUser's bootstrap-once needs).
export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers,
  })
}