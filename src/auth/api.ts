import { apiRequest } from '@/api/client'
import type { CurrentUser } from './types'

export function fetchCurrentUser() {
  return apiRequest<CurrentUser>('/auth/me')
}