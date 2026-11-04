/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { applyUpdatedUser } from './userCache'
import type { User } from './types'

describe('applyUpdatedUser', () => {
  // Added with the patient page (2026-10-08): a practitioner editing a
  // patient there changes what the clinic directory search shows (name,
  // date of birth, photo), not only the roster.
  it('marks the users lists AND the clinic directory searches stale', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['users-list', false], [])
    queryClient.setQueryData(['directory-patients', ''], [])
    queryClient.setQueryData(['directory-patients', 'pa'], [])

    applyUpdatedUser(queryClient, { id: 6, firstName: 'Pat' } as User)

    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['directory-patients', ''])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['directory-patients', 'pa'])?.isInvalidated).toBe(true)
  })

  it('writes the saved user into their own cache entry', () => {
    const queryClient = new QueryClient()
    const updated = { id: 6, firstName: 'Pat' } as User
    applyUpdatedUser(queryClient, updated)
    expect(queryClient.getQueryData(['users', 6])).toBe(updated)
  })
})