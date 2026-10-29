import { useAddressFilters } from '@/common/useAddressFilters'
import { readFilters, writeFilters } from './auditFilters'

// The audit log's filters, read from the page's address and written back to
// it (auditFilters.ts says why the address). The mechanism — and why the
// choice is held in state until the next navigation (the flicker found in
// the live check, 2026-10-22) — is the shared useAddressFilters.
export function useFiltersInAddress() {
  return useAddressFilters(readFilters, writeFilters)
}