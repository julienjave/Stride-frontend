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

import { beforeEach, describe, expect, it, vi } from 'vitest'

// test-setup.ts replaces this module with an inert socket for every other
// test; THIS file is about the real one, so it asks for it back...
vi.unmock('@/messages/messagingSocket')

// ...and replaces the LIBRARY under it instead: `io()` returns a fake
// Socket.IO client that records what the adapter does with it. vi.hoisted:
// the fake must exist before the hoisted vi.mock factory runs. The adapter
// loads the library with a DYNAMIC import (decisions §45); vi.mock replaces
// it there too — a mocked module is mocked however it is imported.
const fake = vi.hoisted(() => {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>()
  const emitWithAck = vi.fn()
  return {
    handlers,
    emitWithAck,
    io: vi.fn(),
    timeout: vi.fn(() => ({ emitWithAck })),
    disconnect: vi.fn(),
    fire(event: string, ...args: unknown[]) {
      for (const handler of handlers.get(event) ?? []) handler(...args)
    },
  }
})

vi.mock('socket.io-client', () => ({
  io: fake.io,
}))

import { API_BASE_URL } from '@/api/client'
import { createMessagingSocket, SEND_TIMEOUT_MS } from './messagingSocket'
import { message } from './testData'

// Waits until the library has "arrived": every dynamic import Vitest is
// resolving has settled, then one macrotask, so every `.then` chained on it
// (the listeners being attached) has run. A real browser has the same
// order: the file arrives, then the callbacks run, then — later, as their
// own tasks — network events.
async function libraryLoaded() {
  await vi.dynamicImportSettled()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  fake.handlers.clear()
  fake.io.mockReset()
  fake.io.mockReturnValue({
    on: (event: string, handler: (...args: unknown[]) => void) => {
      fake.handlers.set(event, [...(fake.handlers.get(event) ?? []), handler])
    },
    timeout: fake.timeout,
    disconnect: fake.disconnect,
  })
  fake.emitWithAck.mockReset()
  fake.timeout.mockClear()
  fake.disconnect.mockClear()
})

describe('createMessagingSocket', () => {
  it('connects to the API with the session cookie, over WebSocket only, once the library has loaded', async () => {
    createMessagingSocket()
    // Synchronous so far: the interface is handed back before the library
    // exists — no connection yet.
    expect(fake.io).not.toHaveBeenCalled()
    await libraryLoaded()
    expect(fake.io).toHaveBeenCalledTimes(1)
    expect(fake.io).toHaveBeenCalledWith(API_BASE_URL, { withCredentials: true, transports: ['websocket'] })
  })

  it('passes server events to a listener registered before the library arrived', async () => {
    const socket = createMessagingSocket()
    const listener = vi.fn()
    socket.onServerEvent('newMessage', listener)
    await libraryLoaded()
    fake.fire('newMessage', message(1))
    expect(listener).toHaveBeenCalledWith(message(1))
  })

  it('passes server events to a listener registered after it arrived', async () => {
    const socket = createMessagingSocket()
    await libraryLoaded()
    const listener = vi.fn()
    socket.onServerEvent('newMessage', listener)
    await libraryLoaded()
    fake.fire('newMessage', message(1))
    expect(listener).toHaveBeenCalledWith(message(1))
  })

  // The provider registers its connection listener first, then the events:
  // they must reach Socket.IO in that order.
  it('attaches the listeners in the order they were registered', async () => {
    const socket = createMessagingSocket()
    socket.onConnectionChange(() => {})
    socket.onServerEvent('newMessage', () => {})
    socket.onServerEvent('messageDeleted', () => {})
    await libraryLoaded()
    expect([...fake.handlers.keys()]).toEqual(['connect', 'disconnect', 'newMessage', 'messageDeleted'])
  })

  it('reports connecting and disconnecting', async () => {
    const socket = createMessagingSocket()
    const listener = vi.fn()
    socket.onConnectionChange(listener)
    await libraryLoaded()
    fake.fire('connect')
    fake.fire('disconnect', 'transport close')
    expect(listener.mock.calls).toEqual([[true], [false]])
  })

  it('sends with an acknowledgement and a time limit, and resolves with the answer', async () => {
    fake.emitWithAck.mockResolvedValue({ ok: true, data: message(1) })
    const socket = createMessagingSocket()
    // Sent before the library has arrived: it waits for it.
    const answer = await socket.send('sendMessage', { conversationId: 12, messageBody: 'Hi' })
    expect(fake.timeout).toHaveBeenCalledWith(SEND_TIMEOUT_MS)
    expect(fake.emitWithAck).toHaveBeenCalledWith('sendMessage', { conversationId: 12, messageBody: 'Hi' })
    expect(answer).toEqual({ ok: true, data: message(1) })
  })

  it('rejects when no answer comes in time', async () => {
    fake.emitWithAck.mockRejectedValue(new Error('operation has timed out'))
    await expect(createMessagingSocket().send('sendMessage', {})).rejects.toThrow('timed out')
  })

  it('disconnects on close', async () => {
    const socket = createMessagingSocket()
    await libraryLoaded()
    socket.close()
    await libraryLoaded()
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
  })

  // A sign-out or a role switch while the file is still downloading: the
  // provider's clean-up closes a socket that doesn't exist yet. No
  // connection may open after that — it would carry the old identity.
  it('never connects when closed before the library arrived', async () => {
    const socket = createMessagingSocket()
    const listener = vi.fn()
    socket.onConnectionChange(listener)
    socket.close()
    await libraryLoaded()
    expect(fake.io).not.toHaveBeenCalled()
    expect(fake.disconnect).not.toHaveBeenCalled()
    await expect(socket.send('sendMessage', {})).rejects.toThrow('Not connected')
  })
})

// The library's file can't be downloaded (offline; an old file name after a
// deploy — staleChunkReload.ts reloads the page then). Its own module graph:
// vi.resetModules() forgets the modules loaded so far, and vi.doMock (not
// hoisted) makes the NEXT import of the library fail, as a missing file does.
describe('createMessagingSocket, when the library cannot be downloaded', () => {
  it('stays quietly unconnected: no listener fires, a send is refused, nothing is thrown', async () => {
    vi.resetModules()
    vi.doMock('socket.io-client', () => {
      throw new TypeError('Failed to fetch dynamically imported module')
    })
    const { createMessagingSocket: createWithMissingFile } = await import('./messagingSocket')

    const socket = createWithMissingFile()
    const listener = vi.fn()
    socket.onConnectionChange(listener)
    socket.onServerEvent('newMessage', listener)
    await libraryLoaded()

    expect(listener).not.toHaveBeenCalled()
    await expect(socket.send('sendMessage', {})).rejects.toThrow('Not connected')
    // Closing what never opened is harmless.
    expect(() => socket.close()).not.toThrow()
    vi.doUnmock('socket.io-client')
  })
})

// Why the adapter exists in this shape: the library must stay OUT of the
// main file. One static `import … from 'socket.io-client'` anywhere in the
// application would put it back (a module imported statically is part of
// the first download), and nothing on screen would say so. Type-only
// imports are erased by the compiler, so they are allowed.
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('socket.io-client stays out of the first download', () => {
  it('is imported by value only dynamically, in messagingSocket.ts', () => {
    const staticImporters = Object.entries(sources)
      .filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
      .filter(([, text]) => /^\s*import\s+(?!type\b)[^'"]*from\s+['"]socket\.io-client['"]/m.test(text))
      .map(([path]) => path)
    expect(staticImporters).toEqual([])
    expect(sources['/src/messages/messagingSocket.ts']).toContain("import('socket.io-client')")
  })
})