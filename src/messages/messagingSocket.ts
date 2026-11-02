import type { Socket } from 'socket.io-client'
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

// Socket.IO is loaded ON DEMAND (decisions §45): `import('socket.io-client')`
// — a DYNAMIC import — is a promise for the module, and the bundler gives
// the module (and everything only it imports: engine.io, the parsers) a file
// of its own, fetched when this line RUNS. So the library is no longer in
// the main file: the sign-in page and an admin's pages never download it,
// and a practitioner or patient fetches it once, as the authenticated
// layout mounts the provider.
//
// The function stays SYNCHRONOUS — it hands back the interface at once,
// before the library has arrived — so nothing outside this file knows the
// load is asynchronous: the provider, its FakeSocket tests and every screen
// are unchanged. Each method waits on the same promise (`ready`) instead:
//   - listeners registered meanwhile are attached when it resolves, in the
//     order they were registered (a promise runs its `.then` callbacks in
//     that order), all in the same moment `io()` is called — before any
//     network event can arrive, since those come later as separate tasks;
//   - `close()` before it arrives: the flag is seen when it does, and no
//     connection is ever opened (a role switch or a sign-out while the file
//     downloads);
//   - the file can't be downloaded (offline, or yesterday's file name after
//     a deploy — Vite's `vite:preloadError` then reloads the page,
//     staleChunkReload.ts): `ready` becomes null, no listener ever fires, the
//     screens keep saying "Connecting…", and a send is refused at once, as
//     the provider does without a socket. Nothing is thrown: a missing file
//     is not a bug of this page (reportRules.ts).
export function createMessagingSocket(): MessagingSocket {
  let closed = false
  const ready: Promise<Socket | null> = import('socket.io-client').then(
    ({ io }) =>
      closed
        ? null
        : io(API_BASE_URL, {
            // Send the session cookie with the handshake, cross-origin (the
            // API is on another port in development, another host in
            // production) — the socket's `credentials: 'include'`. The
            // backend authenticates the connection from that cookie
            // (SessionIoAdapter).
            withCredentials: true,
            // WebSocket from the start, no HTTP long-polling first: one
            // connection, and no need for "sticky sessions" on a load
            // balancer (polling sends several HTTP requests that must reach
            // the same server). Every browser Stride supports has WebSocket;
            // the deployed chain (Cloudflare → Caddy → Node) was checked with
            // this transport.
            transports: ['websocket'],
          }),
    () => null,
  )
  // Runs `use` with the socket once it exists — never, if it never will.
  const withSocket = (use: (socket: Socket) => void) => {
    void ready.then((socket) => {
      if (socket) use(socket)
    })
  }
  return {
    // Socket.IO types listeners against ITS event map (untyped here), so ours
    // goes through the plain `(...args) => void` shape it accepts; the types
    // that matter are the interface's, which every caller sees.
    onServerEvent: (event, listener) => {
      // Widened to a plain string on purpose: with OUR literal type
      // ('newMessage' | …), Socket.IO's typings look the name up in its
      // own (empty) event map and reject the listener.
      const name: string = event
      withSocket((socket) => socket.on(name, listener as (...args: unknown[]) => void))
    },
    onConnectionChange: (listener) => {
      withSocket((socket) => {
        socket.on('connect', () => listener(true))
        socket.on('disconnect', () => listener(false))
      })
    },
    // The callback's return type is written out: without it, TypeScript
    // infers `.then`'s result from the two branches separately and can't
    // match the rejected branch to this `T`.
    send: <T>(event: ClientEvent, data: object) =>
      ready.then(
        (socket): Promise<SocketAnswer<T>> =>
          socket
            ? (socket.timeout(SEND_TIMEOUT_MS).emitWithAck(event, data) as Promise<SocketAnswer<T>>)
            : Promise.reject(new Error('Not connected')),
      ),
    close: () => {
      closed = true
      withSocket((socket) => socket.disconnect())
    },
  }
}