import { useQuery } from '@tanstack/react-query'
import { fetchProgram, programQueryKey } from './api'

export function useProgram(id: number) {
  return useQuery({
    queryKey: programQueryKey(id),
    queryFn: () => fetchProgram(id),
  })
}