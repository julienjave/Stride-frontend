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

import { apiRequest } from '@/api/client'

// GET /admin/metrics — the admin home's numbers (decisions §17). The
// backend counts in ONE SQL statement under the admin's own row security,
// so every number on the page is from the same moment and covers only what
// an admin may read (accounts and clinics — nothing clinical).

export interface AccountRef {
  id: number
  firstName: string
  lastName: string
}

// A group needing an admin's attention: how many, and the first few by name.
export interface AttentionList {
  total: number
  first: AccountRef[]
}

export interface AdminMetrics {
  // ACTIVE accounts per role (a two-role account counts in both) and the
  // deactivated ones, whatever their roles.
  accounts: { admins: number; practitioners: number; patients: number; deactivated: number }
  clinics: { active: number; deactivated: number }
  // Invitations that can still be accepted (not accepted, revoked or expired).
  pendingInvitations: number
  needsAttention: {
    // No current care-team link to an active practitioner.
    patientsWithoutCareTeam: AttentionList
    // In no active clinic.
    practitionersWithoutClinic: AttentionList
    // An open invitation that expired, or whose email couldn't be sent.
    invitationsToSendAgain: AttentionList
  }
}

export const adminMetricsQueryKey = ['admin-metrics'] as const

export function fetchAdminMetrics() {
  return apiRequest<AdminMetrics>('/admin/metrics')
}