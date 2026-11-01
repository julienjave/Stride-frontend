import type { MovementCatalogue, RomAssessment, RomMeasurement } from './types'

// Shared fixtures of the range-of-motion tests — the shapes the backend
// answers. Dates far from today (2031), the project's rule for test clocks.

// A slice of the catalogue (GET /range-of-motion/movements), as the backend
// sends it: the neck (one unsided, one sided movement) and the knee. Values
// are the real catalogue's.
export function catalogue(): MovementCatalogue {
  return {
    joints: [
      {
        joint: 'cervical_spine',
        label: 'Neck',
        movements: [
          {
            movement: 'cervical_flexion',
            label: 'Flexion',
            name: 'Neck flexion',
            sided: false,
            typicalDegrees: 45,
            lowestDegrees: -90,
            highestDegrees: 70,
          },
          {
            movement: 'cervical_rotation',
            label: 'Rotation',
            name: 'Neck rotation',
            sided: true,
            typicalDegrees: 60,
            lowestDegrees: -90,
            highestDegrees: 90,
          },
        ],
      },
      {
        joint: 'knee',
        label: 'Knee',
        movements: [
          {
            movement: 'knee_flexion',
            label: 'Flexion',
            name: 'Knee flexion',
            sided: true,
            typicalDegrees: 135,
            lowestDegrees: -90,
            highestDegrees: 200,
          },
          {
            movement: 'knee_extension',
            label: 'Extension',
            name: 'Knee extension',
            sided: true,
            typicalDegrees: 0,
            lowestDegrees: -90,
            highestDegrees: 20,
          },
        ],
      },
    ],
  }
}

export const ALEX = { id: 3, firstName: 'Alex', lastName: 'Chen' }

let nextMeasurementId = 1000

export function value(
  movement: string,
  side: RomMeasurement['side'],
  degrees: number,
  fields: Partial<RomMeasurement> = {},
): RomMeasurement {
  return { id: nextMeasurementId++, movement, side, mode: 'active', degrees, note: null, ...fields }
}

export function assessment(id: number, fields: Partial<RomAssessment> = {}): RomAssessment {
  return {
    id,
    patientId: 6,
    measuredOn: '2031-03-04',
    createdAt: '2031-03-04T10:00:00.000Z',
    author: ALEX,
    medicalFileEntryId: null,
    amendsId: null,
    amendmentReason: null,
    amendedById: null,
    measurements: [value('knee_flexion', 'right', 100)],
    ...fields,
  }
}

// A record like the seed's Pat, newest measured first (the backend's order):
//   1 — 2031-03-01, right knee 110° (active), left 138°, right passive 118°
//       with a note, linked to note 1;
//   2 — 2031-03-11, right 102° — a typing slip — amended by 3 (right 120°),
//       both linked to note 2;
//   4 — 2031-03-20, right 126°, left 139°, typed in the next day.
export function patRecord(): RomAssessment[] {
  return [
    assessment(4, {
      measuredOn: '2031-03-20',
      createdAt: '2031-03-21T08:15:00.000Z',
      measurements: [value('knee_flexion', 'left', 139), value('knee_flexion', 'right', 126)],
    }),
    assessment(3, {
      measuredOn: '2031-03-11',
      createdAt: '2031-03-11T11:20:00.000Z',
      medicalFileEntryId: 2,
      amendsId: 2,
      amendmentReason: 'Typed as 102°; it measured 120°.',
      measurements: [value('knee_flexion', 'left', 138), value('knee_flexion', 'right', 120)],
    }),
    assessment(2, {
      measuredOn: '2031-03-11',
      createdAt: '2031-03-11T09:40:00.000Z',
      medicalFileEntryId: 2,
      amendedById: 3,
      measurements: [value('knee_flexion', 'left', 138), value('knee_flexion', 'right', 102)],
    }),
    assessment(1, {
      measuredOn: '2031-03-01',
      createdAt: '2031-03-01T09:20:00.000Z',
      medicalFileEntryId: 1,
      measurements: [
        value('knee_flexion', 'left', 138),
        value('knee_flexion', 'right', 110),
        value('knee_flexion', 'right', 118, { mode: 'passive', note: 'pain at end range' }),
      ],
    }),
  ]
}