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

// Where the exercise picker sends the person back to. `returnTo` comes from
// the picker's own address (`/practitioner/library/pick?returnTo=…`), so
// these functions treat it as untrusted text and turn it into a path ON
// THIS SITE.
//
// Why a URL parser rather than gluing strings together:
//
// 1. A `returnTo` can already have a query string. The add-exercise page's
//    is `…/exercises/new?workoutId=5`; gluing "?exerciseId=9" onto it gives
//    `…?workoutId=5?exerciseId=9` — a second "?" is not a separator, so the
//    page would read the workout as "5?exerciseId=9" and no exercise at
//    all. `URLSearchParams.set` adds the parameter with "&" when there
//    already is a query, "?" when there isn't, and REPLACES an existing
//    `exerciseId` instead of adding a second one.
//
// 2. An "open redirect". Anyone can write a link to the picker, with any
//    `returnTo` — `https://elsewhere.example/login` included. A link built
//    from that would send a practitioner who picks an exercise to another
//    site that looks like it belongs to Stride. Parsing against a dummy base
//    and keeping only the PATH, query and fragment drops any other site's
//    address: `https://elsewhere.example/x` becomes `/x`, here. (So does
//    `//elsewhere.example/x`, which browsers read as "same protocol,
//    another site".)
//
// The base, `http://local.invalid`, is only there because `new URL` needs
// an absolute address to resolve a path against; it never appears in the
// result. (`.invalid` is a name reserved to never exist.)
const PARSE_BASE = 'http://local.invalid'

export function localPath(returnTo: string): string {
  const url = new URL(returnTo, PARSE_BASE)
  return `${url.pathname}${url.search}${url.hash}`
}

export function pickerReturnHref(returnTo: string, exerciseId: number): string {
  const url = new URL(returnTo, PARSE_BASE)
  url.searchParams.set('exerciseId', String(exerciseId))
  return `${url.pathname}${url.search}${url.hash}`
}