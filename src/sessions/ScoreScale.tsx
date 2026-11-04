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
import { Button } from '@/components/ui/button'

// A score up to 10 the patient may give or leave out — from 0 (decisions
// §6: pain before and after, mobility after) or from 1 (an exercise's
// difficulty: the column's CHECK is 1–10). All optional, never blocking.
//
// Eleven native radio buttons rather than a slider (decided 2026-10-16): a
// slider always HAS a value — its thumb sits somewhere — so it can't say
// "not answered", which is what an optional question needs. Radios start
// with none chosen, and "Clear answer" takes a choice back.
//
// Native <input type="radio"> elements, visually hidden, each inside its
// <label> styled as a button: the browser gives the group its behaviour for
// free — one choice, arrow keys move between them, a screen reader says
// "3, radio button, 4 of 11" — and the label is the tap target. A
// <fieldset> + <legend> names the group (the question).
//
// On a phone the eleven wrap into two rows (0–5, 6–10); from `sm` up, one
// row. The words at the ends ("No pain" … "Worst pain imaginable") are in
// the hint, which the group points at (aria-describedby), so a screen
// reader hears them too.
const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

// The grid for each range, as WHOLE class names: Tailwind keeps only the
// classes it finds written out in the source, so `grid-cols-${n}` built at
// run time would have no CSS. Eleven → two rows of 6 + 5 on a phone; ten →
// 5 + 5.
const GRID: Record<0 | 1, string> = {
  0: 'grid-cols-6 sm:grid-cols-11',
  1: 'grid-cols-5 sm:grid-cols-10',
}

interface ScoreScaleProps {
  // The question (the fieldset's legend).
  legend: string
  // What 0 and 10 mean.
  lowLabel: string
  highLabel: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  // The lowest score: 0 (the default) or 1.
  min?: 0 | 1
}

export function ScoreScale({
  legend,
  lowLabel,
  highLabel,
  value,
  onChange,
  disabled = false,
  min = 0,
}: ScoreScaleProps) {
  // One name per scale: several on one page (pain after, mobility after)
  // must be separate radio groups.
  const name = useId()
  const hintId = `${name}-hint`

  return (
    <fieldset className="space-y-2" aria-describedby={hintId} disabled={disabled}>
      <legend className="font-medium">{legend}</legend>
      <p id={hintId} className="text-sm text-muted-foreground">
        Optional. {min} = {lowLabel}, 10 = {highLabel}.
      </p>
      <div className={`grid gap-2 ${GRID[min]}`}>
        {SCORES.filter((score) => score >= min).map((score) => (
          <label
            key={score}
            className="relative flex h-11 cursor-pointer items-center justify-center rounded-md border text-base font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
          >
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === score}
              onChange={() => onChange(score)}
              className="sr-only"
            />
            {score}
          </label>
        ))}
      </div>
      {/* The ends' words under the row, for sighted users (the hint above
          says the same to everyone) — hidden from screen readers so they
          don't hear it twice. */}
      <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      {value !== null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          // Named after its question: with two scales on a page (pain
          // after, mobility after) two plain "Clear answer" buttons couldn't
          // be told apart. The visible words start the name (voice control).
          aria-label={`Clear answer: ${legend}`}
          onClick={() => onChange(null)}
        >
          Clear answer
        </Button>
      )}
    </fieldset>
  )
}