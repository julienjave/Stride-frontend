import { durationWords, type HoldEvent, type HoldPlan, type HoldState } from './timerRules'

// The timer's words (timerText.test.ts) — kept apart from the rules, as the
// rest of the session flow does (sessionText.ts beside sessionRules.ts): the
// rules decide what happens, these files say it.

// "Set 2 of 3" — only when there are several sets; one hold needs no count.
function setCount(set: number, plan: HoldPlan): string {
  return `Set ${set} of ${plan.sets}`
}

function capitalized(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

// The line above the clock: which hold, and what's asked.
//   "Hold for 20 seconds · set 2 of 3" / "Hold for 30 seconds"
//   after the last set: "All 3 sets held" / "Hold done"
export function holdHeadline(state: HoldState, plan: HoldPlan): string {
  const hold = `Hold for ${durationWords(plan.holdMs / 1000)}`
  if (state.phase === 'all_done') {
    return plan.sets > 1 ? `All ${plan.sets} sets held` : 'Hold done'
  }
  return plan.sets > 1 ? `${hold} · ${setCount(state.set, plan).toLowerCase()}` : hold
}

// The line under the clock: what to do next. The patient may not be looking
// (lying on a mat), so every state says what the button will do.
export function holdHint(state: HoldState): string {
  switch (state.phase) {
    case 'ready':
      return state.set === 1
        ? 'Get into position, then press Start.'
        : `Set ${state.set - 1} done. Start set ${state.set} when you're ready.`
    case 'running':
      return 'Holding…'
    case 'paused':
      return 'Paused.'
    case 'all_done':
      // Done stays the patient's own tap (the person's choice): the timer
      // can't know whether the hold was managed.
      return 'Press Done below if you managed it.'
  }
}

// The main button's words — what pressing it WILL do.
export function holdMainLabel(state: HoldState): string {
  switch (state.phase) {
    case 'ready':
      return state.set === 1 ? 'Start' : `Start set ${state.set}`
    case 'running':
      return 'Pause'
    case 'paused':
      return 'Resume'
    case 'all_done':
      return 'Start over'
  }
}

// What a screen reader announces when something happens. The clock itself is
// NOT announced (a voice reading every second would drown everything); these
// sentences are, once each, in a polite live region.
export function holdAnnouncement(event: HoldEvent, after: HoldState, plan: HoldPlan): string {
  if (event === 'all_done') {
    return plan.sets > 1
      ? `All ${plan.sets} sets held. Press Done if you managed it.`
      : 'Hold done. Press Done if you managed it.'
  }
  // The set the timer is on NOW — after a set ends, already the next one.
  // Every other event leaves the timer on a set (holdEvent gives all_done
  // exactly when the timer reaches all_done, answered above), so the
  // `plan.sets` branch is unreachable: it only satisfies the type, which
  // can't know that — a mutation of it survives, as it must.
  const set = after.phase === 'all_done' ? plan.sets : after.set
  // "Set 2 of 3: hold reset." with several sets, "Hold reset." with one.
  const named = (sentence: string) =>
    plan.sets > 1 ? `${setCount(set, plan)}: ${sentence}` : capitalized(sentence)
  switch (event) {
    case 'started':
      return named(`hold for ${durationWords(plan.holdMs / 1000)}.`)
    case 'paused':
      return 'Hold paused.'
    case 'resumed':
      return 'Hold resumed.'
    case 'reset':
      return named('hold reset.')
    case 'set_done':
      return `Set ${set - 1} done. Start set ${set} when you're ready.`
  }
}