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

import type { UserRole } from './schemas'

// The human-readable name for each role, shown in the account menu
// ("Julien · Practitioner") and the role switcher. Raw enum values like
// 'practitioner' are for code; people read "Practitioner".
//
// Same Record<UserRole, …> technique as roleHomePath.ts: if UserRole ever
// gains a fourth value, this stops compiling until it gets a label.
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  practitioner: 'Practitioner',
  patient: 'Patient',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role]
}