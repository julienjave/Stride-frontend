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

import { EmailRow } from '@/email-change/EmailRow'

// The profile page, reduced to what these tests look at: its heading and the
// real Email row (to see a cancelled email change vanish). The confirmation
// is a snackbar, checked in the store (decisions §33).
// (Its own file: a component in a test-helper module that exports functions
// too fails react-refresh/only-export-components.)
export function ProfileStub() {
  return (
    <div>
      <h1>My profile</h1>
      <EmailRow email="pat@example.com" />
    </div>
  )
}