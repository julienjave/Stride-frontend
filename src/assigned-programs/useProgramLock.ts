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

import { useUser } from '@/users/useUser'
import { programLock, type ProgramLock } from './programLock'
import type { AssignedProgram } from './types'

// programLock() for a page that has the program: it reads the patient's
// account from GET /users/:id — the same cache entry as the patient page and
// the program page's header, so usually no new request. Nothing is asked
// before the program is known (`enabled`; 0 is never fetched — hooks can't
// be called conditionally, so the switch is an option).
export function useProgramLock(
  program: Pick<AssignedProgram, 'patientId' | 'status' | 'isArchived'> | undefined,
): ProgramLock {
  const { data: patient } = useUser(program?.patientId ?? 0, { enabled: !!program })
  return program ? programLock(program, patient?.isActive) : null
}