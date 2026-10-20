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