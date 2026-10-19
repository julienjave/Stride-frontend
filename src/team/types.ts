import type { CareTeamEntry } from '@/patients/types'

// One link of MY care team, as the patient reads it (GET
// /users/:id/care-team for their own id): the staff's CareTeamEntry WITHOUT
// `reason`. The backend removes that key for a patient (decided 2026-10-18:
// staff type the reason for staff, in a dialog that never said the patient
// would read it). Typing it away here too means a screen can't show it by
// mistake: `entry.reason` doesn't compile.
export type MyCareTeamEntry = Omit<CareTeamEntry, 'reason'>