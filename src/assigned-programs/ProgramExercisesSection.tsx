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

import { useState } from 'react'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { formatMomentDate } from '@/common/formatMomentDate'
import { WorkoutHeader } from '@/workouts/WorkoutHeader'
import { WorkoutListEditor } from '@/workouts/WorkoutListEditor'
import { AddWorkoutExerciseCard } from '@/workouts/AddWorkoutExerciseCard'
import { groupExercisesByWorkout, type WorkoutGroup } from '@/workouts/workoutGroups'
import { ProgramPageSection } from './ProgramPageSection'
import { ProgramExerciseItem, SortableProgramExerciseCard } from './ProgramExerciseCard'
import {
  canDeleteProgramWorkout,
  emptiesScheduledWorkout,
  isWorkoutInSchedule,
  programWorkoutNote,
} from './programExerciseRules'
import { useProgramWorkoutEditing } from './useProgramWorkoutEditing'
import type { AssignedProgramDetail, AssignedProgramExercise, ProgramWorkout } from './types'

type Group = WorkoutGroup<ProgramWorkout, AssignedProgramExercise>

// The program's exercises (step 3a-2 read-only; step 3b-1 tailoring — 3b-1a
// reorganising and removing, 3b-1b adding and the exercise's own page).
//   - An OPEN program: the editor — the template page's own list
//     (WorkoutListEditor, src/workouts/), with the program's card, its
//     removal dialog and its delete rule.
//   - A closed (completed, cancelled, deleted) program, or one whose patient's
//     account is deactivated (decisions §22): read-only — the backend refuses
//     every write on it.
// Either way, the REMOVED exercises (retired: kept for the sessions that
// used them) are hidden behind "Show N removed exercises" (decided
// 2026-10-13): part of the record, not of the program.
export function ProgramExercisesSection({
  program,
  canChange,
  today,
}: {
  program: AssignedProgramDetail
  // Open AND the patient's account active (decisions §22) — the page decides.
  canChange: boolean
  today: string
}) {
  const [showRemoved, setShowRemoved] = useState(false)
  const groups = groupExercisesByWorkout(program.workouts, program.exercises)
  const removed = program.retiredExercises

  return (
    <ProgramPageSection title="Exercises">
      {canChange ? (
        <ProgramExerciseEditor program={program} groups={groups} today={today} />
      ) : (
        <ReadOnlyExercises groups={groups} />
      )}
      <ShowHiddenToggle
        count={removed.length}
        singular="removed exercise"
        plural="removed exercises"
        checked={showRemoved}
        onChange={setShowRemoved}
      />
      {showRemoved && removed.length > 0 && <RemovedExercises removed={removed} groups={groups} />}
    </ProgramPageSection>
  )
}

// --- EDITABLE (an open program) ---------------------------------------------

function ProgramExerciseEditor({
  program,
  groups,
  today,
}: {
  program: AssignedProgramDetail
  groups: Group[]
  today: string
}) {
  const editing = useProgramWorkoutEditing(program.id)
  const several = groups.length > 1

  // What the delete rule and the note need to know about one workout.
  function stateOf(group: Group) {
    return {
      workoutCount: groups.length,
      exerciseCount: group.exercises.length,
      retiredCount: program.retiredExercises.filter(
        (exercise) => exercise.workoutId === group.workout.id,
      ).length,
      inSchedule: isWorkoutInSchedule(program.schedules, group.workout.id),
    }
  }

  return (
    <WorkoutListEditor
      groups={groups}
      editing={editing}
      exerciseName={(exercise) => exercise.name}
      renderCard={(exercise, { workoutLabel, menu }) => {
        const label = groups.find((group) => group.workout.id === exercise.workoutId)?.label
        return (
          <SortableProgramExerciseCard
            programId={program.id}
            exercise={exercise}
            workoutLabel={workoutLabel}
            menu={menu}
            remove={editing.removeExercise}
            emptied={
              label !== undefined && emptiesScheduledWorkout(program, exercise, today)
                ? { label, several }
                : null
            }
            disabled={editing.isBusy}
          />
        )
      }}
      // The template's Add card (src/workouts/), pointing at the program's
      // add page (3b-1b). With several workouts it names its own, in the
      // address (`?workoutId=`) and in its accessible name.
      renderAddCard={(group, several) => (
        <AddWorkoutExerciseCard
          resourcePath={`/practitioner/programs/assigned/${program.id}`}
          workoutId={several ? group.workout.id : undefined}
          workoutLabel={several ? group.label : undefined}
        />
      )}
      canDeleteWorkout={(group) => canDeleteProgramWorkout(stateOf(group))}
      workoutNote={(group) => programWorkoutNote(stateOf(group))}
      deleteHint="To delete a workout, move or remove its exercises first. A workout the schedule uses — now, planned or in its history — can't be deleted."
    />
  )
}

// --- READ-ONLY (a closed program) -------------------------------------------
//
// The template editor's shape rule (3a-w): ONE workout → just the list, no
// header — "A" above everything would say nothing.

function ReadOnlyExercises({ groups }: { groups: Group[] }) {
  const several = groups.length > 1
  if (groups.every((group) => group.exercises.length === 0)) {
    return <p className="text-sm text-muted-foreground">No exercises in this program.</p>
  }
  return (
    <>
      {groups.map((group) => (
        <div key={group.workout.id} className="space-y-2">
          {several && (
            <WorkoutHeader position={group.position} name={group.workout.name} label={group.label} />
          )}
          {group.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
          ) : (
            <ul className="space-y-2">
              {group.exercises.map((exercise) => (
                <ProgramExerciseItem key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  )
}

// --- REMOVED (shown on request) ---------------------------------------------
//
// In the order they were removed (the backend's). Each says when it was
// removed and, with several workouts, which one it was in — the sessions
// that used it did that workout.

function RemovedExercises({
  removed,
  groups,
}: {
  removed: AssignedProgramExercise[]
  groups: Group[]
}) {
  const several = groups.length > 1
  return (
    <section aria-label="Removed exercises" className="space-y-2">
      <h3 className="text-sm font-medium">Removed exercises</h3>
      <p className="text-xs text-muted-foreground">
        No longer part of the program; kept because sessions used them.
      </p>
      <ul className="space-y-2">
        {removed.map((exercise) => {
          const label = groups.find((group) => group.workout.id === exercise.workoutId)?.label
          return (
            <ProgramExerciseItem
              key={exercise.id}
              exercise={exercise}
              extra={
                <p className="text-xs text-muted-foreground">
                  Removed {exercise.retiredAt ? formatMomentDate(exercise.retiredAt) : ''}
                  {several && label ? ` · was in workout ${label}` : ''}
                </p>
              }
            />
          )
        })}
      </ul>
    </section>
  )
}