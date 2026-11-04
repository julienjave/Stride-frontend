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

// Where a patient's program lives (the Sessions hub's pass 2, 2026-10-18) —
// one function, so the home, the hub and any later link agree. Its own file:
// a component file that also exports a plain function loses React's fast
// refresh (the lint rule react-refresh/only-export-components).
export function programPagePath(programId: number): string {
  return `/patient/sessions/programs/${programId}`
}