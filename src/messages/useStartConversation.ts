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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { conversationQueryKey, startConversation } from './api'
import { conversationPath, type MessagingRole } from './messagesPath'

// "Message" (a profile, the patient page) and New message: start the
// conversation — or get the existing one, the backend's "start or get" —
// then open it. The answer is the conversation's summary: cached under its
// key so the thread's header shows at once, without asking again.
export function useStartConversation(role: MessagingRole) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: startConversation,
    onSuccess: (summary) => {
      queryClient.setQueryData(conversationQueryKey(summary.id), summary)
      void navigate(conversationPath(role, summary.id))
    },
  })
}