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
import { formatMomentDate } from '@/common/formatMomentDate'
import type { User } from '@/users/types'
import type { PatientMerge } from './types'

// What a merged-away account's user page says instead of its actions
// (decisions §27, pass 4): it is an empty, deactivated shell — its records
// live on the account it was merged into, which is one link away. `survivor`
// is that account when the users list has it (undefined: the link still
// works, by id).
export function MergedAccountNotice({
  merge,
  survivor,
}: {
  merge: PatientMerge
  survivor: User | undefined
}) {
  const survivorName = survivor ? `${survivor.firstName} ${survivor.lastName}` : 'another account'
  return (
    <section
      aria-labelledby="merged-title"
      className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <h2 id="merged-title" className="font-medium">
        Merged into {survivorName}
      </h2>
      <p>
        On {formatMomentDate(merge.mergedAt)}, {merge.mergedBy.firstName}{' '}
        {merge.mergedBy.lastName} merged this account into {survivorName}
        {survivor ? ` (${survivor.email})` : ''}. Its records are there now; this account stays
        deactivated.
      </p>
      <Link to={`/admin/users/${merge.survivorId}`} className="font-medium underline">
        Open {survivorName}
      </Link>
    </section>
  )
}
