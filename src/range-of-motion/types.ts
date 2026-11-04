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

// Range of motion's shapes, as the backend sends and takes them (Phase 7,
// decisions §36 — `src/range-of-motion/` on the backend). Hand-written like
// every response type in this app, checked against the live API.

// LEFT / RIGHT for a limb (and for neck and trunk side bending and
// rotation); none (null) for neck and trunk flexion / extension.
export const ROM_SIDES = ['left', 'right'] as const
export type RomSide = (typeof ROM_SIDES)[number]

// ACTIVE: the patient moves the joint. PASSIVE: the practitioner moves it.
// Never mixed on one line — the gap between them is itself a finding.
export const ROM_MODES = ['active', 'passive'] as const
export type RomMode = (typeof ROM_MODES)[number]

// --- THE CATALOGUE (GET /range-of-motion/movements) ---------------------------

// One movement of the fixed catalogue. The screens never keep their own copy
// of the list: the backend's file is the one the database was built from,
// and this answer is read from it — so a picker can't offer a movement the
// database would refuse, nor bounds it doesn't apply.
//   - movement: the code ('knee_flexion'), what is stored and sent;
//   - label: the direction alone, as the picker lists it under its joint
//     ("Flexion"); name: the whole name ("Knee flexion");
//   - sided: whether a side is required (and allowed);
//   - typicalDegrees: the textbook value (AAOS) — a GUIDE, not a target;
//   - lowestDegrees / highestDegrees: the plausible bounds the backend
//     accepts (against typing slips, not clinical limits).
export interface CatalogueMovement {
  movement: string
  label: string
  name: string
  sided: boolean
  typicalDegrees: number
  lowestDegrees: number
  highestDegrees: number
}

// A joint and its movements, in examination order (the picker's groups).
export interface CatalogueJoint {
  joint: string
  label: string
  movements: CatalogueMovement[]
}

export interface MovementCatalogue {
  joints: CatalogueJoint[]
}

// --- ASSESSMENTS (GET /range-of-motion, GET /range-of-motion/:id) -------------

// One value: a movement, its side (null when the movement has none), the
// mode, whole degrees — SIGNED (−5° = a knee 5° short of straight) — and an
// optional note.
export interface RomMeasurement {
  id: number
  movement: string
  side: RomSide | null
  mode: RomMode
  degrees: number
  note: string | null
}

// One assessment: the values of one visit.
// - measuredOn: the clinical DAY ('YYYY-MM-DD', no time, no zone);
//   createdAt: the MOMENT it was recorded (the database's clock).
// - medicalFileEntryId: the visit's note in the medical file, when one was
//   linked (the link lives on the assessment — decisions §36).
// - amendsId / amendmentReason: set on an AMENDMENT; amendedById: set on a
//   version that HAS been amended (the medical file's chain, exactly).
// - measurements: in catalogue order, then side, then mode.
export interface RomAssessment {
  id: number
  patientId: number
  measuredOn: string
  createdAt: string
  author: { id: number; firstName: string; lastName: string }
  medicalFileEntryId: number | null
  amendsId: number | null
  amendmentReason: string | null
  amendedById: number | null
  measurements: RomMeasurement[]
}

// --- POST /range-of-motion ---------------------------------------------------

// A value to record. `side` exactly for a sided movement; `note` left out
// rather than sent blank (the backend refuses a blank note).
export interface NewRomMeasurement {
  movement: string
  side?: RomSide
  mode: RomMode
  degrees: number
  note?: string
}

// An assessment, or (with both amend fields) an amendment — a COMPLETE new
// version, every value included, not a patch.
export interface NewRomAssessment {
  patientId: number
  measuredOn: string
  medicalFileEntryId?: number
  amendsId?: number
  amendmentReason?: string
  measurements: NewRomMeasurement[]
}