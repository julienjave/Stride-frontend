import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  assignedProgramQueryKey,
  assignedProgramSummaryQueryKey,
  assignedProgramsListQueryKey,
  patientAssignedProgramsQueryKey,
} from './api'

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

describe('assignedProgramSummaryQueryKey', () => {
  // The contract: whatever refreshes ONE program after changing it (a new
  // schedule version, closing it) refreshes its progress too.
  it("sits under the program's own key, so invalidating the program refreshes it", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, '2031-06-05'), {})

    void queryClient.invalidateQueries({ queryKey: assignedProgramQueryKey(12) })

    expect(
      queryClient.getQueryState(assignedProgramSummaryQueryKey(12, '2031-06-05'))?.isInvalidated,
    ).toBe(true)
  })

  it('is distinct per program and per day', () => {
    expect(assignedProgramSummaryQueryKey(12, '2031-06-05')).not.toEqual(
      assignedProgramSummaryQueryKey(13, '2031-06-05'),
    )
    expect(assignedProgramSummaryQueryKey(12, '2031-06-05')).not.toEqual(
      assignedProgramSummaryQueryKey(12, '2031-06-06'),
    )
  })

  it("is NOT under the programs list's key: refreshing every list leaves it alone", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, '2031-06-05'), {})

    void queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey })

    expect(
      queryClient.getQueryState(assignedProgramSummaryQueryKey(12, '2031-06-05'))?.isInvalidated,
    ).toBe(false)
  })
})