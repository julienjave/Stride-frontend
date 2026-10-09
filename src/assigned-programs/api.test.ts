import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { assignedProgramsListQueryKey, patientAssignedProgramsQueryKey } from './api'

describe('patientAssignedProgramsQueryKey', () => {
  // The contract the key's shape exists for: whatever refreshes "the
  // programs list" after changing a program refreshes each patient's list
  // too — a prefix match, no extra line at each call site.
  it("sits under the programs list's key, so invalidating the list refreshes it", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(patientAssignedProgramsQueryKey(6), [])

    void queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey })

    expect(queryClient.getQueryState(patientAssignedProgramsQueryKey(6))?.isInvalidated).toBe(true)
  })

  it('is distinct per patient', () => {
    expect(patientAssignedProgramsQueryKey(6)).not.toEqual(patientAssignedProgramsQueryKey(7))
  })
})