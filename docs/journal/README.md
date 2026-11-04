# Stride frontend — engineering journal

The decisions, trade-offs and real bugs behind Stride's frontend, a React
single-page app for a physiotherapy practice, told phase by phase. It's a
journal, not a spec: each entry tells a phase as it happened, including what
was wrong at the time and how it was found. The app as it stands is in
[`ARCHITECTURE.md`](../ARCHITECTURE.md), the complete "what and why" in
[`PROJECT.md`](../PROJECT.md), and every choice in its long form in the
[decisions log](../stride-design-decisions.md).

**How these entries were written.** One entry per build phase, written after
the fact (2026-11-03) from the decisions log and the notes kept during each
phase, and condensed to the three or four decisions or bugs worth telling as
a story. The backend has its own
[journal](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/README.md),
whose entries 36–41 cover the same phases from the server; each entry here
names its counterpart. The entries are a frozen record: a later entry names an earlier
one's error, and this README keeps the list of what is still open.

---

## Start here

Three entries that show how this frontend was built, more than what it
contains:

| # | Why read it first |
|---|---|
| [01](01-the-shell-and-the-practitioners-loop.md) | The rule the whole app follows — the screen arranges and words, it never judges — and the session bug that taught the cache's first lesson: a component watches a query *object*, not a key. |
| [04](04-honest-states-plain-words-and-account-pages.md) | What row security and an audit trail ask of a screen: honest "not available" pages, one wording rule checked over every file, and three account-page bugs only using the pages found. |
| [06](06-reports-the-browser-suite-and-the-bundle.md) | Error reports that name no patient (and the reference Dedupe hid), the browser suite catching a bug on its first run, and a bundle measured into shape. |

---

## Reading order

| # | Title | What it covers | Backend counterpart |
|---|---|---|---|
| [01](01-the-shell-and-the-practitioners-loop.md) | Phases 0–3: a shell that knows who is signed in, and the practitioner's loop | One fetch of `/auth/me` (a 1,000-requests loop, then two `clear()` bugs). The program pages arranging the schedule module's answer, and "done early is not a swap". One workout editor lifted for templates and programs, proven by unchanged tests; components given a `save`. Bugs only Windows, a time zone or the app's real cache settings could show; code splitting and the stale-chunk reload. | [entry 36](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/36-care-team-invitations-and-schedules-as-history.md) |
| [02](02-the-patients-loop-on-a-phone.md) | Phase 4: the patient's loop, on a phone | A page before the write, and pages that decide waiting for this visit's answer (a patient sent back into a stopped session). Optimistic ticks: one at a time, the last answer, per-field undo — and tests that hold answers. Hand-drawn charts (asked vs answered, real pixels, a table twin, a text sort). Bugs found by hand: a `translate` fight, a browser that never sent, a suggestion written as a rule. | [entry 37](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/37-the-session-as-a-state-machine.md) |
| [03](03-messaging-shown-once-stored.md) | Phase 5: messaging, shown once it is stored | One connection per identity in a keyed provider, behind a four-method adapter. The cache as the only truth: events written in, REST refetched on every connection, a thread read backwards. Waiting for the acknowledgement. A `setTimeout` that waited 1 ms (the 32-bit limit), two clocks, and a dialog that outlives its button. | [entry 38](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/38-messaging-brought-up-to-standard.md) |
| [04](04-honest-states-plain-words-and-account-pages.md) | Phase 6: honest states, plain words, and the account pages | The audit trail deciding what a screen may read. "Not available" vs "not found", and a retry whose button unmounted itself. `failureText` everywhere, convention tests and their blind spot, a header CORS had hidden since Phase 0. Buttons instead of on-load actions, two cache entries for one account, two navigations with one winner. | [entry 39](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/39-audit-review-account-security-and-record-access.md) |
| [05](05-merges-paging-and-the-leftovers.md) | Phase 6.5: merging two accounts, a paged users list, and the leftovers | The duplicate warning and a merge page revealed step by step, which never flashes a merged account's actions. Typed vs committed search, `replace`, and what a failed page shows. Polling that changed what an error means. Four clinical leftovers. | [entry 40](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/40-defence-in-depth-leftovers-and-merges.md) |
| [06](06-reports-the-browser-suite-and-the-bundle.md) | Phase 7: error reports that name no patient, a browser suite, a timer, and the bundle | Two locks on what a report holds; Dedupe hiding the screen's reference. The Playwright suite and the frozen role switch it found. A timer whose time is calculated, never counted down. The hash cascade (129 of 224 files) and the import map; settings that belonged to someone. | [entry 41](https://github.com/julienjave/Stride-backend/blob/main/docs/journal/41-observability-without-patient-data.md) |

---

## Looking for a specific topic?

| Topic | Entries |
|---|---|
| TanStack Query: the cache, keys, staleness, invalidation | 01, 02, 03, 04, 05 |
| Optimistic updates and races between requests | 02, 03 |
| Routing, guards, navigation state, the way back | 01, 02, 04, 06 |
| Real-time messaging and the socket | 03, 06 |
| Forms, validation and the backend's rules mirrored | 01, 05 |
| Wording, failures, loading and empty states | 01, 04, 05 |
| Accessibility (focus, live regions, names, colour) | 02, 03, 04, 05, 06 |
| Privacy (what a screen reads, what a report holds) | 02, 04, 05, 06 |
| Account security screens | 04, 06 |
| Charts and drawing by hand | 02 |
| Time: calendar days, time zones, timers, clocks | 01, 03, 06 |
| Testing: fakes, held answers, mutation testing, convention tests | 01, 02, 03, 04, 05, 06 |
| The browser suite (Playwright) | 06 |
| Build, bundle size and caching | 01, 06 |
| Bugs only a real browser, another OS or a person found | 01, 02, 04, 06 |

---

## Known open items

Kept up to date here; the entries themselves are never edited. Last checked
against the code and the documents on 2026-11-03.

- **Nothing has been deployed yet.** The host's settings (single-page
  fallback, caching of `index.html` and `/assets/*`), the build's
  `VITE_API_URL` and `VITE_SENTRY_DSN`, and a Content-Security-Policy that
  allows the two inline scripts are ARCHITECTURE's
  [§12](../ARCHITECTURE.md#12-open-items-before-the-deployment).
- **CI is written and parked** while the repositories are private:
  `.github/` is in `.gitignore` (entry 06; PROJECT's
  [CI](../PROJECT.md#ci-built-and-parked-with-gitignore)). The decisions
  log's §38 still describes the earlier `.git/info/exclude` plan.
- **Still to check on a real phone**: that a portrait photo keeps its
  orientation through the avatar crop.
- **Deferred, each with its reason** in PROJECT's
  [Known limits](../PROJECT.md#known-limits-and-whats-deferred): optimistic
  message sending (entry 03), Firefox / WebKit and an accessibility scan in
  the browser suite, keyboard shortcuts in the session player, paging for the
  screens that pick from every account, cacheable URLs for photos other than
  the library's.
