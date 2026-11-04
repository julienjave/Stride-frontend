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

// Where a care-team member's profile lives — under `/patient/team/` so the
// Team tab stays highlighted (NavLink matches by prefix). One function, so
// every link agrees; its own file for the reason programPagePath gives
// (a component file exporting a plain function loses fast refresh).
export function practitionerProfilePath(practitionerId: number): string {
  return `/patient/team/${practitionerId}`
}