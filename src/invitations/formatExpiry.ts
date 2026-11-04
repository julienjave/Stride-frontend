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

import { formatMomentDate } from '@/common/formatMomentDate'

// When an invitation link stops working, in the viewer's own language and
// time zone — an expiry is a moment in time, not a calendar date (unlike a
// date of birth, which formatCalendarDate pins to UTC).
//
// Shared by every screen that shows an invitation: the create-user
// confirmation, the accept page, and the account's invitation status.
// Since 2026-10-08 it delegates to formatMomentDate, the general rule for
// "the day of a moment" (the care team's dates use it too); the name stays
// because it says what the callers are formatting.
export function formatExpiry(expiresAt: string): string {
  return formatMomentDate(expiresAt)
}