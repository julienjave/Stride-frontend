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
import { Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { usePrograms } from './usePrograms'
import { isOwnTemplate } from './permissions'
import { YoursBadge } from '@/common/YoursBadge'
import { useAssignedPrograms } from '@/assigned-programs/useAssignedPrograms'
import { isOwnAssignedProgram } from '@/assigned-programs/permissions'
import { ListSkeleton } from '@/common/Loading'

type ProgramKind = 'template' | 'assigned'

// The hub replacing the earlier flat placeholder — per that placeholder's
// own comment, this is exactly the split it predicted, once "manage
// templates" and "my assigned programs" both needed a real home.
export function ProgramsPage() {
  const { data: currentUser } = useCurrentUser()
  const [kind, setKind] = useState<ProgramKind>('template')
  const [ownOnly, setOwnOnly] = useState(false)

  const templatesQuery = usePrograms()
  const assignedQuery = useAssignedPrograms()
  const { data: templates } = templatesQuery
  const { data: assignedPrograms } = assignedQuery

  // Templates default to showing EVERYONE's, not just the practitioner's
  // own — per the design discussion, a template is something they need
  // to browse broadly (as a base for a new assigned program), not just
  // manage. ownOnly narrows it down when they specifically want to see
  // (and edit) just their own.
  //
  // The filter and the "Yours" badge use the SAME helper, isOwnTemplate,
  // so "Only my templates" always shows exactly the cards marked Yours —
  // they can never disagree. (The filter used canModifyProgram before;
  // see isOwnTemplate for why ownership is the more accurate question.)
  const templateItems = currentUser
    ? (templates ?? [])
        .filter((template) => !ownOnly || isOwnTemplate(template, currentUser))
        .map((template) => ({
          id: template.id,
          title: template.title,
          isOwn: isOwnTemplate(template, currentUser),
        }))
    : []

  // Assigned programs are ALWAYS filtered to "assigned by me" here,
  // unconditionally, with no user-facing toggle at all — per the design
  // discussion, seeing every assigned program for a patient they share
  // with another practitioner belongs to the patient management page,
  // not this "manage MY programs" hub.
  const assignedItems = currentUser
    ? (assignedPrograms ?? [])
        .filter((program) => isOwnAssignedProgram(program, currentUser))
        // isOwn: false — not because they aren't the practitioner's (they
        // ALL are, by the filter above), but because a badge on every
        // single card tells the reader nothing. A marker only carries
        // information when some items have it and others don't.
        .map((program) => ({ id: program.id, title: program.title, isOwn: false }))
    : []

  // The list on screen is the chosen tab's: its loading state, its failure
  // ("Try again" asks only it again) and — after a retry that worked —
  // focus on the page's heading.
  const shownQuery = kind === 'template' ? templatesQuery : assignedQuery
  const { isLoading, isError } = shownQuery
  const what = kind === 'template' ? 'the templates' : 'your assigned programs'
  const heading = useRetryFocus<HTMLHeadingElement>(what, shownQuery.isSuccess)
  const items = kind === 'template' ? templateItems : assignedItems

  const addHref =
    kind === 'template'
      ? '/practitioner/programs/templates/new'
      : '/practitioner/programs/assigned/new'
  const addLabel =
    kind === 'template' ? '+ Add New Template' : '+ Assign a program'

  function detailHref(id: number) {
    return kind === 'template'
      ? `/practitioner/programs/templates/${id}`
      : `/practitioner/programs/assigned/${id}`
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        My Programs
      </h1>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={kind === 'template' ? 'default' : 'outline'}
          aria-pressed={kind === 'template'}
          onClick={() => setKind('template')}
        >
          Templates
        </Button>
        <Button
          type="button"
          variant={kind === 'assigned' ? 'default' : 'outline'}
          aria-pressed={kind === 'assigned'}
          onClick={() => setKind('assigned')}
        >
          Assigned
        </Button>
      </div>

      {/* Only rendered for Templates — Assigned is already implicitly
          own-only unconditionally, so a disabled/inert toggle here would
          ask a question that isn't actually a real choice for that mode. */}
      {kind === 'template' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ownOnly}
            onChange={(e) => setOwnOnly(e.target.checked)}
          />
          Only my templates
        </label>
      )}

      {isLoading ? (
        <ListSkeleton label={`Loading ${what}…`} layout="cards" />
      ) : isError ? (
        <LoadError what={what} queries={[shownQuery]} />
      ) : (
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {kind === 'template'
                ? ownOnly
                  ? 'You have no templates yet.'
                  : 'No templates yet.'
                : 'You have no assigned programs yet.'}
            </p>
          )}
          <ul className="space-y-2">
            {/* Always first, matching the exercise library's own
                AddExerciseCard convention — the same rule applies
                regardless of what's in the list below it. */}
            <li>
              <Link
                to={addHref}
                className="block rounded-lg border border-dashed p-3 text-center hover:bg-muted"
              >
                {addLabel}
              </Link>
            </li>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={detailHref(item.id)}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted"
                >
                  <span>{item.title}</span>
                  {item.isOwn && <YoursBadge />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button asChild variant="outline">
        <Link to="/practitioner">Back</Link>
      </Button>
    </div>
  )
}