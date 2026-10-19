// Where a care-team member's profile lives — under `/patient/team/` so the
// Team tab stays highlighted (NavLink matches by prefix). One function, so
// every link agrees; its own file for the reason programPagePath gives
// (a component file exporting a plain function loses fast refresh).
export function practitionerProfilePath(practitionerId: number): string {
  return `/patient/team/${practitionerId}`
}