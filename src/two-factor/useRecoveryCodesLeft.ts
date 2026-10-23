import { useQuery } from '@tanstack/react-query'
import { fetchRecoveryCodesLeft, recoveryCodesLeftQueryKey } from './api'

// How many recovery codes the account has left — asked only while two-factor
// sign-in is ON (`enabled`): with it off there are none, and nothing needs
// asking. Spending a code (here or on another device) changes it, so every
// screen that spends or replaces codes refreshes this query.
export function useRecoveryCodesLeft(mfaEnabled: boolean) {
  return useQuery({
    queryKey: recoveryCodesLeftQueryKey,
    queryFn: async () => (await fetchRecoveryCodesLeft()).remaining,
    enabled: mfaEnabled,
  })
}