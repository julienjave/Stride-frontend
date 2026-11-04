# Phase 6: honest states, plain words, and the account pages

This entry covers Phase 6 (2026-10-20 → 2026-10-29), the longest after
Phase 3: the medical file and "My records", forgot and reset password,
changing one's email and password, two-factor sign-in with recovery codes,
the audit log viewer, the admin home's numbers, the records export and its
emailed link, what a deactivated patient's care team may still do, the
complaint review and the legal disclosure — and two passes over every screen,
one for failures and one for loading.

Condensed to four stories; [`PROJECT.md`](../PROJECT.md) has the rest. The
backend's side — an audit trail worth reading, accounts that hold, record
access instead of a back door — is the backend journal's [entry 39](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/39-audit-review-account-security-and-record-access.md).

## The audit trail decides what a screen reads

From this phase on, every read of another person's clinical data writes an
audit entry: who saw which entries, when. That changes what a screen may
fetch. The obvious patient page would show the medical file's latest entry, or
at least a count — and every visit to the patient page would then record
"viewed the medical file", for a practitioner who came to check a schedule.
The trail would be full and meaningless.

So the file is its own page, behind a link card with no data on it; a test
asserts the patient page sends no request to `/medical-files`. Reading the
file is a deliberate act and the trail says so only when it happened. The
same reasoning chose *invalidate* over *patch* after saving an entry: the
file is read again, so what the trail records as shown is exactly what the
server sent. Range of motion, in Phase 7, reads the file only to name a note
an assessment is linked to.

A second rule came from the same place: corrections are amendments, never
edits. An amended entry is folded under its correction ("Show the
original"), and "Amend" is offered only on a note's latest version — a chain
of corrections, never a branch.

## Honest states, and a retry that unmounted itself

The first screens built under row security had a problem a plain 404 page
couldn't solve. When a practitioner opens a program they aren't allowed to
see, the backend answers `404` — row security hides the row, and existence
itself is clinical information. "Program not found" would lie (it may well
exist); "you aren't allowed" would leak. Thirteen pages, written over five
phases, said it in five different ways, three of them dead ends.

They now share one shape, `NotAvailable`: "Program not available", one
sentence naming both possibilities, and links out. Records with no such rule
(an exercise, a template, a user) say "… not found" — a 404 has one meaning
there. Any other failure gets `LoadError`: "Couldn't load …", the reason, and
**Try again**, which refetches only the failed requests. `LoadFailure` takes
the queries themselves rather than `retrying` and `onRetry` props: planning
the mutation run showed a page could wire those wrong with no test noticing,
and deciding inside, once, removes the slip.

Try again then failed in Chromium in a way the unit tests couldn't show.
After a retry that failed again, focus was lost to the top of the page. The
cause was TanStack Query: a query that never had data goes back to
"pending" while it refetches, so the page renders "Loading…" and the error
block — with the button that had focus — unmounts. A new error block mounts
when the retry fails. State dies with its component, so the memory of "a
retry was just pressed for *this*" lives at module level, bounded to the
block that replaces the pressed one (same subject, under 30 seconds,
forgotten once used). The new block reads it and says "Still couldn't load
…", with focus on its button. Later in the phase the memory gained its other
outcome: after a retry that *works*, focus goes to the new content's heading.

The unit tests had modelled a failed query as staying in error while it
refetches — true only for a query that already had data. The page-level test
now runs the real flow, TanStack Query and a held `fetch` together. A test
double must behave like the thing it stands for.

## One wording rule, and a header the browser hid

By the middle of the phase, failures were worded in 51 places in 45 files,
each its own way: some showed the server's text — for a 429, that was
"ThrottlerException: Too Many Requests" — others a fixed sentence. The person
chose both halves of
a fix. The backend now writes the 429's sentence itself ("Too many attempts
in a short time. Try again in N seconds."), and one frontend function,
`failureText(error, noAnswer?)`, decides every failure's words: the backend's
words for a refusal, "Something went wrong on our side. Try again in a
moment." for a 5xx, and a "check your connection" sentence when no answer
came. A convention test reads the source of every application file (Vite's
`import.meta.glob` with `?raw`) and fails on any other file reading an
error's messages. The convention tests later learned their own blind spot:
"no checked file breaks the rule" is also true when *no* file is checked, so
each now asserts named files are in its list.

The records export found something no unit test could. Its download needs the
file's name from `Content-Disposition`, and asking the running API with an
`Origin` header showed the browser would never let JavaScript read it. A
cross-origin response's headers are hidden from the page except a short
safelist, unless the server names them in `Access-Control-Expose-Headers`.
The same rule had been hiding `Retry-After` since Phase 0: the client read it
into `ApiError.retryAfterSeconds`, and in a browser the value was always
`undefined`. Unit tests build a `Response` directly, with no CORS between.
The backend now exposes both, and the request id in Phase 7.

## The account pages: buttons, caches, and two navigations

Account security is where a screen's small decisions carry the most weight.
Three of them were found by using the pages:

- **A link that changes something acts on a button, never on load.** The
  email change's confirm and cancel pages, and later the records download,
  wait for a press. Mail scanners and link previews open every link in an
  email before the person does; only a person may move a sign-in address or
  spend a one-time download. A test proves nothing is sent when the page
  opens. Each of those pages also reads its token from the address once and
  removes it, so it isn't left in the history.
- **Two cache entries for one account.** After turning two-factor on, the
  profile still said "Off" until a reload. The session's account lives under
  `['auth', 'me']`; the profile reads the same account through
  `GET /users/:id`, a separate entry. Turning it on updated the first only.
  Every unit test passed because the test's stub profile read the first
  entry; the walk-through in Chromium found it. Both entries are now updated,
  and the stub reads what the real page reads.
- **Two navigations, one winner.** After five failed re-confirmations the
  backend signs that session out, and the sign-in page should say why. The
  global 401 handler navigated to `/login` with the reason in the navigation
  state — and in the same moment `RequireAuth` re-rendered, saw no user, and
  navigated to `/login` itself, with its own state. The last navigation's
  state won, and the reason was lost. The reason now sits beside the
  navigation, in a module variable the sign-in page reads once. jsdom tests
  rendered no guard, so they couldn't see the race.

Recovery codes are handed over with Copy all, Download and a tick ("I've
saved my recovery codes") before Done. The download is built entirely in the
click's handler — the Blob, a temporary link, `click()`, then revoking the
address — because a side effect that is the result of a click belongs in the
click, not in an effect feeding a value back into state.

The phase's two closing passes applied one rule each to every screen: load
errors on one sentence (`loadErrorText`, with a "not found" page for one
record and links out), then loading states and skeletons (nothing for
200 ms, then a status region filled with a sentence or shapes). The first
alone changed 115 files; two more convention tests keep both rules true.

## Current status

Phase 6 was feature-complete on 2026-10-28; its tidy-up (the care-team join
notice, the complaint review, the legal disclosure) and a dependencies pass
followed by 2026-10-29. The shared states are ARCHITECTURE's
[§8](../ARCHITECTURE.md#8-screens-the-shared-states-and-parts).
