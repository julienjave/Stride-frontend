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
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { type AttentionList } from './api'
import { useAdminMetrics } from './useAdminHome'
import { moreLine, nothingNeedsAttention, notCountedLine } from './adminHomeText'
import { ATTENTION_GROUPS, attentionHref, type AttentionKind } from '@/users/attention'
import { LinesSkeleton } from '@/common/Loading'

// The admin home's "Metrics" section (decisions §17, the person's choices
// 2026-10-24): active accounts by role, clinics, invitations still waiting,
// and the accounts that need an admin — each by name, linking to the user
// page where the fix is (the care team for a patient, the clinics for a
// practitioner).
//
// Its own full-width section, not a slot of the summary card: the card puts
// each slot in one equal column, and five numbers plus two lists don't fit a
// third of a 375 px screen.
export function AdminMetricsSection() {
  // Refetched every minute while the tab is visible (useAdminHome.ts).
  const metrics = useAdminMetrics()
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the metrics', metrics.isSuccess)

  return (
    <section aria-labelledby="metrics-heading" className="space-y-3">
      <div className="space-y-1">
        <h2 ref={heading} tabIndex={-1} id="metrics-heading" className="text-lg font-semibold outline-none">
          Metrics
        </h2>
        <p className="text-sm text-muted-foreground">
          Active accounts and clinics, across all clinics. An account with two roles counts in
          each.
        </p>
      </div>

      {metrics.isPending && <LinesSkeleton label="Loading the metrics…" lines={3} />}
      {/* "Try again" refetches just this request (decisions §15) — not
          "Try refreshing the page", which reloads the whole app for it. */}
      {/* Only when there is nothing to show: a minute's refresh that fails
          keeps the last numbers, and the freshness bar says so. */}
      {metrics.isError && !metrics.data && <LoadError what="the metrics" queries={[metrics]} />}

      {metrics.data && (
        <>
          {/* A description list: each number is DEFINED by its label, which
              is what <dt>/<dd> say to a screen reader ("Patients, 8") — a
              grid of divs would read as loose numbers and words. The dd
              comes first visually (the big number), the dt under it, but
              in the source dt comes first, so it's read label then value. */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label="Practitioners" value={metrics.data.accounts.practitioners} />
            <Tile label="Patients" value={metrics.data.accounts.patients} />
            <Tile label="Admins" value={metrics.data.accounts.admins} />
            <Tile label="Clinics" value={metrics.data.clinics.active} />
            <Tile label="Invitations waiting" value={metrics.data.pendingInvitations} />
          </dl>
          {notCountedLine(metrics.data) && (
            <p className="text-sm text-muted-foreground">{notCountedLine(metrics.data)}</p>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Needs attention</h3>
            {nothingNeedsAttention(metrics.data) ? (
              <p className="text-sm">
                Nothing needs attention: every patient has a care team, every practitioner
                belongs to a clinic, and no invitation needs sending again.
              </p>
            ) : (
              <>
                <AttentionGroup
                  kind="patients-without-care-team"
                  list={metrics.data.needsAttention.patientsWithoutCareTeam}
                />
                <AttentionGroup
                  kind="practitioners-without-clinic"
                  list={metrics.data.needsAttention.practitionersWithoutClinic}
                />
                <AttentionGroup
                  kind="invitations-to-send-again"
                  list={metrics.data.needsAttention.invitationsToSendAgain}
                />
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    // flex-col-reverse: the number shows ABOVE its label while the source
    // (and so the reading order) stays label, then number.
    <div className="flex flex-col-reverse rounded-lg border px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

// One group of accounts needing attention — nothing at all when it's empty
// (another group may still have some; the "nothing" sentence above covers
// the case where all are empty). Its words come from the users list's
// filter (src/users/attention.ts), so both pages name it the same way; its
// title and "and N more" lead to that filter — every account of the group,
// in the same order, continuing where these first names stop.
function AttentionGroup({ kind, list }: { kind: AttentionKind; list: AttentionList }) {
  if (list.total === 0) return null
  const { title, explanation } = ATTENTION_GROUPS[kind]
  const more = moreLine(list)

  return (
    <div className="space-y-2 rounded-lg border px-4 py-3">
      <div>
        <p className="font-medium">
          <Link to={attentionHref(kind)} className="underline-offset-4 hover:underline">
            {title} · {list.total}
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">{explanation}</p>
      </div>
      {/* aria-label: the list is named by its group, so a screen reader's
          list navigation says which one it is in. */}
      <ul aria-label={title} className="space-y-1">
        {list.first.map((account) => (
          <li key={account.id}>
            <Link
              to={`/admin/users/${account.id}`}
              className="text-sm underline underline-offset-4"
            >
              {account.firstName} {account.lastName}
            </Link>
          </li>
        ))}
      </ul>
      {more && (
        <p className="text-sm">
          <Link to={attentionHref(kind)} className="underline underline-offset-4">
            {more}
          </Link>
        </p>
      )}
    </div>
  )
}