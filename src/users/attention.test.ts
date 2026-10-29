import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { attentionHref, readAttention, refreshAttention } from './attention'
import { userListPageQueryKey, userQueryKey, usersListQueryKey } from './api'
import { adminMetricsQueryKey } from '@/app/home/admin/api'

describe('readAttention', () => {
  it('reads every group from the address', () => {
    expect(readAttention(new URLSearchParams('attention=patients-without-care-team'))).toBe(
      'patients-without-care-team',
    )
    expect(readAttention(new URLSearchParams('attention=practitioners-without-clinic'))).toBe(
      'practitioners-without-clinic',
    )
    expect(readAttention(new URLSearchParams('attention=invitations-to-send-again'))).toBe(
      'invitations-to-send-again',
    )
  })

  it('reads anything else as "all users"', () => {
    expect(readAttention(new URLSearchParams(''))).toBeNull()
    expect(readAttention(new URLSearchParams('attention='))).toBeNull()
    expect(readAttention(new URLSearchParams('attention=everyone'))).toBeNull()
    // A prefix of a real name is not that name.
    expect(readAttention(new URLSearchParams('attention=patients'))).toBeNull()
  })
})

describe('attentionHref', () => {
  it('leads to the users list filtered to the group', () => {
    expect(attentionHref('patients-without-care-team')).toBe(
      '/admin/users?attention=patients-without-care-team',
    )
    expect(attentionHref('practitioners-without-clinic')).toBe(
      '/admin/users?attention=practitioners-without-clinic',
    )
  })
})

describe('refreshAttention', () => {
  it("marks the home's numbers and every users list stale — and nothing else", async () => {
    const queryClient = new QueryClient()
    // The app's own key functions, not literals: a key moved out of reach
    // of refreshAttention (another prefix) must fail this test.
    const keys = {
      metrics: adminMetricsQueryKey,
      everyone: usersListQueryKey(false),
      withDeactivated: usersListQueryKey(true),
      // A page of the Users page (GET /admin/users), a group's included.
      page: userListPageQueryKey('attention=patients-without-care-team'),
      oneUser: userQueryKey(7),
      careTeam: ['care-team', 7],
    }
    for (const key of Object.values(keys)) queryClient.setQueryData(key, 'cached')

    await refreshAttention(queryClient)

    const stale = Object.entries(keys)
      .filter(([, key]) => queryClient.getQueryState(key)?.isInvalidated)
      .map(([name]) => name)
    expect(stale).toEqual(['metrics', 'everyone', 'withDeactivated', 'page'])
  })
})