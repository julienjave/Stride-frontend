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

import { useState } from 'react'
import { createBeeper, type Beeper } from './beeper'

// Whether the hold timer beeps — the patient's choice, remembered ON THIS
// DEVICE (localStorage), not on the account: it's about where they are (a
// shared room, earphones in), not who they are — the same reasoning as the
// theme (`src/theme/theme.ts`). On by default: the beep is the point of the
// timer for a patient lying down, not looking at the phone.
export const TIMER_SOUND_STORAGE_KEY = 'stride-timer-sound'

// Anything but the two known values (an old version, a hand edit) → the
// default.
export function parseTimerSound(raw: string | null): boolean {
  return raw !== 'off'
}

// localStorage can THROW (blocked storage, some private modes): a preference
// that can't be read is the default, one that can't be written just isn't
// remembered — never an error on the screen.
export function readTimerSound(): boolean {
  try {
    return parseTimerSound(localStorage.getItem(TIMER_SOUND_STORAGE_KEY))
  } catch {
    return true
  }
}

export function writeTimerSound(on: boolean): void {
  try {
    localStorage.setItem(TIMER_SOUND_STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Not remembered — the switch still works for this visit.
  }
}

// The switch's state, read once when the timer appears and written on every
// change.
export function useTimerSound(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readTimerSound)
  return [
    on,
    (next) => {
      setOn(next)
      writeTimerSound(next)
    },
  ]
}

// ONE beeper for the whole app, made the first time a timer asks for it:
// browsers allow only a few AudioContexts at once, and every exercise's timer
// making its own would run out on a long session.
let shared: Beeper | null = null
export function sharedBeeper(): Beeper {
  shared ??= createBeeper()
  return shared
}