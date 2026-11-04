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

import { useQuery } from '@tanstack/react-query'
import { fetchPatientAssignedPrograms, patientAssignedProgramsQueryKey } from './api'

// One patient's programs, for the practitioner's patient page — and for the
// program page, which reads who assigned a program and which programs it
// continues from it. A sibling of useAssignedPrograms() (the hub's
// role-scoped list), with its own cache entry per patient — see
// patientAssignedProgramsQueryKey for why its key starts with the hub list's.
// `enabled` (default true): the program page asks only once it knows the
// patient (the program has loaded) — the same switch as useUser's.
export function usePatientAssignedPrograms(
  patientId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: patientAssignedProgramsQueryKey(patientId),
    queryFn: () => fetchPatientAssignedPrograms(patientId),
    enabled,
  })
}