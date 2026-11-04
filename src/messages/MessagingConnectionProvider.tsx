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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CONVERSATIONS_PREFIX } from './api'
import { applyArchived, applyDeletedMessage, applyNewMessage, applyRead } from './messageCache'
import { MessagingConnectionContext, type MessagingConnection } from './messagingConnection'
import { createMessagingSocket, type ClientEvent, type MessagingSocket } from './messagingSocket'

interface MessagingConnectionProviderProps {
  // Whose connection this is — the cache updates need it ("is this message
  // mine?"). AuthenticatedLayout mounts the provider with a `key` of user id
  // AND role, so a role switch unmounts it (the old socket closes) and
  // mounts a fresh one for the new role.
  userId: number
  // How to open the socket. The app uses the real one; tests pass a
  // FakeSocket (testSocket.ts). Read ONCE, at mount: a test writing
  // `createSocket={() => fake}` inline creates a new function every render,
  // and an effect depending on it would reconnect every render.
  createSocket?: () => MessagingSocket
  children: ReactNode
}

// ONE live connection per signed-in practitioner or patient, for the whole
// tab — the list, the badge, the home slot and an open thread all share it.
// It lives in a React provider (decided 2026-10-20) so its life follows the
// tree: opened when the authenticated layout mounts, closed when it
// unmounts (logout), replaced on a role switch (the key) — no module-level
// socket to open and close by hand.
//
// It opens only once /auth/me has answered with a user — the roadmap's rule
// ("established only after /auth/me confirms a session") — because
// AuthenticatedLayout renders it only when it HAS a user. A socket opened
// before that would be refused at the handshake anyway.
export function MessagingConnectionProvider({
  userId,
  createSocket = createMessagingSocket,
  children,
}: MessagingConnectionProviderProps) {
  const queryClient = useQueryClient()
  const createSocketRef = useRef(createSocket)
  const socketRef = useRef<MessagingSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = createSocketRef.current()
    socketRef.current = socket

    socket.onConnectionChange((isConnected) => {
      setConnected(isConnected)
      // On EVERY connection — the first one too — whatever is cached about
      // messaging is marked stale, and what's on screen is fetched again.
      // Events sent while this tab wasn't connected (a network drop, the
      // laptop asleep, the moments between the page's first requests and
      // the socket's handshake) are never replayed: the server doesn't
      // queue them. The REST answers are the truth; the socket only keeps
      // them fresh between two fetches.
      if (isConnected) void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_PREFIX })
    })
    socket.onServerEvent('newMessage', (message) => applyNewMessage(queryClient, message, userId))
    socket.onServerEvent('messageDeleted', (message) => applyDeletedMessage(queryClient, message))
    socket.onServerEvent('conversationRead', (event) => applyRead(queryClient, event, userId))
    socket.onServerEvent('conversationArchived', (event) => applyArchived(queryClient, event))

    // React runs this when the provider unmounts (logout, role switch) —
    // and, in development's StrictMode, once right after the first mount
    // (mount → cleanup → mount, to surface effects that don't clean up):
    // the first socket is closed and a second one opened. Harmless, and the
    // reason the cleanup must really close it.
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [queryClient, userId])

  // Stable for the provider's life (no dependencies): it reads the socket
  // from the ref at call time, so it never holds a closed one.
  const send = useCallback(<T,>(event: ClientEvent, data: object) => {
    const socket = socketRef.current
    return socket ? socket.send<T>(event, data) : Promise.reject(new Error('Not connected'))
  }, [])

  // A new value only when `connected` changes — every consumer re-renders
  // when the context value's identity changes.
  const value = useMemo<MessagingConnection>(() => ({ connected, send }), [connected, send])

  return <MessagingConnectionContext.Provider value={value}>{children}</MessagingConnectionContext.Provider>
}