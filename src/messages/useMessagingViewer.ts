import { useCurrentUser } from '@/auth/useCurrentUser'
import { isMessagingRole, type MessagingRole } from './messagesPath'

// Who is looking at the Messages pages: my id (to tell my messages from
// theirs) and my role (to build links under my own prefix). The pages sit
// under RequireRole and AuthenticatedLayout, so a user with a messaging role
// is always there; `null` only covers the defensive case, and the pages then
// render nothing rather than guess.
export function useMessagingViewer(): { myId: number; role: MessagingRole } | null {
  const { data: user } = useCurrentUser()
  if (!user || !isMessagingRole(user.activeRole)) return null
  return { myId: user.id, role: user.activeRole }
}