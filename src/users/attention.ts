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

import type { QueryClient } from '@tanstack/react-query'
import { adminMetricsQueryKey } from '@/app/home/admin/api'

// "Needs attention" (decisions §17): the two groups of accounts an admin
// should look at. The backend owns the RULES (attention-rules.ts — one SQL
// condition for the home's numbers and the users list's filter); this file
// owns their WORDS and how the users list's address names them, so the
// home and the list say the same thing.

// The same values as the backend's ATTENTION_KINDS (GET /admin/users?attention=…).
export const ATTENTION_KINDS = [
  'patients-without-care-team',
  'practitioners-without-clinic',
  'invitations-to-send-again',
] as const
export type AttentionKind = (typeof ATTENTION_KINDS)[number]

// Each group's words: its name, the rule in one sentence, and what the
// filtered list says when nobody is in it.
export const ATTENTION_GROUPS: Record<
  AttentionKind,
  { title: string; explanation: string; empty: string }
> = {
  'patients-without-care-team': {
    title: 'Patients without a care team',
    explanation: 'No current care-team link to an active practitioner.',
    empty: 'Every patient has someone on their care team.',
  },
  'practitioners-without-clinic': {
    title: 'Practitioners without a clinic',
    explanation: 'Not a member of any active clinic.',
    empty: 'Every practitioner belongs to a clinic.',
  },
  // 2026-10-25 (decisions §19): an open invitation that expired, or whose
  // email couldn't be sent — the person can't join on their own. A REVOKED
  // one isn't listed: someone decided it.
  'invitations-to-send-again': {
    title: 'Invitations to send again',
    explanation: "The invitation expired, or its email couldn't be sent.",
    empty: 'No invitation needs sending again.',
  },
}

// The users list's address names the filter `?attention=` — the API's own
// name. Anything else there (a typo, an old link) means "all users": an
// address someone typed shouldn't break the page.
const PARAM = 'attention'

export function readAttention(params: URLSearchParams): AttentionKind | null {
  const value = params.get(PARAM)
  return ATTENTION_KINDS.find((kind) => kind === value) ?? null
}

// The users list filtered to one group — where the home's links lead.
export function attentionHref(kind: AttentionKind): string {
  return `/admin/users?${new URLSearchParams({ [PARAM]: kind })}`
}

// After a change that can move someone into or out of a group — a
// care-team link added or ended, a clinic membership added or removed — the
// home's numbers and every users list (filtered or not, all under the
// ['users-list'] prefix) are marked stale. Without it, an admin who fixes
// Dana's care team and goes back would still see her listed, for up to the
// 30 seconds the app trusts cached data (api/queryClient.ts). Invalidating a
// query nobody is showing only marks it stale — it is fetched again when
// next shown — so practitioners calling this pay nothing.
export function refreshAttention(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminMetricsQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['users-list'] }),
  ])
}