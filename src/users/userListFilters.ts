import { readAttention, type AttentionKind } from './attention'

// The Users page's filters (Phase 6.5, decided 2026-10-29), as they live in
// its ADDRESS: `/admin/users?search=lee&role=patient&clinic=2&status=all
// &attention=…&page=3`. Pure functions, so every rule is a unit test:
//   - readUserListFilters: address → filters, with anything unreadable (a
//     typo, an old link, `page=abc`) read as its default — an address
//     someone typed shouldn't break the page;
//   - writeUserListFilters: filters → address, defaults left out, so the
//     plain page is plain `/admin/users`;
//   - the API's query is the same text (GET /admin/users takes the same
//     names), so what the address says is exactly what is asked.

export const USER_LIST_ROLES = ['admin', 'practitioner', 'patient'] as const
export type UserListRole = (typeof USER_LIST_ROLES)[number]

export const USER_LIST_STATUSES = ['active', 'deactivated', 'all'] as const
export type UserListStatus = (typeof USER_LIST_STATUSES)[number]

// 25 a page — the backend's default too (USER_LIST_PAGE_SIZE), so the
// request needs no `limit`.
export const USER_LIST_PAGE_SIZE = 25

export interface UserListFilters {
  // As typed, trimmed ('' = no search).
  search: string
  role: UserListRole | null
  // A clinic's id as text, or 'none' (accounts in no clinic); null = any.
  clinic: string | null
  status: UserListStatus
  attention: AttentionKind | null
  page: number
}

export const NO_USER_FILTERS: UserListFilters = {
  search: '',
  role: null,
  clinic: null,
  status: 'active',
  attention: null,
  page: 1,
}

// The backend's own rule for `clinic` (list-users-query.dto.ts): an id of at
// most 9 digits (it fits Postgres's integer), or `none`.
const CLINIC_PATTERN = /^(none|[1-9]\d{0,8})$/
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

function oneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return values.find((candidate) => candidate === value) ?? null
}

export function readUserListFilters(params: URLSearchParams): UserListFilters {
  const clinic = params.get('clinic')
  const page = params.get('page')
  return {
    search: (params.get('search') ?? '').trim(),
    role: oneOf(USER_LIST_ROLES, params.get('role')),
    clinic: clinic !== null && CLINIC_PATTERN.test(clinic) ? clinic : null,
    status: oneOf(USER_LIST_STATUSES, params.get('status')) ?? 'active',
    attention: readAttention(params),
    page: page !== null && PAGE_PATTERN.test(page) ? Number(page) : 1,
  }
}

// Always in the same order, so one view has one address (and one cache
// entry: the query key is this text).
export function writeUserListFilters(filters: UserListFilters): URLSearchParams {
  const params = new URLSearchParams()
  const search = filters.search.trim()
  if (search !== '') params.set('search', search)
  if (filters.role !== null) params.set('role', filters.role)
  if (filters.clinic !== null) params.set('clinic', filters.clinic)
  if (filters.status !== 'active') params.set('status', filters.status)
  if (filters.attention !== null) params.set('attention', filters.attention)
  if (filters.page !== 1) params.set('page', String(filters.page))
  return params
}

// Is anything narrowing the list (the page aside)? Decides between "No
// users yet." and "No users match these filters."
export function hasUserFilters(filters: UserListFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.role !== null ||
    filters.clinic !== null ||
    filters.status !== 'active' ||
    filters.attention !== null
  )
}

// Any change of filter starts again on page 1: page 4 of the old results
// may not exist in the new ones.
export function withFilter(
  filters: UserListFilters,
  change: Partial<Omit<UserListFilters, 'page'>>,
): UserListFilters {
  return { ...filters, ...change, page: 1 }
}