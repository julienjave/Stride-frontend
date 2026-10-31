import { useId } from 'react'

// "Beep when a hold ends" — a plain checkbox with its label: a native control
// that every keyboard and screen reader already knows, and a big target (the
// whole label is clickable). Remembered on this device (timerSound.ts).
export function TimerSoundSwitch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (on: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={on}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      <label htmlFor={id}>Beep when a hold ends</label>
    </div>
  )
}