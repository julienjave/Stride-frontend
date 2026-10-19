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