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

import { useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { NativeSelect } from '@/common/NativeSelect'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Loading } from '@/common/Loading'
import { StepUpForm } from '@/two-factor/StepUpForm'
import { useUser } from '@/users/useUser'
import { useUsers } from '@/users/useUsers'
import type { User } from '@/users/types'
import { mergePatients, patientMergesQueryKey } from './api'
import { usePatientMerges } from './usePatientMerges'
import { MergeComparison } from './MergeComparison'
import { candidateLabel, keepRefusal, mergeCandidates, mergeOf } from './mergeRules'
import type { PatientMergeAnswer } from './types'

// "Merge with another account" (decisions §27, pass 4) —
// /admin/users/:id/merge, optionally ?with=<id> (the user page and the
// possible-duplicate warning can name the other account).
//
// Three steps on one page, each shown once the one before is answered:
//   1. the OTHER account — any other patient account not merged away;
//   2. the two side by side (identity only), then WHICH ONE IS KEPT — either
//      way round, so this page works from either account's page;
//   3. what will happen, in words, then the admin's own password (and code)
//      — the step-up the person chose for a change that can't be undone.
// Afterwards, the page says what happened and links to the account kept.
export function MergePatientPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  if (!id || Number.isNaN(userId)) {
    return <RecordNotFound noun="user" links={WAYS_OUT} />
  }
  return <MergeView userId={userId} />
}

const WAYS_OUT: [{ to: string; label: string }] = [{ to: '/admin/users', label: 'Users' }]

