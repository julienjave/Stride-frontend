import { apiRequest } from '@/api/client'
import type { ExercisesPage } from './types'

// --- QUERY KEYS --------------------------------------------------------

export interface FetchExercisesParams {
  page?: number
  search?: string
  mine?: boolean
}

// 'exercises-list' as its own top-level key, distinct from a future
// exerciseQueryKey(id) that would live under ['exercises', id] — the
// same reasoning clinicsListQueryKey/usersListQueryKey already
// established: invalidating every cached LIST variant after a
// create/update needs a prefix match that must NOT also sweep up
// individual detail-view cache entries sharing the same top-level key.
//
// Every parameter that affects the RESULT is part of the key — page,
// search, and mine all change what comes back, so all three have to be
// in here. Without this, switching "own only" on and off would just
// read whichever mode was cached first.
export function exercisesListQueryKey(params: FetchExercisesParams) {
  return [
    'exercises-list',
    params.page ?? 1,
    params.search ?? '',
    params.mine ?? false,
  ] as const
}

// --- QUERIES -----------------------------------------------------------

export function fetchExercises(params: FetchExercisesParams = {}) {
  // URLSearchParams over manual string concatenation — this is the
  // first query with more than one optional parameter in this codebase
  // (fetchClinics' includeInactive is the only precedent, and that's a
  // single ternary). URLSearchParams handles encoding correctly (a
  // search term with a space or an ampersand in it, say) and scales
  // cleanly as more params potentially get added later, where manual
  // string-building would only get more error-prone with each one.
  const query = new URLSearchParams()
  if (params.page && params.page !== 1) {
    query.set('page', String(params.page))
  }
  if (params.search) {
    query.set('search', params.search)
  }
  if (params.mine) {
    query.set('mine', 'true')
  }

  const queryString = query.toString()
  return apiRequest<ExercisesPage>(
    `/exercises${queryString ? `?${queryString}` : ''}`,
  )
}