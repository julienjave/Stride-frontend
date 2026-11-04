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

import { useQuery } from '@tanstack/react-query'
import { invitationsQueryKey, listInvitations } from '@/invitations/api'
import { useCareTeam } from '@/patients/useCareTeam'
import type { User } from '@/users/types'
import { LoadError } from '@/common/LoadError'
import { comparedRows, differingLabels, type ComparedRow } from './comparison'

// The two accounts side by side, before a merge (decisions §27, pass 4) —
// IDENTITY ONLY, the person's choice: who the account is, where it's
// treated, whether it's in use. Nothing clinical: admins read no program,
// session or note (§16), so the screen doesn't count them either.
//
// Two cards (stacked on a phone, side by side from `md`), the same rows in
// the same order, and — above them — the rows that DIFFER, said in words:
// on a phone the cards aren't side by side, and a difference marked only
// by colour or position would be missed.

// One account's rows, and the two requests behind them — returned so a
// failure can be said (and retried) by the app's LoadError.
function useComparedRows(user: User) {
  const careTeam = useCareTeam(user.id, false)
  const invitations = useQuery({
    queryKey: invitationsQueryKey(user.id),
    queryFn: () => listInvitations(user.id),
  })
  return {
    rows: comparedRows(user, careTeam.data ?? null, invitations.data ?? null),
    queries: [careTeam, invitations],
  }
}

export function MergeComparison({ left, right }: { left: User; right: User }) {
  const leftSide = useComparedRows(left)
  const rightSide = useComparedRows(right)
  const leftRows = leftSide.rows
  const rightRows = rightSide.rows
  const differing = differingLabels(leftRows, rightRows)
  const queries = [...leftSide.queries, ...rightSide.queries]

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {differing.length === 0
          ? 'Apart from the email, these two accounts agree on everything below.'
          : `These differ: ${differing.join(', ').toLowerCase()}.`}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <AccountCard user={left} rows={leftRows} />
        <AccountCard user={right} rows={rightRows} />
      </div>
      {/* A care team or an invitation history that couldn't be read: the
          cells say "—", and the app's one sentence says why, with "Try
          again" for just those requests (decisions §15). */}
      {queries.some((query) => query.isError) && (
        <LoadError what="part of these accounts" queries={queries} />
      )}
    </div>
  )
}

function AccountCard({ user, rows }: { user: User; rows: ComparedRow[] }) {
  return (
    <section
      aria-label={`${user.firstName} ${user.lastName}, ${user.email}`}
      className="rounded-lg border px-4 py-3"
    >
      <h3 className="font-medium">
        {user.firstName} {user.lastName}
      </h3>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="wrap-break-word">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}