import { io } from 'socket.io-client'
import { API_BASE_URL } from '@/api/client'
import type { ServerEvents, SocketAnswer } from './types'

// The ONE file that knows socket.io-client exists. The rest of the app talks
// to this small interface — an ADAPTER: a narrow shape of our own around a
// library's wide one. Two payoffs:
//   - tests hand the provider a fake that implements these four methods (a
//     real Socket.IO client would need a real server);
//   - the events are TYPED: `onServerEvent('newMessage', …)` receives a
//     Message, and a misspelled event name is a compile error.
export interface MessagingSocket {
  onServerEvent<E extends keyof ServerEvents>(event: E, listener: (payload: ServerEvents[E]) => void): void
  // true on every (re)connection, false on every disconnection.
  onConnectionChange(listener: (connected: boolean) => void): void
  // An event with an acknowledgement: resolves with the server's answer,
  // REJECTS when no answer comes within SEND_TIMEOUT_MS (offline, server
  // down) — the screen then keeps the text and says so.
  send<T>(event: ClientEvent, data: object): Promise<SocketAnswer<T>>
  close(): void
}

export type ClientEvent = 'sendMessage' | 'deleteMessage'

// Long enough for a slow phone network, short enough that a lost answer
// doesn't leave "Sending…" up for ever.
export const SEND_TIMEOUT_MS = 10_000

export function createMessagingSocket(): MessagingSocket {
  const socket = io(API_BASE_URL, {
    // Send the session cookie with the handshake, cross-origin (the API is
    // on another port in development, another host in production) — the
    // socket's `credentials: 'include'`. The backend authenticates the
    // connection from that cookie (SessionIoAdapter).
    withCredentials: true,
    // WebSocket from the start, no HTTP long-polling first: one connection,
    // and no need for "sticky sessions" on a load balancer (polling sends
    // several HTTP requests that must reach the same server). Every browser
    // Stride supports has WebSocket; the deployed chain (Cloudflare → Caddy
    // → Node) was checked with this transport.
    transports: ['websocket'],
  })
  return {
    // Socket.IO types listeners against ITS event map (untyped here), so ours
    // goes through the plain `(...args) => void` shape it accepts; the types
    // that matter are the interface's, which every caller sees.
    onServerEvent: (event, listener) => {
      // Widened to a plain string on purpose: with OUR literal type
      // ('newMessage' | …), Socket.IO's typings look the name up in its
      // own (empty) event map and reject the listener.
      const name: string = event
      socket.on(name, listener as (...args: unknown[]) => void)
    },
    onConnectionChange: (listener) => {
      socket.on('connect', () => listener(true))
      socket.on('disconnect', () => listener(false))
    },
    send: <T>(event: ClientEvent, data: object) =>
      socket.timeout(SEND_TIMEOUT_MS).emitWithAck(event, data) as Promise<SocketAnswer<T>>,
    close: () => {
      socket.disconnect()
    },
  }
}