# Phase 4: the patient's loop, on a phone

This entry covers Phase 4 (2026-10-15 → 2026-10-19): the patient's home,
starting a session, ticking its exercises one at a time, finishing, stopping
or skipping it, making up a missed day, the Sessions hub and each program's
page, pain and mobility charts, the patient's care team, and the
practitioner's "For review" list. Patients are phone-first, so every screen
was built at 375 px first and checked live in Chromium.

Condensed to four stories; [`PROJECT.md`](../PROJECT.md) has the rest. The
backend's side — a session the database can vouch for — is the backend
journal's [entry 37](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/37-the-session-as-a-state-machine.md).

---

## Contents

- [A page before the write, and fresh data for decisions](#a-page-before-the-write-and-fresh-data-for-decisions)
- [Ticks that feel instant on a slow phone](#ticks-that-feel-instant-on-a-slow-phone)
- [Charts drawn by hand](#charts-drawn-by-hand)
- [What only a person's hands found](#what-only-a-persons-hands-found)
- [Current status](#current-status)

---

## A page before the write, and fresh data for decisions

A session row is an *act*: the backend stores one only once the patient
starts, never as a "pending" placeholder. So the home's **Start** is a link,
not a request. It leads to `/patient/sessions/start/:programId`, which says
what today's workout is and asks the optional pain question; nothing is
written until "Start session". An app that opened a session on the home's tap
would record "started, then not finished" for a patient who only looked.

The address names the program and nothing else. The start page works out
today's workout again with the same rule the home used (`todayStatus`, moved
into `src/sessions/` when it gained its second reader), so the button and the
page can't disagree, and a stale link can't start yesterday's workout. A
session already open today redirects to it, with `replace`, so Back doesn't
return to the start page.

The flow's third pass found the case that rule didn't cover. Live, a patient
started a session, stopped it, and pressed Start again — and was sent back
into the *stopped* session. The start page had decided from a summary cached
while it was still mounted: starting invalidated the summaries, the start
page refetched at once ("session 73 open"), then navigated away; the Stop
invalidated them again, but no page showed the summary, so the cached "73
open" stayed. The second visit decided from it.

The fix is a rule for every page that *decides* an action: it waits for this
visit's own answer (`staleTime: 0` and `isFetchedAfterMount`). Only the first
fetch is waited for — a refetch when the window regains focus updates in
place and keeps the patient's pain answer. Pages that only *show* the summary
keep the cache. The same rule now covers the finish page, the make-up's
`?for=` and the closing dialogs.

## Ticks that feel instant on a slow phone

Ticking an exercise done, rating its difficulty and writing a note are the
three things a patient does mid-session, often on a bad connection. They are
optimistic: the screen changes at once, the request follows. Three rules make
that safe:

- **One request at a time.** Two quick taps sent at once can reach the server
  in either order. A mutation `scope` queues them, so the order is the
  patient's.
- **Only the last answer is written.** Each answer is the whole session; the
  first one doesn't know about the rating still queued behind it. A hook
  writes the server's answer only when nothing else is pending
  (`isMutating() <= 1`).
- **A failure undoes only its own fields.** A snapshot of the whole session
  taken before the failed change would also undo the rating queued after it;
  `previousValues` keeps just the keys the change touched.

The first tests passed with each rule removed — the next answer from the fake
server arrived fast enough to hide every bug. The simulated server in
`SessionPlayer.test.tsx` now applies each request and answers the whole
session, and tests *hold* answers (a gate the test opens) and look at the
screen while they're held. Holding answers became the standard way to test
anything that races.

Done is a toggle button whose name never changes ("Done"), with
`aria-pressed` carrying the state: a label that describes the opposite action
half the time ("Mark as not done") reads as two different buttons.

## Charts drawn by hand

The person chose a "Pain and mobility" section on both program pages and
hand-drawn SVG over a chart library. Every decision became a pure function in
`progress/scoreRules.ts`, and `ScoreChart` only turns numbers into pixels:

- **Asked is not answered.** "Missing values leave gaps" needs to know which
  values are *missing* rather than never expected. Pain before is asked at
  every start and on a skip for pain; the check-out on Finish and on the
  patient's own Stop — never on a session the app closed. A session asked and
  left blank breaks the line; a session never asked is stepped over.
- **A dated axis.** One band per calendar day; a week without sessions is
  empty space, because the time really passed.
- **Drawn at real pixels.** The chart measures its frame with a
  `ResizeObserver` and computes every coordinate, instead of stretching a
  `viewBox`: on a phone a stretched one would shrink 11 px labels to 6 px.
- **Readable without the picture.** A readout under the chart (a finger
  covers whatever a tooltip shows beside it), driven by hover, tap or the
  arrow keys; a table twin with every value; the picked session kept by id,
  so a refetch can't make the readout name another session.

The home's "Pain after sessions" line compares the median of the last three
answers with the three before, in words ("lower", "steady"); the arrow beside
it is decoration, since "down" is good for pain and an arrow alone tells a
screen reader nothing. A mutation survived there until a test used a 10:
`[10, 2, 3].sort()` puts 10 first, because JavaScript's default sort compares
*text*. Numbers now always sort with `(a, b) => a - b`.

## What only a person's hands found

Three bugs of the phase came from the person using the app, and none would
have shown in a test written from the code:

- **The carousel's arrow lost about half its clicks.** A console snippet
  logging `pointerdown`, `pointerup` and `click` in the capture phase showed
  the press landing on the button and the release on the photo. The arrow was
  centred with `-translate-y-1/2`; the shared Button's press effect is
  `active:translate-y-px`. Both write the one CSS `translate` property, so
  while pressed the second *replaced* the first and the button jumped 15 px
  out from under the pointer. Playwright's press and release are milliseconds
  apart, so a transition never moves the target; a press-and-hold reproduced
  it. The arrows are now centred without a transform (`inset-y-0 my-auto`).
  Utility classes compose by property, not by class.
- **Uploads that took forever.** Narrowing it one layer at a time on the
  person's machine — a script straight to storage, the same photo posted from
  Node, Firefox, Edge — showed their Chrome never sent the request at all.
  That one wasn't Stride's. The search found a real one on the way, in the
  backend's storage client (entry 37 on the backend's side).
- **A suggestion written as a rule.** The home said a late make-up would wait
  "for another free day" while an on-time catch-up was open. The person asked
  whether the coming Sessions hub would then refuse it — and it would have:
  the backend refused it. The preference moved to the screens. The home
  suggests the on-time catch-up and says the late one is possible too; the
  hub lists every make-up with its own button and lets the patient choose.
  Walking the live path past that first success then found two more: the hub
  offering "Make it up" for the very make-up in progress, and the home
  offering a catch-up on a day already used. Both are now handled by the
  screens, with the server's rules said in words wherever a button is
  disabled.

The phase closed with the patient's care team and the practitioner's list.
**My team** shows each current member's specialties, shared clinics and
since when — and never the staff `reason` for a link, which the backend
removed from the patient's answer rather than the screen hiding it.
**For review** lists alerts the backend computes per request; after live
testing, a program's attendance alert gained a way off the list
("Mark as reviewed" on the program page), because an alert designed to clear
itself stays for ever when the patient never acts.

## Current status

Phase 4 was complete on 2026-10-19. The session pages are in
`src/sessions/`, the charts in `src/progress/`, the care team in `src/team/`,
the list in `src/alerts/`; the optimistic pattern is ARCHITECTURE's
[§6](../ARCHITECTURE.md#6-server-state).
