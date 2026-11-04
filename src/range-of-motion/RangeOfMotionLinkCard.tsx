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

import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PatientPageSection } from '@/patients/PatientPageSection'
import { rangeOfMotionPath } from './romPaths'

// The patient page's way into range of motion — beside the medical file's
// card, and DATA-FREE like it (decisions §36): showing a latest value here
// would need a request, and every read of a patient's assessments is audited
// (ROM_VIEWED). The trail must say "viewed" only when someone opened them.
export function RangeOfMotionLinkCard({ patientId }: { patientId: number }) {
  return (
    <PatientPageSection title="Range of motion">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          Joint measurements in degrees, left and right, over time. Opening them is recorded in the
          audit log.
        </p>
        <Button asChild variant="outline">
          <Link to={rangeOfMotionPath(patientId)}>Open range of motion</Link>
        </Button>
      </div>
    </PatientPageSection>
  )
}