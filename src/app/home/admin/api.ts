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
  }
}

export const adminMetricsQueryKey = ['admin-metrics'] as const

export function fetchAdminMetrics() {
  return apiRequest<AdminMetrics>('/admin/metrics')
}