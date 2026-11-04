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

import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface WorkoutTarget {
  id: number
  label: string
}

interface ExerciseWorkoutMenuProps {
  // The trigger's accessible name, e.g. "More actions for Squat in workout
  // A · Mobility" — it must say WHICH card, since a copied warm-up can put
  // two "Squat" cards on one page.
  triggerLabel: string
  // The OTHER workouts, in order: moving or copying an exercise to the
  // workout it's already in means nothing here (a second copy in the same
  // workout isn't what "the same warm-up in several workouts" asks for).
  targets: WorkoutTarget[]
  onMove: (target: WorkoutTarget) => void
  onCopy: (target: WorkoutTarget) => void
  disabled?: boolean
}

// The "⋮" menu on an exercise card when there are several workouts: move it
// to another workout, or copy it there. Knows nothing of templates or
// programs — the caller says what moving and copying mean (3b reuses it).
//
// Why a menu rather than dragging a card from one workout into another:
// dragging across lists (dnd-kit's "multiple containers") is the fiddliest
// thing to build, and on a long phone page it means dragging past screens of
// other cards. Two taps do it here. (Decided with the person, 2026-10-12.)
//
// One flat menu, not "Move to ▸" / "Copy to ▸" sub-menus: sub-menus fly out
// sideways, which on a 375 px phone has nowhere to go. Each item says its
// whole action ("Copy to B · Strength"), so it reads the same to a screen
// reader as to the eye.
export function ExerciseWorkoutMenu({
  triggerLabel,
  targets,
  onMove,
  onCopy,
  disabled = false,
}: ExerciseWorkoutMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={triggerLabel}
          disabled={disabled}
          className="h-7 w-7"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      {/* Wide enough for "Copy to B · Strength" on one line (the library's
          default minimum is 96 px); a long workout name still wraps rather
          than running off a phone screen. */}
      <DropdownMenuContent align="end" className="min-w-44">
        {targets.map((target) => (
          // onSelect, not onClick: Radix calls it for a click AND for Enter
          // or Space on the focused item (keyboard users), then closes the
          // menu.
          <DropdownMenuItem key={`move-${target.id}`} onSelect={() => onMove(target)}>
            Move to {target.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {targets.map((target) => (
          <DropdownMenuItem key={`copy-${target.id}`} onSelect={() => onCopy(target)}>
            Copy to {target.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}