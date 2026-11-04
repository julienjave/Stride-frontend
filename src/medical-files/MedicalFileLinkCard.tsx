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
import { medicalFilePath } from './medicalFilePaths'

// The patient page's way into the medical file (decisions §8, the person's
// choice): a section with a link, and NO data. Showing anything from the
// file here — a count, the latest date — would need a request, and every
// request for the file is an audited read: each visit to the patient page
// (to adjust a program, say) would log "viewed the medical file". The trail
// must say "viewed" only when someone opened it.
export function MedicalFileLinkCard({ patientId }: { patientId: number }) {
  return (
    <PatientPageSection title="Medical file">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          Clinical notes: assessments, progress notes and their amendments. Opening it is
          recorded in the audit log.
        </p>
        <Button asChild variant="outline">
          <Link to={medicalFilePath(patientId)}>Open medical file</Link>
        </Button>
      </div>
    </PatientPageSection>
  )
}