import { useEffect, useId, useReducer, useRef } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  HOLD_START,
  advance,
  holdEvent,
  holdKeepsScreenOn,
  pressMain,
  remainingMs,
  resetHold,
  clockText,
  durationWords,
  type HoldEvent,
  type HoldPlan,
  type HoldState,
} from './timerRules'
import { holdAnnouncement, holdHeadline, holdHint, holdMainLabel } from './timerText'
import { sharedBeeper, useTimerSound } from './timerSound'
import type { Beeper } from './beeper'
import { useTicker } from './useTicker'
import { useWakeLock } from './useWakeLock'
import { TimerSoundSwitch } from './TimerSoundSwitch'

// The hold countdown (decided 2026-10-31): one hold per set of the
// prescription, Start / Pause / Resume on ONE button, Reset for the current
// hold, a beep at the end of each (two, then three after the last), the
// screen kept on while it counts and between sets. Nothing is saved: leaving
// the exercise (Next) forgets it — the session's own record is the ticks,
// ratings and notes, as before.
//
// The state lives in a REDUCER: every change goes through one pure function
// (`holdModel` below) given the time it happened — and, for a tick, the plan
// it's judged against. The model keeps three
// things together, so they can never disagree:
//   - `hold`: the countdown's state (timerRules.ts);
//   - `now`: the moment last looked at — what the clock is drawn from;
//   - `last`: the last thing that happened, numbered, for the beep and the
//     screen-reader sentence (a number, so two identical events in a row are
//     still two events).

interface Model {
  hold: HoldState
  now: number
  last: { event: HoldEvent; after: HoldState; count: number } | null
}

type Action =
  | { type: 'main'; now: number } // the one big button
  | { type: 'reset'; now: number }
  | { type: 'tick'; now: number; plan: HoldPlan } // the clock looked at again (useTicker)

function holdModel(model: Model, action: Action): Model {
  let next: HoldState
  switch (action.type) {
    case 'main':
      next = pressMain(model.hold, action.now)
      break
    case 'reset':
      next = resetHold(model.hold)
      break
    case 'tick':
      next = advance(model.hold, action.plan, action.now)
      break
  }
  const event = holdEvent(model.hold, next)
  return {
    hold: next,
    now: action.now,
    last: event ? { event, after: next, count: (model.last?.count ?? 0) + 1 } : model.last,
  }
}

const INITIAL: Model = { hold: HOLD_START, now: 0, last: null }

export function HoldTimer({
  plan,
  // The sound maker. The app's one shared beeper by default; tests pass a
  // fake (jsdom has no Web Audio).
  beeper = sharedBeeper(),
}: {
  plan: HoldPlan
  beeper?: Beeper
}) {
  const [model, dispatch] = useReducer(holdModel, INITIAL)
  const [soundOn, setSoundOn] = useTimerSound()
  const mainButton = useRef<HTMLButtonElement>(null)
  const headingId = useId()

  const { hold } = model
  useTicker(hold.phase === 'running', (now) => dispatch({ type: 'tick', now, plan }))
  useWakeLock(holdKeepsScreenOn(hold))

  // The beep: a side effect of an event, so it runs in an effect. Each event
  // is handled ONCE, by its number: the effect also runs when the sound is
  // switched on or off, and must not play an old event then. The number is
  // remembered even with the sound off — switching it on after a hold ended
  // doesn't beep for that hold.
  const handled = useRef(0)
  const last = model.last
  useEffect(() => {
    if (!last || last.count === handled.current) return
    handled.current = last.count
    if (!soundOn) return
    if (last.event === 'set_done' || last.event === 'all_done') beeper.beep(last.event)
  }, [last, soundOn, beeper])

  function pressMainButton() {
    // Inside the click: the moment the browser allows sound to be unlocked
    // (beeper.ts). Every press, not only the first — cheap, and it revives a
    // context the phone suspended meanwhile.
    if (soundOn) beeper.unlock()
    dispatch({ type: 'main', now: performance.now() })
  }

  function pressReset() {
    dispatch({ type: 'reset', now: performance.now() })
    // The Reset button disappears with the hold it reset; focus would fall to
    // the top of the page. It goes to the main button ("Start") instead.
    mainButton.current?.focus()
  }

  const left = remainingMs(hold, plan, model.now)
  const underWay = hold.phase === 'running' || hold.phase === 'paused'
  // How far through this hold, for the bar (0 to 1) — full after the last
  // set, since nothing is left then (remainingMs gives 0).
  const progress = 1 - left / plan.holdMs

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-lg border p-4">
      <h3 id={headingId} className="font-medium">
        Hold timer
      </h3>
      <p className="text-sm text-muted-foreground">{holdHeadline(hold, plan)}</p>

      {/* role="timer": a screen reader knows this is a running clock and does
          NOT read each change out (it isn't a live region). The digits are
          for the eyes; the words beside them for a screen reader that reads
          this line ("14 seconds left", not "zero fourteen"). */}
      <div role="timer" aria-labelledby={headingId} className="text-5xl font-semibold tabular-nums">
        <span aria-hidden="true">{clockText(left, 'up')}</span>
        <span className="sr-only">{durationWords(Math.ceil(left / 1000))} left</span>
      </div>

      {/* A bar for a glance from across the room. Drawn only: the clock above
          says the same in words. */}
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-linear motion-reduce:transition-none"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <p className="text-sm">{holdHint(hold)}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={mainButton}
          type="button"
          size="lg"
          variant={hold.phase === 'all_done' ? 'outline' : 'default'}
          onClick={pressMainButton}
        >
          <MainIcon hold={hold} />
          {holdMainLabel(hold)}
        </Button>
        {underWay && (
          <Button type="button" variant="outline" onClick={pressReset}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>

      <TimerSoundSwitch on={soundOn} onChange={setSoundOn} />

      {/* What happened, said once by a screen reader. Always on the page —
          a live region added together with its text isn't announced. */}
      <p role="status" className="sr-only">
        {model.last ? holdAnnouncement(model.last.event, model.last.after, plan) : ''}
      </p>
    </section>
  )
}

function MainIcon({ hold }: { hold: HoldState }) {
  if (hold.phase === 'running') return <Pause aria-hidden="true" />
  if (hold.phase === 'all_done') return <RotateCcw aria-hidden="true" />
  return <Play aria-hidden="true" />
}