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

import { cn } from '@/lib/utils'

// A small "Yours" pill marking something the current user owns — built
// for program templates first (the hub cards and the template page),
// where two practitioners' identically-named items ("Copy of Knee
// Rehab") were otherwise impossible to tell apart. Lives in src/common,
// not src/programs, because it's expected to be reused: assigned
// programs will need it once a patient's page lists programs assigned
// by several practitioners side by side.
//
// Deliberately "dumb": it takes no data and makes no ownership decision.
// The CALLER decides whether to render it (e.g. `{isOwn && <YoursBadge />}`),
// because what "owned" means differs per entity — a template's owner is
// its practitionerId, an assigned program's is its assignedBy. Keeping
// that rule out of here is what lets one badge serve both.
//
// It's real, visible text, not an icon: a screen reader simply reads it
// as part of the card or heading it sits in ("Knee Rehab, Yours"), with
// no extra aria-label needed.
export function YoursBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        // shrink-0 + whitespace-nowrap: in a flex row next to a long
        // title, the TITLE should wrap, never the badge.
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary',
        className,
      )}
    >
      Yours
    </span>
  )
}