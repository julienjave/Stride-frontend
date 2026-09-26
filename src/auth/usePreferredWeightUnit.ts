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