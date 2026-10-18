// The round trip between a program page and one of its sessions (2026-10-18,
// asked by the person: "Back" should return to the program, as it was).
// Two notes travel through NAVIGATION STATE — data React Router keeps in the
// browser's history entry (`history.state`), not in the address: it
// survives a reload of that entry and the Back / Forward buttons, but not a
// new tab or a pasted link, which is exactly "how did I get here".
//
//   1. on the SESSION's entry: "I came from this program's page" — the
//      session page then offers "Back to the program";
//   2. on the PROGRAM page's own entry (replaced just before leaving): "this
//      session was viewed, from this week" — on returning, the page opens
//      that week again and puts focus back on the link.
//
// Read DEFENSIVELY, like readNotice: location.state is whatever an entry
// holds (or null), so each reader checks the shape and answers null on
// anything else. Pure (sessionReturn.test.ts).

export interface FromProgram {
  from: 'program'
  programId: number
}

export function fromProgramState(programId: number): FromProgram {
  return { from: 'program', programId }
}

// The program the session was opened from — or null.
export function readFromProgram(state: unknown): number | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    state.from === 'program' &&
    'programId' in state &&
    typeof state.programId === 'number'
  ) {
    return state.programId
  }
  return null
}

export interface ViewedSession {
  sessionId: number
  // The day the link was shown under — which week to open again.
  date: string
}

export function viewedSessionState(viewed: ViewedSession): { viewedSession: ViewedSession } {
  return { viewedSession: viewed }
}

export function readViewedSession(state: unknown): ViewedSession | null {
  if (typeof state !== 'object' || state === null || !('viewedSession' in state)) return null
  const viewed = state.viewedSession
  if (
    typeof viewed === 'object' &&
    viewed !== null &&
    'sessionId' in viewed &&
    typeof viewed.sessionId === 'number' &&
    'date' in viewed &&
    typeof viewed.date === 'string'
  ) {
    return { sessionId: viewed.sessionId, date: viewed.date }
  }
  return null
}

// A click the app may take over: the main button, no modifier. Ctrl / Cmd /
// Shift / middle clicks mean "open in a new tab or window" — the browser
// does that from the link's real `href`, and the app must not cancel it.
// (React Router's own Link makes the same check before navigating.)
export function isPlainClick(event: {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  )
}