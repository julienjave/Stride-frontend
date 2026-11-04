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

import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { conversationsQueryKey } from './api'
import { useMessagingConnection } from './messagingConnection'
import { MessagingConnectionProvider } from './MessagingConnectionProvider'
import { FakeSocket } from './testSocket'

// Shows what a consumer sees.
function Status() {
  const { connected } = useMessagingConnection()
  return <p>{connected ? 'online' : 'offline'}</p>
}

function setup(userId = 3) {
  const queryClient = new QueryClient()
  const sockets: FakeSocket[] = []
  const createSocket = vi.fn(() => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket
  })
  const ui = (id: number) => (
    <QueryClientProvider client={queryClient}>
      <MessagingConnectionProvider userId={id} createSocket={createSocket}>
        <Status />
      </MessagingConnectionProvider>
    </QueryClientProvider>
  )
  const view = render(ui(userId))
  return { ...view, queryClient, sockets, createSocket, rerenderAs: (id: number) => view.rerender(ui(id)) }
}

describe('MessagingConnectionProvider', () => {
  it('opens one socket, and closes it when it goes away (logout)', () => {
    const { sockets, unmount } = setup()
    expect(sockets).toHaveLength(1)
    // Re-renders don't reconnect.
    expect(sockets[0].closed).toBe(false)
    unmount()
    expect(sockets[0].closed).toBe(true)
  })

  it('tells its consumers whether it is connected', () => {
    const { sockets } = setup()
    expect(screen.getByText('offline')).toBeInTheDocument()
    sockets[0].setConnected(true)
    expect(screen.getByText('online')).toBeInTheDocument()
    sockets[0].setConnected(false)
    expect(screen.getByText('offline')).toBeInTheDocument()
  })

  it('marks everything about messaging stale on every connection — what was missed is fetched again', () => {
    const { sockets, queryClient } = setup()
    queryClient.setQueryData(conversationsQueryKey, [])
    queryClient.setQueryData(['users'], [])
    sockets[0].setConnected(true)
    expect(queryClient.getQueryState(conversationsQueryKey)?.isInvalidated).toBe(true)
    // Nothing else.
    expect(queryClient.getQueryState(['users'])?.isInvalidated).toBe(false)
  })

  it('opens a new socket for another user, closing the old one', () => {
    const { sockets, rerenderAs } = setup(3)
    rerenderAs(6)
    expect(sockets).toHaveLength(2)
    expect(sockets[0].closed).toBe(true)
    expect(sockets[1].closed).toBe(false)
  })

  it('sends through the socket', async () => {
    const socket = new FakeSocket()
    // renderHook: runs the hook inside a test component and hands back
    // what it returned, here wrapped in the provider.
    const { result } = renderHook(() => useMessagingConnection(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          <MessagingConnectionProvider userId={3} createSocket={() => socket}>
            {children}
          </MessagingConnectionProvider>
        </QueryClientProvider>
      ),
    })
    const answer = result.current.send('sendMessage', { conversationId: 12, messageBody: 'Hi' })
    expect(socket.sent.map((s) => [s.event, s.data])).toEqual([
      ['sendMessage', { conversationId: 12, messageBody: 'Hi' }],
    ])
    await socket.answerLast({ ok: true, data: null })
    await expect(answer).resolves.toEqual({ ok: true, data: null })
  })

  it('cannot be used outside the provider — a programming error, said plainly', () => {
    // React logs the thrown error too; silenced for this test only.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useMessagingConnection())).toThrow(
      'useMessagingConnection must be used inside MessagingConnectionProvider',
    )
    consoleError.mockRestore()
  })
})