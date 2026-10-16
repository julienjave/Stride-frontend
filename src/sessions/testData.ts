// Test data for the session flow's page tests — shared by the start page's
// and the session page's tests (and the coming passes'), so one change of
// shape is made once. Imported only by tests: no page imports it, so it
// never reaches the app's bundle.
import type {
  AssignedProgramDetail,
  AssignedProgramExercise,
  ScheduleSummary,
  ScheduledDay,
} from '@/assigned-programs/types'
import type { Session, SessionExercise } from './types'

// "Today" is Thursday 12 June 2031 — far from the real today (tests fake
// the clock to it), so nothing can pass by reading the real date.
export const TODAY = '2031-06-12'

// Pat — preferring POUNDS, so a weight prescribed in kg shows converted
// ("44.1 lbs (20 kg)"): the proof a screen uses WeightValue.
export const PAT = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'pat@example.com',
  avatarUrl: null,
  roles: ['patient'],
  activeRole: 'patient',
  preferredWeightUnit: 'lbs',
}

export const A = 57
export const B = 58

export function programExercise(
  id: number,
  workoutId: number,
  sortOrder: number,
  fields: Partial<AssignedProgramExercise> = {},
): AssignedProgramExercise {
  return {
    id,
    assignedProgramId: 12,
    workoutId,
    exerciseId: 900 + id,
    name: `Exercise ${id}`,
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Do it slowly.'],
    sets: null,
    reps: null,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder,
    notes: null,
    retiredAt: null,
    retiredBy: null,
    images: [],
    ...fields,
  }
}

// Knee Rehab: two workouts. A holds Heel Slides then Squat (20 kg); B holds
// Bridge. Listed workout by workout, as the backend does.
export const KNEE: AssignedProgramDetail = {
  id: 12,
  patientId: 6,
  assignedBy: 3,
  basedOnTemplateId: 4,
  basedOnProgramId: null,
  title: 'Knee Rehab',
  startDate: '2031-06-02',
  endDate: null,
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  lateMakeUpDays: null,
  schedules: [],
  workouts: [
    { id: A, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: B, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
  ],
  exercises: [
    programExercise(1, A, 0, { name: 'Heel Slides', sets: 3, reps: 10 }),
    programExercise(2, A, 1, { name: 'Squat', sets: 3, reps: 8, weight: 20, weightUnit: 'kg' }),
    programExercise(3, B, 0, { name: 'Bridge', sets: 2, reps: 12 }),
  ],
  retiredExercises: [],
}

export function scheduledDay(
  date: string,
  workoutId: number,
  state: ScheduledDay['state'],
): ScheduledDay {
  return {
    date,
    workoutId,
    state,
    sessionId: null,
    madeUpBy: null,
    madeUpLateBy: null,
    doneEarlyBy: null,
    swappedBy: null,
    attempts: [],
  }
}

export function summary(fields: Partial<ScheduleSummary> = {}): ScheduleSummary {
  return {
    firstDay: '2031-06-02',
    lastDay: '2031-06-15',
    today: TODAY,
    totals: {
      expected: null,
      done: 0,
      madeUp: 0,
      madeUpLate: 0,
      doneEarly: 0,
      swapped: 0,
      missed: 0,
      extra: 0,
      skipped: 0,
      incomplete: 0,
    },
    days: [],
    weeks: [],
    extraSessions: [],
    otherAttempts: [],
    pauses: [],
    nextWorkout: null,
    openSession: null,
    lateMakeUps: { days: [], blockedToday: null },
    ...fields,
  }
}

export function sessionExercise(
  id: number,
  sortOrder: number,
  fields: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    id,
    sessionId: 31,
    assignedProgramExerciseId: id,
    name: `Exercise ${id}`,
    sets: null,
    reps: null,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    notes: null,
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Do it slowly.'],
    completed: false,
    durationActualInSeconds: null,
    difficultyRating: null,
    sortOrder,
    feedback: null,
    ...fields,
  }
}

// Session 31: today's workout A of Knee Rehab, open since 14:05 Paris time.
export function session(fields: Partial<Session> = {}): Session {
  return {
    id: 31,
    assignedProgramId: 12,
    workoutId: A,
    patientId: 6,
    localDate: TODAY,
    countsFor: null,
    status: 'in_progress',
    startedAt: '2031-06-12T12:05:00.000Z',
    completedAt: null,
    endedAt: null,
    endReason: null,
    endNote: null,
    painBefore: null,
    painAfter: null,
    mobilityAfter: null,
    totalDurationInSeconds: null,
    sessionFeedback: null,
    exercises: [
      sessionExercise(1, 0, { name: 'Heel Slides', sets: 3, reps: 10 }),
      sessionExercise(2, 1, { name: 'Squat', sets: 3, reps: 8, weight: 20, weightUnit: 'kg' }),
    ],
    ...fields,
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

export function apiError(statusCode: number, message: string) {
  return json(
    { statusCode, message: [message], error: 'Error', timestamp: '', path: '' },
    statusCode,
  )
}

export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}