import { useId } from 'react'
import { cn } from '@/lib/utils'
import { REASON_CHOICES } from './sessionText'
import type { PatientEndReason } from './types'

// Why the patient stops or skips — one of THEIR four reasons (pass (c)). A
// category rather than free text (decided 2026-10-15): the practitioner's
// future alerts find "stopped for pain" with a query, not by reading notes.
// The note beside it says the rest.
//
// Native radios, as rows (the whole row is the tap target): one choice,
// arrow keys, announced as a group named by its question. REQUIRED, but
// nothing is chosen at first — a pre-chosen reason would be recorded as the
// patient's when they didn't say it. The page shows `error` after a submit
// without one; the group then points at it (aria-describedby) and is marked
// invalid, so a screen reader says why.
export function ReasonPicker({
  legend,
  value,
  onChange,
  error,
  disabled = false,
}: {
  legend: string
  value: PatientEndReason | null
  onChange: (reason: PatientEndReason) => void
  error: string | null
  disabled?: boolean
}) {
  // A name of its own per picker (radios sharing a name are ONE group,
  // page-wide). Today a page holds one picker, so a fixed name would behave
  // the same — a mutation check confirmed no test can tell (2026-10-16) —
  // but useId keeps a second picker on a page from silently merging into
  // this one, and gives the error its own id.
  const name = useId()
  const errorId = `${name}-error`

  return (
    <fieldset
      className="space-y-2"
      disabled={disabled}
      aria-invalid={error !== null}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="font-medium">{legend}</legend>
      <div className="divide-y rounded-lg border">
        {REASON_CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              'flex cursor-pointer items-center gap-3 px-4 py-3',
              'has-[:checked]:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="size-4 accent-primary"
            />
            {choice.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}