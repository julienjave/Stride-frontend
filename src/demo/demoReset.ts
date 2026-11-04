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

// When the demo's data is next reset, in the VIEWER's own time (decisions §46).
//
// The backend sends the reset as a wall-clock time in a zone — `{ time:
// '04:00', timeZone: 'America/Toronto' }`, the same two values the droplet's
// timer uses — and the sign-in card says "Demo data is reset every day at
// 1:00 AM your time". Turning one into the other is two steps:
//
//   1. Which INSTANT is "04:00 in Toronto" next? A wall-clock time names a
//      moment only together with its zone's offset ON THAT DAY (−05:00 in
//      winter, −04:00 in summer). JavaScript's Date has no "make a date in
//      zone X" — it only knows UTC and the browser's own zone — but Intl can
//      do the reverse: tell us what a given instant READS in any zone. So we
//      guess the instant, read the guess back in the zone, and correct by the
//      difference (zoneOffsetMs). Twice, because the guess may sit on the
//      other side of a clock change from the answer.
//   2. Format that instant in the viewer's zone — what Intl does by default.
//
// Why the NEXT reset and not "04:00 Toronto on any day": Toronto and the
// viewer's zone may change their clocks on different dates (Europe moves
// weeks before North America; most of Saskatchewan and Arizona never do), so
// the same wall time can be 9:00 or 10:00 in Paris depending on the week. The
// next occurrence is the one the reviewer cares about.

export interface DemoReset {
  // "HH:MM", 24-hour (the backend refuses anything else at start).
  time: string
  // An IANA zone name ("America/Toronto").
  timeZone: string
}

// How far `timeZone`'s clock is ahead of UTC at `instant`, in milliseconds
// (Toronto in winter: −5 h). Read with Intl: the instant's date and time as
// the zone writes them, taken AS IF they were UTC, minus the instant itself.
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  const asIfUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  )
  // The formatter drops milliseconds, so for an instant that has some this is
  // the offset minus them. Harmless where it's used: instantOf() passes whole
  // minutes, and dayIn() adds the result back to the SAME instant — the
  // milliseconds cancel (a mutation test showed truncating them changed
  // nothing, so it isn't done).
  return asIfUtc - instant
}

// The calendar day `instant` falls on in `timeZone`, as [year, month, day].
function dayIn(instant: number, timeZone: string): [number, number, number] {
  const shifted = new Date(instant + zoneOffsetMs(instant, timeZone))
  return [
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  ]
}

// The instant that reads `hour:minute` on [year, month, day] in `timeZone`.
function instantOf(
  [year, month, day]: [number, number, number],
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = guess - zoneOffsetMs(guess, timeZone)
  // The offset AT the answer may differ from the offset at the guess (a
  // clock change between them): one more correction settles it.
  return guess - zoneOffsetMs(first, timeZone)
}

// The next reset strictly after `now`.
export function nextReset(reset: DemoReset, now: Date): Date {
  const [hour, minute] = reset.time.split(':').map(Number)
  const today = dayIn(now.getTime(), reset.timeZone)
  const todays = instantOf(today, hour, minute, reset.timeZone)
  if (todays > now.getTime()) return new Date(todays)
  // Tomorrow, in the zone's calendar: Date.UTC rolls day 32 into the next
  // month (and December into January) by itself.
  const [y, m, d] = today
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1))
  return new Date(
    instantOf(
      [tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate()],
      hour,
      minute,
      reset.timeZone,
    ),
  )
}

// "1:00 AM" — the next reset's time of day, for the viewer. `locale` and
// `timeZone` are parameters only so tests can pin them; the app passes
// neither, which means the browser's language and zone.
export function resetTimeOfDay(
  reset: DemoReset,
  now: Date,
  options: { locale?: string; timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(options.locale, {
    timeStyle: 'short',
    timeZone: options.timeZone,
  }).format(nextReset(reset, now))
}
