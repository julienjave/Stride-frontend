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