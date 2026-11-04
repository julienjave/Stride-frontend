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

// A calendar date as stored by the backend ('1990-01-01', a Postgres
// `date` column: a day, with no time and no time zone) → a readable date
// in the reader's own locale ("January 1, 1990", "1 janvier 1990", …).
//
// The `T00:00:00Z` + `timeZone: 'UTC'` pair is the important part.
// new Date('1990-01-01') means midnight UTC; formatting that in the
// reader's time zone would show the evening BEFORE anywhere west of
// Greenwich — a birthday one day early. Reading AND formatting in the same
// zone (UTC) keeps the calendar day exactly as stored.
//
// `locale` is only a parameter so tests can pin it; the app passes
// nothing, which means "the browser's language".
export function formatCalendarDate(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}