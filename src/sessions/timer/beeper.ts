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

// The timer's sound — a beep MADE by the browser (the Web Audio API), not an
// audio file: nothing to download, nothing to license, and its pitch and
// length are three numbers here.
//
// How Web Audio makes a sound: an AudioContext is a little sound studio. An
// OscillatorNode produces a pure tone (a sine wave at a frequency, in hertz);
// a GainNode is a volume knob; `destination` is the speakers. Wiring them
// oscillator → gain → speakers and telling the oscillator to start at a time
// and stop at another plays a beep. Times are in the context's own clock
// (`currentTime`, seconds), so several beeps are SCHEDULED at once, each a
// little later — the browser plays them on time even if this page is busy.
//
// The catch: browsers (Safari on iPhone above all) refuse to play sound that
// no user asked for. An AudioContext created or resumed OUTSIDE a tap starts
// "suspended" and stays silent. So the context is created — or resumed — by
// `unlock()`, which the timer calls inside the Start button's click handler
// (a user gesture); the beep at the end of the hold, 20 seconds later and
// with no tap, then plays through that already-unlocked context.

// Two short beeps when a set ends, three when the last one does — told apart
// by ear, without looking.
export type BeepPattern = 'set_done' | 'all_done'

const PATTERN_LENGTH: Record<BeepPattern, number> = { set_done: 2, all_done: 3 }
const FREQUENCY_HZ = 880 // A5: high enough to cut through, not shrill
const BEEP_SECONDS = 0.15
const GAP_SECONDS = 0.12
const VOLUME = 0.25 // a quarter of full scale: noticeable, not startling
// A gain can't jump instantly without a click: it ramps in and out over 10 ms.
const RAMP_SECONDS = 0.01

export interface Beeper {
  // Call inside a user gesture (a click handler). Safe to call many times.
  unlock(): void
  beep(pattern: BeepPattern): void
}

// The browser's AudioContext constructor, or none. A parameter so tests can
// pass a fake (jsdom has no Web Audio).
type AudioContextConstructor = new () => AudioContext

function browserAudioContext(): AudioContextConstructor | undefined {
  // `webkitAudioContext`: Safari before 14.1 named it so.
  const w = window as Window & { webkitAudioContext?: AudioContextConstructor }
  return window.AudioContext ?? w.webkitAudioContext
}

export function createBeeper(
  Context: AudioContextConstructor | undefined = browserAudioContext(),
): Beeper {
  let context: AudioContext | null = null

  return {
    unlock() {
      // No Web Audio at all: the timer works, silently (the screen and the
      // screen reader still say when a hold ends).
      if (!Context) return
      try {
        context ??= new Context()
        // `resume()` returns a promise; a refusal means "still silent", which
        // is all we could do about it anyway — so it's caught, not awaited.
        if (context.state === 'suspended') context.resume().catch(() => {})
      } catch {
        // Some browsers throw when too many contexts exist. The assignment
        // above never happened, so `context` is still null: no sound, and
        // the next Start tries again.
      }
    },

    beep(pattern) {
      // Never unlocked (no Start tap yet) or no Web Audio: nothing to play on.
      if (!context) return
      const start = context.currentTime
      for (let i = 0; i < PATTERN_LENGTH[pattern]; i++) {
        const at = start + i * (BEEP_SECONDS + GAP_SECONDS)
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = FREQUENCY_HZ
        // Volume envelope: from silence up to VOLUME, held, back to silence.
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(VOLUME, at + RAMP_SECONDS)
        gain.gain.setValueAtTime(VOLUME, at + BEEP_SECONDS - RAMP_SECONDS)
        gain.gain.linearRampToValueAtTime(0, at + BEEP_SECONDS)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(at)
        // A stopped oscillator is finished for good; the browser frees it.
        oscillator.stop(at + BEEP_SECONDS)
      }
    },
  }
}