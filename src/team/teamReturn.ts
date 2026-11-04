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

// The way back from a profile to the Team list (asked by the person,
// 2026-10-18: "Back to My team"). The link carries one note in NAVIGATION
// STATE — data React Router keeps in the browser's history entry, not in
// the address (sessions/sessionReturn.ts explains it in full): which
// profile the patient is coming back from. The list then puts keyboard
// focus back on that practitioner's card, where they left off — instead of
// at the top of the page, which is where a screen-reader or keyboard user
// would otherwise start again.
//
// Read DEFENSIVELY: location.state is whatever the history entry holds
// (null on a typed address, anything at all in theory), so the reader
// checks the shape and answers null on anything else. Pure, tested in
// teamReturn.test.ts.

export function viewedPractitionerState(practitionerId: number): { viewedPractitionerId: number } {
  return { viewedPractitionerId: practitionerId }
}

export function readViewedPractitioner(state: unknown): number | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'viewedPractitionerId' in state &&
    typeof state.viewedPractitionerId === 'number'
  ) {
    return state.viewedPractitionerId
  }
  return null
}