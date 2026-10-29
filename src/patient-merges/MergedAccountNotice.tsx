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
