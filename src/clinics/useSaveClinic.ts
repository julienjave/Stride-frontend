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

import { useQueryClient } from '@tanstack/react-query'
import { clinicQueryKey, updateClinic } from './api'
import type { UpdateClinicPayload } from './types'

// The clinic counterpart of useSaveUser: returns the function every
// clinic field (EditableField, EditableAddress) calls to save. Each field
// wraps it in its own useMutation, so pending/error state stays per field.
//
// This is the cache logic that used to live inside EditableClinicField —
// moved here, unchanged, when that component was replaced by the generic
// EditableField.
export function useSaveClinic(clinicId: number) {
  const queryClient = useQueryClient()

  return async (payload: UpdateClinicPayload) => {
    const updated = await updateClinic(clinicId, payload)

    // The PATCH response IS the full, authoritative new clinic, so it is
    // written straight into the detail entry the edit page reads — no
    // extra GET.
    queryClient.setQueryData(clinicQueryKey(clinicId), updated)

    // The clinics LIST (a different cache entry) shows the name and email
    // too — marked stale so it refetches next time it's shown.
    //
    // A prefix match on 'clinics-list' sweeps BOTH cached list variants
    // (active-only and include-inactive). This used to be a real, tested
    // and caught bug when the list key shared a prefix with
    // clinicQueryKey(id): invalidating ['clinics'] without exact: true
    // also invalidated the detail entry written one line above. The list
    // now lives under a DIFFERENT top-level key ('clinics-list', not
    // 'clinics'), so that collision can't happen however this is written.
    void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })

    return updated
  }
}