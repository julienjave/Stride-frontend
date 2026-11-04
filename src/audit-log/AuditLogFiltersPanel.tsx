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

import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/common/NativeSelect'
import type { User } from '@/users/types'
import { changeFilter, hasFilters, NO_FILTERS, type AuditLogFilters } from './auditFilters'
import { actionLabel } from './auditWording'
import { AUDIT_KINDS, type AuditActionOption, type AuditKind } from './types'

interface Props {
  filters: AuditLogFilters
  onChange: (next: AuditLogFilters) => void
  // Undefined while loading (or if it failed): the selects still show the
  // current choice, with "Anyone" / "Any action" to clear it.
  actions: AuditActionOption[] | undefined
  people: User[] | undefined
}

const KIND_GROUP_LABEL: Record<AuditKind, string> = {
  change: 'Changes',
  view: 'Views',
  sign_in: 'Sign-ins',
}

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`

// Everyone, by last name then first name (the users list's own order is the
// backend's), deactivated accounts included — they are in the log too.
function sortedPeople(people: User[]): User[] {
  return [...people].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  )
}

// A person select: "Anyone", everyone, and — if the address names an id the
// list doesn't hold (still loading, or a mistyped link) — that id, so the
// select always shows what is actually filtering.
function PersonSelect({
  id,
  value,
  people,
  onChange,
}: {
  id: string
  value: number | null
  people: User[] | undefined
  onChange: (value: number | null) => void
}) {
  const sorted = people ? sortedPeople(people) : []
  const known = value === null || sorted.some((person) => person.id === value)
  return (
    <NativeSelect
      id={id}
      value={value === null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">Anyone</option>
      {!known && <option value={String(value)}>User #{value}</option>}
      {sorted.map((person) => (
        <option key={person.id} value={String(person.id)}>
          {fullName(person)}
          {person.isActive ? '' : ' (deactivated)'}
        </option>
      ))}
    </NativeSelect>
  )
}

export function AuditLogFiltersPanel({ filters, onChange, actions, people }: Props) {
  const ids = {
    action: useId(),
    performedBy: useId(),
    targetUserId: useId(),
    from: useId(),
    to: useId(),
  }
  const kindName = useId()
  const update = (change: Parameters<typeof changeFilter>[1]) =>
    onChange(changeFilter(filters, change))

  // The action filter offers the chosen kind's actions only (all of them
  // when no kind is chosen), each kind under its own heading, by their words.
  const kindsShown = filters.kind ? [filters.kind] : AUDIT_KINDS
  const groups = kindsShown.map((kind) => ({
    kind,
    options: (actions ?? [])
      .filter((option) => option.kind === kind)
      .map((option) => ({ action: option.action, label: actionLabel(option.action) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }))
  const actionListed = groups.some((group) =>
    group.options.some((option) => option.action === filters.action),
  )

  // Choosing a kind keeps the chosen action only if it IS of that kind —
  // otherwise the two filters together could only ever find nothing.
  const chooseKind = (kind: AuditKind | null) => {
    const actionKind = actions?.find((option) => option.action === filters.action)?.kind
    const keepAction = kind === null || actionKind === kind
    update({ kind, action: keepAction ? filters.action : null })
  }

  return (
    <section aria-label="Filters" className="space-y-4 rounded-lg border p-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Show</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {([null, ...AUDIT_KINDS] as const).map((kind) => (
            <label key={kind ?? 'all'} className="flex items-center gap-1.5">
              <input
                type="radio"
                name={kindName}
                checked={filters.kind === kind}
                onChange={() => chooseKind(kind)}
              />
              {kind === null ? 'All' : KIND_GROUP_LABEL[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ids.action}>Action</Label>
          <NativeSelect
            id={ids.action}
            value={filters.action ?? ''}
            onChange={(event) => update({ action: event.target.value || null })}
          >
            <option value="">Any action</option>
            {filters.action !== null && !actionListed && (
              <option value={filters.action}>{actionLabel(filters.action)}</option>
            )}
            {groups.map(
              (group) =>
                group.options.length > 0 && (
                  <optgroup key={group.kind} label={KIND_GROUP_LABEL[group.kind]}>
                    {group.options.map((option) => (
                      <option key={option.action} value={option.action}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ),
            )}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.performedBy}>Who acted</Label>
          <PersonSelect
            id={ids.performedBy}
            value={filters.performedBy}
            people={people}
            onChange={(performedBy) => update({ performedBy })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.targetUserId}>About</Label>
          <PersonSelect
            id={ids.targetUserId}
            value={filters.targetUserId}
            people={people}
            onChange={(targetUserId) => update({ targetUserId })}
          />
        </div>

        {/* Native date inputs: the value is always YYYY-MM-DD (or empty),
            whatever the browser shows. min / max keep the pickers from
            offering a backwards range; a typed one is still caught (the
            page says so and sends nothing). */}
        <div className="space-y-1.5">
          <Label htmlFor={ids.from}>From</Label>
          <Input
            id={ids.from}
            type="date"
            value={filters.from ?? ''}
            max={filters.to ?? undefined}
            onChange={(event) => update({ from: event.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.to}>To</Label>
          <Input
            id={ids.to}
            type="date"
            value={filters.to ?? ''}
            min={filters.from ?? undefined}
            onChange={(event) => update({ to: event.target.value || null })}
          />
        </div>
      </div>

      {hasFilters(filters) && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(NO_FILTERS)}>
          Clear filters
        </Button>
      )}
    </section>
  )
}