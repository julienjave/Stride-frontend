# Phase 6.5: merging two accounts, a paged users list, and the leftovers

This entry covers Phase 6.5 (2026-10-29 → 2026-10-30), opened once Phase 6
was feature-complete. Most of it was backend work (files a rollback can't
undo, rules given a database half, a job with no user). The screens it needed
were a warning when a new patient may already exist, a page to merge two
accounts of one person, a users list an admin can search and page, an admin
home that stays current, and four clinical leftovers the person chose from
the deferred list.

Condensed to four stories; [`PROJECT.md`](../PROJECT.md) has the rest. The
backend's side — the first `SECURITY DEFINER` function, the guards, the
new-message emails — is the backend journal's entry 40 (TODO-LINK).

## A merge page that reveals itself, and never flashes

Two accounts for one person split their history in two. The backend now warns
when a new patient has the same date of birth and the same name, normalised
(case, accents, hyphens, a first / last swap): a `409` with a `reason`, so the
form can tell it from "this email is taken" on the same route. The form shows
the matches — every one to an admin; to a practitioner only those in their
own directory, plus *that* others exist — and "Create anyway" sends the same
body again with `allowPossibleDuplicate`. A form edited after the warning is
checked afresh.

When duplicates already exist, an admin merges them on
`/admin/users/:id/merge`, one step revealed at a time: choose the other
account, compare the two (identity only — no clinical data on an admin's
screen), choose the account to keep, confirm with one's own password. The
other account lives in the address (`?with=`, *replaced*, not pushed), so a
reload keeps it and another page can link straight to a pair; the kept
account is state, reset whenever the pair changes, because a choice made for
one pair must never stand for another. On a phone the two cards stack, and
"side by side" no longer shows a difference, so a sentence above them names
the rows that differ. A choice the backend would refuse is disabled with its
reason linked by `aria-describedby`: a disabled radio says nothing by itself.

A merged account must never show its Deactivate, Grant role and care-team
buttons, not even for an instant. Its page needs two answers, the user and
the merges; drawn after the first only, a merged account flashed its actions
until the second arrived. The page now waits for both — and so does the
retry's focus, or it would aim at a heading not yet drawn. A mutation removing
the wait survived at first; a test with a merges request that never answers
killed it.

That pass also delivered a test that passed in the sandbox and failed on the
person's machine. The load-error convention test reads every source file
through `import.meta.glob(…, '?raw')`, and Vitest's transform cache kept the
*old* file list, so a new "Couldn't load" in the comparison passed here. It
was fixed in the screen (the app's own `LoadError` under the cards), and a
final run now starts by clearing the cache.

## Searching as you type, without a request per letter

The Users page became a paged list over a new admin route, with every filter
in the address — search, role, clinic, status, "needs attention", page — in
one fixed order, so one view has one address, one request and one cache key.

The search box has two values: what is *typed*, shown at once, and what is
*committed*, written to the address 300 ms after the last keystroke. Two
details make that behave:

- **The newest filters through a ref.** The timer is started by a keystroke,
  but a role chosen in the next 300 ms must stand. A ref written in an effect
  (never during a render) holds the latest filters; the timer reads it when
  it fires. A test types, then picks a role at once.
- **`replace`, not push.** A committed search replaces the history entry, so
  Back goes to the view before the search instead of stepping through
  letters. The typed text is dropped only when the address says something
  else — Back to "ana" while "bob" is typed shows "ana" — compared with the
  *trimmed* typed text, so "ana " (a space still being typed) survives "ana"
  being committed.

While the next page loads, the previous one stays on screen, dimmed and
`aria-busy`. What a failed request shows took a mutation to get right. A
refetch of the page on screen that fails keeps its rows; a *new* page that
fails shows the load error, because TanStack Query drops the placeholder —
and old rows under a new page's number would lie. The first version's
comment claimed the opposite. The tests now tell the two cases apart.

## Numbers that stay current, and an error that changed meaning

The person chose both ways of keeping the admin home's numbers current: a
refetch every 60 seconds while the tab is visible (`refetchInterval`, which
TanStack Query pauses in a background tab by default), and a **Refresh**
button with "Updated 14:05 · refreshes every minute". The time is the *older*
of the two sections' answers, so the line never claims more than the page
has; a test refreshes the metrics with the activity failing and expects the
older time.

Polling changed what an error means. Before, a section showed its data only
when its query had succeeded; a failed *background* refresh (an error, with
the data still there) replaced the numbers with "Couldn't load". Rare with a
refetch on focus; every network blip with a refetch every minute. The
sections now show their data whenever they have it, the error only when they
don't, and a failed refresh says "Couldn't refresh. Showing the numbers from
…" instead. The bar's status region is filled only after a press: a region
that changed every minute would interrupt a screen reader for nothing.

## The clinical leftovers

Four items the person chose from the deferred list, each a gap a practitioner
or a patient would notice:

- **"Not one of your clinics."** On My patients, a clinic badge for a clinic
  the practitioner doesn't work at has a dashed outline — and, for screen
  readers, the words "(not one of your clinics)", because colour or a border
  style may never be the only carrier of a meaning (WCAG 1.4.1). A one-line
  key explains the outline, shown only when such a badge is on screen.
- **"Pause … Back on."** A pause with an end date used to be two requests
  from the screen, and a failed second left a program paused with no end.
  The backend now takes `resumeOn` and writes both versions in one
  transaction; the form gained an optional "Back on" date.
- **"Copy exercises…"** from a workout's menu: several exercises, or a whole
  workout, copied in one request instead of five clicks that could leave a
  workout half-copied. The dialog is native checkboxes and radios in a
  `fieldset` with its `legend`, the browser's own semantics inside Radix's
  dialog.
- **"Email me about new messages"** in the Settings menu, on by default,
  saved optimistically. The current user is a query fetched once and never
  refetched by an invalidation, so after a failed save the hook reads
  `/auth/me` again explicitly to put the switch back where the server has
  it.

## Current status

Phase 6.5 was complete on 2026-10-30. The merge is `src/patient-merges/`,
the users list `src/users/` with `common/useAddressFilters.ts`, the home's
freshness `src/app/home/admin/`. The address-as-state rule is ARCHITECTURE's
[§6](../ARCHITECTURE.md#6-server-state).
