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
import { AddToMyPatientsDialog } from './AddToMyPatientsDialog'
import { PatientIdentity } from './PatientIdentity'
import type { DirectoryPatient } from './types'

interface DirectoryPatientRowProps {
  patient: DirectoryPatient
  // Called once "Add to my patients" has succeeded (the dialog's onAdded).
  onAdded: () => void
}

// One patient of the clinic directory, as a list item: who they are
// (name, photo, date of birth, the clinics they share with me) and the one
// thing I can do — "Add to my patients", or "Open" when they're mine
// already. Drawn by the directory search (AddPatientPage) and by the
// invite page's possible-duplicate warning (decisions §27): the same
// person shown the same way, with the same action, wherever they're found.
export function DirectoryPatientRow({ patient, onAdded }: DirectoryPatientRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <PatientIdentity
        userId={patient.id}
        firstName={patient.firstName}
        lastName={patient.lastName}
        avatarUrl={patient.avatarUrl}
        dateOfBirth={patient.dateOfBirth}
        clinics={patient.sharedClinics}
      />
      {patient.onMyCareTeam ? (
        // Already mine: nothing to add — lead to them instead.
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <span className="text-muted-foreground">In your patients</span>
          <Link
            to={`/practitioner/patients/${patient.id}`}
            className="font-medium underline"
            aria-label={`Open ${patient.firstName} ${patient.lastName}`}
          >
            Open
          </Link>
        </div>
      ) : (
        <div className="shrink-0">
          <AddToMyPatientsDialog
            patientId={patient.id}
            patientFirstName={patient.firstName}
            patientLastName={patient.lastName}
            onAdded={onAdded}
          />
        </div>
      )}
    </li>
  )
}