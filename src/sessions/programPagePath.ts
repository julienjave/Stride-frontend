// Where a patient's program lives (the Sessions hub's pass 2, 2026-10-18) —
// one function, so the home, the hub and any later link agree. Its own file:
// a component file that also exports a plain function loses React's fast
// refresh (the lint rule react-refresh/only-export-components).
export function programPagePath(programId: number): string {
  return `/patient/sessions/programs/${programId}`
}