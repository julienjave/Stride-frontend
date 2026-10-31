import type { SessionExercise } from '../types'
import { HoldTimer } from './HoldTimer'
import { Stopwatch } from './Stopwatch'
import { holdPlan } from './timerRules'
import type { Beeper } from './beeper'

// Which timer an exercise of a running session gets (decided 2026-10-31): a
// prescribed duration → the hold countdown, one hold per set; none → a
// stopwatch. Decided from the SESSION's copy of the prescription (what this
// session was told when it started), like everything else on the page.
export function ExerciseTimer({
  exercise,
  beeper,
}: {
  exercise: Pick<SessionExercise, 'durationInSeconds' | 'sets'>
  beeper?: Beeper
}) {
  const plan = holdPlan(exercise)
  return plan ? <HoldTimer plan={plan} beeper={beeper} /> : <Stopwatch />
}