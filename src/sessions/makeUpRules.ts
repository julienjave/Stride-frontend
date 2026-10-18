import type { ScheduleSummary } from '@/assigned-programs/types'

// The Sessions hub's "To make up" list (decided 2026-10-16/17): EVERY
// missed session the patient may still make up, each with its own button —
// the on-time catch-up AND every late one, side by side, the patient
// choosing. (The home offers only the one todayStatus picks.) Read from the
// backend's summary, never worked out from the schedule: the summary has
// already judged which days are open and until when; this only lists them.
// Pure (makeUpRules.test.ts).

// One missed session that can still be made up:
//   - catch_up — on time: its make-up window is still open (the summary's
//                `nextWorkout` names a day BEFORE today). Started like any
//                start: the backend infers which day it makes up;
//   - late     — its window has closed, but the program allows late
//                make-ups (`lateMakeUps.days`). The start must SAY which
//                day it counts for (`countsFor`).
// `until`: the last day it can be done — on time, or late.
export interface MakeUpOffer {
  kind: 'catch_up' | 'late'
  forDay: string
  workoutId: number
  until: string
}

// Why no make-up can be STARTED today — each one a SERVER rule (POST
// /sessions would refuse), so the hub says it as a rule, not a preference.
// They are the summary's own `blockedToday`:
//   - not_a_free_day     — a late make-up is done on a free day, never on a
//                          scheduled day, during a pause or in a weekly
//                          count;
//   - session_done_today — a session was already completed today: one a
//                          day.
export type MakeUpBlock = 'not_a_free_day' | 'session_done_today'

export interface MakeUps {
  // The on-time catch-up first (when there is one), then the late ones,
  // oldest first — the backend's order, the first to run out first.
  offers: MakeUpOffer[]
  // Why every button is disabled today — or null: they can be started.
  blocked: MakeUpBlock | null
  // The on-time catch-up when TODAY is its last day and it could be done
  // today — the hub then warns, beside the late ones, that making up one of
  // them instead leaves it missed (decided 2026-10-16/17: a sentence, never
  // a refusal). Null otherwise.
  lastDay: MakeUpOffer | null
}

// While a session of this program is IN PROGRESS today, there's no list at
// all (found in the live check, 2026-10-17): the open session may itself
// BE one of the make-ups — the summary's `openSession` doesn't say which day
// it counts for, and it isn't completed, so the day is still listed — and
// showing the session being done as "to make up" says the wrong thing.
// Nothing could be started meanwhile anyway (one open session at a time);
// the Today row offers Resume, and the list comes back once it ends. (A
// session left open on an EARLIER day doesn't hide it: the next start
// closes that one.)
const NONE: MakeUps = { offers: [], blocked: null, lastDay: null }

export function makeUps(summary: ScheduleSummary, today: string): MakeUps {
  const open = summary.openSession
  if (open !== null && open.localDate === today) return NONE
  const next = summary.nextWorkout
  // A catch-up: the next thing to do is an EARLIER day (it can only be while
  // its window is open). `until` comes with it — null only for an upcoming
  // day or a week, so a day before today always has one; the check is what
  // lets TypeScript know.
  const catchUp: MakeUpOffer | null =
    next !== null && next.forDay !== null && next.forDay < today && next.until !== null
      ? { kind: 'catch_up', forDay: next.forDay, workoutId: next.workoutId, until: next.until }
      : null
  const late = summary.lateMakeUps.days.map(
    (day): MakeUpOffer => ({ kind: 'late', ...day }),
  )

  const blocked: MakeUpBlock | null = summary.lateMakeUps.blockedToday

  // An offer whose last day is TODAY, on a day when nothing can be started,
  // can't be made up any more — listing it would offer a button that can
  // never work. Left out (a screen's choice: its day shows as missed on the
  // program page once the day is over).
  const offers = [...(catchUp ? [catchUp] : []), ...late].filter(
    (offer) => blocked === null || offer.until !== today,
  )
  return {
    offers,
    blocked,
    lastDay: catchUp !== null && blocked === null && catchUp.until === today ? catchUp : null,
  }
}