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

import type { CareTeamEntry } from '@/patients/types'

// One link of MY care team, as the patient reads it (GET
// /users/:id/care-team for their own id): the staff's CareTeamEntry WITHOUT
// `reason`. The backend removes that key for a patient (decided 2026-10-18:
// staff type the reason for staff, in a dialog that never said the patient
// would read it). Typing it away here too means a screen can't show it by
// mistake: `entry.reason` doesn't compile.
export type MyCareTeamEntry = Omit<CareTeamEntry, 'reason'>