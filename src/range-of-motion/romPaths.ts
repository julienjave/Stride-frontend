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

import { patientPagePath } from '@/medical-files/medicalFilePaths'

// Range of motion's addresses, written once (medicalFilePaths.ts's shape):
// a link and the route it matches can't drift apart.

export function rangeOfMotionPath(patientId: number): string {
  return `${patientPagePath(patientId)}/range-of-motion`
}

// The form: a new assessment, an AMENDMENT of one version (`amends`), or a
// new assessment with the visit's note already chosen (`note` — "Record
// measurements for this visit", from a medical file entry).
export function romAssessmentPath(
  patientId: number,
  options: { amends?: number; note?: number } = {},
): string {
  const path = `${rangeOfMotionPath(patientId)}/new`
  const query = new URLSearchParams()
  if (options.amends !== undefined) query.set('amends', String(options.amends))
  if (options.note !== undefined) query.set('note', String(options.note))
  const search = query.toString()
  return search === '' ? path : `${path}?${search}`
}