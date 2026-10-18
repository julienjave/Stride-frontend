import { formatShortDate } from '@/common/calendarDate'
import type { MakeUpBlock, MakeUpOffer } from './makeUpRules'
import { missedSession } from './todayText'

// The words of the Sessions hub's "To make up" list and of the start page
// when a chosen day can't be started — written for the PATIENT. Pure, so
// every wording is a plain test (makeUpText.test.ts). `locale` only for
// tests (the app passes nothing: the browser's language).
//
// Wording rule (pass 3, 2026-10-17): every sentence that says why something
// can't be done names a SERVER rule (POST /sessions refuses it), never a
// screen's preference — a patient reads "isn't possible today" as a rule,
// so it must be one.

// A make-up's name: "A · Mobility from Fri, Oct 2", or "The session of Fri,
// Oct 2" with one workout — by DATE, like the home's late make-up (a missed
// day can be weeks back, when a weekday no longer says which one). The same
// words as the home's (missedSession), capitalised to start a line.
export function makeUpName(offer: MakeUpOffer, label: string | null, locale?: string): string {
  const name = missedSession(offer.forDay, label, locale)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Under the name: on time or late, and the last day it can be done —
// "On time · until Thu, Oct 15", "Late · until today". "Late" is said in
// words, as the badge and the totals say it (never colour alone, and a late
// make-up must stay visibly late — decided 2026-10-10).
export function makeUpTiming(offer: MakeUpOffer, today: string, locale?: string): string {
  const kind = offer.kind === 'catch_up' ? 'On time' : 'Late'
  const until = offer.until === today ? 'today' : formatShortDate(offer.until, locale)
  return `${kind} · until ${until}`
}

// Why no make-up can be started today — each one a rule the backend
// enforces. `several`: the hub's list may hold more than one ("them"); the
// start page is about one ("it").
export function makeUpBlockText(
  block: MakeUpBlock,
  several: boolean,
): string {
  const them = several ? 'them' : 'it'
  switch (block) {
    case 'not_a_free_day':
      return `Missed sessions are made up on a free day — a day with nothing scheduled — and today isn't one. You can make ${them} up on another free day.`
    case 'session_done_today':
      return `You've already done a session of this program today, and it's one session a day. You can make ${them} up on another free day.`
  }
}

// Beside the late make-ups, on the LAST day of the on-time catch-up's
// window (decided 2026-10-16/17: the patient chooses — but should know what
// choosing a late one costs): "Today is the last day to make up B ·
// Strength from Wed, Oct 14 on time. If you make up a late one today
// instead, it will be missed." A heads-up, never a refusal: the late ones
// stay startable.
export function lastDayText(catchUp: MakeUpOffer, label: string | null, locale?: string): string {
  return `Today is the last day to make up ${missedSession(catchUp.forDay, label, locale)} on time. If you make up a late one today instead, it will be missed.`
}

// The start page, when the day asked for (`?for=`) isn't offered — an old
// link, or a make-up done or run out since the hub was opened.
export const NOT_OFFERED_TEXT =
  "This missed session can't be made up any more. Your Sessions page lists the ones that still can."