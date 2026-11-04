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

import { startSession } from './api'
import type { Session } from './types'
import { useSessionWrite } from './useSessionWrite'

// Start a session (pass (a)). What a session write refreshes is said once,
// in useSessionWrite (since pass (c)): the answer cached, the program's
// summaries stale, then `onStarted` — the page navigates.
export function useStartSession(onStarted: (session: Session) => void) {
  return useSessionWrite(startSession, onStarted)
}