import { useId } from 'react'
import { ApiError } from '@/api/client'
import { NativeSelect } from '@/common/NativeSelect'
import { useUpdateAssignedProgram } from './useUpdateAssignedProgram'

// The backend's limits (assigned_programs.late_make_up_days: 1–28, or null =
// off). 7 when they're turned on — a week: long enough to cover a few days of
// illness, short enough to stay close to the plan; the practitioner can choose
// another number at once.
export const LATE_MAKE_UP_DAYS_MAX = 28
export const LATE_MAKE_UP_DAYS_DEFAULT = 7
const DAY_CHOICES = Array.from({ length: LATE_MAKE_UP_DAYS_MAX }, (_, i) => i + 1)

// "Let the patient make up missed sessions late" — the program's
// `lateMakeUpDays` (decided 2026-10-16, decisions §5). One value answers both
// questions — off (null), or up to how many days after the missed day — so
// the page shows a checkbox, and, when it's ticked, how many days.
//
// Like RearrangeWeekSwitch, NOT optimistic: the controls show what the SERVER
// holds. Both are controlled by the `lateMakeUpDays` prop, which changes only
// when the answer (the whole program) replaces the cached one; while the
// request runs they're disabled, and a refusal leaves them as they were, with
// the reason.
//
// The number is a native select (1 to 28), not a typed number: every choice
// is a whole, valid value, saved the moment it's chosen. With a text field,
// typing "14" would save "1" on the way, or need a Save button and messages
// for 0, 29 or "abc" — a select can't hold any of those.
export function LateMakeUpsSetting({
  programId,
  lateMakeUpDays,
}: {
  programId: number
  lateMakeUpDays: number | null
}) {
  const update = useUpdateAssignedProgram(programId)
  const hintId = useId()
  const allowed = lateMakeUpDays !== null

  return (
    <div className="space-y-1 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={allowed}
          disabled={update.isPending}
          aria-describedby={hintId}
          onChange={(event) =>
            update.mutate({
              lateMakeUpDays: event.target.checked ? LATE_MAKE_UP_DAYS_DEFAULT : null,
            })
          }
        />
        Let the patient make up missed sessions late
      </label>
      {allowed && (
        // Indented under the checkbox it belongs to.
        <div className="flex flex-wrap items-center gap-2 pl-6">
          <span aria-hidden="true">Up to</span>
          {/* Its name starts with the words shown beside it (voice control
              users say what they see); the visible words around it are
              hidden from screen readers so they aren't read twice. */}
          <NativeSelect
            className="w-auto"
            aria-label="Up to how many days after the missed day"
            value={lateMakeUpDays}
            disabled={update.isPending}
            onChange={(event) => update.mutate({ lateMakeUpDays: Number(event.target.value) })}
          >
            {DAY_CHOICES.map((days) => (
              <option key={days} value={days}>
                {days === 1 ? '1 day' : `${days} days`}
              </option>
            ))}
          </NativeSelect>
          <span aria-hidden="true">after the missed day</span>
        </div>
      )}
      <p id={hintId} className="text-muted-foreground">
        With specific days, a session that wasn't made up before the next scheduled day can still be
        done later, on a day with nothing scheduled — never as a second session on a day. It shows as
        "made up late", counted apart. Turning it off or shortening it stops new ones; those already
        done still count.
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