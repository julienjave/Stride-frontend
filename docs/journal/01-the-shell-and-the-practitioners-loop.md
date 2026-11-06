# Phases 0–3: a shell that knows who is signed in, and the practitioner's loop

This entry covers the frontend from its scaffolding to the end of Phase 3
(2026-10-15). Phases 0–2 built the plumbing and the admin's basics: the one
HTTP funnel, the session, the route guards, clinics and users. Phase 3, by
far the longest, made Stride a tool a practitioner works in: an exercise
library, program templates with several workouts, a patient roster, a patient
page, and assigning a program on a real schedule — then changing that
schedule, pausing it, closing the program, continuing it.

Condensed to four stories; the full list of what was decided is in
[`PROJECT.md`](../PROJECT.md), and how the parts work today is in
[`ARCHITECTURE.md`](../ARCHITECTURE.md). The same period seen from the
backend — the care team, invitations, schedules as history — is the backend
journal's [entry 36](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/36-care-team-invitations-and-schedules-as-history.md).

---

## Contents

- [Who is signed in, asked once](#who-is-signed-in-asked-once)
- [The screen arranges and words; it never judges](#the-screen-arranges-and-words-it-never-judges)
- [One editor, two resources](#one-editor-two-resources)
- [What only another machine could show](#what-only-another-machine-could-show)
- [Current status](#current-status)

---

## Who is signed in, asked once

The first version of the session was the obvious one: every component that
needed the current user called a hook, and the hook fetched `GET /auth/me`.
It looped. For a signed-out visitor the answer is an error, and TanStack
Query starts a new fetch for a query with no data the moment *any* new
observer mounts. `App`, `RequireAuth` and `RequireGuest` each observed it;
each mount re-armed a fetch, the fetch put the query back to "pending", the
app's loading gate unmounted the router, the guards mounted again. Reproduced:
more than 1,000 requests in two seconds.

The fix splits fetching from watching. Exactly one fetch is ever started,
checked against the cache's own state (`getQueryState`); every caller then
observes the entry with `enabled: false`, so mounting and unmounting can
never start another. `null` means "signed out", `undefined` "not known yet",
and sign-in, sign-out and the role switch write their answer into that one
entry with `setQueryData`.

Signing out and switching roles then each had a bug of their own, both from
`queryClient.clear()`, which looks like the right tool for "forget everything
the last role saw":

- **Switching roles left the header on the old role.** A component watching
  the cache is subscribed to one query *object*, not to a key. `clear()`
  threw that object away; the `setQueryData` after it created a new one the
  header knew nothing about.
- **Signing out sometimes fetched `/auth/me` again.** `clear()` also removed
  the current-user entry, so a header still on screen until the navigation
  finished found no entry at all and started the bootstrap fetch. Whether it
  re-rendered before or after it unmounted depended on timing, which is why
  the account menu's sign-out test failed only on a busy machine.

Both now remove every query *except* the current user's
(`removeQueries` with a predicate), then write the new value into the entry
everyone is already watching. Nothing fetched as a practitioner survives into
the admin's screens — the roadmap's manual check for Phase 1 — and nothing
has to be refetched to know who is signed in.

## The screen arranges and words; it never judges

A program's page shows, day by day, what was done, made up, missed or due.
None of that is decided in the frontend. The backend's schedule module judges
every day; the page cuts its answer into program weeks around a focus week
(this week while the program runs, the last once it's over, the first before
it starts) and puts words on it. Each state's words are a `Record` keyed by
the API's union — `DAY_STATE_BADGE: Record<DayState, …>` — so the day the
backend adds a state, the frontend fails to compile until it has words for it.
A badge always shows its word; colour only repeats it.

The rule was tested the first time the words were wrong. Pat had done
Wednesday's workout on Tuesday, a free day, and the page said "Swapped". The
person pointed out that a swap is an *exchange* — Monday's workout on
Wednesday and Wednesday's on Monday — and that doing a later day's workout
early is something else. The fix didn't go into the label. It went into the
backend's model: a new `done_early` state, and a case refused until late
make-ups were designed. A label that is wrong usually means the model is.

The same split decides what the page says before an action:

- **When the page can't see what decides, it asks.** Whether cancelling a
  program deletes it depends on whether any session exists, unfinished ones
  included — which the summary, built from completed sessions, can't show.
  So the dialog asks the backend on every opening (`GET …/closing`, the same
  function the close runs), and the confirm button stays disabled until the
  exact outcome is known.
- **When the rule is plain, the page mirrors it to describe it.** Shortening
  a program's end date says, before saving, that the last week's target
  becomes 2 instead of 3, by mirroring the summary's arithmetic. The backend
  still decides; the mirror only describes, and the page is stricter, never
  looser.

## One editor, two resources

A template's page grew a workout editor in step 3a-w: workouts added, renamed,
reordered, deleted; exercises dragged within a workout, moved or copied to
another. Step 3b needed exactly the same editor on a patient's program, plus
two things only a program has: a removal that may *keep* an exercise for its
past sessions, and the removed exercises shown on request.

Two copies would have drifted, so the machinery was lifted into
`src/workouts/`: a hook (`useWorkoutEditing`) given the resource's routes as
an object of functions and its cache key, and a list (`WorkoutListEditor`)
given render props for the cards. The template and program hooks became thin
wrappers. The proof of the move was the template page's tests passing
*unchanged* — and they caught one drift: the lifted hook had reworded the
template's removal error. Moving code is a tempting moment to tidy it; the
rule since then is to refactor with no visible change first, and change
behaviour in a separate, named step.

The same move — inversion of control — happened three times in the phase.
`EditableField` was given a `save` instead of calling one API, then the
prescription fields, then the description fields. A component that used to
call one route now edits the library's exercise or one patient's copy, and
can't confuse them, because it never knows which. Its tests give it a mock
`save` and check what it was asked to save; each page has a test with the
literal request body, because `JSON.stringify` drops an `undefined` key and
keeps a `null` one, and only the bytes show which was sent.

One library detail surfaced through that seam: TanStack Query v5 calls a
`mutationFn` with *two* arguments, the variables and its own context.
`mutationFn: save` therefore handed every caller's `save` an object it never
asked for. No symptom — until a test asserted the exact arguments.
`(value) => save(value)` keeps the contract the component promises.

## What only another machine could show

Several of the phase's bugs couldn't appear where the code was written, a
Linux sandbox running in UTC with a fresh test client.

- **Two file names that were one.** On the person's Windows machine the
  patient page couldn't be imported: `PatientPage.tsx` and its helpers file
  `patientPage.ts` are one name to a case-insensitive file system, and
  TypeScript tries `.ts` before `.tsx`. The helpers were renamed
  (`patientPageRules.ts`, hence the `…Rules.ts` convention), and
  `fileNameCase.test.ts` now fails on any two paths that differ only by case
  — after first proving it sees the files at all.
- **A dark-mode list drawn by Windows.** The assign form's open dropdowns were
  light grey on white in dark mode. A native `<select>`'s list is drawn by the
  browser, which on Windows uses the select's background only when it is
  opaque, while the options inherit the page's light text. The options now
  carry the theme's colours themselves. jsdom and headless screenshots can't
  see a control drawn outside the page; only a look by hand in each theme can.
- **Days that are 23 hours long.** `addDays` computed in local time passed
  every test in a UTC sandbox, where every day lasts 24 hours. Calendar dates
  became `YYYY-MM-DD` strings with arithmetic in UTC, and the date tests run
  again under `TZ=America/Montreal` and `TZ=Europe/Paris`, with a case on each
  side's clock-change date.
- **A cache bug the tests' client hid.** The admin's create-user form never
  refreshed the Users list; every test passed because the test client had
  `staleTime: 0`, so every list refetched on mount anyway. Tests now use the
  app's real staleness.

The phase ended with the bundle, measured before it was changed: one 1.6 MB
file, 40 % of it a library's geographic data and the rest every page of every
role. Every page became its own file, loaded on demand behind a static shell
(the guards, the layouts, the sign-in page), and the address data a generated
copy of only the codes and names the forms store (640 → 125 kB). The first
download fell from 1,627 kB to 626 kB. Splitting brought a duty with it: a tab
opened before a deploy asks for yesterday's file names, so a missing page file
triggers one reload, at most once per ten seconds, and a second failure shows
the error page instead of a loop.

## Current status

Phase 3 was complete on 2026-10-14, the bundle pass on 2026-10-15. The
editor lives in `src/workouts/`, the program pages in
`src/assigned-programs/`, and how routes load on demand is ARCHITECTURE's
[§4](../ARCHITECTURE.md#4-routes-guards-and-layouts). The next entry gives
the same programs to the patient.
