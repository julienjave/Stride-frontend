import { useId, useReducer, useRef } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  STOPWATCH_START,
  clockText,
  durationWords,
  pressStopwatch,
  stopwatchMs,
  type StopwatchState,
} from './timerRules'
import { useTicker } from './useTicker'
import { useWakeLock } from './useWakeLock'

// A stopwatch for an exercise with no prescribed duration (decided
// 2026-10-31): the patient times what they want — a walk, a stretch they hold
// "as long as comfortable". Counts up; Start / Pause / Resume on one button,
// Reset beside it. No end, so no beep; the screen stays on while it runs.
// Nothing saved, as for the hold.
//
// Same shape as HoldTimer, smaller: a reducer keeping the state and the
// moment last looked at together.

interface Model {
  watch: StopwatchState
  now: number
}

type Action = { type: 'press' | 'reset' | 'tick'; now: number }

function stopwatchModel(model: Model, action: Action): Model {
  switch (action.type) {
    case 'press':
      return { watch: pressStopwatch(model.watch, action.now), now: action.now }
    case 'reset':
      return { watch: STOPWATCH_START, now: action.now }
    case 'tick':
      return { ...model, now: action.now }
  }
}

export function Stopwatch() {
  const [model, dispatch] = useReducer(stopwatchModel, { watch: STOPWATCH_START, now: 0 })
  const mainButton = useRef<HTMLButtonElement>(null)
  const headingId = useId()

  const running = model.watch.since !== null
  useTicker(running, (now) => dispatch({ type: 'tick', now }))
  useWakeLock(running)

  const counted = stopwatchMs(model.watch, model.now)
  const started = running || counted > 0
  const label = running ? 'Pause' : started ? 'Resume' : 'Start'

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-lg border p-4">
      <h3 id={headingId} className="font-medium">
        Stopwatch
      </h3>
      <p className="text-sm text-muted-foreground">
        No time is set for this exercise. Time yourself if it helps.
      </p>

      <div role="timer" aria-labelledby={headingId} className="text-4xl font-semibold tabular-nums">
        <span aria-hidden="true">{clockText(counted, 'down')}</span>
        <span className="sr-only">{durationWords(Math.floor(counted / 1000))}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={mainButton}
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: 'press', now: performance.now() })}
        >
          {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {label}
        </Button>
        {started && !running && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              dispatch({ type: 'reset', now: performance.now() })
              // Reset disappears with the time it cleared: focus to Start.
              mainButton.current?.focus()
            }}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>

      {/* Said once: started, paused — the counting itself isn't announced. */}
      <p role="status" className="sr-only">
        {running ? 'Stopwatch running.' : started ? 'Stopwatch paused.' : ''}
      </p>
    </section>
  )
}