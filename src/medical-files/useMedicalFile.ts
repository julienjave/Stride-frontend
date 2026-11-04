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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import {
  createMedicalFileEntry,
  fetchMedicalFile,
  fetchMedicalFileEntry,
  medicalFileEntryQueryKey,
  medicalFileQueryKey,
} from './api'

// The three ways the screens read and write the medical file. Each READ is
// audited by the backend, so each is called only by a page that shows what
// it reads.

// A patient's file, as their practitioner opens it (?patientId=).
// `enabled: false` waits: the range-of-motion page reads the file only when
// an assessment is linked to one of its notes (to name it — decisions §36).
export function useMedicalFile(patientId: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: medicalFileQueryKey(patientId),
    queryFn: () => fetchMedicalFile(patientId),
    enabled,
  })
}

// The signed-in patient's own file ("My records"). The id comes from
// /auth/me — for the cache key only: the request names nobody (the backend
// takes the patient from the session). Until /auth/me has answered the query
// waits (`enabled`) — a safety net, since the patient's pages render only
// after RequireRole has the user.
export function useMyMedicalFile() {
  const { data: me } = useCurrentUser()
  return useQuery({
    queryKey: medicalFileQueryKey(me?.id ?? 0),
    queryFn: () => fetchMedicalFile('mine'),
    enabled: me !== undefined,
  })
}

// One entry — the version an amendment starts from.
export function useMedicalFileEntry(patientId: number, entryId: number) {
  return useQuery({
    queryKey: medicalFileEntryQueryKey(patientId, entryId),
    queryFn: () => fetchMedicalFileEntry(entryId),
  })
}

// Writing an entry or an amendment. On success the file is marked stale
// (the prefix covers its entries too): the list page, opened next, reads it
// again — a new, audited read of what the practitioner then sees, rather
// than a list patched in the browser that the server never recorded showing.
export function useAddMedicalFileEntry(patientId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMedicalFileEntry,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medicalFileQueryKey(patientId) }),
  })
}