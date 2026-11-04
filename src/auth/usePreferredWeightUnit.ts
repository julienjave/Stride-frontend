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

import type { WeightUnit } from '@/common/weight'
import { useCurrentUser } from './useCurrentUser'

// The logged-in user's weight unit — what weights are shown in, and the
// unit pre-selected when typing a new one.
//
// A hook of its own (rather than every component reaching into
// useCurrentUser().data?.preferredWeightUnit) so the fallback below lives
// in exactly one place, and components ask the question they actually
// have: "which unit?", not "who's logged in?".
//
// Nothing extra is fetched: useCurrentUser reads the /auth/me data the app
// already loaded at startup. Changing the setting (useSetPreferredWeightUnit)
// writes to that same cache entry, so every component using this hook
// re-renders with the new unit at once — no prop drilling, no context.
export function usePreferredWeightUnit(): WeightUnit {
  const { data: currentUser } = useCurrentUser()
  // Only reached with no user (logged out), where no weight is ever shown.
  // 'kg' matches the backend's own default for the column.
  return currentUser?.preferredWeightUnit ?? 'kg'
}