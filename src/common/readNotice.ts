// A one-line confirmation another page hands over through navigation state
// (`navigate(to, { state: { notice } })`): "You left Pat Lee's care team.",
// "Session finished. Well done!". Read DEFENSIVELY: location.state is
// whatever the previous page put there (or null, or left over from an older
// entry in the history), so it's checked, not trusted.
//
// Moved here from the roster page (2026-10-16) when the patient home became
// its second reader — a helper leaves its first user's file when the second
// one arrives.
export function readNotice(state: unknown): string | null {
  // Each check narrows the type for the next: after `'notice' in state`,
  // TypeScript knows `state.notice` exists (as `unknown`) — no cast needed.
  if (typeof state === 'object' && state !== null && 'notice' in state) {
    return typeof state.notice === 'string' ? state.notice : null
  }
  return null
}