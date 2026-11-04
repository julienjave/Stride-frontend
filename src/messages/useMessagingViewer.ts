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