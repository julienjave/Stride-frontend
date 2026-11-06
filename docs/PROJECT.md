# Stride frontend: decisions and rationale

What was decided while designing and building the frontend, and why: the
alternatives weighed, and what each choice costs. Written to stand alone, for
someone picking the project up or reviewing it without having been there.

Three neighbours divide the rest of the work:
[`ARCHITECTURE.md`](ARCHITECTURE.md) explains *how* the app works as it
stands; [`TESTING.md`](TESTING.md) is the guide to the suites; the
[journal](journal/README.md) tells each build phase as a story, mistakes
included. This document is the summary of decisions between them.

**"decisions §N".** The code's comments, the roadmap and these documents cite
"decisions §N". They refer to
[`stride-design-decisions.md`](stride-design-decisions.md), in this folder:
the log where each feature was designed with the person, one section per
item (§1–§47), every option weighed and the rejected ones kept. It is the
long form; this document keeps the choices that shaped the screens. The
backend repository cites the same log for its own work. Where the log and
this document disagree about what was finally built, this document follows
the code (one such place is CI, below).

A few comments also cite `deferred-improvements.md`, a working ledger of
postponed improvements kept outside the repositories. What is still open in
it and matters to a reader is under "Known limits and what's deferred".

---

## Table of Content

- [Project shape](#project-shape)
- [Technology stack](#technology-stack)
- [The layout and the three homes](#the-layout-and-the-three-homes)
- [The screens and the backend's rules](#the-screens-and-the-backends-rules)
- [Server state, writes and freshness](#server-state-writes-and-freshness)
- [Messaging](#messaging)
- [Accounts, sign-in and security screens](#accounts-sign-in-and-security-screens)
- [States, words and feedback](#states-words-and-feedback)
- [Look](#look)
- [Delivery and performance](#delivery-and-performance)
- [Development practices](#development-practices)
- [Known limits and what's deferred](#known-limits-and-whats-deferred)

---

## Project shape

Stride is a multi-role physiotherapy practice management application:
admins run clinics, practitioners build exercise programs and assign them to
patients, patients complete sessions and message their practitioner. It is
two repositories. This one is the frontend, a React single-page app; the
backend (a NestJS API over PostgreSQL, with object storage, email and a
WebSocket gateway) is the other, [`Stride-backend`](https://github.com/julienjave/Stride-backend).

It was built as a bootcamp capstone, specifically to show real frontend,
backend and infrastructure understanding rather than CRUD. That goal shaped
the frontend too: rules written as pure functions and tested with plain
values, charts drawn by hand rather than imported, a bundle measured and
designed rather than accepted, and tests that are themselves tested by
putting deliberate bugs into the code.

The frontend was built in phases, each demoable on its own: Phase 0
(scaffolding), 1 (the session and sign-in), 2 (clinics and users), 3 (the
practitioner's loop), 4 (the patient's loop), 5 (messaging), 6 (medical
files, account security, record access, polish), 6.5 (defence in depth and
leftovers) and 7 (observability, the browser suite and the nice-to-haves).
The backend grew phase by phase with it. Neither side of that work has been
deployed yet (see "Delivery").

---

## Technology stack

**React 19 with TypeScript 6 in `strict` mode**, plus `erasableSyntaxOnly`
(type annotations only, nothing TypeScript would have to generate code for).
The frontend's types are where most of its rules are checked: a new status
from the backend without its words, a page added without lazy loading, a
call site forgetting a required fact all fail to compile (below).

**React Router 8's data router** (`createBrowserRouter`), not the
component router. It gives every page a `lazy` loader (code splitting with no
Suspense boundaries to place by hand), a root `errorElement`, route `handle`s
that tell a layout something about its page, and navigation state that
`useNavigation()` can show. The cost: a navigation is asynchronous, which
made a radio button flicker "unchecked" for 20–60 ms in the audit log until
the address-filter hook learned to remember a click until the navigation
lands (decisions §11).

**TanStack Query 5 for server state, and no store mirroring it.** Almost
everything on screen comes from the API. A cache with keys, staleness,
retries and invalidation by prefix replaces hand-written loading flags and
copies of server data that drift. A separate client store was weighed in
Phase 0 and kept to one job: **Zustand** holds the snackbars' list, the one
piece of state raised from anywhere (a hook whose page has gone) and drawn in
one place (decisions §33). Filters and pages live in the address bar.

**Forms with react-hook-form and zod.** The schema checks what can be checked
before sending; the backend's refusals are shown as they come. Small forms
with two values (a schedule change, a session's check-out) use plain
`useState` and one pure validation function instead: react-hook-form's
wiring would cost more than it saves there.

**shadcn/ui over Radix, Tailwind CSS 4, lucide icons.** shadcn copies its
components into the repository (`src/components/ui/`) instead of installing
them, so they are code that can be read and changed. Radix gives dialogs,
menus and toasts their keyboard and screen-reader behaviour. A native
`<select>` (`NativeSelect`) is used where the platform's own picker is better
— a phone's wheel, free accessibility — at the price of styling its open list
by hand for dark mode on Windows (the options in 2026-10, the optgroup
labels in 2026-11, decisions §5 and §36).

**Hand-written API types, not generated ones.** `openapi-typescript` was set
up in Phase 0 and removed at the end of Phase 5: nothing imported its output,
because routes without a declared response produced empty types, and its
TypeScript-5 peer requirement forced `--legacy-peer-deps` on every npm
command. Each `<area>/types.ts` is checked against the backend's code or a
real answer. The cost is named under "Known limits": a renamed field is
caught by the browser suite and by review, not by the compiler.

**`socket.io-client` for messaging**, behind an adapter of four methods
(below), authenticated by the same session cookie as HTTP. The person chose
it over rewriting the gateway on plain WebSockets: instructive, but
reconnection, acknowledgements and rooms would have been ours to write and
test (decisions §7).

**Special-purpose libraries, each chosen for one job:** `@dnd-kit` (drag to
reorder, with keyboard dragging and announcements we word ourselves),
`react-easy-crop` (the avatar, with our own zoom slider and a 10 px arrow-key
step because the library's 1 px needed hundreds of presses), `@sentry/react`
(error reports, decisions §32). Charts are **hand-drawn SVG**: two small
charts didn't justify a chart library, and drawing them made every decision
(gaps, scales, readouts) a pure, tested function (decisions §6, §36).

**Fonts self-hosted** through `@fontsource-variable`: Geist by default,
Atkinson Hyperlegible Next behind an "Easier-to-read font" setting, each
downloaded only when used (decisions §39).

**Vite 8 with Rolldown, pinned to an exact version** (8.3.5). The build
relies on an experimental option (an import map, under "Delivery"), so an
upgrade is a deliberate edit followed by the browser suite and
`npm run check:cache-names`.

**Tests:** Vitest with Testing Library in jsdom, and Playwright in Chromium
against the real backend ([`TESTING.md`](TESTING.md)). **Lint:** oxlint, then
ESLint with type-checked rules.

---

## The layout and the three homes

**One navigation model for every role** (decisions §1). From 768 px up
(Tailwind's `md`, where an iPad in portrait begins), the sections sit in a
top bar with the logo, the Settings menu and the account menu. Below it, the
sections move to a **bottom tab bar, for every role**: chosen over a
hamburger because sections stay visible and within thumb reach, which
matters most for patients, who are phone-first. A tab bar fits about five
items, which became the ceiling on sections per role; Profile is
deliberately not a section (it is in the account menu), freeing a slot. Both
navigations are always in the page and CSS shows one, so the first paint is
right without measuring the window. One list of sections per role
(`sections.ts`) feeds both, and a test holds its rules.

| Role | Sections |
|---|---|
| Admin | Home, Clinics, Users, Audit log |
| Practitioner | Home, Patients, Library, Programs, Messages |
| Patient | Home, Sessions, Team, Messages |

**A patient's medical record is not a section.** "My records" sits in the
profile area: it belongs to the patient, tab space is limited, and
practitioners see the record on the patient page instead (decisions §2).

**Sections that didn't exist yet stayed in the navigation** and opened a
shared "Coming soon" page, so the navigation's shape didn't change as
features shipped. It was deleted once Messages, its last user, was built.
From Phase 3 the rule hardened: **no button leads to a placeholder** — an
action appears when its screen exists (the Start button arrived with the
session flow, "Message" with messaging).

**The homes share building blocks, not a component** (decisions §3).
`HomeGreeting`, `HomeSummaryCard` and `HomeShortcuts` are composed by each
role's page rather than one home branching on the role, so the patient's
card (Today, then Upcoming, stacked at every width because a patient's lines
would be squeezed to a few words side by side at 375 px) is a new
arrangement, not an edit to shared code. The practitioner's card has
Messages and **For review** (renamed from "To-do" after live testing: alerts
computed by the backend per request, each with a way off the list the
practitioner controls). The admin's home has metrics and recent activity
that refresh every minute while the tab is visible (decisions §17, §29).

**One `/profile` for everyone** (decisions §4), showing the role-specific
section of **every role the account holds**, not only the active one: the
fields belong to the person, and the backend checks them against the
account's roles, not the active one. The same editable fields edit any user,
so `/profile`, the admin's user page and the practitioner's patient page
share them.

**Preferences live where their scope says** (decisions §1, §39): the theme
belongs to the device (light, dark or system, applied before the first paint
by an inline script); the weight unit, the font and the new-message emails
belong to the account and follow the person. The font was first built per
device, until one person's setting reached the next person on the same
computer; it moved to the account, with a device copy kept only while
someone is signed in.

**Weights are never converted where they are stored** (decisions §1). A
prescription keeps the unit it was written in; the viewer's preferred unit
pre-selects the unit when entering a weight, and a weight in the other unit
is shown converted with the prescription beside it: "44.1 lbs (20 kg)".

---

## The screens and the backend's rules

The frontend decides nothing that matters. Every permission and every rule
is the backend's, enforced in its services and again in the database. What
the frontend decides is what to show, what to suggest and how to say it.
Several conventions follow from that.

**The screen arranges and words; it never judges.** Whether a scheduled day
was done, made up, missed or due is answered by the backend's schedule
module; the program pages only cut its answer into weeks around a focus week
and put words on it (decisions §5). Every state's words live in a `Record`
keyed by the API's union (`DAY_STATE_BADGE: Record<DayState, …>`), so the day
the backend adds a state, the frontend fails to compile until it has words
for it. When a label is wrong, the fix goes where the label came from: Pat's
session done on a free day for a later day was labelled "swapped", the
person pointed out that a swap is an exchange, and the correction went into
the backend's model (`done_early`), not into the screen's words.

**Rules on the server, suggestions on the screen.** "Do the on-time catch-up
before a late make-up" was first written as a server refusal; the person
asked whether the coming Sessions hub would then refuse the late one, and it
would have. The preference became the home's ordering and the hub offers
both (decisions §5, "Corrected 2026-10-17"). A server rule binds every client
for ever; a screen's ordering binds one screen.

**When the screen can't see what decides, it asks.** Whether cancelling a
program deletes it depends on whether any session exists, unfinished ones
included, which the page can't see. So the dialog asks the backend
(`GET …/closing`, the same function the close itself runs) on every opening,
and its confirm button stays disabled until the answer is in. The removal of
a program exercise works the same way, and the notice afterwards is read
from the write's answer, not from the preview: a session can start between
the two (decisions §5).

**When the rule is plain, the screen mirrors it to describe it**, never to
decide. Moving a program's end date says, before saving, what a shorter end
cuts off, by mirroring the summary's weekly arithmetic; the backend still
decides. A mirrored rule is **stricter, never looser** — with one lesson
learned: an editor that sends a whole list when one item changes must accept
everything already stored. A 500-character step limit on the page, stricter
than the backend's, would have made a 744-character imported step unsavable,
so the limit became the backend's 1,000 (decisions §5, D-3).

**Privacy is decided by what the API sends, not by what a screen draws.** A
field the response carries is one click away in the network tab, hidden or
not. So when a screen needed less, the backend sent less: the clinic
directory shows only the clinics a practitioner shares with a patient; a
patient's view of their care team has no staff `reason` key at all; another
person's font setting never leaves the server (decisions §3, §2, §41).

**Pages that would trigger an audited read don't read until opened.** The
patient page shows the medical file as a link card with no data: a count or a
date would need the list, and the list is a logged read, so every visit to
the patient page would have said "viewed the medical file". After saving an
entry the file is invalidated, not patched, so what the trail says was shown
is what the server sent (decisions §8). The range-of-motion page reads the
medical file only to name a linked note, and only when an assessment is
linked to one (decisions §36).

---

## Server state, writes and freshness

**Optimistic only where the result is predictable and waiting would be
felt**: the patient's ticks, ratings and notes during a session, dragging
exercises and photos into a new order, the settings menu's switches. The
requests run one at a time (a mutation `scope`), only the last answer is
written, and a failure undoes only the fields its own change touched
(decisions §5, pass (b)). Everything whose result depends on the server waits
for it: a move or a copy (new ids, positions), a schedule change, closing a
program, sending a message, choosing which photos a patient sees.

**A page that decides an action waits for this visit's own answer.** The
start page once sent a patient back into a session they had just stopped: it
decided from a summary cached while it was still mounted. Pages that decide
(start, finish, a make-up's `?for=`) now ask with `staleTime: 0` and wait for
`isFetchedAfterMount`; pages that only show keep the cache (decisions §5,
pass (c)).

**A link carries an id; the page derives the rest from the server's rules.**
The start page's address names the program, never the workout: the page asks
the same `todayStatus` rule the home asked, so a stale link can't start
yesterday's workout. A make-up's `?for=` is a request, checked against a fresh
summary by the very function the hub's buttons came from (decisions §5).

**After a write: the answer into the cache, or the lists stale.** Most
program and session routes answer with the whole record so the page can write
it into the cache (`setQueryData`) with no request; lists are marked stale
rather than patched, because a list row has its own shape and the server
builds it. Query keys are nested on purpose, so one invalidation by prefix
reaches everything below it.

**Losing access is handled in order.** Leaving a patient's care team switches
the patient query off, navigates away with `replace` (Back can't land on a
page now forbidden), and then *removes* the patient's data from the cache
rather than invalidating it, which would refetch and briefly show a 403
(decisions §3).

**The address is state.** Filters and pages of the users list and the audit
log live in the query string, so Back, a reload and a shared link show the
same view; a search is committed 300 ms after the last keystroke and
*replaces* the history entry, so Back doesn't step through letters
(decisions §11, §29).

**Calendar dates are strings.** A day is `YYYY-MM-DD` from the device's own
day, never a `Date` at midnight UTC, and the app sends its "today" with every
request whose answer depends on it, because the server can't know the
patient's day (decisions §5).

---

## Messaging

Designed with the person before any screen (decisions §7).

- **One live connection per signed-in identity**, opened by a provider the
  layout renders only once `/auth/me` has answered, keyed by user and role:
  a role switch mounts a new provider and closes the old socket, so one
  socket never carries two identities. Admins have no Messages and get no
  connection.
- **An adapter of four methods** (`onServerEvent`, `onConnectionChange`,
  `send`, `close`) is the only code that knows the library exists; tests pass
  a fake with the same four. Since Phase 7 the library downloads on demand
  inside the adapter, which still returns its interface synchronously.
- **Events are written into the query cache** by pure functions, and REST is
  the truth: everything under `['conversations']` is refetched on every
  (re)connection, because the server doesn't replay what a sleeping tab
  missed.
- **A message is shown once the server has stored it** (the person's
  choice). Sending waits for the acknowledgement ("Sending…", the text kept
  until stored, the server's reason on a refusal). An optimistic bubble was
  considered and deferred: it needs a "failed, retry" state per message.
- **Two panes on a desktop** (the person's choice, against a single-column
  recommendation): the list beside the open conversation from 768 px up; one
  at a time on a phone.
- **A former care-team member's conversation stays, read-only** (the
  patient's history), and **admins read no message content** — oversight is
  the audit trail of who wrote to whom, and when.
- **"Seen" with its time**, under my newest message only while it is the
  newest standing; a **trash icon** on my unread messages only while the
  15-minute delete window lasts, behind a confirmation that outlives its
  button; **archive** in the conversation's header. The device's clock only
  estimates the window: the server judges, and its 409 is shown in its own
  words.

---

## Accounts, sign-in and security screens

- **Accounts by invitation only** (decisions §3). Public self-registration
  was built in Phase 1 and removed in Phase 3: nobody sets another person's
  password. "First time? Set up Stride" appears on the sign-in page only while
  no admin exists, asked of the backend (`GET /auth/setup-status`) and shown
  only when the answer is a definite "not set up" — while loading or after a
  failure the answer is unknown, and unknown shows no link.
- **Pages an email links to sit under no route guard**: the person may have
  no password yet or be unable to sign in. Each reads its token from the
  address once and removes it, so it isn't left in the history (decisions §3,
  §9, §12).
- **A link that changes something acts on a button, never on load** (the
  email change's confirm and cancel pages, the records download). Mail
  scanners and link previews open every link in an email before the person
  does; only a person's press may change a sign-in address or spend a
  download (decisions §12, §20).
- **Changing the email, the password or two-factor asks for the current
  password again** (and the code, when two-factor is on): a session proves a
  sign-in happened, not who is at the keyboard now. Those pages read the
  account again as they open, because two-factor may have been turned off on
  another device (decisions §12–§14, §26).
- **Recovery codes are handed over with Copy all, Download and a tick** ("I've
  saved my recovery codes") before Done (decisions §14).
- **The way back after signing in belongs to its owner.** Signing out on a
  page once sent the *next* person to sign in on that browser to it; the way
  back now carries the account's id and is honoured only for that account
  (decisions §40).
- **Demo mode**, for reviewers of the deployed app: when the backend says it
  is on, the sign-in page shows four published accounts, each with a "Use"
  button that *fills* the form rather than signing in, so a reviewer meets the
  real steps, two-factor included (decisions §46).

---

## States, words and feedback

Every screen follows the same few rules, each with its component and, for the
first three, a convention test that names any file breaking it (decisions
§15, §23, §24, §33).

- **One wording rule for failures.** `failureText()` gives the backend's own
  words for a refusal (it writes them for people), "Something went wrong on
  our side. Try again in a moment." plus an 8-character reference for a 5xx,
  and "check your connection" when no answer came. Before it, 51 places in 45
  files each had their own wording; a component that reads an error's
  messages itself now fails the build.
- **Load errors say what couldn't load, why, and offer Try again**, which
  refetches only the failed requests and, when it works, moves focus to the
  new content's heading. Records that row security may hide (a program, a
  session, a conversation, a file entry) are "not available" — the record may
  exist, hidden from this person — never "not found"; records with no such
  rule are "not found", with links out (the person chose both wordings).
- **Loading states wait 200 ms** (most answers come sooner), then show a
  skeleton for lists and the homes' cards and a sentence elsewhere, in a
  status region that is announced, with reduced motion respected.
- **Snackbars only for what has no place on screen**: a confirmation after a
  page has gone, a failure of a menu switch. A field's refusal stays at its
  field and a load error in its section. A success hides after 5–10 s by its
  length (paused on hover, focus or a background window); a failure stays
  until closed; there is no Undo. They were first handed over in navigation
  state, which the browser keeps across a reload: the old notices came back
  on every refresh.

**Accessibility is a convention of every screen**, checked by the tests where
jsdom can see it and in Chromium where it can't: every control named, focus
moved deliberately (to the next item after a removal, to the content after a
retry, back to the link that opened a page), changes announced through live
regions that exist before their text, colour never the only carrier of a
meaning (the roster's "not one of your clinics" badge is dashed *and* says so
to screen readers, decisions §30), every colour pair at WCAG AA in both
themes, a 16 px gutter at 375 px.

---

## Look

- **The logo's dark teal is the primary colour; coral is an accent only**,
  never a button or a text colour: it fails AA with white text, and darkened
  enough to pass it reads as the destructive red. Warm greys for the rest.
- **The palette is tokens in OKLCH**, light and dark, and a test reads the
  real stylesheet and checks every pair the screens use against WCAG AA,
  with the colour maths written in the repository rather than imported.
- **Initials avatars take one of three tints** (teal, coral, sand) picked
  from the user's id by a hash, so a person has the same colour on every
  screen and device; pale tints with dark text, because white initials on
  coral fail contrast.
- **The room under each page belongs to the layout**: it was written in 30
  pages and forgotten in 55, so the layout owns it and Messages opts out
  through its route's `handle`. No footer and no credit line (the person's
  choice).
- **Patients see only the Stride logo**, never a clinic's (decisions §43).

---

## Delivery and performance

**Measured before it was changed** (decisions §5 "Bundle size", §45). The
first build warning was one 1.6 MB file, 40 % of it a library's geographic
data. Three passes followed:

1. **Every page loaded on demand** (31 routes then, 64 now), with the shell —
   guards, layouts, the sign-in page — kept static so a signed-out visitor's
   first screen waits for no second file; `routes.test.ts` fails if a page is
   added statically. **Address data generated** into two JSON files (640 →
   125 kB), with a test that fails when the source would change them. The
   source was `country-state-city` until 2026-11, then **Unicode CLDR**
   (129 → 80 kB built): the library is GPL-3.0, whose copyleft an Apache 2.0
   repository that ships its data can't honour, while CLDR's Unicode License
   v3 asks only that its notice travel with the data (`LICENSE-CLDR.txt`,
   named in `NOTICE`). CLDR is also what browsers and ICU use, kept in step
   with ISO 3166-2. The level of each country's list was chosen by what its
   addresses name: CLDR's top level, except provinces or counties in Italy,
   Spain, Ireland, the Philippines, Indonesia, Iraq and the Dominican
   Republic, and no list (a free-text field) for France and the United
   Kingdom, whose addresses have no such line. Stored addresses were
   unaffected: the database keeps a country's code, the same in every
   source, and a state's name as typed or picked.
2. **A page file missing after a deploy** — the duty code splitting brings:
   an old tab asks for yesterday's names. One automatic reload, at most once
   per 10 seconds, and an error page instead of a loop.
3. **The hash cascade**: one changed page renamed 129 of 224 files, because a
   file's imports are part of its content. React, React DOM and React Router
   went into a `framework` file, `socket.io-client` and the Sentry SDK load on
   demand, and Vite's experimental **import map** made one changed page rename
   one file. A returning visitor after a one-page deploy: 475 kB → 21 kB.

Today's first download is 12 files, 768.75 kB (235.44 kB gzipped).

**Error reports name no patient** (decisions §32). The rule is the
backend's: nothing that leaves the browser or the server names or locates a
patient. The Sentry SDK is loaded after the page, with every data-collection
option off and the report rebuilt from an allow-list; it is sent through our
own API (`POST /monitoring`), which rebuilds it again before passing it to a
self-hosted GlitchTip. Only real bugs report — a crash, an uncaught error —
never an answer the server chose to give. The same server-made request id is
on the screen ("Reference: 2dc325cf"), in the logs and in the report.

**Deployed on 2026-11-03:** `https://stridecare.app` on Cloudflare Pages for
this app, `https://api.stridecare.app` for the API. What the host needs
(unknown paths answered with `index.html`, `index.html` not cached) and the
build settings are in [`DEPLOYMENT.md`](DEPLOYMENT.md); ARCHITECTURE's
[§12](ARCHITECTURE.md#12-open-items) lists what is still open.

---

## Development practices

- **Design with the person, then build in passes.** Each feature was
  proposed — as screens when it had any — its choices made by the person, and
  built in passes, each confirmed green on the person's machine before the
  next. The decisions log records each choice with what was rejected.
- **Decisions as pure functions, words beside them.** `…Rules.ts` files hold
  the decisions (no React, no network, no clock read: today is passed in),
  `…Text.ts` files the words, and components arrange what they return
  ([`ARCHITECTURE.md` §2](ARCHITECTURE.md#2-the-source-tree)).
- **Mutation testing, by hand.** After each pass, deliberate bugs are put into
  the new code and the tests must fail. A survivor is either a missing test or
  dead code, and which one is proven before acting; several pieces of focus
  and cache code were removed that way, with a comment saying why.
- **Rules checked across the whole codebase by tests**: one wording for
  failures, one for load errors, loading states through one component, every
  page lazy, no two file names differing only by case (a Windows bug: two
  names Linux saw as different resolved to one file), no static import of the
  messaging library.
- **What jsdom can't show is checked in a real browser**: each pass was
  walked through in Chromium against the real backend at 375 and 1280 px,
  light and dark; date code runs again under `TZ=America/Montreal` and
  `TZ=Europe/Paris`, where a local-time bug shows that UTC hides.
- **Fixtures where rules disagree.** A test of a sort "with accents" passed
  for the wrong reason because its names sorted the same with a plain `<`; a
  test of "the end of workout B" passed with workout A's position because
  both ended at 2. Each rule gets the case the naive version gets wrong.
- **Line endings**: the working copy is on Windows, and most source files
  are CRLF; an edit keeps each file's own line endings, so a diff shows only
  what changed.
- **AI assistance, reviewed.** Much of the code and documentation was written
  with an AI assistant (Claude). The rule throughout was root causes over
  patches, real verification over "should work", and every ambiguity raised
  rather than guessed. The person reviewed, ran and confirmed each pass, and
  found several of the bugs the journal tells by using the app.

### CI: parked while private, on since going public

The workflow ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) has
two jobs: `checks` (type check, lint, Vitest, build) and `browser` (the
Playwright suite against the backend's `main`, the twin of the backend's own
browser job). It was rehearsed in the sandbox from fresh clones, and runs on
GitHub since the repositories went public.

While the repositories were private, `.github/` was listed in this
repository's **`.gitignore`**: no Actions minutes were spent and no token was
held. Decisions §38 records a different plan — `.git/info/exclude`, with
`.gitignore` rejected because reviewers would see the line and it costs two
commits — but the person chose `.gitignore` when applying it (2026-11-03).
When the repositories went public, the line was removed and `.github/`
committed.

---

## Known limits and what's deferred

Postponed on purpose, each with its reason. None is an unknown.

**What the app doesn't do**
- **No offline mode**: no service worker, nothing kept between visits. Every
  screen needs the network, and the cache is emptied on sign-out.
- **English only**: words are written in the code, many in `…Text.ts` files;
  dates and numbers follow the browser's locale.
- **One role at a time per browser**: the active role belongs to the
  server-side session, which every tab shares.
- **Optimistic message sending** (deferred, above), **admin cross-clinic
  dashboards** (admins read no clinical row, so what they would show needs
  defining first), **a practitioner's own to-do list** beside "For review"
  (a new backend table), **keyboard shortcuts in the session player**, and a
  **React Native client** (a project of its own).

**Engineering**
- **Hand-written API types**: a renamed field is caught by the browser suite
  and by review, not by the compiler.
- **The browser suite runs Chromium only**; Firefox, WebKit and an automated
  accessibility scan are deferred ([`TESTING.md`](TESTING.md#what-the-suites-dont-cover)).
- **The import map is an experimental Vite option**, hence the exact pin.
- **Screens that pick from every account** (the audit log's person filters,
  the merge page) still read the whole users list; the paged admin route
  serves only the Users page.
- **Signed photo URLs are stable for an hour only for the library's
  thumbnails**; avatars, logos and program photos are signed afresh, so a
  refetch downloads them again.

**Still to do now that it's deployed**
- A Content-Security-Policy that allows the two inline scripts by their
  hashes ([ARCHITECTURE §12](ARCHITECTURE.md#12-open-items)).
- To check that a portrait photo from a real phone keeps its orientation through the
  avatar crop (only tested with files on a computer).
- One person's Chrome never sent file uploads from disk (Firefox, Edge and a
  Node script did, on the same machine). It wasn't Stride, and stays recorded
  so nobody goes looking for it in the code (decisions §5).
