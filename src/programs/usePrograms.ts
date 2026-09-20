import { useQuery } from '@tanstack/react-query'
import { fetchPrograms, programsListQueryKey } from './api'

export function usePrograms() {
  return useQuery({
    queryKey: programsListQueryKey,
    queryFn: fetchPrograms,
  })
}