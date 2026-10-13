import { useId } from 'react'
import { ApiError } from '@/api/client'
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
          {update.error instanceof ApiError
            ? update.error.messages.join(' ')
            : "Couldn't save the change. Try again."}
        </p>
      )}
    </div>
  )
}