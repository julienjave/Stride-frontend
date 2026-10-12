import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { programsListQueryKey } from './api'
import {
  upsertInProgramsList,
  removeFromProgramsList,
} from './programsListCache'
import type { ProgramTemplate, ProgramTemplateDetail } from './types'

function listItem(overrides: Partial<ProgramTemplate> = {}): ProgramTemplate {
  return {
    id: 1,
    practitionerId: 7,
    title: 'Shoulder Rehab',
    description: null,
    isArchived: false,
    ...overrides,
  }
}

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient()
})

describe('upsertInProgramsList', () => {
  it('replaces the matching entry in place, keeping the order', () => {
    queryClient.setQueryData(programsListQueryKey, [
      listItem({ id: 1 }),
      listItem({ id: 2, title: 'Old Title' }),
      listItem({ id: 3 }),
    ])

    upsertInProgramsList(queryClient, listItem({ id: 2, title: 'New Title' }))

    expect(
      queryClient
        .getQueryData<ProgramTemplate[]>(programsListQueryKey)
        ?.map((t) => [t.id, t.title]),
    ).toEqual([
      [1, 'Shoulder Rehab'],
      [2, 'New Title'],
      [3, 'Shoulder Rehab'],
    ])
  })

  it('appends a template that is not in the list yet', () => {
    queryClient.setQueryData(programsListQueryKey, [listItem({ id: 1 })])

    upsertInProgramsList(queryClient, listItem({ id: 42 }))

    expect(
      queryClient
        .getQueryData<ProgramTemplate[]>(programsListQueryKey)
        ?.map((t) => t.id),
    ).toEqual([1, 42])
  })

  it('strips the workouts and exercises, so the list keeps the real list endpoint shape', () => {
    queryClient.setQueryData(programsListQueryKey, [])
    const detail: ProgramTemplateDetail = {
      ...listItem({ id: 5 }),
      workouts: [{ id: 1, templateId: 5, name: 'Mobility', sortOrder: 0 }],
      exercises: [],
    }

    upsertInProgramsList(queryClient, detail)

    // toStrictEqual: an extra `workouts` key must fail, not be overlooked.
    expect(queryClient.getQueryData(programsListQueryKey)).toStrictEqual([
      listItem({ id: 5 }),
    ])
  })

  it('does nothing when the list has never been fetched', () => {
    upsertInProgramsList(queryClient, listItem({ id: 5 }))

    // Not an empty array — genuinely absent, so the hub's first visit
    // still does a real fetch instead of trusting a one-item "list".
    expect(queryClient.getQueryData(programsListQueryKey)).toBeUndefined()
  })

  it('marks the list stale, so the server still gets the final word', () => {
    queryClient.setQueryData(programsListQueryKey, [listItem({ id: 1 })])

    upsertInProgramsList(queryClient, listItem({ id: 1, title: 'Renamed' }))

    expect(
      queryClient.getQueryState(programsListQueryKey)?.isInvalidated,
    ).toBe(true)
  })
})

describe('removeFromProgramsList', () => {
  it('removes the matching entry and leaves the rest', () => {
    queryClient.setQueryData(programsListQueryKey, [
      listItem({ id: 1 }),
      listItem({ id: 2 }),
    ])

    removeFromProgramsList(queryClient, 1)

    expect(
      queryClient
        .getQueryData<ProgramTemplate[]>(programsListQueryKey)
        ?.map((t) => t.id),
    ).toEqual([2])
  })

  it('does nothing when the list has never been fetched', () => {
    removeFromProgramsList(queryClient, 1)
    expect(queryClient.getQueryData(programsListQueryKey)).toBeUndefined()
  })
})