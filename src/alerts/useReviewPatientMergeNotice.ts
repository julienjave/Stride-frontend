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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewPatientMergeNotice } from './api'

// "Mark as reviewed" on a patient merge's notice (decisions §27, pass 4):
// the legal disclosure notice's hook again — the list is asked for afresh
// afterwards, so the row leaves because the SERVER says it's reviewed.
export function useReviewPatientMergeNotice(mergeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewPatientMergeNotice(mergeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}
