# Phase 7: error reports that name no patient, a browser suite, a timer, and the bundle

This entry covers Phase 7 (2026-10-30 → 2026-11-03), the nice-to-have backlog
taken in the order recommended to the person: exercise thumbnails, error
tracking, snackbars, a browser suite built from each phase's demo target, one
larger feature (the session timer, then practitioner-measured range of
motion), CI, a design pass (palette, logo, font), the bundle, and a demo mode
for reviewers. Optimistic message sending, cross-clinic admin dashboards and
a React Native client were deferred.

Condensed to four stories; [`PROJECT.md`](../PROJECT.md) has the rest. The
backend's side — request ids, allow-list logs and reports, branded emails,
demo mode, CI — is the backend journal's entry 41 (TODO-LINK).

## Error reports that name no patient, and a reference that led nowhere

The rule, decided with the person: nothing that leaves the browser or the
server names or locates a patient. Reports go to a self-hosted GlitchTip
through the official Sentry SDKs. On the frontend that meant two locks:

- **What is collected.** Every `dataCollection` option off, the default
  integrations off, no breadcrumbs, no replay, no tracing. The report is then
  rebuilt from an allow-list — the error's type, its message with email
  addresses removed, its stack, three tags — rather than "the SDK's event minus
  a few keys", which an SDK upgrade could widen.
- **Where it goes.** To our own API (`POST /monitoring`, the SDK's `tunnel`),
  which rebuilds the report again from its own allow-list, puts in the
  session's user id (a page could claim any), and passes it on. The browser's
  copy of the rule keeps the data in the page; the server's copy is the one
  that can't be bypassed.

The SDK (~90 kB) loads after the page, from a file of its own. Our own
`error` and `unhandledrejection` listeners are installed on `main.tsx`'s
first line and wait on one promise for the SDK, so an error in the first
second is reported a moment later rather than lost, and the route is read
when the error *happens*, not when the SDK arrives. Only real bugs report: a
crash, an uncaught error. A server's answer (the server reports its own
5xx), a lost network or a page file missing after a deploy are not the page's
bugs.

The live check found the bug in it. A failing request is retried twice by the
app, so the server saw three requests and made three reports, and the screen
showed the *last* one's reference — "Something went wrong on our side. …
Reference: 2dc325cf." Searching GlitchTip for it found nothing. The SDK's
Dedupe integration drops an event equal to the one before it (same type,
message and stack), and three requests failing the same way *are* equal:
it kept the first. The unit tests reported one failure each and could never
show it. Dedupe is off on both sides now; GlitchTip groups the three events
into one issue by its own fingerprint, so they cost nothing.

The pass also fixed a sentence that blamed the wrong side. When the backend is
down, a proxy answers with an HTML page; `response.json()` threw a
`SyntaxError`, which isn't an `ApiError`, so the screen said "check your
connection" for a failure that was the server's. The client now reads the
body as text and keeps it only if it has the backend's shape.

## A browser suite, and the bug it found on its first run

The person chose a small Playwright suite: one test per group of demo
targets, its own database seeded fresh every run, Chromium only. `npm run
test:e2e` starts a second backend on port 3100 and the production build on
4174, signs the test accounts in once through the API and saves their cookies,
then runs the tests one at a time. A cookie set by `localhost:3100` is sent
by a page on `localhost:4174` because cookies are scoped by host, not port,
and `SameSite=Lax` allows it because the two are the same *site*.

Tests find elements by role and name, the way a screen reader does, and
assertions retry until true or ten seconds pass — no fixed waits, the
commonest cause of flaky browser tests. What a screen can't wait for, the test
prepares through the API, so a test of "today's session" is the same on a
Saturday.

The first full run failed on the role switch. After "Admin" in the account
menu, the switch answered 201 and the address became `/admin`, but the screen
kept the practitioner's navigation and the menu stayed open, frozen. Building
variants narrowed it to one line from the snackbars' pass two days earlier:
`key={identity}` on `<Snackbars>`, meant to empty the list on a new identity,
remounted Radix's toast provider in the same update while the account menu —
a modal Radix layer — was open. jsdom never showed it: no layout, no real
timing, and the unit test only checked the store. An effect now empties the
list (`useEffect(() => clearSnackbars, [identity])`: a clean-up runs before
the effect runs again, and on unmount). Putting the key back fails the role
switch test, and four other bugs put back on purpose each failed theirs.

