# Phase 5: messaging, shown once it is stored

This entry covers Phase 5 (2026-10-19 → 2026-10-20): the Messages tab for
practitioners and patients — the conversation list, a thread, live sending
and receiving, read receipts, deleting within 15 minutes, archiving — and the
unread counts on the home and the tab bar. The screens were proposed first;
the person chose `socket.io-client`, a read-only history once a care-team link
ends, no message content for admins, a provider for the connection, sending
that waits for the server, and two panes on a desktop.

Condensed to four stories; [`PROJECT.md`](../PROJECT.md) has the rest. The
backend's side — nine gaps closed before any screen, the database deciding
"read-only" — is the backend journal's [entry 38](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/38-messaging-brought-up-to-standard.md).

## One connection, shaped like the app

A live connection has a life: it must open only once someone is signed in,
close on sign-out, and never carry two identities. Opening and closing a
module-level socket by hand from the sign-in and sign-out code was rejected.
The connection lives in a React provider instead,
`MessagingConnectionProvider`, which opens the socket in an effect and closes
it in the effect's clean-up. Its life is then the component's:

- the layout renders it only once `/auth/me` has answered with a user, so a
  socket never opens for a visitor;
- sign-out unmounts it, and the clean-up closes the socket;
- it is rendered with `key={userId:role}`. A role switch changes the key, so
  React unmounts the old provider (closing its socket) and mounts a new one.
  One socket never carries two roles; the backend also closes the old
  session's sockets on its side.

Admins get no provider at all. Consumers read `{ connected, send }` from a
context whose value is memoised on `connected`, so they re-render only when
the connection's state changes.

The library itself is behind an adapter, `messagingSocket.ts`, the only file
that imports it. The rest of the app sees four methods of its own —
`onServerEvent` (typed by the server's event names, so a misspelt event is a
compile error), `onConnectionChange`, `send` (an acknowledgement as a promise,
rejected after 10 seconds) and `close`. The payoff is in the tests: a
`FakeSocket` implementing four methods replaces a real server, and the ~170
test files that render the layout get a socket that never connects, set once
in `test-setup.ts`, instead of trying to reach `localhost:3000`.

## The cache is the only source of truth

Every screen reads TanStack Query; the socket only writes into it. Pure
functions in `messageCache.ts` return new data (a thread with a new message,
a list with a conversation read), and small appliers call `setQueryData` with
them. The screens don't know whether an update came from REST or the socket.

Two details decide whether that stays true:

- **The sender's own message arrives twice**: the acknowledgement, and the
  `newMessage` event every participant's tabs receive. The thread replaces a
  message it already holds by id, and a conversation's summary changes only
  for an id newer than its last message, so it is counted once in whichever
  order the two come.
- **REST stays the truth.** The server doesn't replay events a tab missed
  while it slept or was offline. So on *every* connection, the first one
  included, everything under `['conversations']` is marked stale and fetched
  again. A message for a conversation the list doesn't hold refetches the
  list, rather than inventing a row without the other person's name and
  photo.

A thread is an infinite query read backwards: page 0 is the newest, and the
"next" page is the older one, by the oldest loaded id (`?before=`). Loading
older messages above the ones on screen would make the view jump, so the
scroll position is moved down by exactly the height added, in a
`useLayoutEffect`, which runs after the DOM update and before the paint: the
jump is never seen. jsdom has no layout, so that one was checked live.

## Waiting for the server, on purpose

Sending could have been optimistic: a bubble at once, the request after. The
person chose to wait for the acknowledgement. The text stays in the box,
read-only, under "Sending…"; the box empties only once the server has stored
the message; a refusal shows the server's own reason and keeps the text. An
optimistic bubble was deferred: it needs a "failed, retry" state of its own
for every message, and it stays on the list of Phase 7's deferred items.

The box is read-only rather than disabled while sending: a disabled field
drops the keyboard focus. A `403` turns the page read-only, by refetching the
conversation's header, instead of offering a box that would refuse again —
the case of a practitioner who has left the patient's care team, whose
history stays readable and closed to new messages.

## A timer that waited 1 millisecond

Pass 2 added the delete window: a trash icon on my unread messages for 15
minutes, gone at the exact moment. A ticking interval re-rendering every
bubble every second was rejected for a change that happens once. Each
deletable message gets one timer set to its deadline (`useBeforeDeadline`),
and "now" is never read during a render — at mount through a `useState`
initialiser, then in the effect, so a message loaded already past its window
never shows the button, not even for a frame.

The tests found the bug. Their fixtures are dated 2031, so their deadlines
were years away, and the button vanished one millisecond after it appeared.
Browsers and Node store a `setTimeout` delay in a signed 32-bit integer;
anything above 2³¹ − 1 ms (about 24.8 days) becomes 1 ms. In real use, the
same bug would hit a device whose clock runs weeks behind the server's. The
hook now waits in pieces of at most that limit, and each wake-up asks the
clock whether the deadline has passed. Never hand a timer a delay you didn't
bound.

The countdown runs on the device's clock against the server's `sentAt`, so it
is only an estimate: a device a minute fast hides the button a minute early;
a minute slow, offers it a minute too long. The server judges: its `409` is
shown in its own words in the dialog, and the thread is fetched again, so the
screen learns what the server knew. The dialog itself outlives its button —
a confirmation must never vanish under the finger because the window closed
while it was open — and when the button is gone, focus goes to the message's
bubble instead of falling to the top of the page.

"Seen" follows a rule of the same kind. One label, under my newest message,
only while it is the newest one still standing: the backend marks everything
read at once, so "my newest is read" says all of mine are, and once the other
person replies, the reply is the receipt. Deleted messages are skipped, or
deleting a typo would hide the receipt of the message before it — seen live
as "Seen" above "Message deleted".

## Current status

Phase 5 was complete on 2026-10-20, confirmed by the person in two live
windows. A clean-up followed the same day: the unused OpenAPI generator
removed (no more `--legacy-peer-deps`), two packages moved to
`devDependencies`, `npm audit --omit=dev` at 0. The messaging code is
`src/messages/`, described in ARCHITECTURE's
[§7](../ARCHITECTURE.md#7-real-time-messaging).
