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

import { useAddressFilters } from '@/common/useAddressFilters'
import { readFilters, writeFilters } from './auditFilters'

// The audit log's filters, read from the page's address and written back to
// it (auditFilters.ts says why the address). The mechanism — and why the
// choice is held in state until the next navigation (the flicker found in
// the live check, 2026-10-22) — is the shared useAddressFilters.
export function useFiltersInAddress() {
  return useAddressFilters(readFilters, writeFilters)
}