One trap is worth keeping: inside a test, `browser.newContext()` inherits the
file's saved cookies. The "new visitor" opening an invitation link was the
admin again, until it was given an empty `storageState`.

## A timer whose time is calculated, never counted down

The session timer counts a hold down for an exercise with a prescribed
duration (one hold per set, "Start set 2" between sets) and runs a stopwatch
for one without; nothing it measures is recorded. A countdown that subtracts
a second every tick drifts: browsers throttle timers in background tabs, and
every late tick is time lost for good. So the state stores *when* a hold
started (and how long it ran before a pause), and the time left is computed
from `performance.now()` at each look — a monotonic clock that never jumps
when the phone corrects its time. The ticks only redraw. A page hidden through
set 2 showed "Start set 3" the moment it was shown again.

The rules are pure functions with time passed in (`pressMain(state, now)`,
`remainingMs(state, plan, now)`), so a test says "6.5 seconds later" by
passing a bigger number. The browser APIs had their traps, each with its
answer: sound needs a user gesture on iPhone Safari, so the `AudioContext` is
created inside the Start click; a screen wake lock arrives asynchronously and
is released by the browser when the page is hidden, so it is asked again on
`visibilitychange` and released at once if it arrives too late. `role="timer"`
is not a live region — the digits change four times a second and nothing is
read — while one polite status says each event once ("Set 1 done. Start set 2
when you're ready.").

Its browser test uses Playwright's clock inside the page: time stops, the
test clicks Start for real (so the real audio unlock runs), then advances 6.5
seconds and reads exactly "0:14". Three 20-second holds take about three
seconds, and the tones are counted by wrapping `createOscillator`, so the
sound is still made. A mutation moving the audio unlock out of the click left
zero tones — something the jsdom fake could never tell.

## One page changed, 129 files renamed

Every built file is named after a hash of its content, so a server can tell
browsers to keep it for a year: new content, new name. The deploy check in
the bundle pass measured what that costs. Changing one page renamed 129 of
224 files. A file's imports are part of its content, and the main file lists
every page by its hashed name, so a new page name changed the main file's
name, which changed the content of the ~120 files importing it, and so on.
None of those 129 files had changed except the name of something they import.

Three changes, measured each time:

- **A `framework` file** for React, React DOM and React Router, whose name
  changes only on an upgrade (they had been in the main file, re-sent after
  any change to shared code);
- **`socket.io-client` on demand**, loaded inside the messaging adapter by a
  dynamic `import()` while the adapter still returns its interface at once,
  queueing listeners until the library arrives — so the sign-in page and the
  admin's screens never download it;
- **an import map** (Vite's experimental `build.chunkImportMap`): files import
  each other by stable keys, and `index.html`, fetched on every visit, maps
  each key to the real hashed name.

One page changed now renames one file. A returning visitor after a one-page
deploy downloads 21 kB instead of 475 kB. Because the option is experimental,
`vite` is pinned to an exact version and `npm run check:cache-names` — two
builds, one page changed, the names compared — is the check after any upgrade.
A first comparison went wrong in an instructive way: one side was built with
source maps, so every file's last line differed, and so did every name.
Comparisons now always run one command twice.

Two settings of the phase turned out to belong to someone. The "Easier-to-read
font" was first stored per device, like the theme, until Morgan's setting
reached Alex on the same computer; it moved to the account, with a device copy
kept only while someone is signed in. And the way back after signing in — the
page a signed-out person was on — sent the *next* person to sign in on that
browser to it, until it carried its owner's id.

## Current status

Phase 7's last item was built on 2026-11-03: the room under each page owned
by the layout, and the avatars' three tints. The browser suite is 15 tests: 4
sign-ins, then 11 in six files ([`TESTING.md`](../TESTING.md)); CI is written and
parked until the repositories are public (PROJECT's
[CI](../PROJECT.md#ci-built-and-parked-with-gitignore)); the delivery choices
are ARCHITECTURE's [§11](../ARCHITECTURE.md#11-build-and-delivery).
