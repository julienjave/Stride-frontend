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

import { useId } from 'react'
import { failureText } from '@/api/apiErrors'
import { useUpdateAssignedProgram } from './useUpdateAssignedProgram'

// "Let the patient rearrange the week" — the program's `allowSwaps`
// (decided 2026-10-12: it covers both ways of doing another day's workout,
// a swap and a session done early). A native checkbox: the platform's own
// control, keyboard- and screen-reader-ready, its label clickable.
//
// Not optimistic: the box shows what the SERVER holds — it changes when the
// answer (the whole program) replaces the cached one, and is disabled while
// the request runs. A failure leaves it as it was, with the reason.
export function RearrangeWeekSwitch({
  programId,
  allowSwaps,
}: {
  programId: number
  allowSwaps: boolean
}) {
  const update = useUpdateAssignedProgram(programId)
  const hintId = useId()

  return (
    <div className="space-y-1 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={allowSwaps}
          disabled={update.isPending}
          aria-describedby={hintId}
          onChange={(event) => update.mutate({ allowSwaps: event.target.checked })}
        />
        Let the patient rearrange the week
      </label>
      <p id={hintId} className="text-muted-foreground">
        With specific days, the patient may do a later day's workout early, or swap two days'
        workouts, within the same week. Turning it off stops new ones; those already done still
        count.
      </p>
      {update.isError && (
        <p role="alert" className="text-destructive">
          {failureText(update.error, "Couldn't save the change. Try again.")}
        </p>
      )}
    </div>
  )
}