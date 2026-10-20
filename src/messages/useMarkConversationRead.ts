import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markConversationRead } from './api'
import { applyRead } from './messageCache'

// Marks a thread read while the person is LOOKING at it: whenever the
// thread holds a message from the other person that isn't read yet, and the
// tab is visible. An incoming message in an open, visible thread is read at
// once (the unread badge never flickers up for it); in a hidden tab it waits
// until the tab is shown again.
//
// `newestUnreadId` is the newest such message, or null (newestUnreadFrom,
// messageRules.ts). The request is sent
// at most once per value: if the server answers "nothing new" (someone read
// it in another tab a moment ago, and this cache hasn't heard yet), the same
// id won't trigger it again — no request loop. The receipt then updates the
// cache like the conversationRead event does.
export function useMarkConversationRead(
  conversationId: number,
  myId: number,
  newestUnreadId: number | null,
) {
  const queryClient = useQueryClient()
  const lastAsked = useRef<number | null>(null)
  const { mutate } = useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: (receipt) => {
      if (receipt.readAt === null) return
      applyRead(
        queryClient,
        { conversationId, readerId: myId, readAt: receipt.readAt, messageIds: receipt.messageIds },
        myId,
      )
    },
  })

  useEffect(() => {
    function markIfVisible() {
      if (newestUnreadId === null || document.visibilityState !== 'visible') return
      if (lastAsked.current !== null && lastAsked.current >= newestUnreadId) return
      lastAsked.current = newestUnreadId
      mutate()
    }
    markIfVisible()
    document.addEventListener('visibilitychange', markIfVisible)
    return () => document.removeEventListener('visibilitychange', markIfVisible)
  }, [newestUnreadId, mutate])
}