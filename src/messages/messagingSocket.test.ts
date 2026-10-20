import { beforeEach, describe, expect, it, vi } from 'vitest'

// test-setup.ts replaces this module with an inert socket for every other
// test; THIS file is about the real one, so it asks for it back...
vi.unmock('@/messages/messagingSocket')

// ...and replaces the LIBRARY under it instead: `io()` returns a fake
// Socket.IO client that records what the adapter does with it. vi.hoisted:
// the fake must exist before the hoisted vi.mock factory runs.
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
  it('connects to the API with the session cookie, over WebSocket only', () => {
    createMessagingSocket()
    expect(fake.io).toHaveBeenCalledWith(API_BASE_URL, { withCredentials: true, transports: ['websocket'] })
  })

  it('passes server events to their listener', () => {
    const socket = createMessagingSocket()
    const listener = vi.fn()
    socket.onServerEvent('newMessage', listener)
    fake.fire('newMessage', message(1))
    expect(listener).toHaveBeenCalledWith(message(1))
  })

  it('reports connecting and disconnecting', () => {
    const socket = createMessagingSocket()
    const listener = vi.fn()
    socket.onConnectionChange(listener)
    fake.fire('connect')
    fake.fire('disconnect', 'transport close')
    expect(listener.mock.calls).toEqual([[true], [false]])
  })

  it('sends with an acknowledgement and a time limit, and resolves with the answer', async () => {
    fake.emitWithAck.mockResolvedValue({ ok: true, data: message(1) })
    const socket = createMessagingSocket()
    const answer = await socket.send('sendMessage', { conversationId: 12, messageBody: 'Hi' })
    expect(fake.timeout).toHaveBeenCalledWith(SEND_TIMEOUT_MS)
    expect(fake.emitWithAck).toHaveBeenCalledWith('sendMessage', { conversationId: 12, messageBody: 'Hi' })
    expect(answer).toEqual({ ok: true, data: message(1) })
  })

  it('rejects when no answer comes in time', async () => {
    fake.emitWithAck.mockRejectedValue(new Error('operation has timed out'))
    await expect(createMessagingSocket().send('sendMessage', {})).rejects.toThrow('timed out')
  })

  it('disconnects on close', () => {
    createMessagingSocket().close()
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
  })
})