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