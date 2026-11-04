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

import { useFieldArray } from 'react-hook-form'
import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreateExerciseFormValues } from './schemas'

type ListFieldName =
  | 'primaryMuscles'
  | 'secondaryMuscles'
  | 'equipment'
  | 'instructions'

interface DynamicStringListFieldProps {
  control: Control<CreateExerciseFormValues>
  register: UseFormRegister<CreateExerciseFormValues>
  errors: FieldErrors<CreateExerciseFormValues>
  name: ListFieldName
  label: string
  addButtonLabel: string
  // Controls TWO things at once, both driven by the same underlying
  // fact — whether the backend requires at least one entry:
  //   1. Whether the list starts with one empty row (true) or zero (false)
  //   2. Whether that first row can be deleted at all
  // A field the backend requires shouldn't let itself be emptied out
  // entirely through the UI, and a field the backend doesn't require
  // shouldn't show an empty input before anyone's asked for one.
  required: boolean
  multiline?: boolean
}

// Shared by all four array fields on the exercise creation form
// (primaryMuscles, secondaryMuscles, equipment, instructions) — they
// differ only in label text, required-or-not, and single-line vs
// multiline input, so one parameterized component avoids four
// near-identical copies of the same add/delete mechanics. Not written
// as a fully generic "works with any form" component, since nothing
// else in this codebase needs this pattern yet — that would be
// speculative abstraction for a form that doesn't exist.
export function DynamicStringListField({
  control,
  register,
  errors,
  name,
  label,
  addButtonLabel,
  required,
  multiline = false,
}: DynamicStringListFieldProps) {
  // useFieldArray owns the add/remove/reorder mechanics for this one
  // named array — fields[].id is a stable identity RHF generates per
  // row, safe to use as React's key even when rows are added or removed
  // in the middle, unlike the array INDEX (which shifts under every
  // other row whenever one is deleted above it).
  const { fields, append, remove } = useFieldArray({ control, name })

  // errors[name] is either undefined, a per-row array of errors (each
  // possibly holding a `.value` error for that row's own min/max
  // violation), or a single FieldError for a WHOLE-ARRAY rule like
  // "at least one entry required" — these are two different kinds of
  // problems shown in two different places below.
  const fieldErrors = errors[name]
  const wholeArrayError =
    fieldErrors && !Array.isArray(fieldErrors)
      ? (fieldErrors as { message?: string }).message
      : undefined

  // RHF's FieldErrors type, indexed by a UNION field name like `name`
  // here, can't precisely narrow to "array of { value: FieldError }" on
  // its own — TypeScript falls back to `any` for fieldErrors[index],
  // which is exactly what @typescript-eslint/no-unsafe-* is warning
  // about. One explicit, narrow cast here (to a small local type that
  // says exactly what shape is actually expected) is safer than leaving
  // an implicit `any` to spread through every use below.
  interface RowError {
    value?: { message?: string }
  }
  const rowErrors = Array.isArray(fieldErrors)
    ? (fieldErrors as RowError[])
    : undefined

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>

      {fields.map((field, index) => {
        // The first row of a REQUIRED field can't be deleted — that's
        // what makes "at least one" visually obvious, rather than only
        // ever being enforced by a validation message after the fact.
        const canDelete = !(required && index === 0)
        const itemError = rowErrors?.[index]?.value?.message
        const fieldName = `${name}.${index}.value` as const
        const inputId = `${name}-${index}`

        return (
          <div key={field.id} className="space-y-1">
            <div className="flex items-start gap-2">
              {multiline ? (
                <textarea
                  id={inputId}
                  aria-label={`${label} ${index + 1}`}
                  aria-invalid={!!itemError}
                  className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                  {...register(fieldName)}
                />
              ) : (
                <Input
                  id={inputId}
                  aria-label={`${label} ${index + 1}`}
                  aria-invalid={!!itemError}
                  {...register(fieldName)}
                />
              )}

              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Delete ${label} ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {itemError && (
              <p className="text-sm text-destructive">{itemError}</p>
            )}
          </div>
        )
      })}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">None added yet.</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ value: '' })}
      >
        + {addButtonLabel}
      </Button>

      {wholeArrayError && (
        <p className="text-sm text-destructive">{wholeArrayError}</p>
      )}
    </div>
  )
}