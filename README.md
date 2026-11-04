<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/stride-dark.svg" />
    <img src="docs/assets/stride-light.svg" alt="Stride logo" width="250" />
  </picture>

  # Stride — frontend

  **Physiotherapy practice management: the web app**

  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
  ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix-000000?logo=shadcnui&logoColor=white)
  ![React Router](https://img.shields.io/badge/React_Router-8-CA4245?logo=reactrouter&logoColor=white)
  ![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
  ![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)
  ![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)
  ![Cloudflare Pages](https://img.shields.io/badge/Hosted_on-Cloudflare_Pages-F38020?logo=cloudflarepages&logoColor=white)
  ![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

  <br />

  [Live demo](https://stridecare.app) ·
  [Backend repository](https://github.com/julienjave/Stride-backend) ·
  [Architecture](./docs/ARCHITECTURE.md) ·
  [Design decisions](./docs/stride-design-decisions.md) ·
  [Journal](./docs/journal/README.md)
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Documentation & links](#documentation--links)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Technical Highlights](#technical-highlights)
- [Lessons Learned](#lessons-learned)
- [Future Improvements](#future-improvements)
- [Production Readiness — what would change for real patients](#production-readiness--what-would-change-for-real-patients)
- [A note on multi-tenancy](#a-note-on-multi-tenancy)
- [License](#license)

---

## About the Project

A physiotherapy practice-management system: admins run the practice's
clinics and accounts, practitioners build exercise programs and assign them
to their patients, patients complete them session by session and message
their practitioners in real time. This repository is the frontend — a
React single-page app, phone-first for patients. The backend, a NestJS API
over PostgreSQL with row-level security on every table, is its own
repository, [`Stride-backend`](https://github.com/julienjave/Stride-backend),
which decides every permission and every rule; this app decides what to
show, what to suggest, and how to say it.

This is a bootcamp capstone, built specifically to demonstrate real
frontend, backend and infrastructure understanding rather than CRUD. On
this side, that meant rules written as pure functions and tested with plain
values, charts drawn by hand rather than imported, a bundle measured and
designed rather than accepted, and tests that are themselves tested by
putting deliberate bugs into the code.

> [!NOTE]
> **Status: live** at [stridecare.app](https://stridecare.app), served by
> Cloudflare Pages, with the API at `https://api.stridecare.app`. The
> reviewers' demo mode is on: the sign-in page lists four published
> accounts, and the demo resets every night. The deployment was done by
> following the deployment guide from start to finish.

---

## Key Features

- 🏠 **Three homes, one navigation model.** Each role gets a home built
  from shared parts: the patient's *Today* and *Upcoming*, the
  practitioner's messages and **For review** (alerts the backend computes,
  each with a way off the list), the admin's metrics and recent activity.
  Sections sit in a top bar on a desktop and a bottom tab bar on a phone,
  for every role.
- 🏋️ **The practitioner's loop.** An exercise library with photos, program
  templates built in a drag-to-reorder workout editor, programs assigned
  and tailored per patient, schedules changed from a chosen day, and each
  program shown week by week as the backend's schedule summary describes
  it.
- 📱 **The patient's loop, on a phone.** Today's workout, a session player
  with ticks, ratings, notes, a hold countdown or a stopwatch, make-ups for
  missed days, and hand-drawn charts of pain and mobility over time.
- 📋 **The clinical record.** SOAP notes and range-of-motion assessments,
  corrected by amendment, with pages that don't read an audited record
  until someone actually opens it.
- 💬 **Real-time messaging.** One live connection per signed-in identity,
  two panes on a desktop, a message shown once the server has stored it,
  "seen" with its time, and a delete button only while the server's
  15-minute window lasts.
- 🔐 **Account and security screens.** Invitations instead of sign-up,
  two-factor set-up with recovery codes handed over deliberately, email and
  password changes behind re-confirmation, and pages reached from an email
  that act on a button press, never on load (mail scanners open links
  first).
- 🔎 **Record access with a trace.** A patient's own record as a PDF,
  complaint reviews and legal disclosures for admins, duplicate patients
  merged step by step, and the audit log with its filters in the address
  bar.
- 🗣️ **Honest states and plain words.** One wording rule for every failure
  (with a reference to quote), "not available" rather than "not found"
  where row security may be hiding a record, loading states that wait
  200 ms before showing anything, and accessibility as a convention of
  every screen: named controls, deliberate focus, announced changes, WCAG
  AA contrast in both themes.
- 🎬 **A reviewers' demo mode.** When the backend says it's on, the sign-in
  page lists four published accounts whose "Use" button fills the form, so
  a reviewer meets the real steps, two-factor included.

---

## Tech Stack & Architecture

### Core

| Technology | Purpose |
| --- | --- |
| [TypeScript 6](https://www.typescriptlang.org/) | `strict`, `erasableSyntaxOnly` |
| [React 19](https://react.dev/) | The UI library |
| [Vite 8](https://vite.dev/) with Rolldown | Dev server and production build (pinned to 8.3.5), an import map for stable file names |

### UI & styling

| Technology | Purpose |
| --- | --- |
| [shadcn/ui](https://ui.shadcn.com/) over [Radix](https://www.radix-ui.com/) | Accessible components, copied into the repository to be read and changed |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling, with the palette as OKLCH tokens for the light and dark themes |
| [lucide](https://lucide.dev/) | Icons |
| [Fontsource](https://fontsource.org/) | Geist by default, Atkinson Hyperlegible Next for the "Easier-to-read font" setting, both self-hosted |
| [dnd kit](https://dndkit.com/) | Drag-to-reorder in the workout editor |
| [`react-easy-crop`](https://github.com/ValentinH/react-easy-crop) | The avatar's crop dialog |
| Hand-drawn SVG | The charts — no chart library |

### Routing, data & forms

| Technology | Purpose |
| --- | --- |
| [React Router 8](https://reactrouter.com/) | The data router, every page loaded on demand |
| [TanStack Query 5](https://tanstack.com/query) | Server state — and no store mirroring it |
| [Zustand](https://zustand.docs.pmnd.rs/) | The snackbars, and nothing else |
| [react-hook-form](https://react-hook-form.com/) + [zod](https://zod.dev/) | Forms and their validation |

### Real-time & observability

| Technology | Purpose |
| --- | --- |
| [`socket.io-client`](https://socket.io/) | Messaging, behind a four-method adapter, loaded on demand |
| `@sentry/react` → [GlitchTip](https://glitchtip.com/) | Error reports, sent through the API to a self-hosted GlitchTip |

### Hosting

| Technology | Purpose |
| --- | --- |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Serves the static files |

### Testing & tooling

| Tool | Purpose |
| --- | --- |
| [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) in jsdom | Unit and component tests (277 files / 3,621 tests, 2026-11-03) |
| [Playwright](https://playwright.dev/) | The browser suite, in Chromium against the real backend (15 tests) |
| [oxlint](https://oxc.rs/docs/guide/usage/linter.html), then [ESLint](https://eslint.org/) | Linting, with type-checked rules |
| `scripts/check-doc-links.mjs` | Checks every link in the documentation (`npm run docs:links`) |

Everything on screen comes from the backend's REST API and its Socket.IO
connection, both authenticated by one `httpOnly` session cookie that
JavaScript never sees. The app as it stands is described in
[**`ARCHITECTURE.md`**](./docs/ARCHITECTURE.md), and the reasons behind each
choice — including the ones reversed, such as generated API types removed
in favour of hand-written ones — in [`PROJECT.md`](./docs/PROJECT.md).

---

## Documentation & links

| Document | What it's for |
| --- | --- |
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | The app **as it currently stands** — the source tree, start-up, routes and guards, talking to the API, server state, messaging, the shared states, the look, error reporting, the build. Living, not historical. |
| [`PROJECT.md`](./docs/PROJECT.md) | The decisions and their reasons, by topic, ending with what's deliberately deferred. |
| [`TESTING.md`](./docs/TESTING.md) | The suites: how to run them, what each proves, the techniques, and what they don't cover. |
| [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Running it locally, the build's settings, what the host must do, and the first deployment on Cloudflare Pages, with how to verify it. |
| [`docs/journal/README.md`](./docs/journal/README.md) | One entry per build phase — the decisions and bugs worth telling as a story — with a "Start here" path of three. |
| [`stride-design-decisions.md`](./docs/stride-design-decisions.md) | The design-decisions log: every feature designed with its options weighed and the rejected ones kept, §1–§47. The code's comments, in both repositories, cite it as "decisions §N". |
| [The backend repository](https://github.com/julienjave/Stride-backend) | The other half: the API reference, its architecture (data, row-level security, the audit trail), its tests, the server's deployment guide, and a 42-entry journal. |
| [The demo accounts](https://github.com/julienjave/Stride-backend/blob/main/docs/demo-accounts.md) | The backend's `docs/demo-accounts.md`: the seeded accounts, their password, and what each one shows. |

---

## Getting Started

This is the short version, for local development. Production builds, the
settings a deployed build needs and the host's side are in
[`DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

### Prerequisites

- [Node.js](https://nodejs.org/) **24**
- npm (comes with Node.js)
- **The backend, running locally** — follow its README's
  [Getting Started](https://github.com/julienjave/Stride-backend/blob/main/README.md#getting-started)
  (or its [`DEPLOYMENT.md`, Part 1](https://github.com/julienjave/Stride-backend/blob/main/docs/DEPLOYMENT.md#part-1--local-development)),
  so that the API answers on `http://localhost:3000` and Mailpit's inbox is
  on `http://localhost:8025`

> [!TIP]
> The unit tests (`npm test`) need no backend at all. Only the app itself
> and the browser suite do.

### Installation

1. **Clone the repository** beside the backend

   ```bash
   git clone https://github.com/julienjave/Stride-frontend.git frontend
   cd frontend
   ```

   Keep both folders in the same parent folder: the browser suite looks
   for the backend at `../backend`, then `../Stride-backend`.

2. **Install the dependencies**

   ```bash
   npm ci
   ```

   `npm ci` installs exactly the versions recorded in `package-lock.json`.

3. **Point it at another API (optional)**

   The app calls `http://localhost:3000` by default. To use another
   address, create a `.env.local` file at the root of the project:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Then open <http://localhost:5173>, the origin the backend allows by
   default.

### First checks

- Sign in with any of the backend seed's accounts — the password is
  `password123` — for instance `alex@stride.test` (a practitioner),
  `pat@stride.test` (a patient) or `admin@stride.test`. All of them are in
  [the demo accounts](https://github.com/julienjave/Stride-backend/blob/main/docs/demo-accounts.md).
- Every email the app makes the backend send (an invitation, a password
  reset) lands in Mailpit, at <http://localhost:8025>.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload on <http://localhost:5173> |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run Vitest, every file once — no backend needed |
| `npx tsc -b` | Type-check the whole project |
| `npm run lint` | Run oxlint, then ESLint |
| `npm run test:e2e` | Run the browser suite: it builds and starts the backend itself (see [`TESTING.md`](./docs/TESTING.md#the-browser-suite) for where it looks and what it starts) |
| `npm run check:cache-names` | Build twice, with one page changed, and fail if anything but that page's file was renamed (the long-term caching guard) |
| `npm run docs:links` | Check every link in the documentation |
| `npm run generate:address-data` | Regenerate the country and subdivision lists from the Unicode CLDR |

---

## Project Structure

```text
frontend/
├── src/
│   ├── main.tsx, App.tsx     # start-up
│   ├── api/                  # the one HTTP funnel, the query client, the words of a failure
│   ├── app/                  # routes, guards, layouts, navigation, the three homes
│   ├── common/               # shared components and pure helpers
│   ├── components/ui/        # shadcn's components, copied in to be read and changed
│   ├── theme/  snackbars/  observability/
│   ├── auth/  two-factor/  invitations/  password-change/  email-change/  users/  clinics/  patient-merges/  demo/
│   ├── exercises/  programs/  workouts/  assigned-programs/  sessions/  progress/
│   ├── patients/  team/  medical-files/  range-of-motion/  alerts/
│   ├── messages/
│   └── records-export/  complaint-reviews/  legal-disclosures/  audit-log/
├── e2e/                      # the browser suite (Playwright)
├── scripts/                  # build-time tools: the address data, the cache-name check
└── docs/                     # architecture, decisions, testing, deployment, the journal
```

The area folders follow the backend's module names, so a screen's code
sits under the same name as the routes it calls. Inside an area, files are
named by what they do, and tests sit beside the code:

| File | What it holds |
| --- | --- |
| `api.ts` | The requests and their query keys |
| `types.ts` | The answers' shapes |
| `use….ts` | One query or mutation |
| `…Rules.ts` | **Pure** decisions — no React, no network, no clock read |
| `…Text.ts` | The words a rule's outcome is said in |
| `…Page.tsx` | One route |

---

## Technical Highlights

### The screen arranges and words; it never judges

Whether a scheduled day was done, made up, missed or due is the backend's
answer; the program pages cut it into weeks and put words on it. Every
state's words live in a `Record` keyed by the API's union type, so the day
the backend adds a state, this app fails to compile until it has words for
it.

### Optimistic only where the result is predictable and waiting would be felt

A patient's ticks during a session, drag-to-reorder, the settings switches.
Those requests run one at a time, only the last answer is written, and a
failure undoes only the fields its own change touched. Everything whose
result depends on the server (a move, a schedule change, sending a
message) waits for it.

### Privacy is decided by what the API sends, not by what a screen draws

A field in a response is one click away in the network tab, hidden or not,
so when a screen needed less, the backend was changed to send less. And a
page doesn't fetch a record whose read is audited until the person opens
it, so the audit trail says what was actually seen.

### Error reports that name no patient

The Sentry SDK loads after the page, with every collection option off and
each report rebuilt from an allow-list; it goes through the API's own
`POST /monitoring`, which rebuilds it again before a self-hosted GlitchTip
sees it. The same server-made request id is on the screen ("Reference:
2dc325cf"), in the logs and in the report.

### A bundle measured, then designed

The first build was one 1.6 MB file, 40 % of it a library's geographic
data. Every page now loads on demand (64 routes), the address data is
generated into two small JSON files (640 → 80 kB), a missing file after a
deploy reloads the app once, and an import map stops one changed page from
renaming 129 of 224 files: a returning visitor after a one-page deploy
downloads 21 kB instead of 475.

### Rules checked across the whole codebase by tests

One wording for failures, loading states through one component, every
page lazy, no two file names differing only by case, no static import of
the messaging library — and a test that reads the real stylesheet and
checks every colour pair against WCAG AA, with the colour maths written
here rather than imported.

### Tests that are tested

After each pass, deliberate bugs were put into the new code and the tests
had to fail; a survivor was either a missing test or dead code, and which
one was proven before acting. Date code runs again in Montreal's and
Paris's time zones, where a bug UTC hides shows.

---

## Lessons Learned

The [journal](./docs/journal/README.md) is the full version; a few of the
more instructive moments.

### 1. A page that decides must wait for this visit's answer

The start page once sent a patient back into a session they had just
stopped, because it decided from a summary cached while it was still on
screen. Pages that decide now wait for a fresh answer; pages that only show
keep the cache.

### 2. What belongs to a person must not stay with the device

The easier-to-read font was first a device setting, until one person's
choice reached the next person on the same computer; the way back after
signing in once sent the *next* person to sign in to the previous one's
page. The font now belongs to the account, and the way back carries the
account's id and is honoured only for that account.

### 3. A wrong label is a wrong model

A session done on a free day for a later day was labelled "swapped"; the
person pointed out a swap is an exchange. The fix went into the backend's
model ("done early"), not into the screen's words.

### 4. Some bugs only a real browser, another OS, a time zone or a person can show

The browser suite found a frozen role switch on its first run; Windows
resolved two file names Linux saw as different to one file; a date bug
appeared only outside UTC; several account-page bugs were found only by
using the pages.

### 5. A test that passes for the wrong reason proves nothing

A sort "with accents" passed because its names sorted the same with a
plain `<`. Each rule now gets the case the naive version gets wrong.

---

## Future Improvements

What's next for the screens. Items that are mostly server work — the audit
purge, cacheable photo URLs, the records PDF's fonts, more than one API
instance — and the full detail of each shared item are in the
[backend's README](https://github.com/julienjave/Stride-backend/blob/main/README.md#future-improvements);
[`PROJECT.md`'s "Known limits"](./docs/PROJECT.md#known-limits-and-whats-deferred)
gives each postponed item its reason.

### 🖥️ In this repository

- **Optimistic UI for sending messages.** Today a message appears once
  stored ("Sending…" until then); a bubble shown at once needs a "failed,
  retry" state per message.
- **A React Native mobile client** — a project of its own, against the same
  API.
- **The avatar's photo orientation (EXIF) checked with a real phone
  photo**, now that the app can be opened from a phone; and a rotate
  button in the crop dialog.

### 🔗 Across both repositories

Each of these needs server rules and screens.

- **Requiring two-factor sign-in for admins** — the one that matters, since
  admins hold the most power; it changes the sign-in flow.
- **Legal disclosures**: fetching a lost download again, ending or
  extending a hold early, the 30-day limit of a hold asked for by phone or
  in person, and the recipient's address.
- **Medical file templates** beside the built-in SOAP note; **referring a
  patient to another clinic**; **a patient removing a practitioner from
  their care team**.
- **Schedules**: removing a planned change directly, several sessions a
  day, a minimum rest between sessions, recording a session on an earlier
  day.
- **Other ways for patients to get an account** — a clinic join code, a
  request to join, or booking.
- **A practitioner's own to-do list** in the home's "For review" slot,
  beside the automatic alerts.
- **Admin cross-clinic oversight dashboards**, and **HEIC** avatar
  uploads.
- **A multi-tenant version** — see [the note below](#a-note-on-multi-tenancy).

---

## Production Readiness — what would change for real patients

The whole system's answer is in the
[backend's README](https://github.com/julienjave/Stride-backend/blob/main/README.md#production-readiness--what-would-change-for-real-patients):
this project follows the HIPAA Security Rule's technical safeguards as a
demonstration of understanding, not as a claim of compliance, and it names
what real patient data would need — BAAs with every vendor in the chain,
keys in a key-management service, backups off the server, a risk
assessment and organizational policies. Every rule that protects a patient
is enforced by the backend, in its services and again in the database; this
app enforces nothing, by design.

What this side would add or re-check:

- **A Content-Security-Policy.** There is none yet. Adding one means
  allowing the two inline scripts in `index.html` (the pre-paint theme
  script and the import map Vite writes) by their hashes.
- **The error-report path, reviewed independently.** Reports leave the
  browser only through the API, are rebuilt from an allow-list twice, and
  reach a self-hosted GlitchTip — a sound design, but this project's own
  word for it. Moving to hosted Sentry would need its BAA.
- **The host stays static.** Cloudflare Pages serves only the app's files;
  no patient data passes through it. Patient data travels from the API
  (through Cloudflare's proxy, a vendor in the backend's list) straight to
  the page.
- **Nothing kept on the device.** No token is stored (the cookie is
  `httpOnly`), the query cache lives in memory and is emptied on sign-out,
  and browser storage holds three display settings (theme, font, timer
  sound) and nothing else. Worth keeping that way — no offline mode without
  a design for shared devices.
- **Hand-written API types.** A renamed field is caught by the browser
  suite and by review, not by the compiler. For real use, generated types
  checked in CI would close that gap.

---

## A note on multi-tenancy

Stride is deliberately single-tenant: one practice per deployment, its
clinics being the practice's locations rather than separate organizations.
Going multi-tenant would mean revisiting nearly every access-control
decision in the backend — every query, and every row-security policy,
scoped by organization, forever, with no exceptions — a categorically
stricter security bar than the one this system was built to meet. The
[backend's README](https://github.com/julienjave/Stride-backend/blob/main/README.md#a-note-on-multi-tenancy)
states that line in full. On this side it would add an organization to
every page's context and every query key, but the hard part — and the
security boundary — would be the server's.

---

## License

Licensed under the Apache License, Version 2.0 — see [`LICENSE`](./LICENSE)
and [`NOTICE`](./NOTICE). Copyright 2026 Julien Javelaud.

The country and subdivision lists in `src/common/address/` are generated
from the Unicode CLDR, under the Unicode License v3 — see
[`LICENSE-CLDR.txt`](./LICENSE-CLDR.txt).

---

<div align="center">
  Built by <a href="https://github.com/julienjave">Julien Javelaud</a> ·
  The other half: <a href="https://github.com/julienjave/Stride-backend">Stride-backend</a>
</div>