function MergeView({ userId }: { userId: number }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const userQuery = useUser(userId)
  const usersQuery = useUsers(true)
  const mergesQuery = usePatientMerges()
  const { data: me } = useCurrentUser()
  const pickerId = useId()
  const [keptId, setKeptId] = useState<number | null>(null)
  const [done, setDone] = useState<{ kept: User; merged: User } | null>(null)
  const loaded = userQuery.isSuccess && usersQuery.isSuccess && mergesQuery.isSuccess
  const heading = useRetryFocus<HTMLHeadingElement>('this merge', loaded)

  if (userQuery.isPending || usersQuery.isPending || mergesQuery.isPending) {
    return <Loading label="Loading the accounts…" />
  }
  if (userQuery.isError || usersQuery.isError || mergesQuery.isError) {
    return (
      <RecordLoadFailed
        queries={[userQuery, usersQuery, mergesQuery]}
        what="this merge"
        noun="user"
        links={WAYS_OUT}
      />
    )
  }

  const user = userQuery.data
  const name = `${user.firstName} ${user.lastName}`
  const candidates = mergeCandidates(usersQuery.data, mergesQuery.data, userId)
  const withId = Number(searchParams.get('with'))
  const other = candidates.find((candidate) => candidate.id === withId)
  const alreadyMerged = mergeOf(mergesQuery.data, userId)

  // The choice of the account kept belongs to THIS pair: picking another
  // account forgets it (a choice made for Frank shouldn't stand for Pat).
  function pick(value: string) {
    setKeptId(null)
    const next = new URLSearchParams(searchParams)
    if (value === '') next.delete('with')
    else next.set('with', value)
    setSearchParams(next, { replace: true })
  }

  const kept = other && keptId === user.id ? user : keptId === other?.id ? other : undefined
  const mergedAway = kept && other ? (kept.id === user.id ? other : user) : undefined

  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-6 px-4">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Merge {name} with another account
        </h1>
        <p className="text-sm text-muted-foreground">
          For one patient with two accounts. Everything of the account you don't keep — programs,
          sessions, notes, messages, care team — moves to the one you keep. This can't be undone.
        </p>
      </div>

      {done ? (
        <div role="status" className="space-y-2 rounded-lg border px-4 py-3 text-sm">
          <p>
            Merged. {done.merged.firstName} {done.merged.lastName} ({done.merged.email}) is now part
            of {done.kept.firstName} {done.kept.lastName}'s account. The care team is told, and the
            patient gets an email at {done.kept.email}.
          </p>
          <Link to={`/admin/users/${done.kept.id}`} className="font-medium underline">
            Open {done.kept.firstName} {done.kept.lastName}
          </Link>
        </div>
      ) : alreadyMerged ? (
        <p className="text-sm">
          This account was already merged into another.{' '}
          <Link to={`/admin/users/${alreadyMerged.survivorId}`} className="underline">
            Open the account it was merged into
          </Link>
        </p>
      ) : !user.roles.includes('patient') ? (
        <p className="text-sm">Only patient accounts can be merged.</p>
      ) : (
        <>
          <div className="space-y-1">
            <label htmlFor={pickerId} className="text-sm font-medium">
              The other account
            </label>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other patient account to merge with.</p>
            ) : (
              <NativeSelect
                id={pickerId}
                value={other ? String(other.id) : ''}
                onChange={(event) => pick(event.target.value)}
              >
                <option value="">Choose an account…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidateLabel(candidate)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>

          {other && (
            <>
              <MergeComparison left={user} right={other} />
              <KeepChoice
                accounts={[user, other]}
                keptId={keptId}
                onChange={setKeptId}
              />
            </>
          )}

          {kept && mergedAway && me && (
            <section aria-labelledby="merge-confirm" className="space-y-3 rounded-lg border px-4 py-3">
              <h2 id="merge-confirm" className="font-medium">
                Merge into {kept.firstName} {kept.lastName} ({kept.email})
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>
                  {mergedAway.firstName} {mergedAway.lastName}'s programs, sessions, medical file,
                  messages and care team move to {kept.email}.
                </li>
                <li>
                  {mergedAway.email} is deactivated for good: it can't sign in, and it can't be
                  reactivated.
                </li>
                <li>
                  Details missing from the account you keep — phone, address, photo — are taken from
                  the other one. Nothing it already has is replaced.
                </li>
                <li>The care team is told, and the patient gets an email at {kept.email}.</li>
              </ul>
              <p className="text-sm">
                {me.mfaEnabled
                  ? 'Confirm with your own password and a code from your app.'
                  : 'Confirm with your own password.'}
              </p>
              <StepUpForm<PatientMergeAnswer>
                idPrefix="merge"
                withCode={me.mfaEnabled}
                email={me.email}
                submitLabel="Merge the accounts"
                pendingLabel="Merging…"
                send={(values) =>
                  mergePatients(mergedAway.id, kept.id, values.currentPassword, values.code)
                }
                onSuccess={() => {
                  // Both accounts changed (one deactivated, one fuller), and
                  // the lists that show them: asked for again.
                  void queryClient.invalidateQueries({ queryKey: ['users-list'] })
                  void queryClient.invalidateQueries({ queryKey: ['users'] })
                  void queryClient.invalidateQueries({ queryKey: patientMergesQueryKey })
                  void queryClient.invalidateQueries({ queryKey: ['care-team'] })
                  void queryClient.invalidateQueries({ queryKey: ['invitations'] })
                  setDone({ kept, merged: mergedAway })
                  heading.current?.focus()
                }}
              />
            </section>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to={`/admin/users/${userId}`} className="underline">
          Back to {name}
        </Link>
      </p>
    </div>
  )
}

// "Which account do you keep?" — two radio buttons, one per account. A
// choice the backend would refuse is DISABLED, with the reason under it in
// words (a greyed-out option alone says nothing to a screen reader user).
function KeepChoice({
  accounts,
  keptId,
  onChange,
}: {
  accounts: [User, User]
  keptId: number | null
  onChange: (id: number) => void
}) {
  const groupName = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Which account do you keep?</legend>
      {accounts.map((account, index) => {
        const refusal = keepRefusal(account, accounts[1 - index])
        const optionId = `${groupName}-${account.id}`
        return (
          <div key={account.id} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={optionId}
                name={groupName}
                checked={keptId === account.id}
                disabled={refusal !== null}
                aria-describedby={refusal ? `${optionId}-why` : undefined}
                onChange={() => onChange(account.id)}
              />
              <label htmlFor={optionId} className="text-sm">
                Keep {account.firstName} {account.lastName} ({account.email})
              </label>
            </div>
            {refusal && (
              <p id={`${optionId}-why`} className="pl-6 text-sm text-muted-foreground">
                {refusal}
              </p>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
