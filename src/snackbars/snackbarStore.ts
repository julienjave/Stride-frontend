import { create } from 'zustand'
import { addSnackbar, closeSnackbarIn, type Snackbar } from './snackbarRules'

// WHERE the snackbars live: a store OUTSIDE React's component tree.
//
// Why not React state (useState in the layout, handed down by a context)?
// Because of who raises a snackbar and when. "Session finished. Well done!"
// is raised by the Finish page in the same moment it navigates home — and
// the Finish page then UNMOUNTS. The message must outlive the code that
// raised it. A module-level store does: it exists once for the whole page
// load, any code can write to it (a component, a mutation's onSuccess, a
// plain function), and the one component that draws the list
// (Snackbars.tsx, in the signed-in layout) re-renders when it changes.
//
// Why Zustand: it was chosen in Phase 0 as the app's client-state library
// (TanStack Query holds SERVER state; this is not server state). Under the
// hood `create` keeps one plain object and a set of listeners, and the hook
// it returns subscribes a component through React's useSyncExternalStore —
// the built-in way for React to read a value that lives outside it without
// ever drawing a half-updated screen ("tearing").
//
// Before this, a page handed its confirmation to the next one through
// navigation state (`navigate(to, { state: { notice } })`). Two problems,
// both gone: the browser keeps history state across a RELOAD and Back, so
// the notice came back on a refresh; and each receiving page had to read
// and draw it itself (9 boxes, 5 pages).

interface SnackbarState {
  snackbars: Snackbar[]
}

export const useSnackbarStore = create<SnackbarState>(() => ({ snackbars: [] }))

// Ids only need to be unique while the page is open: a counter is enough
// (and, unlike Date.now(), two snackbars in the same millisecond differ).
let nextId = 1

function show(kind: Snackbar['kind'], text: string): void {
  // setState with a function: the NEW state is computed from the CURRENT
  // one at the moment of the update — never from a copy read earlier, which
  // two quick snackbars in a row could otherwise both start from.
  useSnackbarStore.setState((state) => ({
    snackbars: addSnackbar(state.snackbars, { id: nextId++, kind, text, open: true }),
  }))
}

// The two ways to raise one — plain functions, callable from anywhere:
//   showSuccess('Entry added.')
//   showFailure("Couldn't save your weight unit. Try again.")
// The sentence is the caller's (in the app's usual words); the kind decides
// the look, how it is announced, and whether it closes by itself.
export function showSuccess(text: string): void {
  show('success', text)
}

export function showFailure(text: string): void {
  show('failure', text)
}

export function closeSnackbar(id: number): void {
  useSnackbarStore.setState((state) => ({ snackbars: closeSnackbarIn(state.snackbars, id) }))
}

// Every snackbar gone at once, without an animation: on sign-out and on a
// role switch (Snackbars.tsx), so a message naming a patient never stays on
// screen for the next person or role; and after every test (test-setup.ts),
// since a module-level store would otherwise carry one test's snackbars
// into the next.
export function clearSnackbars(): void {
  useSnackbarStore.setState({ snackbars: [] })
}