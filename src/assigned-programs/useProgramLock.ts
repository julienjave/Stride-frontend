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