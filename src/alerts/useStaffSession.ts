import { useQuery } from '@tanstack/react-query'
import { fetchStaffSession, staffSessionQueryKey } from './api'

export function useStaffSession(id: number) {
  return useQuery({
    queryKey: staffSessionQueryKey(id),
    queryFn: () => fetchStaffSession(id),
  })
}