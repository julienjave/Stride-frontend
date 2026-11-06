# Stride — Design Decisions

Decisions that shape more than one roadmap item, recorded where they were
made so later work doesn't have to re-derive them. The roadmap points
here by section number (§1, §2, …). Each section ends with what is still
**open**, so it's clear what was decided versus what was only discussed.

Source: the dashboard/navigation discussion of 2026-09-24.

---

## Table of Content

- [§1 — Shared layout and navigation (all roles)](#1--shared-layout-and-navigation-all-roles)
- [§2 — Patient home and sections](#2--patient-home-and-sections)
- [§3 — Practitioner and admin homes](#3--practitioner-and-admin-homes)
- [§4 — Profile](#4--profile)
- [§5 — Scheduling and program progress](#5--scheduling-and-program-progress)
- [§6 — Pain and mobility tracking](#6--pain-and-mobility-tracking)
- [§7 — Messaging (Phase 5)](#7--messaging-phase-5)
- [§8 — Medical files (Phase 6)](#8--medical-files-phase-6)
- [§9 — Forgot / reset password (Phase 6)](#9--forgot--reset-password-phase-6)
- [§10 — Audit review (Phase 6)](#10--audit-review-phase-6)
- [§11 — Audit log viewer (Phase 6)](#11--audit-log-viewer-phase-6)
- [§12 — Change email (Phase 6)](#12--change-email-phase-6)
- [§13 — Change password (Phase 6)](#13--change-password-phase-6)
- [§14 — Two-factor sign-in: MFA enrolment (Phase 6)](#14--two-factor-sign-in-mfa-enrolment-phase-6)
- [§15 — Honest "not available" and load-error states (Phase 6)](#15--honest-not-available-and-load-error-states-phase-6)
- [§16 — Privacy and security pass (Phase 6)](#16--privacy-and-security-pass-phase-6)
- [§17 — Admin home: metrics and recent activity (Phase 6)](#17--admin-home-metrics-and-recent-activity-phase-6)
- [§18 — Deactivation and care-team links (Phase 6)](#18--deactivation-and-care-team-links-phase-6)
- [§19 — The small audit / attention bundle (Phase 6)](#19--the-small-audit--attention-bundle-phase-6)
- [§20 — Medical records export (Phase 6)](#20--medical-records-export-phase-6)
- [§21 — A deactivated patient's care team (Phase 6)](#21--a-deactivated-patients-care-team-phase-6)
- [§22 — What a deactivated patient's care team may still write (Phase 6)](#22--what-a-deactivated-patients-care-team-may-still-write-phase-6)
- [§23 — Plain words for every failure (Phase 6)](#23--plain-words-for-every-failure-phase-6)
- [§24 — Loading and error states, across the whole app (Phase 6)](#24--loading-and-error-states-across-the-whole-app-phase-6)
- [§25 — Phase 6 tidy-up: who may read a record beyond the care team (decided 2026-10-28)](#25--phase-6-tidy-up-who-may-read-a-record-beyond-the-care-team-decided-2026-10-28)
- [§26 — Dependencies and two-factor leftovers (2026-10-29)](#26--dependencies-and-two-factor-leftovers-2026-10-29)
- [§27 — Leftover storage files, and duplicate patient accounts (2026-10-29)](#27--leftover-storage-files-and-duplicate-patient-accounts-2026-10-29)
- [§28 — Phase 6.5: the database's half of two service rules (2026-10-29)](#28--phase-65-the-databases-half-of-two-service-rules-2026-10-29)
- [§29 — Phase 6.5: the paged users list, and an admin home that stays current (2026-10-29)](#29--phase-65-the-paged-users-list-and-an-admin-home-that-stays-current-2026-10-29)
- [§30 — Phase 6.5: the clinical leftovers (chosen 2026-10-29, green 2026-10-29/30)](#30--phase-65-the-clinical-leftovers-chosen-2026-10-29-green-2026-10-2930)
- [§31 — Phase 7: exercise thumbnails, and the library list's order (2026-10-30)](#31--phase-7-exercise-thumbnails-and-the-library-lists-order-2026-10-30)
- [§32 — Phase 7: error tracking and observability (designed 2026-10-30)](#32--phase-7-error-tracking-and-observability-designed-2026-10-30)
- [§33 — Phase 7: snackbars (chosen 2026-10-31)](#33--phase-7-snackbars-chosen-2026-10-31)
- [§34 — Phase 7: the browser suite (Playwright, chosen 2026-10-31, green the same day)](#34--phase-7-the-browser-suite-playwright-chosen-2026-10-31-green-the-same-day)
- [§35 — Phase 7: the session timer (chosen and green 2026-10-31)](#35--phase-7-the-session-timer-chosen-and-green-2026-10-31)
- [§36 — Phase 7: practitioner-measured range of motion (chosen 2026-10-31, complete 2026-11-01)](#36--phase-7-practitioner-measured-range-of-motion-chosen-2026-10-31-complete-2026-11-01)
- [§37 — Phase 7: the pre-CI tidy-up (chosen and green 2026-11-01)](#37--phase-7-the-pre-ci-tidy-up-chosen-and-green-2026-11-01)
- [§38 — Phase 7: CI with GitHub Actions (built 2026-11-01, PARKED until the repos are public)](#38--phase-7-ci-with-github-actions-built-2026-11-01-parked-until-the-repos-are-public)
- [§39 — Phase 7: the design discussion — logo, palette, type (2026-11-01)](#39--phase-7-the-design-discussion--logo-palette-type-2026-11-01)
- [§40 — The way back after signing in belongs to its owner (found and fixed 2026-11-02)](#40--the-way-back-after-signing-in-belongs-to-its-owner-found-and-fixed-2026-11-02)
- [§41 — Branded emails, and the font setting kept to its owner (2026-11-02)](#41--branded-emails-and-the-font-setting-kept-to-its-owner-2026-11-02)
- [§42 — The branded records PDF (2026-11-02)](#42--the-branded-records-pdf-2026-11-02)
- [§43 — Settled leftovers, and what comes next (2026-11-02)](#43--settled-leftovers-and-what-comes-next-2026-11-02)
- [§44 — A font change is written, not audited (built 2026-11-02)](#44--a-font-change-is-written-not-audited-built-2026-11-02)
- [§45 — The bundle pass: a framework file, an import map, socket.io on demand (built 2026-11-02)](#45--the-bundle-pass-a-framework-file-an-import-map-socketio-on-demand-built-2026-11-02)
- [§46 — Demo mode for reviewers: the person's choices (2026-11-02)](#46--demo-mode-for-reviewers-the-persons-choices-2026-11-02)
- [§47 — The room under each page, and the avatars' tints (2026-11-03)](#47--the-room-under-each-page-and-the-avatars-tints-2026-11-03)
- [§48 — Address data from Unicode CLDR, one level per country (2026-11-04)](#48--address-data-from-unicode-cldr-one-level-per-country-2026-11-04)

---

## §1 — Shared layout and navigation (all roles)

**Why:** today's header holds only the role switcher and Log out, and
every page relies on its own Back button. That already breaks down in the
template flow (hub → template → exercise → picker, four levels deep).

**Decided:**
- Persistent navigation for every role.
- **Tablet / desktop** — a top bar, left to right:
  1. App logo (links home)
  2. Section navigation: Home, then one entry per section — icon with its
     name under it
  3. Settings (a menu; see below)
  4. Avatar menu — Profile, role switcher, Log out. The active role is
     shown as **text under the user's name** ("Julien · Practitioner"),
     not a small overlay badge on the avatar.
- **Phones** — logo and avatar stay at the top; the sections move to a
  **bottom tab bar, for every role** (one rule for all roles, not a
  hamburger for some and tabs for others). Chosen over a hamburger menu
  because it keeps sections always visible and within thumb reach, and
  labeled icons are more recognizable than a hamburger — this matters most
  for patients, who are phone-first.
- A bottom tab bar fits about **five** items — a practical ceiling on
  sections per role. Profile is deliberately NOT a section (it lives in
  the avatar menu), which frees a slot.
- Back buttons remain on detail pages, where "back to the list" is still
  the right action — the persistent nav replaces them only as the way to
  move between sections.
- **Settings** is a menu of labeled groups: **theme (light / dark /
  system)**, then **weight unit (kg / lbs)** — see below.

**Expected device usage** (drives layout priorities):

| Role | Desktop | Tablet | Phone |
|---|---|---|---|
| Admin | +++ | ++ | + |
| Practitioner | +++ | +++ | + |
| Patient | + | ++ | +++ |

**Settled while building it (2026-09-25):**
- The practitioner home's "My Profile" link was dropped — redundant with
  the account menu.
- The account menu's Profile entry points at a shared `/profile` route
  (outside every role guard), created now with the placeholder page, so
  the menu never links to a role-specific URL.
- One breakpoint, Tailwind's `md` (768px): below it, the bottom tab bar;
  from it up, the top bar with icon + label (tablets included — iPad
  portrait starts at 768px).
- Logo: a text "Stride" wordmark in its own `Logo` component until a real
  asset exists. Browser tab title: "Stride".
- Theme preference: per device, in localStorage, applied before first
  paint by an inline script in `index.html`.
- Sections without pages yet stay in the nav and open a shared "Coming
  soon" page, so the nav's shape doesn't change as features ship.
- Role switcher: a radio group of every held role (active one ticked) in
  the account menu, shown only for multi-role accounts.

**Default weight unit (decided 2026-09-25):** stored **on the user's
account** (a backend field), not per device — it follows the person across
devices, unlike the theme, which is a per-device preference.

**Where the weight unit is edited (decided 2026-09-25):** the **Settings
menu**, next to the theme — it's a preference, not profile information.
The profile page does not edit it.

**Weight unit — built 2026-09-26.** Decided along the way:
- **Every role** sees the setting: it drives how weights are *displayed*,
  not only which unit is pre-selected for practitioners.
- Backend: `users.preferred_weight_unit`, NOT NULL DEFAULT `'kg'`, reusing
  the `weight_unit` enum (moved to its own `weight-unit.schema.ts` to avoid
  a circular import between the users and programs schemas). Set through
  `PATCH /users/:id`; **self-only** — anyone else, admins included, gets
  a 403. Returned by `/auth/me` with no extra code.
- **Stored weights are never converted.** Each keeps the unit it was
  prescribed in. The preference does two things:
  1. **Entering:** the unit toggle starts on the preferred unit (new
     exercise form, and the weight field when no weight is saved yet).
     A unit with no weight typed is simply dropped — "no weight".
  2. **Displaying:** a weight in the other unit is shown converted, with
     the prescription alongside — **"44.1 lbs (20 kg)"**. Exact factor
     (1 lb = 0.45359237 kg), one decimal, never rounded to plate sizes;
     the prescribed value is never rounded. Editing always starts from
     the stored value in its stored unit, never the converted one.
- The Settings menu saves it **optimistically** (the tick moves at once;
  requests run one at a time; on failure the screen returns to the last
  unit the server confirmed, and the menu shows an error next time it
  opens).
- Applies today to template exercise cards and the exercise weight
  field. The patient session views (Phase 4) must use the same
  `WeightValue` component.

**Open:** nothing currently.

---

## §2 — Patient home and sections

**Decided:**
- Same overall structure as the practitioner home: greeting + avatar, a
  summary card, then section links.
- In the card, the slot the practitioner uses for "To-do" is **split in
  two**:
  - **Today** — today's session(s), with a button to start.
  - **Upcoming** — the next 3–4 sessions, minimal (program name + day or
    date; for times-per-week programs, e.g. "2 more this week" — there
    are no fixed dates to show).
- A patient can have **several active programs at once**, listed
  **equally** (no "primary" program).
- Below the card: progress per program (see §5) and small pain/mobility
  trends (see §6).
- **Sections** (bottom tabs on phones): **Home, Sessions, Team,
  Messages.** Profile is in the avatar menu.
  - **Sessions** — hub for programs and sessions.
  - **Team** — the patient's practitioners and their profiles.
  - **Messages** — "Coming soon" until Phase 5 (designed 2026-10-19/20,
    §7).
- **Medical records** are NOT a section: they go inside the profile area
  as "My records" — they belong to the patient, tab space is limited, and
  practitioners see them on the patient page instead.

**Patient home — decided and built 2026-10-15** (shape proposed and agreed
before building; details in §5, "Phase 4 step 2"):
- **One card, stacked: Today, then Upcoming** — at every width. The
  practitioner's card puts short slots side by side; the patient's lines (a
  program, a workout, a sentence) would be squeezed to a few words at 375 px.
- **Today, one row per program that has something to say** — a program with
  nothing today gets no row ("Nothing to do today." when none has anything):
  due, catch up ("Catch up: Wednesday's B · Strength" — a FREE day inside a
  missed day's make-up window, from the summary's `nextWorkout`), an "N a
  week" count ("1 of 3 done this week", its dates, the next workout), in
  progress, done for today, the week's target met, skipped (with the reason),
  paused; "Stopped earlier today (pain)" under a day still to do.
- **No Start / Resume button yet** — decided: the session flow comes right
  after the home (before the Sessions hub), and the buttons arrive with it;
  until then no button leads to a placeholder (the 2026-10-09 rule).
  *(Built 2026-10-16 with the session flow's pass (a) — Start and Resume on
  the Today rows, §5 "The session flow".)*
- **Upcoming:** the 4 soonest scheduled days across programs, then one
  weekly line per program ("1 more this week" — what the week needs AFTER
  today's session, which Today offers), and "From Mon 19 Oct: 3× a week" for
  a weekly program not started. Two weeks ahead (`through`).
- **"My programs":** one card per ACTIVE program (closed ones belong to the
  Sessions hub), listed equally — the earliest started first —, "From Alex
  Chen", the totals headline, a progress bar only with an end date (§5: a
  count otherwise). Not links yet (no patient program page; the hub will be).
- **Where the code lives (asked by the person):** `src/app/home/patient/`,
  beside the other homes' pieces — not `src/patients/`, which is the
  PRACTITIONER's view of patients (roster, patient page), and not a folder
  named after the screen: a home is assembled FROM feature folders (the
  coming `sessions/`), so its pieces live with the homes.
- **The Sessions hub** (built from 2026-10-17): §5, "The Sessions hub —
  settled 2026-10-17".

**My Team — settled and built 2026-10-18/19** (proposed as screens
before any code; roadmap Phase 4; deep-dive §21).

*The check first.* A patient could already read their OWN care team (`GET
/users/:id/care-team`, `?includeEnded=true` for the history) — name, photo,
period, who added / ended each link — but not a practitioner's profile: `GET
/users/:id` answers 403, and would carry the practitioner's own email, phone,
address and license anyway. Row security doesn't decide this one: the
identity tables (`users`, `practitioner_profiles`, `user_clinics`, `clinics`)
are readable without a context (login needs them, §3 "Care team — built"), so
the narrowing is which FIELDS an endpoint returns.

*Decided with the person:*
- **No new route:** every care-team entry gains the practitioner's
  `specialties` and `bio`, and `sharedClinics` (the clinics practitioner and
  patient BOTH belong to now — empty once they share none). One access rule,
  written once; both screens read the one list.
- **Never the practitioner's own contact details, never the license number**
  (a patient verifies credentials through the regulator's public register).
  The patient reaches their practitioner through the CLINIC (its contact
  details are public to any signed-in user, `GET /clinics/:id`) — and later
  through messaging.
- **The staff `reason` is removed from the patient's answer** — the key
  ABSENT, not `null` (null already means "no reason given"). Staff typed it
  for staff, in a dialog that never said the patient would read it. It stays
  in the audit trail and on staff screens. A server rule. Who added someone,
  and when, stays visible — the accountability promised in §3.
- **Screens:** `/patient/team` — "My team": a card per CURRENT member
  (photo, name, specialties, shared clinics, "On your team since …" — "…,
  until …" with a planned end —, "Added by …" only when SOMEONE ELSE added
  them), longest-serving first, the whole card opening the profile; past
  members behind "Show N past members" (one row per person who isn't on the
  team now, their latest period, "Ended by …" when someone else ended it; no
  link, no clinics). `/patient/team/:practitionerId` — the profile: photo,
  name, specialty pills, the bio (nothing at all without one), **"Where they
  see you"** (each shared clinic's address, phone, email, website) and
  **"Programs from them"** (current, then past, each linking to its program
  page). Current members only: anyone else gets "Not on your care team" — a
  screen's choice (the list does carry past members' fields). The person
  dropped "their time on your team" from the profile.
- **"Back to My team"** (the person's request after live testing,
  2026-10-18): at the TOP of every state of the profile page — a long
  profile on a phone shouldn't need scrolling to leave. A plain link to the
  list (the profile's parent is always the list, and a link also works after
  a refresh or from a bookmark), carrying in navigation state which profile
  the patient came from; the list puts keyboard focus back on that card
  (`teamReturn.ts`). (The Sessions program page keeps its "Back to Sessions"
  at the bottom — offered to align, not decided.)
- **No "Message" button** until Phase 5 (no button leads to a placeholder).
  *(Proposed with Phase 5's screens — §7.)*
- **Seed:** Morgan, Alex and Sam have bios; Blake (on Robin's team) has
  none, so the no-bio profile shows without set-up — the person's choice
  after the first delivery left Morgan, on nobody's team, as the only one
  without.

**Open:** nothing currently.

---

## §3 — Practitioner and admin homes

**Practitioner (already built, stays):** greeting + avatar (photo, or
initials when there's none — see §4); card with Today (date/time),
Messages, To-do (the last two "Coming soon"); links to the sections.
- **To-do slot, later:** automatic alerts once session data exists —
  patients inactive for N days or with N missed sessions in a row;
  sessions with high pain or difficulty feedback to review. Later still,
  a real task list the practitioner manages (new backend table).
- **Clinics:** the home page stays clinic-agnostic. Clinic context appears
  where it's useful — a **clinic filter** and a **clinic badge** on the
  patient roster (a user can belong to several clinics). Built 2026-10-08 —
  see "Patient roster — built" below.

**Admin:** same structure as the practitioner home (greeting, summary card,
section links), with admin-specific cards and metrics.
- **Built 2026-09-27, structure first** (decided that day): the card holds
  Today plus two "Coming soon" slots — **Metrics** (which numbers, and
  whether they need backend count endpoints, is the open question below)
  and **Activity** (recent changes, from the audit log the backend already
  records; goes with the Phase 6 audit log viewer). Shortcuts: Clinics,
  Users.
- **The three homes share their building blocks** (`src/app/home/`):
  `HomeGreeting`, `HomeSummaryCard` with `TodaySlot` / `ComingSoonSlot`,
  and `HomeShortcuts`. Each page COMPOSES its own card from these slots
  rather than one component branching on the role, so the patient home
  (Today · Upcoming, §2) is a new arrangement, not an edit to shared code.
- Options noted for the metrics, when that's decided: counts computed in
  the frontend from the existing lists (`GET /clinics`, `GET /users`,
  no backend change, but the whole user list — with a signed avatar URL
  per user — is downloaded just to count it), or an admin-only
  `GET /admin/stats` using SQL `COUNT(*)` (scales, and is the more
  instructive backend piece).

**Open:**
- Which admin metrics, and whether they need new backend count endpoints
  (the card's "Metrics" slot waits for this).
- **Who is "my patient"?** — RESOLVED 2026-09-27, see "Care team and
  accounts" below.

**Care team and accounts — decided 2026-09-27.**

*The question:* until now a practitioner "manages" a patient when they
share a clinic (`isPatientManagedBy` in TypeScript,
`rls_practitioner_manages_patient()` / `rls_clinic_overlap()` in SQL).
That gives every practitioner of a clinic every patient's clinical data,
and makes "my patients", the patient's Team and future alerts mean "the
whole clinic". Three options were weighed (A: keep clinic-wide; B: an
explicit link used only for display; C: the explicit link becomes the
access rule), then re-examined against real clinic situations — a colleague
covering, a patient changing practitioner, a patient seeing two, how
patients get an account. The result is C, made practical:

- **Two levels of access.**
  - **Directory** — every practitioner of a clinic can find the clinic's
    patients (name, date of birth, photo): enough to identify someone and
    join their care team.
  - **Clinical** — medical files, sessions, assigned programs, messaging,
    profile editing: only the patient's **care team**.
  Clinic membership decides who CAN be on a care team; the care team
  decides who has clinical access.
- **The care team** is an explicit many-to-many link between a patient and
  practitioners, with who created it, when it started, when it ended, and
  an optional reason.
- **"Join care team" is self-service ("break-glass").** Any practitioner of
  the patient's clinic can add themselves (or a colleague) at once, with no
  approval: a rule that can block treatment (a colleague covering on a
  Monday morning with no admin around) is worse than one resting on
  accountability. Every join is written to the audit log and visible to the
  patient on their Team page — access is a deliberate, recorded act, never
  ambient and silent (the difference from option A).
  - **Clarified 2026-10-08:** "break-glass" describes HOW joining works
    (immediate, no approval, accountable afterwards), not WHEN it's meant to
    be used. It is the ORDINARY way to take on an existing patient — taking
    over a patient, a second opinion, cover — not an emergency override,
    and a link with no `endsAt` is permanent. In the roster it is called
    "Add to my patients" (see "Patient roster — built" below).
- **Links are ended, not deleted** — "who treated this patient, and when"
  is kept (clinical records must be retained anyway). A patient changing
  practitioner = the new one joins, the old link is ended.
- **Accounts are created by invitation only, for every role.** Whoever
  creates the patient (practitioner or admin) is automatically on the care
  team; the patient gets a one-time email link and chooses their OWN
  password. Staff accounts (practitioners, admins) work the same way —
  nobody ever sets someone else's password (today `POST /users` requires
  the creator to type one).
  - **Public self-registration (`/register`, `POST /auth/register`) is
    removed**, and with it the sign-in page's "Register" link. (A
    self-registered patient belonged to no clinic and was visible to
    nobody.)
  - **`/register-clinic` stays**: the one-time first-admin setup, closed by
    the backend once any admin exists. The sign-in page shows a "First time?
    Set up Stride" link ONLY while no admin exists (public
    `GET /auth/setup-status` — built in step 4, below).
  - Other ways in (clinic join code, patient requests, booking) are future
    options — `deferred-improvements.md`.
- **Implementation notes, from the code (2026-09-27):** the rule is already
  centralized — the policies call the SQL functions, the services call
  `isPatientManagedBy` / `findPatientsForPractitioner`. Switching means
  new function bodies behind the same names (`CREATE OR REPLACE FUNCTION`;
  the same TypeScript signatures, so existing unit-test mocks keep working),
  both copies changed together. A backfill links today's clinic-sharing
  pairs so nobody loses access on the day of the switch; e2e tests must
  prove "same clinic, not on the care team → no clinical data", including
  at the RLS level.
- **Order** (roadmap Phase 3): care team → invitations and email →
  patient roster and patient page (built once, on the final flows).

**Care team — built 2026-09-27** (backend only; the screens come with the
patient roster and patient page). Settled while designing it:

- **Directory vs clinical, field by field.** Directory (any practitioner
  sharing a clinic with the patient): first and last name, photo, date of
  birth (tells two same-name patients apart), the shared clinics, who is on
  the care team and whether I am. Clinical (care team only): email, phone,
  address, profile editing, programs, sessions, medical files, messages.
  Identity tables (`users`, profiles, `user_clinics`) must stay readable
  without a session context (login needs it — migration 0007), so for them
  the split is which fields each endpoint returns; the clinical tables get
  the rule at both layers (service and RLS).
- **Clinical access = an active link AND a clinic both still share.** A
  patient or practitioner leaving a clinic loses access at once, even if a
  link were left behind; `ClinicsService.removeMember` also ENDS the links
  left without a shared clinic (same transaction), so the history stays
  truthful.
- **`ends_at` does double duty:** NULL = open-ended; past = ended; future =
  planned cover, active until then. Ending a link sets it to now(), with
  `ended_by`. Links are never deleted (no DELETE policy).
- **Who ends a link:** the practitioner themselves, or an admin. (A patient
  removing someone from their team: possible later — deferred.)
- **The patient sees their team's history too** (ended links, marked
  `isActive: false` so the screen can show them differently).
- **Endpoints:** `GET /users/:id/care-team` (admin, the patient, a
  clinic-sharing practitioner; `?includeEnded=true` for history);
  `POST /users/:id/care-team` (empty body = join; `practitionerId` = add a
  colleague; optional `endsAt`, `reason`); `POST
  /users/:id/care-team/:practitionerId/end`; `GET /directory/patients?search=`
  (practitioners; directory fields only).
- **Creating a patient:** a practitioner must give a clinic (400 otherwise)
  and joins the new patient's care team in the same transaction.
- **Database:** table `care_team_members` (migration 0018); migration 0019
  adds a `btree_gist` EXCLUSION constraint (no two overlapping periods for
  the same pair — also makes simultaneous joins safe, 23P01 → 409), the
  backfill (one link per pair sharing a clinic on the day of the switch, so
  nobody lost access; `created_by` NULL), the table's policies, and the rule
  in SQL, `rls_care_team_member()`. `rls_practitioner_manages_patient()` got
  a new body (every policy using it switched automatically); the
  conversations insert policy and both medical_files policies were
  recreated — the latter had a THIRD copy of the clinic rule written into
  them (migration 0001).
- **The two copies of the rule** (TypeScript `CareTeamService.isOnCareTeam`,
  SQL `rls_care_team_member`) are kept in step by a parity test in
  `test/care-team.e2e-spec.ts`.
- **Admins still read and change everything, clinical data included.**
  Deliberately left for a separate decision (`deferred-improvements.md`).

**Email delivery — decided and built 2026-09-28** (the first step of the
invitations item). *The question:* how development and the tests handle
emails without calling Resend — the e2e tests had to route every
forgot-password call through Resend's one sandbox address
(`delivered@resend.dev`) and could never read an email back, so no test
covered following a reset link. Three options were weighed:
1. **A swappable transport in code** — fast, in-process tests, no new
   infrastructure; but the production sender itself is only unit-tested,
   and dev shows a console line rather than a real email.
2. **SMTP with Mailpit** (nodemailer + a Mailpit container) — dev and
   tests go through the real protocol, with a clickable inbox that suits
   reviewers; but tests must poll (flakiness), share one inbox, and
   production would move to SMTP.
3. **Resend's test addresses** — rejected: still needs a key and the
   network, and a test can't read the link back.

**Chosen: 1 now, then 2 as a further transport** — for its learning value
and for reviewers. Resend stays the production provider, through its HTTP
API.

- **The split:** `EmailService` decides WHAT an email says (subject, HTML
  and plain-text bodies, links); an `EmailTransport`
  (`src/email/email-transport.ts`, injected under the Symbol token
  `EMAIL_TRANSPORT`, same pattern as `DRIZZLE`) decides HOW it leaves:
  - `ResendTransport` — production (the old sending code, moved). Resend's
    SDK *returns* `{ data: null, error }` instead of throwing; the
    transport turns that into a rejection.
  - `LogTransport` — local development: prints the email (text body,
    links included) to the backend console.
  - `InMemoryEmailTransport` (`test/support/`) — the e2e outbox, installed
    with `overrideProvider(EMAIL_TRANSPORT)`. Lives under `test/`, so no
    configuration value can select it. Records synchronously, so an email
    sent fire-and-forget is already there when the response arrives.
- **Configuration:** `EMAIL_TRANSPORT=resend|log`, **required, no
  default** (any default is wrong somewhere: `resend` emails real people
  from a fresh checkout, `log` makes a misconfigured production server
  silently send nothing). `log` is **refused when `NODE_ENV=production`**
  — its output holds live reset/invitation links. `RESEND_API_KEY` is
  required only for `resend`. The rules live in `getEmailTransportKind()`,
  called by `validateEnv()` at boot AND by the transport factory (the e2e
  tests build the app without `main.ts`).
- **Transports reject on failure; the caller decides.** `EmailService`
  used to log and swallow a Resend error. Now `forgotPassword()` logs it
  and still answers 204 (no enumeration); an invitation will report the
  failure to whoever sent it.
- **Every email has an HTML and a plain-text body.**
- **Dropping Resend was considered:** switching production to Resend's
  SMTP endpoint would give one sending path everywhere, at the cost of the
  HTTP API's structured errors, email ids and idempotency keys (and SMTP
  ports are blocked by some hosts). With the transport split it's a
  one-variable change, so it's left until SMTP has been used for real.
- **Deployment caveat:** Resend's shared `onboarding@resend.dev` sender
  only delivers to the address the Resend account was created with — a
  deployed demo that invites reviewers needs a verified sending domain.
- **`SmtpTransport` + Mailpit — built 2026-10-08.**
  - `EMAIL_TRANSPORT=smtp` (nodemailer 10, `src/email/transports/
    smtp.transport.ts`, same constructor seam as Resend: `Pick<Transporter,
    'sendMail'>`). Settings `SMTP_HOST`, `SMTP_PORT` (required; digits
    only, 1–65535), `SMTP_SECURE` (`true`/`false`/empty), `SMTP_USER` +
    `SMTP_PASS` (both or neither) — read by ONE function, `getSmtpConfig()`,
    used at boot and by the factory. Allowed in production (SMTP is a real
    delivery protocol; Resend offers it). Timeouts shortened (10 s connect /
    greeting, 20 s socket): `POST /users` waits for the invitation email.
  - Mailpit in `docker-compose.yml` (SMTP 1025, inbox
    http://localhost:8025, no volume); `.env.example` now defaults to
    `smtp`. Image `axllent/mailpit:latest` — not pinned (couldn't check
    versions; see deferred-improvements).
  - The factory's `never` exhaustiveness check flagged the missing `smtp`
    branch the moment the kind was added (TS2322) — as designed.
  - **No `@types/nodemailer`, no tsconfig change:** nodemailer 10 ships its
    own types; tsconfig's `types` list only limits GLOBAL `@types/*`
    packages, not types found through an import. (The earlier note "add
    nodemailer to tsconfig types" was wrong.)
  - **`SMTP_HOST=127.0.0.1`, not `localhost`** (found in live testing on
    Windows: "Creating…" hung for seconds). Given a NAME, nodemailer asks a
    network DNS server (`dns.resolve4`, then `resolve6`), which doesn't know
    `localhost`, and only then falls back to the OS (`dns.lookup`); on
    Windows each network query can wait for a timeout. Answers are cached 5
    minutes, which is why it was only slow sometimes. An IP skips lookup.
- **Fixed with it — email failures were logged without their reason.**
  `this.logger.error('Failed …', error)`: with nestjs-pino, arguments after
  the message are printf values (`%s`), so with no `%s` the error was
  silently dropped — for Resend failures too. Found by stopping the SMTP
  server in a live test. Now the reason is in the text, through
  `errorMessage()` (`src/common/error-message.ts`) — invitation emails,
  reset emails, and audit-log writes (`AuditLogInterceptor`, which got its
  first spec). Same pattern `StorageService` already used.
- **`invitations.email_sent_at` — added 2026-10-08** (migrations 0022
  generated, 0023 custom backfill). Found in live testing: with the mail
  server down, the create-user page said "couldn't be sent" but the user
  page said "Sent by …" — only `POST /users`' response knew; nothing was
  stored. Now `deliver(invitationId, …)` sets it AFTER the server accepts
  the email (a separate step — an email can't be un-sent; if only the
  record fails, it's logged and `deliver` still returns true), as the
  actor under RLS. NULL = couldn't be sent. Means "accepted by the mail
  server", not "in the inbox". Existing rows backfilled with `created_at`
  (left NULL, every old pending invitation would read "couldn't be sent").
  The user page shows a pending invitation with no `emailSentAt` in amber:
  "Created by …, but the email couldn't be sent… Send it again." The e2e
  outbox got `failNext()` (one-shot) to test this end to end.

**Invitations — decided 2026-09-28; step 1 (database) built 2026-10-07.**
An invitation is not a pending account: `POST /users` creates the account at
once (a practitioner can assign a program before the patient opens the
email), with **no password**; the invitation is a one-time permission for
that existing account to choose its first password. Decided:

1. **Its own table, `invitations`** (rather than columns on `users`): one
   row per invitation SENT — `user_id`, `token_hash` (SHA-256 of the emailed
   token, never the token), `invited_by` (NOT NULL, `restrict`: every
   invitation is sent by someone signed in, and the record must not vanish),
   `created_at`, `expires_at`, `accepted_at`, `revoked_at`, `revoked_by`.
   - **Status is derived**, never stored: accepted / revoked / expired /
     pending.
   - **Resend** = close the open row (`revoked_at`, `revoked_by` = whoever
     resent) and insert a new one, in one transaction: the old link dies,
     the history stays as rows.
   - **A partial unique index** (`user_id WHERE accepted_at IS NULL AND
     revoked_at IS NULL`): at most one OPEN invitation per account, even if
     two "Resend" clicks race. CHECKs: accepted XOR revoked; `revoked_at`
     and `revoked_by` together; expiry after creation.
2. **`users.password_hash` becomes nullable** (NULL = no password chosen
   yet), rather than a fake "unusable" hash. Guards in `AuthService`:
   login treats it exactly like a wrong password (same 401, recorded as
   `LOGIN_FAILURE`); forgot-password sends nothing (otherwise anyone — or a
   revoked invitee — could get in around the invitation); reset-password
   refuses (defence in depth).
3. **Expiry 7 days.** Resend issues a new link. Revoke closes the
   invitation; the account stays and simply can't be entered (an admin can
   deactivate it). Who may resend or revoke: admins, and for a patient the
   care team (the inviting practitioner joined it at creation).
4. **Accepting:** `GET /invitations/:token` (first name, email, clinic, for
   the greeting; 404 unknown token, 410 Gone for expired / revoked / used)
   and `POST /invitations/:token/accept` `{ password }` → 204, as ONE
   conditional UPDATE (`… WHERE accepted_at IS NULL AND revoked_at IS NULL
   AND expires_at > now()`), so two tabs can't both accept. Rate-limited
   like reset-password. Then the sign-in page, email prefilled — no
   automatic login (same as reset; password managers save passwords typed
   into a real sign-in form).
5. **A failed invitation email doesn't undo the account.** `POST /users`
   awaits the send and reports `invitation: { status, emailSent }`; the
   screen offers "Resend".
6. **Unchanged:** granting a role (that person has a password),
   `/register-clinic` (sets its own password). No backfill: every existing
   account has a password.

**Step 1, built 2026-10-07** — migrations 0020 (generated: the table, the
nullable column) and 0021 (custom: the policies), the three guards, and
`test/invitations.e2e-spec.ts` (22 tests: the guards over HTTP, the policies
as the app's own database role, the constraints as the owner).
- **Policies:** read / update — an admin, the patient's care team
  (`rls_practitioner_manages_patient`), or the TOKEN HOLDER; insert — an
  admin or the care team, always as `invited_by = current user`; a
  revocation is always recorded as made by whoever made it; no DELETE.
- **The token branch.** The accept page has no session. Rather than letting
  context-less queries read invitations, the app puts the token's HASH in a
  transaction-local setting, `app.invitation_token_hash`
  (`withInvitationTokenContext` in `rls-context.ts`), and the policies show
  that transaction exactly the matching row.
- **Fixed along the way — `rls_current_user_id()`** (0003) cast
  `app.current_user_id` straight to integer. On a pooled connection a
  signed-in request used before, that setting is `''`, not NULL, and
  `''::integer` raises 22P02. Earlier policies only reached the function
  behind a role check (which `''` never passes); `invitations_insert` is the
  first to call it first, so a context-less INSERT failed with 22P02 — a
  500 — instead of the policy's refusal. 0021 replaces the body with
  `NULLIF(…, '')::integer` (same name and signature: every policy picks it
  up).
- **Learned from mutation-checking the tests** (worth remembering for every
  RLS test):
  - `INSERT … RETURNING` also needs the SELECT policy to allow the new row:
    a refusal test with RETURNING passes whatever the INSERT policy says.
    Refusal tests insert without RETURNING.
  - An UPDATE with a WHERE applies the SELECT policy to the rows it
    targets; when both policies allow the same people, the UPDATE policy's
    USING adds nothing of its own (its WITH CHECK does).
  - Postgres runs a data-modifying `WITH` that the main statement doesn't
    read from AFTER the main statement: "revoke, then insert" written as
    one statement still sees the old invitation open. Two statements.

**Step 2, built 2026-10-07 — `src/invitations/`.**
- **Endpoints.** Admin or care team: `GET /users/:id/invitations` (history,
  newest first — a list, so "none" is just `[]`), `POST
  /users/:id/invitations` (send; closes any open one first, so inviting and
  resending are one call), `POST /users/:id/invitations/revoke`. Public:
  `POST /invitations/lookup` `{ token }` and `POST /invitations/accept`
  `{ token, password }` (204).
- **Changed from the proposal: the token travels in the BODY, never the
  URL** — the lookup included, though it only reads. pino-http logs every
  request URL (its redaction covers cookies and password fields, not
  paths), so `/invitations/<token>` would have put live links in the logs.
  Same choice as `POST /auth/reset-password`.
- **410 Gone carries a `reason`** (`accepted` / `revoked` / `expired` /
  `deactivated`), passed through by `HttpExceptionFilter`, so the accept
  page picks its next step without parsing the message. 404 = no such
  link.
- **One clock:** `expires_at = now() + 7 days`, computed by the database in
  the INSERT that also sets `created_at = now()`; accepting compares with
  the database's `now()` too.
  - **Corrected 2026-10-18 — 7 × 24 HOURS, not 7 calendar days.** `now() +
    make_interval(days => 7)` is calendar arithmetic in the session's time
    zone: across a daylight-saving change an invitation lived 169 or 167
    hours (found in a sandbox running Europe/Paris the week before the clocks
    went back; the person's Docker Postgres runs UTC). Now
    `invitationExpiry(from)` = `from + make_interval(hours => 168)`, tested
    at fixed dates next to both changes under `SET LOCAL timezone`
    (deep-dive §21.5).
- **Send:** close + insert in one transaction; the email after commit;
  a failed email → `emailSent: false`, not an error; two racing sends →
  the partial unique index refuses the second → 409 (only for THAT
  constraint, `INVITATIONS_ONE_OPEN` in `pg-errors.ts`).
- **Accept:** bcrypt BEFORE the transaction (keeps the row lock short);
  one conditional UPDATE is the single-use guarantee (a second tab waits on
  the row lock, then matches nothing); the reasons for a refusal are read
  afterwards, only to choose 404 / 410; `applyUserContext()` (extracted
  from `withRlsContext`) switches the transaction to "acting as the
  account" once the invitation names it; `AND password_hash IS NULL` —
  never overwrites a password; any refusal rolls everything back.
- **Email:** `EmailService.sendInvitationEmail()`, HTML + text, fixed
  subject (no user text in a header), every typed name through
  `escapeHtml()` (`src/email/escape-html.ts`) — a "first name" containing
  `<a href=…>` would otherwise be a live link sent from Stride's address.
- **`InvitationsModule` imports CareTeam and Email, NOT Users**: step 3
  makes `UsersModule` import it (`insertInvitation()` and `deliver()` are
  public for that).
- **Tests:** 31 unit, 16 e2e (38 in `test/invitations.e2e-spec.ts`).
  Mutation-checked (20): accept's two guards — "still open" and "no
  password yet" — covered for each other in the race test, so each now has
  a test where it alone stands (a revoked invitation; an open invitation
  planted for an account WITH a password). Those two call
  `InvitationsService.accept()` directly: the file had used up accept's 5
  calls per minute (the budget is counted in a comment in the file).

**Step 3, built 2026-10-07 — accounts are created by invitation.**
- **`POST /users`** takes no password (sending one is a 400 —
  `forbidNonWhitelisted`: an old client fails loudly instead of believing it
  set one), stores none, and creates the first invitation IN THE SAME
  TRANSACTION, AFTER the creator's care-team link (the invitations insert
  policy only lets a practitioner invite a patient whose care team they're
  on — proven against the real policies by an e2e test; reversed, creation
  fails). Email after commit; the response adds `invitation: { id, status,
  expiresAt, emailSent }`. The requesting user is now required.
- **`POST /auth/register` removed** (backend, `RegisterPage`, the sign-in
  page's link → "No account yet? Your clinic creates it and emails you an
  invitation.").
- **`withRlsContext()`'s user became REQUIRED**: its optional user existed
  only for self-registration. The compiler now proves no request reaches a
  policy without a user context. (`registerClinic()` opens its own
  transaction; `users_insert`'s no-context branch stays for it.)
- **e2e helper `activateAccount(pool, email)`** (`test/support/accounts.ts`)
  — a deliberate change from the roadmap's "create users directly in the
  database": accounts are still created through the real `POST /users`
  (creator joins the care team, clinic checks, RLS — a hand-written INSERT
  would bypass and drift from all of it), then the helper writes the end
  state of an accepted invitation (known password + invitation accepted).
  STRICT: throws unless the account exists and has no password yet — which
  caught the script that converted the suites activating after creations
  meant to fail. Every suite now uses the in-memory outbox.
- **The auth suite split in two** (`auth.e2e-spec.ts`: setup + role
  selection, 4 logins; `auth-recovery.e2e-spec.ts`: MFA, forgot, reset — 3
  logins, 5 forgot-password calls): `/auth/register` used to provide signed-in
  sessions, and replacing them with logins needed 7 against a limit of 5.
- **Frontend:** create-user form without password; the confirmation
  reports the invitation and its expiry (viewer's locale and time zone),
  or — amber — that the email failed, with "Send the invitation again"
  (`POST /users/:id/invitations`, `src/invitations/api.ts`).

**Bug found in manual testing, fixed (2026-10-07):** after a successful
creation, the reset form showed "Select a clinic for this patient" (and
"Country is required"), and the clinic still displayed the old choice. Two
Radix `Select` behaviours: (1) it keeps a hidden native `<select>` in step
with `value`, and a reset from a chosen option to empty fires a change that
comes back through `onValueChange` as if the person had picked "nothing" —
react-hook-form validated it; fix: `ignoreEmptySelection()`
(`src/common/`), safe because these selects have no empty option; (2) given
`value={undefined}` it becomes UNCONTROLLED and keeps showing its last
choice; fix: `value={field.value ?? ''}` ('' = placeholder). Applied to the
clinic and country selects; NOT the state select — a mutation check showed
it never needs it (clearing the country turns it back into a text input
before any echo). The success test had only checked that the email field
was empty; the new one checks every select's placeholder and that no error
shows.

**Step 4, built 2026-10-07 — "is setup done?"**
- **`AuthService.isSetupComplete()`** — any `user_roles` row with role
  `admin`, a deactivated admin included (setup happened; an install whose
  only admin was deactivated needs a database fix, not a second founding
  admin created by whoever finds the page first). The ONE definition:
  `registerClinic()` calls it to decide whether to run (it had the same
  query inline), and the new endpoint calls it — so the sign-in link can
  never point at a setup that refuses, nor hide one that would run.
- **`GET /auth/setup-status`** → `{ setupComplete }`. Public (asked before
  anyone signs in; `user_roles` is readable without a session context),
  no extra throttle: it reveals one bit that `POST /auth/register-clinic`'s
  403 already reveals to anyone.
- **Frontend:** `useSetupStatus()` (`src/auth/`, key
  `['auth', 'setup-status']`, `staleTime: Infinity` — the answer changes
  once in an install's life, and the two places that change it write the
  cache themselves; logout drops the query anyway).
  - Sign-in page: "First time? Set up Stride" only when the answer is
    `false` — `=== false`, so while loading or after a failed request
    (unknown) there is no link.
  - `/register-clinic`: "Stride is already set up" + "Log in instead"
    instead of the form when `true`; "Loading…" while asking; the form if
    asking failed (the backend still refuses with 403). A 403 on submit
    (someone finished setup in the meantime) marks setup complete in the
    cache and shows the same notice — replacing the old inline 403
    message. Success marks it complete too.
- **Tests:** the frontend tests route `GET /auth/setup-status` separately
  (`apiMock` receives every other request — one shared `Response` can be
  read only once); `preservedDestination.test.tsx` seeds the cache
  instead. e2e: `false` checked in `beforeAll` right after the truncate
  (the only moment the database has no admin), `true` by a request with no
  session.

**Step 5a, built 2026-10-07 — the accept page** (`/accept-invitation?token=`,
`src/invitations/AcceptInvitationPage.tsx`). Frontend only.
- **Under no route guard.** Not `RequireGuest` (a signed-in visitor would be
  bounced home without a word), not `RequireAuth` (no password yet, so no
  session). A signed-in visitor is asked to log out, then reopen the link
  from the email — accepting would set a password on an account that isn't
  the one in use.
- **The token is read once, then removed from the address bar**
  (`setSearchParams({}, { replace: true })`): an unused link is a key to an
  account, and the address bar feeds history and bookmarks. A reload then
  asks for the email's link again (it works until accepted).
- **Lookup = `useQuery`** although it's a POST (it reads, and should run on
  its own); `retry: false` (404 / 410 are final, and the endpoint allows 10
  a minute — a "Try again" button instead), `staleTime: Infinity`.
- **Refusals (404, or 410 with `reason`) — from the lookup OR from
  accepting** (an invitation can die while the page is open) replace the
  page with the backend's own message (written for end users; the one copy
  of the wording) plus a next step chosen from `reason`: only `accepted`
  gets "Go to log in". Any other failure keeps "Try again" / the form.
- **Read-only email field marked `autoComplete="username"`** so a password
  manager saving the new password attaches it to the right account; the
  password fields are `new-password`.
- **After accepting:** `navigate('/login', { replace: true, state: { email,
  passwordSet: true } })` — the sign-in page fills in the email and shows
  "Your password is set. Log in to continue." No automatic login.
- `formatExpiry()` moved to `src/invitations/formatExpiry.ts` (create-user,
  accept page, and next the user page).
- Verified in Chromium against the real backend: greet → token gone from
  the URL → password set → sign-in prefilled → login works → the same link
  again says "already been used".

**Step 5b, built 2026-10-07 — invitation status on the user page**
(`src/invitations/InvitationStatus.tsx`, on the admin `UserEditPage`).
Frontend only.
- **Props, not the route** (`userId`, `userName`, `email`, `isActive`): the
  practitioner's patient page will reuse it (the backend allows the care
  team the same three calls).
- **Only the newest invitation** (the list is newest first; a resend
  revokes the previous one) — one sentence per status: pending ("Sent by …
  The link works until …"), accepted, expired, revoked ("revoked by …").
  Nothing rendered for an account with no invitation history (the founding
  admin's).
- **Actions:** "Send again" (pending) / "Send a new invitation" (expired,
  revoked) — not for accepted or deactivated accounts (the backend 409s;
  a deactivated one says "Reactivate the account…"); "Revoke" (pending
  only) behind a confirmation dialog that says what happens and what
  doesn't (the account stays).
- **After either action the history is refetched (`invalidateQueries`),
  not patched**: a resend changes two rows; the server knows. The send's
  result (`sendMutation.data`) says whether the email went out — the same
  green / amber boxes as the create-user page — and is cleared by a revoke
  (`reset()`), which would otherwise describe a dead link.
- **Found by mutation testing:** removing `setIsRevokeOpen(false)` passed
  every test, because the dialog unmounts once the invitation stops being
  pending — but the stale `open` state reopened it by itself on the next
  "Send a new invitation". Test added (revoke → send → no dialog).
- Verified in Chromium against the real backend: pending → send again →
  revoke → send a new one.

**The invitations item is complete** (2026-10-07). Remaining from the
email work: `SmtpTransport` + Mailpit and the dev seed script (roadmap) —
both done 2026-10-08, below.

**Dev seed script — built 2026-10-08** (`npm run seed:dev`, backend
`scripts/seed-dev.ts` + `scripts/seed/`; reviewers' guide in the BACKEND
REPO, `docs/dev-test-accounts.md`, which replaces the project doc of the
same name).
- **Dataset (decided with the person):** two clinics (Riverside Physio,
  Harbour Sports Clinic); `admin@` (founder, both clinics), `morgan@`
  (practitioner + admin), `alex@`, `sam@` (Riverside), `blake@` (Harbour);
  patients `pat@` (Alex; assigned program), `jo@` (Alex + Sam), `robin@`
  (both clinics; Sam + Blake); invitation states `new.patient@` (pending,
  email really sent to Mailpit), `stuck.patient@` (email failed),
  `late.patient@` (expired), `former.patient@` (accepted, then
  deactivated). All `@stride.test` (reserved, undeliverable), one published
  password `password123`. Content: 2 custom exercises and 2 templates by
  Alex (mixing library exercises by name), 1 program assigned to Pat.
- **Through the real services, as the right person**: the acting user is
  `{ ...UsersService.findOne(id), activeRole }` — what
  `SessionSerializer.deserializeUser` gives a request. Every DTO goes
  through the same `ValidationPipe` (same options as `main.ts`) first:
  services don't validate, the pipe does, at the HTTP layer. Invitations
  are accepted with the token read from the captured email
  (`InvitationsService.accept`). Only the expired invitation is written by
  hand (moved 10 days back).
- **`SeedEmailTransport`** (installed with `overrideProvider`, hence Nest's
  `Test.createTestingModule` in a script — nothing Jest-specific): capture
  (default; token read back, nothing sent), deliver (the real transport —
  `new.patient@` only), fail (makes the email-failed state through the
  app's own path; the seed announces the expected error first).
- **Safety (`refuseSeed`, pure):** refuses `NODE_ENV=production`, any
  database ending `_test`, and a database with users unless `--reset`.
- **`--reset` uses DELETE, not TRUNCATE**, to KEEP the exercise library
  (`source = 'api'`; custom exercises go): `TRUNCATE users CASCADE` empties
  every table with a foreign key to users — `exercises.created_by` included
  — and plain TRUNCATE refuses a referenced table. The order is a
  topological sort (Kahn) of the foreign keys read from `pg_constraint` at
  run time (a future table is handled automatically); all in ONE
  transaction (rollback proven by an e2e test with a failing trigger). The
  `session` table is emptied too. Stored files (avatars, logos, custom
  exercise photos) are not deleted from storage.
- **Commands:** `seed:exercises` (unchanged, idempotent), `seed:dev
  [-- --reset]`, `seed` = both (`npm run seed:exercises && npm run
  seed:dev --` — the trailing `--` lets `npm run seed -- --reset` reach the
  script). Jest `roots` now includes `scripts/`.
- **Tests:** 42 unit (`scripts/seed/*.spec.ts`: deletion order, safety,
  transport, the dataset's own rules, and `docs/dev-test-accounts.md`
  listing exactly the seeded accounts), `test/seed-reset.e2e-spec.ts` (2).

**Patient roster — decided and built 2026-10-08** (frontend only;
`src/patients/`). The open questions from the hand-off, settled with the
person:

- **"Add patient" means two things — so: search first.** It can mean
  "create a new patient" or "add an existing patient to my list". One button,
  "Add patient", leads to a search of my clinics' directory: if the patient
  is there, **"Add to my patients"**; if not, **"Invite a new patient"**
  (the searched name prefilled). Searching first is how health records
  avoid **duplicate patients** — an account created for someone who already
  has one splits their history — and the backend only refuses an identical
  email. Detecting and merging duplicates: `deferred-improvements.md`.
- **Adding an existing patient IS joining their care team** — there is no
  separate "roster" record, and no third action. "Add to my patients" (the
  roster's name for it) and "Join care team" (the patient page's) are the
  same `POST /users/:id/care-team`; the confirmation says what it means
  ("You'll join Pat's care team, which gives you access to their clinical
  record… This is recorded, and Pat can see who is on their care team.")
  with an optional reason (max 255). No end date in this dialog — it fits
  the patient page's "add a colleague" better (deferred).
- **Directory search:** the default list (the backend's first 50,
  alphabetically) shown at once; filtering from **2 characters**
  (trimmed); **debounced 300 ms**; previous results kept, dimmed, while
  the next load; at exactly 50 rows a hint to type a name.
- **A directory row** shows the directory fields only (photo, name, date of
  birth, the clinics we share) and either "Add to my patients" or, if the
  patient is already mine, "In your patients · Open". Opening a patient
  page requires being on the care team.
- **The invite form is the practitioner's own** (`InvitePatientPage`), not
  the admin's create-user page: names, email, date of birth, clinic. The
  field rules are the admin form's (`users/schemas.ts`), so "a valid name"
  means one thing. The clinic list is MY clinics — `/auth/me` always sent
  `clinics`, now declared on `CurrentUser` — because `GET /clinics` lists
  every clinic to a practitioner and the backend refuses the others. One
  clinic → shown as text; none → an explanation instead of a form. A
  **409** (email taken) is explained: the account exists where the
  directory can't see it (another clinic, or deactivated) — ask an admin.
- **Clinic badges — ALL of a patient's clinics on "My patients", only the
  shared ones in the directory** (discussed with the person, who first
  wanted all, weighed privacy, and kept all). On my care team I have
  clinical access, `GET /users` / `GET /users/:id` already return every
  clinic, the care team lists the other clinics' practitioners anyway, and
  "also seen at Harbour" helps coordinate care. In the directory the
  patient isn't mine, and it shows only what finding them needs (directory
  level, above). **Privacy is decided by what the API sends, not by what a
  screen draws** — hiding a field the response still carries protects
  nothing. A lighter style for clinics that aren't mine: deferred.
- **Clinic filter:** only for a practitioner in two or more clinics (with
  one it could only repeat the list); its options are MY clinics.
- **Empty states:** no patients at all ("No patients yet" — what the list
  is and how to fill it, with Add patient); none at the chosen clinic;
  nobody matching a search ("No patient in your clinics matches …", with
  the invite link).
- **Rows link to `/practitioner/patients/:id`**, a "Coming soon"
  placeholder until the patient page.
- **Structure:** the rules as pure functions (`roster.ts`: sort by last
  name with `localeCompare` / `sensitivity: 'base'`, filter, the search
  term, splitting a searched name); `PatientIdentity` + `ClinicBadges`
  shared by both lists; joining and inviting INVALIDATE `['users-list']`
  and `['directory-patients']` (prefixes) rather than patching; the join's
  confirmation callback lives on the hook (`useJoinCareTeam(id, onJoined)`),
  not in `mutate()` — today both work, the hook version doesn't depend on
  the library's timing. "Invitation sent / couldn't be sent → Send again" is
  now `InvitationSentNotice` (`src/invitations/`), shared with the admin
  form and keyed by the account's id so a new account never inherits the
  previous one's resend state.
- **Found along the way:** the admin create-user form never invalidated the
  Users list (its comment still said there was no list page), so with the
  30 s `staleTime` the list could miss a just-created account — fixed, with
  a test.
- **Tests:** frontend 766 (+45). Every new test mutation-checked (38; one
  equivalent survivor, the `mutate()`-vs-hook callback, documented in the
  code). Verified in Chromium against the real backend, including a
  two-clinic practitioner and 375 px width.

**Patient page — decided and built 2026-10-09** (`src/patients/PatientPage.tsx`;
two small backend changes). Settled with the person before building:

- **Care team only.** `GET /users/:id` answers anyone else with 403, and the
  page then explains ("You're not on this patient's care team") with links
  to find a patient and to the roster — no name, nothing identifying. No
  "directory version" of the page (it would need a new endpoint; joining
  happens from the directory search's "Add to my patients").
- **Order:** header (photo, name, date of birth, every clinic), Programs,
  Care team, Invitation, profile — programs first, they're what a
  practitioner opens the page for.
- **Programs: every program of the patient, whoever assigned it** — two
  backend changes: `GET /assigned-programs?patientId=` (validated by
  `ListAssignedProgramsQueryDto`; checked with the same `assertCanView` as
  one program — the care team, the patient, admins; anyone else gets the
  same 403, NEVER an empty list, which would tell an outsider "no programs")
  and `assigner { id, firstName, lastName }` on every listed program (names
  loaded in ONE query for the whole list, not one per program — the N+1
  problem). Sorted active → on hold → completed → cancelled, newest first;
  `YoursBadge` on mine, "Assigned by …" on a colleague's. Rows are NOT links
  and there's no "Assign a program" button yet: both lead to placeholders
  until the assign + scheduling item (decided: no buttons to "Coming soon").
  *(Both arrived with step 3a-1, 2026-10-12; `on_hold` is gone from the
  order. Since 2026-10-14 completed and cancelled programs wait behind "Show N
  past programs" — §5, "Show past programs".)*
- **Care team:** current members with since when, reason, and "Added by …"
  (when someone else added them); "Show past members" adds the history
  (`?includeEnded=true`, its own cache entry). **"Leave care team" on my own
  current row only** (the backend lets a practitioner end only their own
  link) — a confirmation saying what changes (no clinical access; the
  history keeps the record; you can rejoin), with a warning when I'm the
  patient's only current practitioner.
- **"Add a colleague": its own roadmap item** (decided 2026-10-08 — after the
  patient page, before assigning programs): a practitioner has no way to
  list a clinic's practitioners yet (`GET /clinics/:id/members` is admin
  only); it also brings the planned-cover end date.
- **Profile:** `ProfileFields` as on `/profile` (`canEditLicense` false; the
  care team may edit a patient's details, decisions §4); email read-only;
  photo via `UserAvatar`, never `AvatarUpload` (§4). `InvitationStatus`
  reused unchanged (the care team may send, resend, revoke).
- **Leaving, step by step** (the part that needed care): the page first
  switches its own profile query off (`useUser(id, { enabled: false })`) and
  navigates to the roster with `replace` (Back must not return to a page I
  can no longer open) and a notice in the navigation state; the hook then
  REMOVES the patient's profile and programs from the cache (invalidating
  would refetch them → 403) and invalidates the roster, the directory
  searches and the care team. Without the switch-off, the page re-rendered
  with no profile, refetched it and flashed the 403 view before the
  redirect.
- **`key={patientId}`** on the page's view: another patient's page starts
  with fresh state (the past-members toggle, the "left" flag) even when
  that patient is already cached.
- **Smaller pieces:** `formatMomentDate()` (`src/common/`) — the day of a
  TIMESTAMP in the viewer's zone (care-team dates; `formatExpiry` now
  delegates to it), next to `formatCalendarDate` for date-only values;
  `applyUpdatedUser()` also invalidates the directory searches (they show
  names and dates of birth); the patient programs' query key sits UNDER the
  programs list key, so refreshing the list refreshes every patient's.
- **Found on Windows, fixed 2026-10-09:** `PatientPage.tsx` (the page) and
  `patientPage.ts` (its helpers) were the same name to a case-insensitive
  file system. TypeScript resolves `./PatientPage` by trying `.ts` before
  `.tsx`, found `patientPage.ts`, and never reached the component. Linux
  (where the code was written and tested) treats them as two names, so
  nothing failed there. The helpers became `patientPageRules.ts`, and
  `src/fileNameCase.test.ts` now fails if two source files' import paths
  differ only by letter case (proven by recreating the clash).
- **Tests:** backend 542 unit (+4), e2e 223 (+3: the filter and assigner,
  who may ask, invalid values); frontend 799. Every new test
  mutation-checked; the survivors were either covered by new tests (the
  `replace`, removing the programs, Leave on my own past row, the `key` —
  which needed the next patient cached), a test client with `staleTime: 0`
  hiding a missing invalidation (now 30 s, as in the app), or equivalent
  (de-duplicating assigner ids — removed; the order of `onLeft` and the
  cache clean-up — documented). Verified in Chromium against the real
  backend.

**Add a colleague — decided and built 2026-10-09** (backend
`CareTeamService.listCandidates`; frontend `src/patients/`
`AddCareTeamMemberDialog`, `EndCareTeamMembershipButton`, `CareTeamSection`):
- **Who can be added: the practitioners of the PATIENT's clinics,** not the
  caller's. Sam (Riverside) may add Blake (Harbour) to Robin, who attends
  both; a practitioner who works only at a clinic Robin doesn't attend
  isn't listed. Each candidate carries directory fields only (name, photo,
  specialties) plus `sharedClinics` (only the clinics they share with the
  patient) and `onCareTeam`. Active practitioners only, sorted by last
  name then first name.
- **Not cross-clinic, on purpose.** Clinical access needs an active link AND
  a shared clinic, so a link to a practitioner from another clinic would
  grant nothing. Sending a patient to another clinic is a REFERRAL: its own
  feature with its own consent questions (`deferred-improvements.md`).
- **Who may ask:** an admin, or a practitioner who shares a clinic with the
  patient (the same people who can see the care team). Anyone else gets a
  403, never an empty list; a user who isn't an active patient gets a 404.
  No search parameter: a clinic has a handful of practitioners, so the
  dialog filters what it already has (name or specialty; accents and case
  ignored — "emond" finds "Émond").
- **The dialog:** a radio list (those already on the team shown but
  disabled, so the list stays a complete picture of the clinic), an optional
  reason, an optional **"Until" date** for planned cover. The backend stores
  a moment and refuses one in the past, so "until Friday" is sent as
  **Friday 23:59:59.999 in the viewer's time zone** (`endOfLocalDay`), not
  Friday 00:00, which would end the cover before Friday's work starts. The
  date input's `min` is today, computed from LOCAL date parts
  (`localDateString`), because `toISOString()` gives UTC's day, which is
  tomorrow for an evening user west of UTC.
- **One section, permissions as props.** `CareTeamSection` takes `canAdd`,
  `canEndAny` and an optional `onLeft`, rather than having a copy per role.
  The practitioner's patient page uses `canAdd`, `canEndAny={false}` and
  `onLeft`, so they get "Add a colleague" and Leave on their own row. The
  admin's user page (patients only) uses `canAdd` and `canEndAny`, so the
  admin gets "Add someone" and "End" on every current row, behind a
  confirmation (with the only-member warning). The labels differ because
  an admin isn't anyone's colleague.
- **Cache:** candidates live at `['care-team', id, 'candidates']`, under the
  care team's prefix, so the single `['care-team', id]` invalidation after
  an add or an end also refreshes the "already on the team" flags. Changing
  a user's clinics (`UserClinicMemberships`) now also invalidates
  `['care-team']`: a clinic change can make a practitioner a candidate or
  stop them being one.
- **Found while testing:** a new e2e patient sorted before "Martin" and
  broke an older test that read the directory's `body[0]`. Tests that share
  a database must find their row by id, never by position. The
  `staleTime: 30_000` test client (lesson of the patient page) is used in
  the new section tests from the start.
- **Tests:** backend 546 unit (+4), e2e 228 (+5); frontend 823 (+24).
  Mutation-checked; verified in Chromium against the real backend.

---

**The practitioner's To-do — settled 2026-10-19; backend built the same day**
(confirmed green by the person). Proposed as screens first; the person chose
every recommended option, and all four kinds of alert.

- **Two families.**
  - **Attendance, one row per program, clearing itself** when the patient
    acts: **missed in a row** — the latest run of judged misses reaching **3
    scheduled days** (specific days) or **2 program weeks** (N a week), read
    from the schedule module's own states (a day still `due` or `upcoming` is
    neither a miss nor a break); **inactive** — **7** unpaused program days
    with no session of ANY status (a skip or a stop is contact), counted up to
    yesterday. Only for a program RUNNING today (started, not past its end, not
    paused today — a pause is the practitioner's own answer).
  - **Sessions to review, one row per finished session of the last 14 days**
    (today included): stopped or skipped **for pain**; pain after **≥ 7**; a
    **rise ≥ 3** from before to after; an exercise rated **≥ 8**; **the patient
    wrote something** (an exercise note, the session feedback, the end note —
    the person's choice). Only THAT a note exists reaches the list, never its
    words (minimum necessary); a session in progress is never listed.
- **Thresholds:** one backend constant (`ALERT_THRESHOLDS`); settings per
  practitioner would be their own item. Noted: for a once-a-week schedule,
  "inactive after 7 days" fires after one missed session.
- **"Reviewed" is per practitioner** (`session_reviews`, one row per
  practitioner and session): my review takes the session off MY list only;
  the session page shows every review to the whole care team. A permanent,
  audited record (`SESSION_REVIEWED`); no undo. Staff only — the patient's
  `GET /sessions/:id` has no `reviews` key, and the row security agrees.
- **Computed per request, never stored** (`GET /alerts?today=`): stored alerts
  need a job, and a job has no user to sign its audit (the "system actor"
  question). A fixed number of queries whatever the caseload; the summaries
  come from the SAME code as `GET …/summary` (`summaryFromRows`).
- **Whose patients:** my care team, at both layers (TypeScript and RLS). A
  practitioner on no care team gets `[]`, not a 403. Patients and admins: 403.
- **Where it leads (frontend, pass 2):** attendance → the program page; a
  session → a NEW read-only practitioner session page
  (`/practitioner/sessions/:id`) with **Mark as reviewed** — practitioners could
  not see difficulty ratings or the patient's notes anywhere before. The list
  lives on the home, under the card (first 5, then "Show all N"); the card's
  slot shows the count.

**Backend pass — built 2026-10-19.** Migrations 0043 (generated: the table, the
unique index) and 0044 (custom: RLS — read by admins and the care team, insert
by a practitioner for themselves on their care team, no update or delete; a
trigger: `reviewed_at` = the database's now(), no review of a session in
progress). `src/alerts/` (`alert-rules.ts` pure, `AlertsService`,
`GET /alerts`), `SessionReviewsService` + `POST /sessions/:id/review` (200,
idempotent via `ON CONFLICT DO NOTHING`), `reviews` on staff's
`GET /sessions/:id`; `program-summary.ts` split (`readSummarySessions`,
`summaryFromRows`). Seed: Jo two weeks below target, Robin's last session 3 →
7 reviewed by Sam (on Blake's list only), Pat's last session a 9 with a note.
Backend 1,578 unit (+70), e2e 680 (+23). 69 mutations: 64 killed, 1 test gap
closed, 3 equivalents commented, 1 redundant policy clause removed.

**Frontend pass — built 2026-10-19** (confirmed green by the person). The
home's card slot (count, a link down to the list), the list (first 5, then
"Show all N"; attendance rows → the program page, session rows → the review
page) and `/practitioner/sessions/:sessionId` (`SessionReviewPage`, lazy):
status, the scores ASKED (`wasAsked` — "Not answered" vs not shown), the
patient's words as quotations, each exercise's tick, difficulty and note,
the reviews ("You — …" for mine), **Mark as reviewed** (not optimistic).
Practitioners could read none of the ratings or notes before.

**Changed after the person's live testing, 2026-10-19:**
- **Renamed "For review"** (the person's proposal): "To-do" promised tasks,
  and the roadmap keeps that name for a task list the practitioner manages
  (Phase 7). Every row now ends in the same verb, "Mark as reviewed".
- **The list moved BELOW the shortcuts** (the person's point): the shortcuts
  have a fixed height, the list doesn't — above them it pushed the
  navigation down by a different amount on every visit. The card's count
  still links straight to the list.
- **A program's attendance alert can be marked reviewed** (the person's
  point: an alert the patient never answers sat on the list forever).
  Decided: on a BANNER on the program page (look at the weeks first, then
  mark — no row removed by an accidental tap); the review hides the alert
  from THAT practitioner's list **until something changes, and for at most
  14 days** (the person chose both). A review records the alert's facts —
  the first day of the run of misses and of the stretch without a session,
  computed by the SERVER (the client sends only `today`); only the latest
  review counts; a fact that went away keeps it hidden, a new fact or a new
  start brings it back; 14 × 24 hours from the review's moment. Pausing the
  program stays the clinical answer for a patient who is away (a pause
  silences attendance alerts).
- Backend: `program_alert_reviews` (0045 generated — the foreign key named
  by hand, drizzle's name was 65 characters; 0046 custom: RLS like 0044, the
  moment trigger), `POST /alerts/programs/:programId/review { today }` (200,
  idempotent under the program's row lock; 409 nothing to review; 404 off the
  team), `GET /alerts` skips what my latest review covers. Frontend:
  `ForReviewSlot`, `ForReviewSection` (renamed), `ProgramAlertBanner` on an
  open program's page.
- Backend 1,588 unit (+10), e2e 692 (+12). Frontend 2,085; main file 459.04
  kB. Mutations: backend 31 (2 test gaps closed, 2 equivalents commented),
  frontend 16 (+44 earlier) — all killed.

## §4 — Profile

**Status:** built and verified 2026-09-25 — `/profile`, the editable
admin `UserEditPage`, and the clinic page on the same shared components
(see the roadmap's Phase 3 entry for the pieces). Avatar upload added
2026-09-26, avatar crop 2026-09-27 (both below).

**Decided:**
- **One shared `/profile` route** for every role, reached from the avatar
  menu, with a **role-specific section** below the common fields.
- Common fields: name, email, phone, six-field structured address (reusing
  `AddressFields`).
- Role-specific fields (these already exist in the backend):
  - practitioner (`practitioner_profiles`): `licenseNumber` (required,
    unique), `specialties` (list), `bio`
  - patient (`patient_profiles`): `dateOfBirth` (required)
  - admin (`admin_profiles`): `position`
- The same editable-fields component closes the admin `UserEditPage` gap.
  It is built to edit ANY user (it receives the user being edited plus
  what the viewer may change), so `/profile`, the admin `UserEditPage`
  and the future practitioner patient page all reuse it.
- **Multi-role accounts (decided 2026-09-25):** the profile shows the
  role-specific section for **every role the account holds**, not only
  the active one — the fields belong to the person, not to whichever role
  is active. This matches the backend, which checks fields against the
  TARGET's held roles (rule 2 below), not the active role.
- The default weight unit is NOT on the profile page — it lives in the
  Settings menu (§1).

**Existing backend rules (verified 2026-09-24), three agreeing layers:**
1. **Who** may edit a profile (`UsersController.update`): the user
   themselves, an admin, or a managing practitioner (one sharing a clinic
   with that patient — to become "on the patient's care team", §3).
2. **Which fields apply** (`UsersService.update`): checked against the
   TARGET's held roles — practitioner fields only for practitioners, etc.
   Anything else is a 400.
3. **The database** (RLS, migration `0010`) mirrors rule 1.

Until 2026-09-25 there was **no field-level rule**: anyone allowed to edit
a profile could edit every field that applied to it.

**Decided change — built 2026-09-25:** `licenseNumber` is **admin-only** —
a professional credential, normally set or verified by an admin, not
self-edited. Enforced in `UsersService.update()` against the caller's
**active** role (a practitioner + admin account can change its own
license while switched to admin). A non-admin sending it gets a **403**
and nothing in the request is applied. On the profile page a
practitioner sees it read-only, with a note to ask their clinic admin.
Everything else keeps the old rules (e.g. a patient or their
practitioner can correct a date of birth).

Two related backend fixes made at the same time:
- A **duplicate license number** is now a **409** on create, grant-role
  and update (it was an unhandled 500). The 409 comes from catching the
  database's own unique-constraint error (`isUniqueViolation`,
  `src/database/pg-errors.ts`), not from a check-then-write, so it can't
  race.
- **Required fields can be omitted from a PATCH but not cleared.**
  `firstName`, `lastName`, `licenseNumber`, `specialties`, `dateOfBirth`
  reject `null` (and the three text ones reject `''`) with a 400 — before,
  `null` slipped past `@IsOptional()` and failed at the NOT NULL
  constraint as a 500. Optional fields (phone, bio, position, address)
  are cleared by sending `null`.

**Email (decided 2026-09-25):** read-only on the profile page. What the
backend did at the time: no endpoint changes an email at all (it's
deliberately absent from `UpdateUserDto`); uniqueness is checked only at
account creation (409), backed by a UNIQUE constraint; emails are
case-sensitive (never lowercased); sessions store only the user id, so
an email change wouldn't log anyone out; there is no email verification.
A proper **self-service change with verification** (confirmation link to
the new address, notice to the old one, current password required) is
its own roadmap item in Phase 6, and starts by making emails
case-insensitive.

**Update 2026-10-22:** emails are case-insensitive (§12, pass 1 — one
stored spelling, a CHECK, the 409 from the constraint); the change flow itself
is §12's passes 2 and 3.

**Avatar (photo) — built 2026-09-26.** Decided along the way:
- **Who:** the user themselves or an admin may upload, replace or remove
  a photo — a managing practitioner may NOT (narrower than profile
  editing: a photo is personal, and there's no clinical reason for a
  practitioner to change a patient's). Enforced in `UsersController`
  (`POST` and `DELETE /users/:id/avatar`); the frontend offers the
  controls only on `/profile` and the admin-only user page.
- **The raw storage key never leaves the server.** `UsersService.toPublic()`
  swaps `avatarPath` for `avatarUrl`, a presigned URL (or `null`), the
  same conversion clinic logos use. `toPublic()` is now public and is
  also used by `AuthService` (login, register-clinic), replacing their
  hand-copied strip lists — one funnel for every user response.
- **URL lifetime: 24 hours + an initials fallback** (chosen over a stable
  redirect route). The logged-in user's own `avatarUrl` comes from
  `/auth/me`, which the frontend caches for the tab's whole life, so a tab
  left open over 24 hours (e.g. a laptop closed over a weekend) can hold an
  expired URL. `UserAvatar` handles the image's `onError` by showing
  initials; the next page load brings a fresh URL. Worst case: initials
  instead of the photo, never a broken image. The redirect-route
  alternative and its trade-offs are in `deferred-improvements.md`.
- **Why Stride doesn't serve photos publicly like GitHub/Facebook do:**
  those platforms treat avatars as public, so a CDN can cache them
  without any permission check — which is what makes their stable
  redirect URLs cheap. A photo held by a physiotherapy clinic reveals that
  someone is a patient there: personal data touching on health (GDPR).
  Storage stays private; every image URL is signed.
- **Files:** each upload gets a new key (`avatars/<id>/<timestamp>.<ext>`),
  built only from server-controlled values — the uploaded file's NAME is
  never used (so every upload can be called `avatar.jpg` without
  collisions, and a client can't steer where a file goes). A URL's content
  therefore never changes. Replacing or removing deletes the old file —
  always AFTER the row points away from it, so a failure leaves an
  orphaned file, never a user pointing at a missing one. Removing is
  idempotent.
- **Frontend:** `AvatarUpload` (the "Photo" section; the upload preview is
  dropped if the upload fails), cache updates through `applyUpdatedUser()`
  (`src/users/userCache.ts`, shared with `useSaveUser`, so the header
  updates at once), file check in `src/common/imageFile.ts`.

**Avatar crop — built 2026-09-27.** Pick a photo → position and zoom it in
a circular frame → the chosen square is drawn onto a `<canvas>` and
uploaded as a small JPEG. **Frontend only**: the existing
`POST /users/:id/avatar` receives the cropped file; the original never
leaves the browser. Decided along the way:
- **Library: `react-easy-crop`** (about 7 KB gzipped; checked for React 19
  and install before choosing) rather than hand-built drag/zoom, plus our
  own pieces where it fell short on accessibility:
  - a native `<input type="range">` **zoom slider** (the library zooms only
    by mouse wheel / pinch), announced as "150%" via `aria-valuetext`;
  - `role="group"` and a name on its focusable crop frame (via
    `cropperProps`);
  - an arrow-key step of **10 screen px** instead of the library's 1
    (measured: hundreds of presses to cross a photo); Shift still gives
    fine 2px steps.
- **Shape:** a round frame (how avatars display), square output.
- **Output:** **JPEG, quality 0.9, at most 512×512** — shrunk, never
  enlarged (a 300px crop stays 300px: enlarging adds bytes, not detail).
  The canvas is painted white first, because JPEG has no transparency
  (a transparent PNG would otherwise get a black background). A 4000×3000
  photo came out at a few KB in testing. No rotate button for now.
- **Size limits:** the ORIGINAL may be up to **20MB** (was 5MB) — the
  uploaded file is the small crop, and the backend still checks its 5MB
  on every upload (the real safeguard: the API can be called without the
  crop). The original keeps a limit because the browser decodes the whole
  photo in memory to crop it (4 bytes per pixel: a 48MP photo is about
  190MB), which can freeze or crash a phone tab. Clinic logos and exercise
  photos, uploaded as picked, keep 5MB. `makeImageFileSchema(maxBytes)`
  in `src/common/imageFile.ts` builds both checks.
- **Photos the browser can't decode** (a mislabeled file, a HEIC renamed
  to .jpg): the cropper's `<img>` error event shows "This image couldn't
  be opened…" and disables Save and zoom.
- **Structure:** crop maths as a pure, tested function
  (`src/users/avatarCrop.ts` — `planAvatarCrop`); the canvas step alone
  in `cropImage.ts` (jsdom has no canvas; checked in real Chromium
  instead); `AvatarCropDialog` only CHOOSES the square and reports it;
  `AvatarUpload` runs the crop inside the upload mutation, so "preparing +
  uploading" is one pending state and a crop failure is reported like an
  upload failure. Tests replace the library with `FakeCropper`.
- **Bug found in manual testing and fixed:** the circle couldn't reach the
  photo's edges. The library measures itself with
  `getBoundingClientRect()`, which includes the dialog's opening zoom-in
  transform (95% → 100%); a photo loaded mid-animation was measured up to
  5% too small (7–13px gaps, varying with timing), and its ResizeObserver
  never corrects it (a transform isn't a resize). Fix: remount the cropper
  (new `key`) when the dialog's own opening animation ends; position and
  zoom survive because they're our state. In jsdom, React listens for
  `webkitAnimationEnd` (no `AnimationEvent` there), so tests fire that.
- **Verified in Chromium:** output size and content, zoom, keyboard
  panning, reaching the corner exactly (`x: 0, y: 0`), transparency →
  white, an EXIF-rotated photo, an undecodable file, Escape.
  **Still to verify with a real phone photo once deployed:** EXIF
  orientation (see `deferred-improvements.md`).

**Open:** nothing currently.

---

## §5 — Scheduling and program progress

**Decided:**
- Practitioners give each assigned program a **schedule**, set in the
  assign flow — so **assigning and scheduling are designed together**.
- **Both schedule types are supported**, because practitioners and
  patients differ in what suits them:
  - `weekdays` — specific days (e.g. Mon/Wed/Fri)
  - `times_per_week` — N sessions per week, any days
  Stored as a type plus the matching field, with a database check
  constraint enforcing exactly the right fields per type.
- How each type behaves:

  | | Weekdays | Times per week |
  |---|---|---|
  | "Today" | "Today: Knee Rehab" on scheduled days | "1 of 3 done this week", available any day |
  | Upcoming | real dates | a count ("2 more this week") |
  | Progress total | scheduled days between start and end | sessions/week × weeks |
  | Missed | a scheduled day passed with no session | a week ended with fewer than N |

- **Calculate sessions from the rule, don't pre-create them.** Pre-creating
  breaks down for open-ended programs (no end date) and for schedule edits;
  calculating handles both, and "missed" simply falls out of the rule.
  (Confirmed 2026-10-09 — see below.)
- **One schedule module** — pure, heavily tested functions answering "what's
  due / done / missed for this date range." Home pages, progress bars and
  practitioner alerts all ask it; none of them branch on the schedule
  type themselves. A future third type then changes one module, not
  every screen.
- **Progress percentage** needs a total, but it should be **derived**, not a
  separately stored "number of sessions" field that could contradict the
  dates. Open-ended programs show a count ("12 sessions done") instead of
  a bar.

**Settled 2026-10-09** (with the questions that were open above):

1. **Program length: dates are the source of truth.** Start date required,
   end date optional (none = open-ended), as `assigned_programs` already
   stores them. The total number of sessions is derived from the schedule
   and the dates, never stored. The assign form offers a **"Duration: N
   weeks"** shortcut that just fills in the end date.
2. **Missed sessions can be made up any time before the next scheduled
   day** ("specific days" schedules). Missed Monday on Mon/Wed/Fri → Tuesday;
   missed Friday → Saturday or Sunday; Tue/Fri, missed Tuesday → Wednesday or
   Thursday; Mondays only → the rest of the week. A session on a scheduled
   day always counts for THAT day first, so a make-up can never leave the
   patient one session behind for the rest of the program. Chosen over "until
   the end of the week" (unfair to a missed Friday) and over a fixed number
   of days (it collides with the next scheduled day). A made-up session stays
   visible as "made up" to the practitioner. Explicitly skipping a session
   (with a reason) belongs to the Phase 4 session flow.
3. **Calculate, don't pre-create — confirmed.** A `sessions` row exists only
   once the patient starts a session (`POST /sessions`, as today). Due / done
   / made up / missed come from matching the schedule against those rows.
4. **Each session stores the patient's local calendar date** (sent by the
   app) beside its timestamp. "Was Monday done?" is a question about the
   patient's day; a moment alone can't answer it (11 pm in Montreal is
   already tomorrow in UTC). The same split as `formatCalendarDate` /
   `formatMomentDate`. Rejected: storing each patient's time zone and
   converting on the server.
5. **Schedules keep a history.** Each version records the date it applies
   from; each day is judged by the version in force on that day, so
   changing Mon/Wed/Fri to Tue/Thu doesn't turn past weeks into misses.
   Versions are added, never overwritten (the same idea as care-team links).
6. **"N times per week" counts in PROGRAM weeks**, starting on the program's
   start date (a Thursday start → weeks run Thursday to Wednesday), so there
   is no partial first week and no target the patient can't reach. "Specific
   days" schedules need none of this (a Thursday start on Mon/Wed/Fri simply
   has one session that week). To keep "week" from being read as a calendar
   week:
   - the program row says so: "3× a week · weeks start Thursday";
   - every count shows its dates: "1 of 3 this week (Thu 15 – Wed 21)";
   - the assign form shows "Weeks will run Thursday to Wednesday" under the
     start date and offers a **"Start next Monday"** shortcut for calendar
     weeks.
   A final week cut short by the end date has its target scaled to its
   length, rounded (3/week over 3 days → 3 × 3/7 ≈ 1). The "Duration: N
   weeks" shortcut avoids that case entirely.
7. **Scope of the roadmap item: the practitioner side.** Setting the
   schedule while assigning (from the template's "Assign to a patient", and
   from the patient page's new "Assign a program" with the patient
   preselected); program rows on the patient page become links to the
   program's page, which shows the schedule and a done / made up / missed
   summary. The schedule logic lives in ONE backend module of pure, tested
   functions; screens ask it and never branch on the schedule type. The
   patient side (Today, the session flow, progress pages) stays in Phase 4.
   Also closes the two related backend gaps in `deferred-improvements.md`
   (an archived template accepted by `create()`, `updateExercise` returning
   the bare row).

**Not modelled, on purpose:** clinic opening days. Sessions are mostly done
at home, sometimes at a clinic or gym for equipment, and opening days differ
between clinics. The practitioner's choice of schedule already carries that
knowledge (they don't schedule Saturdays for a patient whose clinic is
closed then); "N times per week" plus program weeks and the make-up window
leave the patient room. Rest days between sessions and where a session took
place are noted in `deferred-improvements.md`.

**Settled at the start of building (2026-10-09/10):**
- **Every assigned program has a schedule** (templates don't). No backfill
  for old programs: the dev database is reset with the seed instead.
- **Existing sessions' local date = the UTC day of `scheduled_date`** — kept
  as a backfill in the migration anyway, because a migration must work on
  whatever data exists (the test database keeps the last e2e run's
  sessions; `ADD COLUMN … NOT NULL` fails on any non-empty table).
- **"Done" = `completed` sessions only** (`in_progress` was started, not
  done).
- **A new schedule version can't start in the past** — today or later, with
  one day of slack for time zones (yesterday in UTC is someone's today).
- **The summary's "today" is the viewer's local date**, sent by the app
  (`?today=YYYY-MM-DD`, step 2).
- **Weekdays are ISO numbers**: 1 = Monday … 7 = Sunday (Postgres `isodow`,
  date-fns `getISODay`).

**Step 1 — backend data, built 2026-10-10.** Decided while building:
- **Schedules are a table of versions, `program_schedules`**: `type`,
  `weekdays` (sorted `smallint[]`) or `times_per_week` (1–7),
  `effective_from` (a date), `created_by`, `created_at`. A day is judged by
  the latest version starting on or before it. *(First written: "the first
  version also covers any days before its own date". Superseded the same
  day by step 1b: a start date moves only before the program starts, with
  its schedule — so every day of a program has a version.)*
- **"Exactly the right fields per type" is a CHECK constraint**; the weekday
  SET (1–7, sorted, no duplicates, not empty) is a second CHECK calling an
  IMMUTABLE function, `is_iso_weekday_set()` — a CHECK can't hold a
  subquery, a function can. One spelling per set means equal schedules have
  equal arrays. The API accepts any order and sorts.
- **Adding a version "from day D" REPLACES every version from D on** (a
  same-day correction, or a change planned for later and now superseded)
  and keeps the earlier ones. Delete, then insert, in one transaction; a
  same-day race is caught by the unique constraint (one version per program
  per day) → 409. Allowed days: not before the start, not after the end,
  not before yesterday (UTC).
- **History is guarded by the database, not only the API:** no UPDATE
  policy at all; DELETE only for versions starting yesterday (UTC) or
  later; INSERT refuses a backdated version too (it would change how past
  days are judged just as much) — except on the program's start date, where
  the first version goes (a program can be recorded with a past start; a
  second version on that day would hit the one-per-day constraint, and the
  first can't be deleted). `created_by` must be the current user.
- **`sessions.local_date`** (date, NOT NULL), required by `POST /sessions`;
  refused if more than one day away from UTC's date (no time zone is
  further), so a session can't be filed under another day. Recording a
  session done on an EARLIER day belongs to the Phase 4 session flow. Index
  `(assigned_program_id, local_date)` for step 2's range queries.
- **`assigned_programs_ends_after_start`** (end ≥ start, or no end) — the
  dates are the program's length; checked in the service too (create, and
  PATCH with the stored value of whichever date wasn't sent).
- **Dates are calendar strings, strictly `YYYY-MM-DD`**
  (`src/common/calendar-date.ts`: `isCalendarDate`, `utcToday`, `addDays` in
  UTC; `@IsCalendarDate()` replaces `@IsDateString()`, which accepted full
  timestamps and let Postgres pick the day). Alphabetical order of such
  strings is date order.
- **Responses:** a program (one, or in the list — batched, one query)
  carries `schedules`, oldest first; `PATCH /assigned-programs/:id` and
  `PATCH …/exercises/:rowId` answer with the full program (exercises +
  schedules). A template that doesn't exist → 404; archived → 400
  ("Archived program templates cannot be assigned"); empty → 400 (was a
  404, but the template exists). `UpdateAssignedProgramDto`'s NOT NULL
  fields refuse `null` (the `isPresent` pattern).
- **Seed:** *Knee Rehab — Pat* (Alex, Mon/Wed/Fri, starting the seed's
  day) and *Lower Back Mobility — Jo* (assigned by Sam, 3× a week, started
  10 days earlier). An assignment whose template ends up empty (library not
  imported) is skipped and reported, not a crash.
- **Learned from mutation testing** (66 mutations: TypeScript, the
  policies, the CHECK function, the constraints):
  - A DELETE applies the SELECT policy to the rows it targets — so "a
    colleague off the team can't delete" proved nothing about the DELETE
    policy's own rule (the colleague can't even see the rows). The case
    that tests it is the PATIENT, who can see but mustn't delete.
  - A unit test with a pinned clock on the day it was written passed for a
    version that ignored the clock. Pin clocks far from today.
  - "From D on" without the program in the WHERE would wipe other
    programs' versions — invisible to tests that each use a fresh program.
- Tests: backend 642 unit (+96), e2e 272 (+44, new
  `test/program-schedules.e2e-spec.ts`: API, constraints as the owner, RLS
  as the app's role), lint 893 (+48, e2e `res.body`).

**Step 1b — the three flagged choices, and the audit trail, built
2026-10-10.** The three choices made while building step 1 were reviewed
with the person, alternatives weighed:

1. **"From day D" replaces every version from D on — KEPT.** Alternatives:
   append-only (planned changes survive, surprising, and cancelling one needs
   its own endpoint), refusing a same-day duplicate (409; no correction
   path), editing in place (an UPDATE policy, two mechanisms), or a soft
   replace (`superseded_at` rows: the full story, but every read, the module
   and every policy filter them forever). The worry behind the soft replace —
   a medical app must keep track of every change (HIPAA, the reviewers being
   in Canada and the US) — is met where an audit trail belongs: the AUDIT
   LOG, not the business table. The business table says what the schedule
   IS; the audit log says who changed it, from what, to what, and when.
2. **The database requires end ≥ start — KEPT.** (Stricter clinical minimums
   rejected: a one-day program is legitimate. "The end may not cut off later
   versions" rejected: those versions are harmless, and ending a program
   early is normal.)
3. **"The first version covers earlier days" — REPLACED** by: **a start date
   can change only while the program hasn't started** (both the current and
   the new start must be on or after yesterday in UTC), and then the
   schedule moves with it. Reasons: the old rule made `effective_from` mean
   something else than it says, and moving a start re-cuts every program
   week ("3 of 3" could become "2 of 3" after the fact) — rewriting judged
   history, which the rest of the design forbids. A typo in a started
   program: archive it and assign it again. How the schedule moves
   (`planStartDateMove`, pure): on the new start, the version that would
   have been in force that day; versions starting before the new start are
   deleted; later ones stay. (Not "move the first version": wrong past a
   planned change, and a collision exactly on one.)

**The audit trail (decided with the person 2026-10-10):**
- **Every create, PATCH and schedule change of an assigned program writes ONE
  complete audit entry, inside the change's own transaction**
  (`AuditService.logInTransaction(tx, entry)`): no change without its entry,
  no entry without its change. (`log()` writes on its own connection —
  inside a transaction it could record a rolled-back change, after the
  commit the entry can be lost.)
  - `ASSIGNED_PROGRAM_CREATED`: the whole prescription (title, dates,
    template, first schedule version, every exercise with sets / reps /
    duration / weight / notes).
  - `ASSIGNED_PROGRAM_SCHEDULE_SET`: `effectiveFrom`, the `added` version and
    every `replaced` one, whole (`DELETE … RETURNING`) — after a replace, the
    audit log is the only place they still exist.
  - `ASSIGNED_PROGRAM_UPDATED`: `changes { field: { from, to } }` — only
    fields that really changed (re-sent values and undefined keys aren't
    changes) — plus the versions a start move replaced.
  - `targetUserId` = the patient on every entry.
- **`@AuditedByService()`** (`src/common/decorators/`) tags such routes; the
  global interceptor (via `Reflector`, handler then class) skips them, so a
  change has one complete entry, not one plus a vague generic duplicate.
- **The convention from now on:** every new route that changes clinical or
  account data is tagged and its service writes the complete entry in its
  transaction. The rest of the app is brought to it by the **audit review**
  (roadmap Phase 6, before the audit log viewer; checklist in
  `deferred-improvements.md`).
- Tests: backend 668 unit (+26), e2e 281 (+9: the start-date rules and the
  trail read back from `audit_logs` — one entry, its details, none for a
  refused change, no generic duplicate after a 200 ms pause, since the
  interceptor writes after the response), lint 900 (+7, e2e `res.body`).
  25 mutations, all killed (including removing the tag from each route).

**Step 2 — the schedule module, built 2026-10-10.** Settled with the person
first:
- **Make-up reading confirmed:** a session on an unscheduled day makes up
  the most recent missed day still in its window; a session on a scheduled
  day counts for that day first (it never makes up an earlier one).
- **At most one session per day counts.** Several sessions a day can be too
  much unless the practitioner recommends it; further ones are reported as
  "extra" so the practitioner sees it. ("Up to N per day" as a setting:
  `deferred-improvements.md`.) *(Since 2026-10-16 the app also PREVENTS a
  session on a day with a completed one, and the module applies the rule across
  every kind of session — "Late make-ups — settled 2026-10-16", point 4.)*
- **No carry-over between program weeks** ("N per week"): each week stands
  alone.
- **Late make-ups** (a "Make up session" button past the window) discussed:
  worth it only as a practitioner opt-in per program, both rows visible
  ("Missed · made up Thu 15" / "Make-up for Mon 12", badge + text) —
  recorded in `deferred-improvements.md` for Phase 4.

Built:
- **`summarizeSchedule(input)`** (`src/assigned-programs/schedule/
  schedule-summary.ts`) — pure: the program's dates, its versions, its
  COMPLETED sessions (id + local date) and the viewer's today in; plain
  values out. No database, clock or Nest, so every rule is a table of dates
  in its spec. Every screen asks it; none branches on the schedule type.
- **Output:** `days` (each scheduled day of a specific-days version: `done`,
  `made_up` with the session and date, `missed`, `due`, `upcoming`),
  `weeks` (each "N per week" stretch: `programWeek`, dates, `target`,
  `done` capped at the target, `met` / `missed` / `in_progress` /
  `upcoming`, the counted session ids), `extraSessions` with a reason
  (`same_day`, `outside_program`, `no_missed_day`, `beyond_target`),
  `totals` (`expected` null for an open-ended program — a count, not a
  bar). Covers the start date to the end date, or to the end of the current
  program week when open-ended.
- **The rules, as implemented:** each day judged by the version in force; one
  counted session per day (the earliest-created); a scheduled day closes the
  previous missed day's window, then counts its own session; an unscheduled
  day's session makes up the open missed day (then used up) or is extra; a
  change to the other KIND of schedule also closes the window; a day not
  done is `missed` only once its window ended before today, else `due` (so
  today is never missed); "N per week" days grouped per program week AND
  version, target `round(N × days / 7)` (covers a final week cut by the end
  date and a week split by a schedule change; no .5 ties are possible).
- **`GET /assigned-programs/:id/summary?today=YYYY-MM-DD`** — `today`
  required (the viewer's date; refused unless it could be today somewhere:
  `isPossibleToday`, now shared with a session's local date); same access as
  viewing the program; reads versions and completed sessions under RLS; no
  rule in the service.
- **`calendar-date.ts` grew** `daysBetween`, `isoWeekday` (1 = Monday …
  7 = Sunday), `isPossibleToday`.
- **Seed history:** the API records only today's sessions, so past ones are
  written as the owner (like the expired invitation), with their checklist.
  Plans are relative to the program ("all done except the 2nd, made up the
  next day, and the 4th, missed"; "days 0, 2, 8 after the start") and turned
  into dates by a pure, tested `seedSessionDays()`. Pat now starts 14 days
  before the seed runs.
- Verified live against the real backend with the seeded data (Alex: Pat's
  and Jo's summaries exactly as planned). Tests: backend 734 unit (+66, 40
  of them the module's tables), e2e 286 (+5), lint 915 (+15, e2e
  `res.body`). 36 mutations, all killed — 5 survived the first round and each
  was a real gap, closed with a test: a make-up that doesn't use up the
  missed day; a version switch that doesn't close the window (visible only
  with today inside the new schedule); `floor` instead of `round` (every
  scaled target chosen had rounded down); a week starting today shown as
  upcoming; extras out of date order.

**Settled 2026-10-10 — workouts, pause, and the screens' shape** (before
step 3, because the assign form and the program page depend on them):
1. **Workouts (option A), now.** A program can have a different exercise
   set per day (upper body Monday, lower body Wednesday, a targeted joint
   Friday): a program — and a template — has one or more named WORKOUTS, and
   each exercise belongs to one. Specific-days schedules say which workout
   each day uses; N-per-week schedules follow a rotation. Sessions record
   their workout. A one-workout program behaves exactly as before. (Option
   B, "days on each exercise", rejected: no answer for N per week,
   duplicates for an exercise used on two days.)
2. **A make-up must be the missed day's workout** (doing Wednesday's lower
   body on Tuesday doesn't make up Monday's upper body).
3. **N per week: a fixed rotation** (A, B, C, A…) that the app suggests —
   the practitioner can set the pattern.
4. **On hold = a pause, as a schedule version** ("paused from D", "resumed
   from E"): nothing is due while paused, then normal behaviour resumes.
   `on_hold` leaves `status`, which can't say since when — "on hold" is read
   from the version in force today.
5. **Step 3 in two parts:** 3a — the assign form (ONE page: template,
   patient, dates, schedule; tailoring happens after, on the program page —
   no wizard holding an unsaved copy of the exercise list), the entry
   points, program rows as links, the program page's sections (Details ·
   Schedule & progress · Exercises), the summary as a LIST (a calendar view
   is for the patient side), "Change schedule". 3b — tailoring on that page
   (exercises by workout, reusing the template editor's components; title,
   dates, status).

**Settled 2026-10-11 — the rest of step 2b, before building it:**
1. **Swaps — a nullable `sessions.counts_for` date**: "this session fulfils
   the workout scheduled on that day" (Monday's upper body done Wednesday and
   Wednesday's lower body done Monday: both show "swapped"). An explicit link
   counts only if the session IS that day's workout, the day is in the same
   program week, and that day isn't already done. Allowed by default; the
   practitioner can turn swaps off per program. The same column later serves
   late make-ups (opt-in). Without a link, the inferred rules apply (a wrong
   workout on a scheduled day doesn't count for it — an extra,
   `wrong_workout`).
2. **N per week with workouts**: each program week needs the next N positions
   of the rotation, done in any order within the week; a repeat beyond what's
   needed is an extra (`repeated_workout`) — A, A, B with A/B/C at 3 a week =
   2 of 3. The rotation continues BY PLAN (positions counted from the
   version's start), not by what was done; a scaled week needs its first k
   positions.
3. **Cancelling is not pausing** (the person's point: there is already a
   pause). Decided:
   - **A program with no sessions**: cancelling = ARCHIVING (`is_archived`,
     hidden from every list). Nothing happened clinically, so hiding loses
     nothing — and this settles "cancelling before the start date" (an end
     date before the start would break `end ≥ start`).
   - **A program with sessions**: status `cancelled`, kept visible and
     read-only under past programs (it is part of the clinical record), end
     date = **yesterday** (the decision is taken today, so today is not a
     missed day) — or **today** if a session was already completed today.
     Completing early: the same rule; a program completed on or after its
     end date keeps it.
   - **Archiving a program that has sessions is refused** (409, "cancel it
     instead"), so clinical history can't be hidden by accident.
   - **No re-activation in place** (it would bring back weeks already judged
     and closed): **"Assign again"** on a cancelled or completed program
     creates a NEW program from its tailored workouts and exercises (not the
     template, which may have changed), with new dates and schedule in the
     usual assign form; a nullable `based_on_program_id` lets the program
     page say "continues Knee Rehab (cancelled 12 Nov)" — also usable for a
     follow-up block. `cancelled` and `completed` become final; with
     `on_hold` gone, the statuses are active / completed / cancelled.
   - Built with the rest of the status work in 2b-iii (the button with the
     screens). *(2b-ii was split on 2026-10-11: schedules by workout and
     pause first, then swaps and the status rules.)*
4. **Workout labels**: letters by order (A, B, C) + an optional name ("A ·
   Upper body"); a one-workout program shows just its exercises.

**Step 2b-i — workouts, built 2026-10-11.**
- **Tables** (migration 0026, generated and HAND-EDITED; 0027 custom, RLS):
  `template_workouts` and `program_workouts` (`name` optional varchar(100),
  `sort_order`); `workout_id` NOT NULL on `template_exercises`,
  `assigned_program_exercises` and `sessions`.
  - **Composite foreign keys**: `(workout_id, template_id)` →
    `template_workouts(id, template_id)` (the same for programs, and for
    sessions with `assigned_program_id`). A plain key on `workout_id` only
    says "some workout exists"; the pair makes "a workout of THIS template /
    program" a rule of the database. The target needs a UNIQUE covering
    exactly those columns, hence the otherwise redundant `UNIQUE (id,
    template_id)`. **NO ACTION**, not RESTRICT: deleting a whole template
    (only the seed's `--reset` does) cascades to its workouts AND exercises
    in one statement; RESTRICT checks mid-cascade and fails, NO ACTION at
    the end of the statement.
  - CHECK `*_name_not_blank`: "no name" is always NULL. The label (A, B…) is
    never stored — derived from the order (`workoutLabel`).
  - **Backfill**: add the columns nullable → one unnamed workout for EVERY
    template and program (empty ones too: every one always has a workout) →
    point every exercise and session at it → NOT NULL → only then the
    composite keys (they check every existing row when created).
  - **RLS**: each workout table copies its sibling exercise table's policies
    (templates: everyone reads, owner / admin writes; programs: whoever sees
    the program reads, admin / care team writes).
- **One rules module, `src/common/workout-rules.ts`** (pure, shared by both
  services): at most 10 workouts (A–J); `normalizeWorkoutName` (trim, '' →
  NULL); `resolveWorkoutId` (none asked for → the FIRST BY POSITION — what
  keeps today's screens working; asked for → one of THESE, 404 otherwise);
  `orderExercisesByWorkout` (one flat list, workout by workout — flat so
  screens that don't know about workouts keep listing every exercise; each
  exercise carries `workoutId`); `isPermutationOf` (moved from the two
  reorder methods); `assertWorkoutRemovable` — 409: never the last, only an
  empty one, never one with recorded sessions.
- **Routes** (templates under `/programs/:id`, programs under
  `/assigned-programs/:id`): `POST …/workouts` (added after the last
  position), `PATCH …/workouts` (complete new order), `PATCH
  …/workouts/:workoutId` (`{ name }` — required key, `null` clears), `DELETE
  …/workouts/:workoutId`. Every write answers with the full template /
  program: `workouts` (ordered) + `exercises` (flat, ordered).
- **Exercises**: `workoutId` optional when adding (first workout otherwise);
  `PATCH` an exercise with `workoutId` MOVES it — to the END of that workout
  unless a position is given; `null` is a 400 (the null trap). Reordering
  exercises happens WITHIN one workout (`{ workoutId?, order }`). The
  program's add route got its own DTO (`AddAssignedProgramExerciseDto`): the
  inline list at creation has no workouts yet, so a `workoutId` there is
  refused, not silently ignored.
- **Row locks**: adding and deleting decide from a count ("fewer than 10?",
  "more than one left?"); two deletes at once on a two-workout template would
  both count 2 and leave none. Both lock the parent row first (`SELECT … FOR
  UPDATE` — the codebase's first row lock); the second request waits, counts
  again. (Under RLS, FOR UPDATE also needs the UPDATE policy — the same
  people allowed to change it.) An exercise added (or a session started)
  between the count and the DELETE makes the foreign key refuse it; that
  error becomes the same 409 (`isForeignKeyViolation`).
- **Assigning copies the workouts**, in order, with their names; exercises
  are resolved by workout POSITION (the program's workouts don't exist yet)
  and `create()` maps positions to the new ids, inserting one workout at a
  time (a multi-row `INSERT … RETURNING` doesn't promise its order). Copied
  in display order (workout by workout). **A template with an empty workout
  can't be assigned** (400, "Workout B of program template N has no
  exercises") — an empty workout in a template is fine while it's being
  written. An inline list = one unnamed workout. `duplicate()` copies
  workouts the same way.
- **Audit**: the four program workout routes follow the convention
  (`ASSIGNED_PROGRAM_WORKOUT_ADDED` / `_RENAMED` {from, to} /
  `ASSIGNED_PROGRAM_WORKOUTS_REORDERED` {from, to} / `_WORKOUT_REMOVED`
  {the whole row}); a request that changes nothing writes nothing;
  `ASSIGNED_PROGRAM_CREATED` now lists the workouts and each exercise's
  `workoutId`. Template routes keep the generic entry (no patient data).
- **Sessions**: `POST /sessions` takes an optional `workoutId`
  (`chooseSessionWorkout`): asked for → must be the program's (400); none and
  one workout → it; none and several → **refused, never guessed** (a session
  filed under the wrong workout would be judged against the wrong day). The
  checklist is THAT workout's exercises; an emptied workout can't start a
  session (400).
- **Seed**: the knee template has *A · Mobility* and *B · Strength*, the back
  template one unnamed workout. Pat's past sessions did A on Mondays and
  Fridays, B on Wednesdays (`workoutByWeekday` in the dataset), the make-up
  doing the missed day's workout — `seedSessionDays` now returns `{ day,
  forDay }`. A template with an empty workout (library not imported) isn't
  assigned, and the seed says so.
- **Tests**: backend 780 unit (+46), e2e 353 (+67, new
  `test/workouts.e2e-spec.ts`; only the 5 known Exercises pagination
  failures), lint 965 (+50, all e2e `res.body` / session boilerplate). 98
  mutations (rules, services, seed, 13 SQL mutations of the policies and
  constraints) — the 10 first-round survivors were real gaps, closed; the
  others equivalent and documented (`assertCanManage` on the program
  workout routes can't be reached by anyone who'd fail it).
- **Learned**: the throttler's 60 requests a minute count PER ROUTE (rebuilt
  fixtures per test hit 429 — the program tests share one template); proving
  a row lock by holding a conflicting one must use **FOR NO KEY UPDATE**, not
  FOR UPDATE — inserting a child row takes FOR KEY SHARE on the parent for
  its foreign key, which FOR UPDATE blocks, so the insert waited even with
  the service's lock removed.
- **Noticed, not changed** (`deferred-improvements.md`): `POST
  /assigned-programs/:id/exercises` still answers with the bare row; removing
  a program exercise that a session used is a 500 (`session_exercises`
  RESTRICT) — both matter for 3b.

**Step 2b-ii — schedules by workout, and pause, built 2026-10-11.** Planned
with the person first ("Looks great"): 2b-ii = schedule days and rotations,
pause, `on_hold` removed, the module's new rules, seed; 2b-iii = swaps
(`counts_for`, `allow_swaps`), cancel / complete, "Assign again". API choices
approved with it: (1) when ASSIGNING, a schedule names workouts by POSITION
(`workoutIndex`, 0 = A — the program's workouts don't exist yet); later
versions name them by id (`workoutId`); (2) a program can't start paused;
(3) cancel and complete will be their own routes (2b-iii).
- **Child tables instead of the `weekdays` array** (migration 0028, generated
  and HAND-EDITED; 0029 custom, RLS): `program_schedule_days` (version,
  weekday 1–7, workout; PK `(schedule_id, weekday)`) and
  `program_schedule_rotation` (version, position ≥ 0, workout; PK
  `(schedule_id, position)`). An array can't hold a foreign key; a row per
  day can point at its workout.
  - **Composite keys carrying the parent's type**: `(schedule_id,
    assigned_program_id, schedule_type)` → `program_schedules(id,
    assigned_program_id, type)` (new `UNIQUE (id, assigned_program_id,
    type)` as its target), and a CHECK pinning the child's `schedule_type`
    (`'weekdays'` for days, `'times_per_week'` for rotation positions): a day
    can only belong to a specific-days version, a position only to an N-per-
    week one — a rule of the database. `(workout_id, assigned_program_id)` →
    `program_workouts`: only this program's workouts.
  - **ON DELETE CASCADE from the version** (a replaced version takes its
    days); **NO ACTION from the workout** (a workout a schedule names can't
    be deleted — the service's 409 first, the key behind it). A version's
    type can't change under its children (the key refuses the UPDATE).
  - **`paused`** added to the type enum; `fields_match_type` rewritten as
    `(type = 'times_per_week') = (times_per_week IS NOT NULL)` — without
    naming `'paused'`, which can't be USED in the transaction that adds it.
  - **`on_hold` removed from `program_status`**: Postgres can't drop an enum
    value, so the column goes to text, `on_hold` rows become `active` (a
    status had no date to pause from), the type is recreated, the column cast
    back.
  - **Backfill** before `weekdays` is dropped: each weekday of a version →
    a day row with the program's FIRST workout (`unnest` + `DISTINCT ON`);
    each N-per-week version → a one-position rotation. `is_iso_weekday_set()`
    dropped (0029).
- **RLS (0029)** on both child tables: SELECT = the version is visible;
  INSERT only **in the transaction that created the version** (`ps.created_at
  = now()` — `now()` is the transaction's start, the version's default), by
  its creator (`created_by = current user`), an admin or the care team; **no
  UPDATE, no DELETE policy** — a version's content is fixed; a change is a new
  version. The cascade still removes children of a replaced version
  (referential actions aren't subject to RLS — proven by an e2e test).
- **Content in, content out** (`schedule/schedule-content.ts`, pure):
  `contentFromNewSchedule` (positions → the NEW program's ids, inside
  `create()`'s transaction — a bad position is a 400 that names what exists,
  "the program has 2 workouts (A, B)", and leaves no program behind) and
  `contentFromVersionInput` (ids → checked with `resolveWorkoutId`, 404 for
  another program's). **No rotation given = every workout in order** (by
  position). Days sorted by weekday.
- **Service**: `readScheduleVersions` (versions, days, rotations: 3 queries
  for any number of programs, grouped by version); `insertScheduleVersion`
  (the version, then its children, in the caller's transaction; refuses empty
  days / rotation — the rule spans two tables, no constraint can say it);
  replaced versions read WITH their content before the DELETE, for the audit
  entry; audit entries carry `days` and `rotation`.
- **Pause rules**: a pause on the start date → 400 ("A program can't start
  paused: choose its start date for when it begins"); a start-date move whose
  new start falls in a planned pause → 400 too (the program row's UPDATE,
  already sent, rolls back with the transaction).
- **Deleting a workout** also counts its schedule uses (days + rotation
  positions, any version — current, planned, past): 409 "Workout B is part of
  the program's schedule (now, planned, or in its history)…". The race
  (a schedule naming it between the count and the DELETE) → the same 409 via
  the two new foreign keys.
- **The schedule module** (`summarizeSchedule`): each scheduled day has its
  `workoutId`; a session counts for a day only if it did that day's workout
  (`pickSession`: the matching session wins, others are `same_day`; a wrong
  one is `wrong_workout`); a make-up must be the missed day's workout; N per
  week: each stretch needs the next `target` rotation positions, counted BY
  PLAN from the version's start (`positionsUsed`), slots filled in order, a
  repeat beyond them `repeated_workout`; a pause closes any open make-up
  window, its sessions are extras (`paused`), and `pauses: { from, to | null
  }[]` lists them; **`nextWorkout`** = the earliest thing still to do (a due
  or upcoming day, or an open week's next slot), null while paused.
- **`on_hold`** gone from `UpdateAssignedProgramDto` (400). The FRONTEND still
  lists it as a status label — removed with step 3a. *(Removed in 3a-1,
  2026-10-12.)*
- **Seed**: `SeedSchedule` has the API's shape (days with `workoutIndex`, or a
  rotation); `workoutByWeekday` is gone — each past session's workout comes
  from the schedule AS STORED (`seedSessionWorkouts`: a day's workout, or the
  rotation by plan), so the history counts as done in the summary. Pat: Mon /
  Fri = A · Mobility, Wed = B · Strength; Jo: 3 a week, rotation suggested (A).
- **Tests**: backend 850 unit (+70), e2e 399 (+46; only the 5 known Exercises
  pagination failures), lint 990 in the project's measure (+25, all e2e
  `res.body`). `test/program-schedules.e2e-spec.ts` rewritten for days /
  rotation (constraints of both child tables as the owner, their RLS as the
  app's role, pauses, the cascade) and shares two programs created once (the
  60-a-minute limit on `POST /assigned-programs`). 59 code mutations (9 gaps
  closed; 4 equivalent: two empty-list shortcuts, two tie-break dates that
  can't tie) and 24 SQL mutations (every clause of both INSERT policies, the
  SELECT policies, added UPDATE / DELETE policies, the keys, the CHECKs) — all
  killed. Live: Pat's summary by workout, a pause.
- **Learned**: a policy's subquery is itself filtered by the other table's
  RLS — a refusal test where the actor can't SEE the parent proves nothing
  about the policy's own "admin or care team" clause (the mutation survived);
  the case that does is an actor who sees the version, created it, in this
  transaction, but holds neither role. And the race test "two deletes of a
  program's only two workouts" can't be set up any more — one of the two is
  always in the schedule; the lock is proven by `waitsForRowLock` instead.

**Step 2b-iii — swaps, closing, "Assign again", built 2026-10-11.** API
details settled with the person first (all eight proposals accepted): (1)
swaps only for specific-days schedules; (2) a swap that can't count is an
extra, `swap_not_counted`, never reinterpreted; (3) turning swaps off stops
NEW swaps only; (4) "has sessions" = any session row, even unfinished; (5)
closing answers `{ outcome, program }`, `program` null when archived; (6)
`status` leaves the PATCH body; (7) "read-only once closed" in the service,
a database-level guard deferred; (8) "Assign again" carries the source's
`basedOnTemplateId`.
- **Data** (migration 0030, generated, no hand edits):
  `sessions.counts_for` (date, nullable; CHECK `counts_for <> local_date`);
  `assigned_programs.allow_swaps` (NOT NULL, default true);
  `assigned_programs.based_on_program_id` (self-reference, NO ACTION; CHECK
  not itself). In Drizzle a self-reference needs `(): AnyPgColumn =>
  assignedPrograms.id` — TypeScript can't infer a variable's type from an
  expression using that variable.
- **Swaps**: `POST /sessions { countsFor }` — the workout is the one
  scheduled that day (`workoutId` optional; another one is a 400). Checked
  when the session starts, as one pure function (`swap-rules.ts`): swaps
  allowed, another day, inside the program, the same PROGRAM week, a
  specific-days version in force ON that day (read as such: the latest
  starting on or before it), a scheduled day. "Was that day already done?"
  is judged by the summary (it can depend on sessions that don't exist yet):
  explicit swaps are kept apart from ordinary sessions; a late swap applies
  when the walk reaches the day it was done, an early one waits for its day,
  which starts out `swapped` (`swappedBy`); the EARLIER of a swap and the
  day's own session or make-up wins; the loser is `swap_not_counted` (a swap)
  or `already_done` (the day's own session). A swapped day isn't waiting for
  a make-up. Totals gain `swapped`.
- **A program's life** (`program-state.ts`, pure): `assertProgramOpen` —
  active and not archived, else 409 — called by all ten program write
  methods and by `POST /sessions`; `closingEndDate` — yesterday, or today if
  a session was completed today; never later than the end it had, never
  before its start.
- **`POST /assigned-programs/:id/cancel` and `/complete`** (`{ today }`, the
  practitioner's date, `isPossibleToday`; 200): under the program's row lock,
  from the state read AFTER taking it; cancel with no session → archived;
  otherwise final status + end date. Audited in the transaction
  (`ASSIGNED_PROGRAM_ARCHIVED` / `_CANCELLED` / `_COMPLETED`, `changes`
  before → after). **`DELETE`** (archive) refuses a program with sessions
  (409, "cancel it instead") and is now audited the same way. `PATCH` takes
  `allowSwaps`, no longer `status` (400).
- **"Assign again"**: `POST /assigned-programs { basedOnProgramId }` — a
  completed or cancelled program (409 if active; 400 if archived) of the
  SAME patient (400); its workouts and TAILORED exercises copied (the old
  program's snapshot, not the library or the template), workout by workout;
  an emptied workout refused as for templates. A request names ONE source
  (template, program or inline list — 400 otherwise; a template used to beat
  an inline list silently).
- **Seed**: Pat's 5th scheduled day done by a swap (`swappedIndex`: the
  unscheduled day before it, or after it when the day before is in the
  previous program week); Robin: *Knee Rehab — Robin* (Sam, twice a week,
  21 days ago) cancelled by the seed through the real service, and *…, block
  2* continuing it. The dataset spec now checks the histories for all seven
  weekdays the seed could run on.
- **Tests**: backend 943 unit (+93), e2e 425 (+26; new
  `test/program-lifecycle.e2e-spec.ts`; only the 5 known Exercises
  pagination failures), lint 1028 (+38, e2e `res.body`). 66 code mutations
  (7 gaps closed; a no-op sort in the seed found and removed) and 6 SQL
  mutations (one equivalent, below).
- **Learned**: RESTRICT and NO ACTION differ only when rows go mid-cascade
  (2b-i's case): for the self-reference, which no cascade reaches, a SQL
  mutation to RESTRICT survived — the schema comment first claimed
  otherwise and was corrected. And a mock chain that is a real Promise runs
  its callback even when the code takes another branch (`.for()`): a
  "thenable" (an object with `then`) records only what is really awaited.

**The closed-program guard, built 2026-10-11** (migration 0031, custom) — the
database-level half of "a closed program is read-only", decided with the
person right after 2b-iii instead of deferring it: (1) a session already in
progress may still be FINISHED and its exercises ticked; (2) only the app is
guarded — the tables' owner (migrations, the seed's reset, test set-up) is
exempt, found from the catalog (`pg_has_role(current_user, relowner,
'MEMBER')`), so no role name is written in SQL; (3) a trigger, not a
condition in a dozen policies.
- `guard_closed_program_child()`, AFTER INSERT / UPDATE / DELETE on
  `assigned_program_exercises`, `program_workouts`, `program_schedules`;
  AFTER INSERT on `sessions`. Not on a version's days and rotation: their
  policies already allow writing them only with a new version, which is
  refused first — a trigger there could never fire for the app.
- `guard_closed_program_update()`, BEFORE UPDATE on `assigned_programs`: a
  closed program's row is final; the one change left is archiving it
  (`is_archived` → true, everything else equal: `to_jsonb(NEW) -
  'is_archived' = to_jsonb(OLD) - 'is_archived'`).
- **AFTER, on purpose — it closes the race.** A row's AFTER triggers run in
  name order, and the foreign-key checks (`RI_ConstraintTrigger_…`, upper
  case) come first: a new session's check waits for `close()`'s row lock,
  and the guard then reads the program with a fresh snapshot — cancelled.
  A BEFORE trigger would read it before the wait (a mutation check proved
  it: the race test fails).
- The refusal is SQLSTATE 23514 with CONSTRAINT `assigned_program_closed`
  (`isCheckViolation`, `ASSIGNED_PROGRAM_CLOSED` in `pg-errors.ts`);
  `HttpExceptionFilter` turns it into a 409 ("This program is closed, so it
  can no longer change") wherever it comes from.
- Tests: backend 949 unit (+6), e2e 435 (+10), lint 1033 (+5). 16 SQL
  mutations (each trigger, each operation, BEFORE vs AFTER, every condition,
  both owner exemptions) — 2 survivors closed with tests — and 3 code
  mutations, all killed.

**Settled 2026-10-12 — the plan for step 3 (frontend)**, with the person:
1. **Three passes before 3b:** 3a-1 (the assign form on one page, its three
   entries, program rows as links), **3a-w** (workouts in the template
   editor — its own small pass, so several-workout templates can be made in
   the app at all), 3a-2 (the program page). Details:
   `claude/handoff-frontend-3a.md`.
2. **The progress list is grouped by program week**: the current week first
   and open, earlier weeks below, newest first, folded.
3. **The program's actions** (complete, cancel, assign again, the swaps
   switch) are part of 3a-2, not 3b — the backend is ready and they're small.
4. **One workout per scheduled day — kept.** The person asked about an "Add
   a workout" button for a second workout on the same day; weighed and set
   aside: the data allows one (`program_schedule_days`' key is `(schedule,
   weekday)`), the module counts one session per day, and "done", make-ups
   and swaps would all need redefining for half a day. A practitioner who
   wants two areas on one day designs ONE workout covering both ("A · Upper
   + core"). Recorded with "a practitioner-set number of sessions per day"
   in `deferred-improvements.md`.

**Settled 2026-10-12 — 3a-w (workouts in the template editor)**, with the
person, before building it:
1. **Workouts reordered by drag-and-drop** of their header — the person
   preferred it to up / down buttons as better UX. Possible with the
   library already in use (`@dnd-kit`), whose keyboard sensor and
   screen-reader announcements keep it accessible.
2. **Exercises dragged within their own workout only.** Dragging across
   workouts (dnd-kit's multiple containers) is left out of 3a-w: the
   fiddliest part to build, and awkward on a long phone page.
3. **"Move to workout…" AND "Copy to workout…"** on each exercise card (with
   2+ workouts) — the copy was the person's idea, for the same warm-up in
   several workouts. Move = `PATCH …/exercises/:rowId { workoutId }`; copy =
   the existing add route with the same exercise and prescription, appended
   to the target workout — no backend change (no uniqueness on template +
   exercise). **A copy is independent** (copy, not reference): editing one
   doesn't change the other. A shared, linked block is a separate feature.
4. **Copying several exercises or a whole workout at once: deferred** — it
   needs a backend route that copies in one transaction
   (`deferred-improvements.md`).
5. 3b reuses the same menu on the program page.

**Step 3a-1 — the assign form, built 2026-10-12** (frontend only; no backend
change). Decided while building, all within the plan above:
- **One page, three ways in** (`NewAssignedProgramPage`,
  `/practitioner/programs/assigned/new`): `?templateId=` from a template's
  "Assign to a patient" (anyone who can see a live template, a colleague's
  included — assigning copies it; not on an archived one), `?patientId=`
  from the patient page's "Assign a program" (the patient is then FIXED,
  shown as text — but only if they're one of MY patients: otherwise a note
  and the normal choice, since the backend would refuse anyway), nothing
  from the Programs page's "+ Assign a program". The patient page's program
  rows became links to `/practitioner/programs/assigned/:id` (still a
  placeholder until 3a-2).
- **Patients = MY care-team patients** (`GET /users`, the roster's list),
  sorted by last name, each with their **date of birth** ("Pat Lee · born
  12 April 1988") — assigning to the wrong one of two same-name patients is
  exactly what two identifiers prevent. **Templates = every live one**,
  mine marked "(yours)".
- **The chosen template is loaded in full only once chosen**
  (`useProgram(id, { enabled })`): the list has no workouts, the schedule
  needs them. A template the backend would refuse — no exercises, or an
  EMPTY workout — is explained as soon as it's chosen ("Workout B of this
  template has no exercises yet…"), the schedule isn't offered, and nothing
  is sent.
- **The title follows the template** until the practitioner types their own
  (`suggestTitle`: replaced only while empty or still the previous
  template's title).
- **Dates:** start = the viewer's own today (`localDateString`); "Start next
  Monday (Mon 19 Oct)" — the first Monday AFTER today, the date shown on
  the button so "next" needs no interpretation; end = none / "After a
  number of weeks" (1–104, previewed "Ends Sun 8 Nov": start + 7N − 1, so N
  WHOLE program weeks — start + 7N would add a short eighth day) / a date (≥
  start). "Weeks will run Thursday to Wednesday" is shown only for "N times
  a week", the one schedule that counts in program weeks.
- **The schedule** (`ScheduleFields`, controlled, reusable by 3a-2 with ids):
  - Specific days: a row per weekday; with several workouts, ONE picker per
    ticked day. A day's workout may be "not chosen" (null) = **follow the
    suggestion**: the workout after the previous day's, wrapping (Mon A,
    Wed B, Fri A; choose A for Wednesday and Friday's suggestion becomes B).
    Computed when needed (`resolveDays`), never stored. A one-workout
    template shows no pickers.
  - N a week: 1–7, and the order shown "A → B (suggested)" with "Edit
    order" (a list of pickers, add — continuing the cycle — / remove, never
    the last, at most 14; "Use the suggested order" goes back). Sent only
    when edited (the backend's default is the same suggestion).
  - Choosing ANOTHER template keeps the ticked days and the count but drops
    the workout choices (`forgetWorkoutChoices`) — they named the previous
    template's workouts.
  - Before saving, the schedule in words, from exactly what will be sent:
    "Schedule: Mon A · Wed B · Fri A", "3× a week · weeks start Monday · A →
    B → A" (`describeSchedule`, also for 3a-2).
- **Workout references:** the editor and its rules work on a generic
  "reference" and receive the available ones in order — positions `[0, 1]`
  when assigning (the API's `workoutIndex`), the program's ids in 3a-2.
- **After saving:** the program page, `replace`d in the history (Back must
  not reopen a filled-in form whose program exists — a second click would
  assign it twice); the response (the full program) written into its cache
  entry; every program list invalidated (the patient lists sit under the
  same prefix). The backend's refusals are shown as they come
  (`role="alert"`). Cancel goes back, or to the Programs page when the form
  was the first page opened.
- **Native `<select>`s** (`NativeSelect`, `src/common/`) for the many small
  pickers: the phone's own picker, accessible for free, no Radix echo to
  guard against. **Found in live testing (the person, Windows, dark mode):**
  the open list was light grey on white — Chrome / Edge on Windows draw it
  with the select's background only when that is opaque (ours is
  transparent / 30%), else the system's white, while the options inherit
  the light text colour. Fixed with explicit option colours, the theme's
  popover pair (`[&_option]:bg-popover [&_option]:text-popover-foreground`).
- **Types caught up:** `on_hold` out (status labels, the patient page's
  order); programs carry `workouts`, `schedules`, `allowSwaps`,
  `basedOnProgramId`; templates `workouts` and each exercise's `workoutId`.
  `localDateString` moved to `src/common/calendarDate.ts` (with the
  frontend's `YYYY-MM-DD` helpers — computed in UTC, like the backend's).
- **Tests:** frontend 914 (+91). 81 code mutations; the 7 first-round
  survivors: a shape regex in `isCalendarDate` that the round trip made dead
  (removed), `describeSchedule`'s "label or null per workout" (changed to "a
  function, or null" — the type can't express a mix any more), five gaps
  tested (an empty-workout template after days were ticked, workouts out of
  order, one workout listed, changing the count, an invalid start reported
  once). Two time-zone mutations run with `TZ=America/Montreal` and
  `Europe/Paris` (`addDays` in local time is wrong around each side's
  daylight-saving change — a test per side). Verified in Chromium against
  the real backend (all three entries, the stored schedule — Mon / Fri
  Mobility, Wed Strength —, Back after saving, 375 px) and by the person in
  dark mode on Windows.

**Step 3a-w — workouts in the template editor, built 2026-10-12** (frontend
only; no backend change). Within "Settled 2026-10-12 — 3a-w"; decided while
building:
- **The page's shape follows the number of workouts.** One workout → the
  list exactly as before (no header, one Add card), plus **"Add a workout"**
  with a line saying what workouts are for. Several → a section per workout:
  a header ("A · Mobility") with a drag handle, a pencil and — only when it
  would succeed — Delete; its exercises (dragged among themselves only); its
  own Add card (`…/exercises/new?workoutId=58`); a ⋮ menu on each card.
- **Delete is offered only when it would succeed** (an empty workout, never
  the last — `isWorkoutRemovable`, the backend's rule); one line under the
  list says "To delete a workout, move or remove its exercises first."
  instead of a button that leads to a predictable 409.
- **"Add a workout" adds an unnamed one** (`POST …/workouts {}`), named
  afterwards on its header; disabled at 10 with the reason ("A to J").
- **Renaming inline:** an empty field = no name (sent as `null`, never ''),
  at most 100 characters, Enter saves, Escape cancels; the letter stays
  visible beside the field (it isn't part of the name). Each header runs its
  own mutation (EditableField's `save` pattern), so its "saving" state and
  error are its own.
- **The ⋮ menu is flat** — "Move to B · Strength" / "Copy to B · Strength",
  the OTHER workouts only — not "Move to ▸" sub-menus, which fly out sideways
  with nowhere to go on a 375 px phone; each item says its whole action.
  Move = `PATCH …/exercises/:rowId { workoutId }` (the backend appends it to
  the target). Copy = the add route with the same exercise and prescription
  (nulls included), appended to the target; the notice says "The copy is
  independent: changing one won't change the other."
- **Appending = the target workout's LAST position + 1, never a count**
  (`nextExercisePosition`): removing an exercise leaves gaps (positions 0
  and 2 — the count, 2, is taken), and positions restart at 0 in every
  workout. **Two existing bugs fixed with it:** the add page and the
  library's "add to a template" both used the template's whole count (a gap
  in A, or a new exercise BEFORE A's last one once gaps exist). The
  program-side twin (library → assigned program) is still to fix in 3b.
- **Two kinds of drag, separate DndContexts:** one for the workouts (each
  section moves as a block), one per workout for its exercises — so an
  exercise can't land in another workout, and workout ids and exercise ids
  (both plain numbers) can't collide.
- **Optimistic for the two drags only** — cancel any refetch on its way,
  remember, guess, restore on failure (the refetch cancellation has its own
  test). Add, move, copy and delete wait for the server, and every control
  that moves things is disabled meanwhile (`isBusy`), so a second change
  can't be built on a screen about to be replaced.
- **One message area for the editor:** `problem` (role="alert") and
  `notice` (a polite live region always in the page — a change of text in
  an existing region is announced reliably, a region appearing with its text
  is often missed). "<What failed>. <the backend's 4xx reason, or 'Try
  again.' for a 5xx or network failure>"; the next action clears both.
- **Accessibility:** dnd-kit's default announcements speak internal ids
  ("Draggable item 57…"); `sortableAnnouncements` speaks names and positions
  ("Picked up Workout B · Strength, position 2 of 2"; "…is at position 2 of
  2" when over its own slot, which dnd-kit reports right after a pick-up).
  With several workouts, every card button names its workout ("Remove Squat
  from workout A · Mobility") — a copied warm-up puts the same exercise in
  two workouts. Names are set with `aria-label`, not visually hidden spans
  (how the space at a hidden span's edge counts differs between tools —
  jsdom: "Exerciseto"); the visible words start the name (voice control).
- **The add page knows its workout:** "To workout B · Strength" (only with
  2+ workouts — with one it would only puzzle); the `workoutId` travels to
  the library picker and back inside `returnTo`; a workout the template no
  longer has is REFUSED (an alert, Add disabled), never replaced by "the
  first one".
- **The picker's return link is built by parsing, not gluing**
  (`pickerReturnHref` / `localPath`, `src/exercises/`): a `returnTo` that
  already has a query gets "&exerciseId=…" (gluing gave a second "?"), an
  existing `exerciseId` is replaced, and only the path, query and fragment
  are kept — which also closes an **open redirect** (a crafted
  `?returnTo=https://elsewhere.example/…` made every card and Cancel point
  off-site). Other readers of `returnTo`: `deferred-improvements.md`.
- **Built for 3b:** `src/workouts/` (`workoutGroups.ts` — generic over the
  few fields it reads; `WorkoutHeader`; `ExerciseWorkoutMenu`),
  `common/reorderIds.ts` (replaces `programs/templateExerciseReorder.ts`),
  `common/sortableAnnouncements.ts`. Every template request lives in
  `useTemplateWorkoutEditing`; the program page gets a twin hook with the
  program routes and reuses the components.
- **Also fixed the same day:** the demo-accounts doc (Sam's row, Jo's
  indentation) and `dataset.ts`'s matching `shows` — whose first version
  didn't compile (an apostrophe in a single-quoted string). The seed tests
  passed anyway — ts-jest compiles each file without type-checking
  (`isolatedModules`), and no test reads that text — and `tsc --noEmit`,
  which DOES cover `scripts/` and refuses the file, had been run before the
  edit, not after. After any backend change, however small: `tsc`, then
  (for a seed file) run the seed.
- **Tests:** frontend 986 (+72; the 4 old reorder tests moved to
  `reorderIds.test.ts`). 80 code mutations, 79 killed; the survivor — the
  drag handler naming the dragged workout — is reachable only by a real drag
  (jsdom can't measure layout), so it's covered in Chromium and the code says
  so. Build 1,575.84 kB / 404.41 kB gzip. Verified in Chromium against the
  real backend (add / rename / delete a workout, copy and move, both drags by
  keyboard with their announcements, adding to B through the picker, 375 px)
  and by the person.

**Settled 2026-10-12 — "done early" is not a swap** (the person's point,
while checking the first program page against the seed: Pat's Wednesday
session done on the Tuesday showed "Swapped"). A swap is an EXCHANGE: two
scheduled days, each doing the other's workout. A session done on a free
day for a LATER scheduled day is **done early**. Three cases, settled:
1. **From a scheduled day, for another scheduled day of the same program
   week** → a swap (as built in 2b-iii).
2. **From a free day, for a LATER scheduled day of the same program week** →
   done early: the day is `done_early`, with `doneEarlyBy { sessionId, date
   }`; `totals.doneEarly` counts them apart.
3. **From a free day, for an EARLIER scheduled day** → that's catching up: a
   make-up (inferred, within its window) or a late make-up (not offered —
   below). **Refused for now** (400), and designed properly together with
   late make-ups. *(Resolved 2026-10-16: past the window it IS a late make-up,
   opt-in per program — "Late make-ups — settled 2026-10-16".)*
- **One setting for both** cases 1 and 2: `allow_swaps`, whose UI label is
  **"Let the patient rearrange the week"** (the column keeps its name).
- **Backend:** `swap-rules.ts` now receives the program's versions and
  picks the one in force on each of the two days with a pure `versionOn`
  ("is the session's own day scheduled?" depends on ITS day's version, not
  the target's); the service reads the versions up to the later of the two
  days and their days (two queries). Messages made neutral ("Rearranging the
  week is turned off for this program", "A session for another day stays
  within the program week"). In the schedule module, old rows of case 3
  (written before the rule) are judged the same way: not counted.
- **Seed:** Pat now starts 21 days back — week 1 a make-up, week 2 a miss and
  a session done early, week 3 a real swap (the first two consecutive
  scheduled days with different workouts). The dataset spec runs the REAL
  schedule module over every seeded history, for all seven weekdays the seed
  could run on (Pat exactly 4 done / 1 made up / 1 done early / 2 swapped /
  1 missed, no extras).

**Late make-ups — placed 2026-10-12:** Phase 4, right after "Session flow —
start session" (roadmap): the patient's "Make up this session" on a missed
day, the practitioner's per-program opt-in on the program page, designed
together with case 3 above, "recording a session on an earlier day" and
"a minimum rest between sessions" (`deferred-improvements.md`). *(Moved
2026-10-16, with the person: after the CORE session flow — start, exercises,
complete — together with program-specific photos, so a patient can run a
whole session before the flow is extended. Then the Sessions hub.)*
*(Designed 2026-10-16 — "Late make-ups — settled 2026-10-16", after the
session flow's pass (c).)*

**Two flaky e2e tests fixed (2026-10-12)** — both in
`test/auth-recovery.e2e-spec.ts`, found when the person's full runs failed
one time in a few:
- **TOTP at a window's edge.** A code generated in the last moment of its
  30-second window expired before the server checked it (the server allows
  no drift, `epochTolerance` 0). `freshCode()` waits for the next window
  when less than 5 s remain (test timeout 20 s). Proven by forcing the
  boundary.
- **Two clocks.** An audit timestamp was bounded by the test's `Date.now()`
  but written with Postgres's `now()`; Docker Desktop's WSL2 virtual machine
  had drifted ~2.4 s ahead of Windows. The bounds now come from the database
  itself (`SELECT clock_timestamp()`, `databaseNow()`), with no margin.
  Proven with a simulated 3 s drift. (`wsl --shutdown` — after quitting
  Docker Desktop — resyncs the clock; the containers restart by themselves.)
- Also learned: `--silent` doesn't hide pino's request logs (they bypass the
  console); `--json --outputFile=` plus a one-line node script extracts the
  failures on any platform.

**Step 3a-2 — the program page, built 2026-10-12/13** (frontend; one backend
route). `/practitioner/programs/assigned/:id`, in three deliveries, each
confirmed green before the next.

*Batch 1 — reading (2026-10-12):*
- **Header:** title, a state badge (Deleted, then Paused — an active program
  whose schedule today is a pause —, then the status), "For Pat Lee, born
  …" (a link to the patient), the dates, "Assigned by you / by …",
  "Continues …" / "Continued in …" links between programs assigned again.
  On a closed or deleted program a plain notice (not an alert: it's the
  page's standing state, not news) says it is read-only.
- **Schedule & progress:** the schedule in force in words, "(since …)" when
  it changed, "Planned changes" after it, **Up next** (`nextWorkout`;
  "Nothing while the program is paused" / "Nothing left to do"), totals
  ("8 of 9 sessions done" with an end date, "8 sessions done" without; the
  non-zero parts below), then the **weeks**: the focus week open — this
  week, or the LAST week of a program that's over, or the FIRST of one that
  hasn't started (its heading says which) —, earlier weeks newest first,
  later weeks soonest first, each a native `<details>` (a chevron, because
  a flex `<summary>` loses its marker). Each day: a badge AND a sentence
  saying when ("Made up on Thu, Oct 1", "Done early on …", "Swapped with
  …"); each week its result ("2 of 3 done · 1 missed", "Paused"); extras
  with their reason.
- **Exercises:** read-only, by workout (`groupExercisesByWorkout`,
  `WorkoutHeader` without callbacks), each with `PrescriptionSummary` (moved
  to `src/common/`, shared with the template cards).
- **A 404** says both things it can mean — no such program, or a patient
  whose care team I'm not on (RLS makes it invisible; telling them apart
  would confirm it exists) — and where to go.
- **Pure modules:** `programSchedule.ts` (`workoutNames`, `describeVersion`,
  `currentAndPlanned`), `programProgress.ts` (`programWeekOf` — `floor`, not
  `trunc`, so a day before the start is week 0 —, `groupProgressByWeek`,
  `arrangeWeeks`), `progressText.ts` (every state's badge and wording as a
  `Record` keyed by the API's unions — a new state without a wording is a
  compile error). The screen arranges and words the module's answer; it
  never judges a day.
- **Cache:** the summary at `['assigned-programs', id, 'summary', today]` —
  UNDER the program's key (one prefix refreshes both) and with `today` in it
  (a page left open past midnight asks again). Today read once per page
  (`useState(() => localDateString())`); `key={programId}` on the view.

*Batch 2a — closing, the switch, Assign again (2026-10-13):*
- **Decided with the person: the confirmations ASK THE BACKEND** what
  closing would do, rather than guess from the page. The page can't see an
  unfinished session — which turns "deletes it" into "ends it".
- **Backend: `GET /assigned-programs/:id/closing?today=`** →
  `{ cancel: ClosingPlan, complete: ClosingPlan }`, `ClosingPlan = { outcome:
  'archived' | 'cancelled' | 'completed', endDate }`. ONE rule,
  `planClosing()` (pure, `program-state.ts`), used by BOTH `close()` and the
  preview, so the preview can't promise what closing then doesn't do — an
  e2e test previews, closes, and compares. `assertPossibleToday()` shared by
  the summary, closing and the preview. Same access as closing (admin 200,
  patient 403, off the care team 404), 409 on a closed program, no audit
  entry (it changes nothing). Route declared before `:id/summary`.
- **Complete / Cancel:** a dialog each; the preview asked only while it's
  open (`enabled`) and asked again on every opening (`staleTime: 0`); the
  confirm button disabled until the answer is here and while closing; the
  wording from `closingText()` — "Delete this program?" (no session yet) or
  "It will end on Mon, Oct 12[ — today, as a session was completed today],
  and become read-only. Its sessions and progress stay on the patient's
  record; to go on with it later, assign it again."; the dismiss button
  says **"Keep it"** — never "Cancel" in a dialog about cancelling.
  Closing the dialog resets the mutation (no old error on reopening). After
  closing: the program prefix and the lists invalidated, awaited.
- **"Let the patient rearrange the week"** — a native checkbox with a hint;
  `PATCH { allowSwaps }`; the answer (the full program) written with
  `setQueryData`, the lists invalidated; disabled while saving; errors in a
  `role="alert"`.
- **"Assign again"** in the closed notice (not on a deleted program) →
  `/practitioner/programs/assigned/new?basedOnProgramId=12`, a third source
  for the assign form (`CreateAssignedProgramInput` is a union: a template OR
  a program, never both or neither). `AssignAgainPage` checks first what the
  backend would refuse — an invalid id, a 404, a deleted program, one still
  running ("complete or cancel it first"), a patient who isn't mine, an
  emptied workout — and explains it with nothing sent. The patient is fixed;
  the schedule is prefilled from the LAST version that isn't a pause
  (`draftFromVersion`, ids → positions; a stored rotation equal to the
  suggestion comes back as "suggested").
- **Lint caught a real bug:** the assign page returned early ("assign
  again?") BEFORE calling its hooks — switching modes on the same page
  would have crashed ("Rendered more hooks than during the previous
  render"). The page now only chooses between two components; a test
  switches modes and failed before the fix.

*Batch 2b — Change schedule, Pause, Resume (2026-10-13, frontend only):*
- **Decided with the person:** the editor opens **inline** in Schedule &
  progress (the weeks stay in view, no dialog to scroll on a phone); a pause
  is **open-ended**, ended by "Resume" — "Pause from … until …" would
  need two versions written in one transaction, a backend change
  (`deferred-improvements.md`).
- **Buttons:** running → "Change schedule" and "Pause"; paused today →
  "Resume" only (while paused, a schedule from some day IS a resume). A
  button is shown only when some day is allowed for it.
- **All three write a schedule version** (`POST …/schedules`), so they share
  one form and one set of rules (`scheduleChange.ts`, pure):
  - `changeWindow` — the earliest day: today or the start, whichever is
    later (a pause: the day after the start — a program can't start paused);
    the latest: the end date; none once the end has passed. The page is
    stricter than the backend (which allows a day of time-zone slack), never
    looser, so what it offers is accepted.
  - `replacedVersions` / `replacedText` — every version from that day on is
    REPLACED (the backend's rule): listed in an amber notice before saving.
  - `startingDraft` — the editor starts from the schedule in force today;
    while paused, from the last real one before the pause; never from a
    planned change.
  - `nextProgramWeekStart` — for "N a week", a "Next program week (…)"
    shortcut and a note: a change mid-week splits the week, each part's
    target scaled.
  - `scheduleChangeProblems` (the backend's order of checks) and
    `toScheduleVersionInput` (the program's ids; a day left to the
    suggestion sent as the suggested workout; a rotation only when edited).
- `describeDraft` moved to `describeSchedule.ts`, shared by the assign form
  and the editor ("New schedule: Mon A · Wed B").
- **Plain `useState`**, not react-hook-form: two values and one pure
  validation. Problems shown after a first save attempt; the form is mounted
  on opening, so it always starts fresh.
- **Cache:** the answer written with `setQueryData`; the SUMMARY prefix
  (`['assigned-programs', id, 'summary']`) and the lists invalidated,
  awaited — not the program prefix, which would refetch the program just
  received.
- **Focus** returns to a button when the form closes — chosen from the
  program AS SAVED (a pause turns "Pause" into "Resume") and moved once
  that button exists. A test found two real bugs on the way: the form
  vanished mid-save (it was shown only while its kind was offered — the
  opened kind and its days are now kept in state), and focus landed on
  "Pause" a moment before it disappeared (TanStack Query notifies
  components asynchronously after `setQueryData`).

*Tests (confirmed green by the person):* backend 978 unit, e2e 444
(program-lifecycle 45), lint 1036 in the project's measure (+5 in
`program-lifecycle.e2e-spec.ts`, −2 in `auth-recovery.e2e-spec.ts`, from the
done-early work; 2a adds 0 — its e2e tests type their response bodies); frontend
1,151; build 1,605.33 kB / 412.01 kB gzip. Mutations: batch 1, 103 killed;
2a, backend 9/9 and frontend all killed but one documented equivalent (where
the closing key sits); 2b, 54/54 (one first-round survivor — focus after
dismissing a pause — now tested). Verified in Chromium against the real
backend at 375 px in light and dark mode (both closing dialogs, the switch
across a reload, complete → Assign again → a new program "Continues …";
a change planned from next week, the replace notice, pause → focus on
Resume, resume tomorrow) and by the person.

**Settled 2026-10-13 — tailoring a started program (before 3b)**, with the
person. Three questions from the handoff, plus three findings checked against
the running backend before deciding:
- *Findings:* (A) the four program-EXERCISE routes (add, edit / move,
  reorder, remove) predated the audit convention — changing a patient's sets
  left only `PATCH /assigned-programs/1/exercises/3`, no content; (B)
  `session_exercises` only POINTED at the program exercise, so changing 3×10
  to 4×8 made every earlier session say 4×8; (C) `PATCH` accepted an end date
  in the PAST on an active program (200) — the days after it vanished from
  the summary, misses included.
1. **Removing a program exercise a session used → RETIRE it** (it was a 500:
   `session_exercises` RESTRICT). Kept for the sessions that used it, out of
   the program, of new sessions' checklists and of "Assign again". One no
   session used is DELETED (nothing to keep). And for (B): **each session
   keeps a COPY of its prescription**, taken when it starts.
2. **A workout the schedule names: NOT retired** — the page explains it
   (Delete offered only when it would succeed, and a line saying why: "part
   of the schedule — now, planned or in its history"), as 3a-w does. Retiring
   workouts would reach the schedule editor and the module, for little gain.
   The page will also warn (3b-1) before removing the LAST exercise of a
   workout the current or a planned schedule uses (that day could no longer
   start: a 400 at session start).
3. **Dates:** the start date's rule is unchanged (only before the program
   starts); the **end date can't move into the past** (yesterday in UTC at
   the earliest — the usual slack); ending a program now is what Complete /
   Cancel do. Clearing it (open-ended) or extending it stays allowed; the
   page will say what a shorter end cuts off (planned versions that will
   never apply; a current week whose target gets scaled).
4. **Order:** 3b-0 (backend: the findings, the decisions above, the two small
   fixes from the handoff) → 3b-1 (the exercise editor, frontend) → 3b-2
   (title and dates, frontend).

**Step 3b-0 — built 2026-10-13** (backend; one small frontend fix).
Migrations 0032 (generated, HAND-EDITED) and 0033 (custom).
- **The four exercise routes follow the audit convention** —
  `@AuditedByService()`, ONE entry in the change's transaction, the full
  program as the answer (`POST …/exercises` answered with the bare row,
  `DELETE` with nothing):
  - `ASSIGNED_PROGRAM_EXERCISE_ADDED` `{ exercise }` (the whole row as
    added, `exerciseForAudit`);
  - `ASSIGNED_PROGRAM_EXERCISE_UPDATED` `{ exerciseRowId, name, changes }` —
    only what really changed; a move shows as `workoutId` and `sortOrder`
    changes; nothing changed → no UPDATE, no entry. `changedFields` now
    compares ARRAYS by their items (`sameValue`): `===` compares arrays by
    identity, so a re-sent `["legs"]` used to count as a change;
  - `ASSIGNED_PROGRAM_EXERCISES_REORDERED` `{ workoutId, from, to }` (row
    ids, `from` read ordered by position); the same order → nothing;
  - `ASSIGNED_PROGRAM_EXERCISE_REMOVED` (deleted) or `…_RETIRED`
    `{ exercise }` — after a DELETE the entry is the only place it exists.
- **Retiring:** `assigned_program_exercises.retired_at` / `retired_by`
  (CHECK both or neither). `removeExercise` locks the row, then tries the
  DELETE **inside a savepoint** (`tx.transaction()` inside a transaction);
  the foreign key from `session_exercises` (RESTRICT) refuses it exactly when
  a session points at the row — decided by the database, atomically, not by
  a count first — and the service then RETIRES it (`retired_at = now()`,
  `retired_by` = the remover). Without the savepoint the failed DELETE would
  abort the transaction ("current transaction is aborted") and the retiring
  UPDATE would fail too. Removing an already retired exercise → 409.
- **Reading:** `exercises` = the ACTIVE ones only (so every screen, and the
  Phase 4 session flow, can ignore retiring); retired ones come apart in
  `retiredExercises`, in the order they were removed. New sessions' checklists
  and "Assign again" leave them out; a workout's reorder is a permutation of
  its ACTIVE exercises. A retired exercise can't change (409 in the service,
  `assertNotRetired`).
- **Row lock on edits and removals** (`lockProgramExercise`, `SELECT … FOR
  UPDATE`): the audit entry's `from` must be the value the UPDATE replaces.
  Without it, an edit racing another change of the same row read the old
  committed value and recorded the wrong `from` (proven deterministically by
  an e2e test holding the row).
- **Appending** when no position is given: `sortOrder` is optional on `POST
  …/exercises` (`OmitType` + redeclared); the backend puts the exercise after
  the workout's LAST position (`nextExercisePosition`, retired rows counted —
  harmless, and a filter no test could separate). The library's "Assign →
  Assigned Program" now sends just `{ exerciseId }` (it read the whole
  program first and sent EVERY workout's count — a gap or a clash on a
  two-workout program).
- **The session's copy of its prescription:** `session_exercises.name`,
  `sets`, `reps`, `duration_in_seconds`, `weight`, `weight_unit`, `notes`,
  copied by `SessionsService.create` (`prescriptionSnapshot`). 0032 is
  hand-edited: `name` added nullable → backfilled from the program exercise
  AS IT IS TODAY (what older sessions were given was never stored) → `SET NOT
  NULL`. The seed copies them with `INSERT … SELECT`. A session started
  while one of its exercises was being DELETED (its checklist read just
  before the delete committed) → 409 "Your program was just changed: start
  the session again" (the checklist row's foreign key), not a 500. One
  RETIRED at that moment stays in that session's checklist — by design.
- **The foreign key got a name**: `session_exercises_program_exercise_fk`.
  Drizzle's generated name was 70 characters; Postgres had cut it to 63
  (`…_assigned_program`) — the code recognising its refusal would have had to
  spell a truncated name. **And an index on
  `session_exercises.assigned_program_exercise_id`**: Postgres indexes the
  referenced side of a key, never the referencing side, so every removal's
  RESTRICT check read the whole table.
- **The database's half (0033, BEFORE UPDATE triggers, the owner exempt as
  in 0031):** a retired program exercise is final (`assigned_program_exercise_retired`)
  and whoever retires one must sign it (`…_retired_by` = the current user); a
  session's copy of its prescription — and which session and program
  exercise the row is — can't change (`session_exercise_prescription_fixed`;
  one row comparison with `IS DISTINCT FROM`, NULL-safe). A policy says which
  ROWS may be updated, never which COLUMNS: only a trigger compares OLD and
  NEW. BEFORE, unlike 0031: these read only the row being updated, which is
  locked and current when a BEFORE UPDATE trigger fires.
  `HttpExceptionFilter` turns `assigned_program_exercise_retired` into the
  service's 409 (reachable by a reorder racing a removal).
- **The end date** (`end-date.ts`, `assertEndDateMovable`): never before
  yesterday (UTC); only when it really changes (re-sending a passed end date
  is fine); checked AFTER "end before start", so an end before a (past) start
  gets that more basic message.
- **Tests:** backend 1,017 unit (+39), e2e 472 (+28, new
  `test/program-exercises.e2e-spec.ts`; only the 5 known Exercises pagination
  failures), lint 1038 in the project's measure (+4: the session-store
  boilerplate every new e2e file carries; −2 in `assigned-programs.e2e-spec.ts`;
  the new file types its response bodies with `bodyOf<T>(res)`). Frontend
  1,151 (one test replaced); build 1,605.28 kB / 411.99 kB gzip. **57
  mutations, all killed** (code, the DTO, the four controller tags, every
  clause and column of both triggers, both owner exemptions); the first round
  left 3 alive, each a real gap now tested — the row lock (the wrong `from`),
  reorder's `from` order (the fixture's storage order matched its positions),
  and an end-date clock test a version pinned to a fixed date also passed.
  Live in Chromium as Alex (1280 and 375 px): the library adds to the end of
  workout A with a named audit entry; removing a used exercise retires it in
  Alex's name; editing it afterwards is a 409. Confirmed green by the person.

**Settled 2026-10-13 — removing on the page, and showing what's hidden**
(with the person, before 3b-1):
1. **The removal dialog asks the backend what removing WOULD do** (as the
   Complete / Cancel dialogs do): the page can't see sessions, so it can't
   know whether the exercise will be deleted or kept for them. A read-only
   route answers `deleted` or `retired` (with how many sessions used it);
   the removal itself still decides again under its row lock.
2. **Hidden by default, one click away:** a shared checkbox whose label says
   how much it hides ("Show 2 removed exercises"), absent when there's
   nothing to show, off on every visit (like "Show past members"). Used for
   the program's RETIRED exercises (3b-1) and, as its own small roadmap item
   after 3b, for a patient's completed and cancelled programs ("Show past
   programs" — built 2026-10-14, below).
3. **Archived (deleted) programs and templates stay unreachable** — the
   toggle is for the record (retired exercises, past programs), not for what
   the app deleted; the audit log keeps what those were.

**Step 3b-1a — built 2026-10-13** (backend: one read-only route; frontend:
the program's exercise editor). 3b-1 was split: 3b-1a reorganises and
removes, 3b-1b adds exercises and edits prescriptions.
- **The removal preview:** `GET /assigned-programs/:id/exercises/:rowId/removal`
  → `{ outcome: 'deleted' | 'retired', sessionCount }`. One rule,
  `planRemoval(sessionCount)` (a session used it → retired). The removal does
  NOT call it: it still lets the foreign key decide at the moment of the
  DELETE — the preview is a moment's answer (a session may start between
  the dialog and the click), so the two can only disagree on timing, and
  then the removal is right. The same guards as the removal (care team /
  admin, open program, this program's row → 404, not already removed → 409
  in the removal's words, `assertNotAlreadyRemoved`); no row lock (a read);
  not audited (a read, like the closing preview). Sessions counted with
  `countDistinct(session_id)` under RLS — complete for the only people past
  `assertCanManage`; distinct, so the answer doesn't depend on one checklist
  row per exercise (an e2e test inserts a duplicate to prove it).
- **One editor for templates and programs:** the template page's machinery
  moved to `src/workouts/` — `useWorkoutEditing<W, E, R>(queryKey, routes,
  { noun, removedNotice? })` (mutations, `setQueryData` with the server's
  whole answer, optimistic drags with rollback, `isBusy`, one message area)
  and `WorkoutListEditor` (the list, with render props for what differs: the
  card, the Add card, `canDeleteWorkout`, `workoutNote`, `deleteHint`).
  `useTemplateWorkoutEditing` and `useProgramWorkoutEditing` only hand over
  their routes and cache key. The list components accept the hook's result
  by its SHAPE (`WorkoutEditing<E>`, structural typing). The template tests
  passed unchanged — the proof the move changed nothing. The program's copy
  sends no position (the backend appends).
- **The rules, as plain functions** (`programExerciseRules.ts`): Delete on a
  program workout only when it's not the last, has no exercises — removed
  ones included (they still point at it) — and no schedule version (past
  included) names it; sessions done with it the page can't see, so the
  backend's 409 stays the backstop. An empty workout without Delete gets a
  line saying why (schedule first, then removed exercises). Removing the
  last exercise of a workout today's or a planned schedule uses is WARNED,
  not refused (amber, in the dialog): the practitioner may be about to add
  one. After the removal the notice is read from the SERVER's answer
  (`removedNotice`: is the row in `retiredExercises`?), not the preview.
- **The dialog:** asked on every opening (`enabled: isOpen`, `staleTime: 0`),
  a cache key per exercise (a key per program briefly showed the previous
  card's answer — a test now catches it), Remove disabled until the answer
  is known, closing resets the mutation (no stale error on reopening). The
  card unmounts on success, taking its dialog with it.
- **Hidden things:** `ShowHiddenToggle` (src/common/) — a native checkbox in
  its label, "Show N singular/plural", nothing at 0, plain state (off on
  every visit). Removed exercises: when, and in which workout (with
  several); read-only, never clickable.
- **Closed programs** keep the read-only list; only open ones get the editor.
- **Tests:** backend 1,026 unit (+9), e2e 476 (+4; only the 5 known
  Exercises pagination failures), lint unchanged. Frontend 1,203 (+52);
  build 1,613.68 kB / 414.17 kB gzip. Mutations: backend 10/10 (a survivor,
  "count every exercise's sessions", closed by the neighbour test), frontend
  41/41 (three survivors closed — the noun hard-coded, the preview key per
  program, "removing" shown on every template card — and one check removed
  as dead code). Live in Chromium as Alex (1280 and 375 px): a used exercise
  previewed "6 sessions" and was kept; the warning before emptying workout
  A; an unused copy deleted; an empty unscheduled workout deleted; the
  checkbox and the removed list. Confirmed green by the person.

**Step 3b-1b — built 2026-10-13** (frontend only; confirmed green by the
person 2026-10-14). Adding exercises to a program and editing a program
exercise's prescription — the backend routes existed since 3b-0.
- **The page decides what saving means.** `EditableNumberField`,
  `EditableWeightField` and `EditableNotesField` (src/programs/) no longer
  send requests: they take a `save(changes: PrescriptionChanges)` — the
  `save` prop of `EditableField` — and only know when it finished or failed.
  The template's page passes a PATCH of the template's row + its cache
  write; the program's page the program's. `PrescriptionChanges`
  (common/PrescriptionSummary) = the changed fields, `null` = cleared. The
  fields stayed in `src/programs/` (a pure move, not worth the churn yet).
- **One add page for both:** `NewWorkoutExerciseView` (src/workouts/) —
  the picker round trip, `?workoutId=`, the form and its checks, refusing a
  workout that no longer exists — given `noun`, `resource` (title +
  workouts), `resourcePath` and `add`. The template's
  `NewProgramExercisePage` became a wrapper (its tests passed unchanged);
  `NewAssignedProgramExercisePage` (`/practitioner/programs/assigned/:id/
  exercises/new`) refuses a CLOSED program before the form. The program's
  add sends no `sortOrder` (the backend appends) and leaves `workoutId` out
  for a one-workout program (`?? undefined`: JSON drops undefined, keeps
  null). `AddWorkoutExerciseCard` (src/workouts/, was
  `AddTemplateExerciseCard`) takes the resource's path; every workout of an
  open program gets one.
- **The program exercise page** (`AssignedProgramExercisePage`,
  `/practitioner/programs/assigned/:id/exercises/:rowId`, from the card's
  body): the program's own COPY of the description (not the library's
  current one), the prescription editable while open, and the sentence
  "Changes apply to the next sessions. Sessions already done keep the
  prescription they were given." No Remove there — removing has its
  dialog on the program page, where the workout and the schedule it may
  empty are in view. A removed exercise reached by an old link says so; a
  closed program is read-only. `isProgramOpen` (assigned-programs/
  permissions.ts) is the one rule for the three pages.
- **`returnTo` through `localPath`** on the template's exercise page (an
  open redirect, deferred since 3a-w) and on the program's.
- **The library's assign dialog** says where the exercise really goes: "at
  the end of X's first workout. To add it to another workout, use that
  workout's Add card on the program's page."
- **Tests:** frontend 1,242 (+39): the fields with a mock `save`
  (`toHaveBeenCalledWith({ sets: null })` tells null from undefined), the
  pages with LITERAL request bodies and the cache entry they read. Build
  1,619.22 kB / 415.33 kB gzip. 33 mutations, all killed. Live in Chromium
  as Alex (1280 and 375 px): added to workout B through the picker (at its
  end), sets 3 → 4, duration cleared, notes added — one audit entry each,
  `from → to`.

**Step 3b-2 — built 2026-10-14** (frontend, plus one backend fix; confirmed
green by the person 2026-10-14). The program's title and dates, on an OPEN
program's page — the last pass of step 3b.
- **Backend first — a blank title was accepted.** Neither
  `CreateAssignedProgramDto` nor `UpdateAssignedProgramDto` refused `''` or
  `'   '` (`@IsString()` + `@MaxLength(200)` only), so a program could be
  stored with no visible name. One decorator for both,
  `IsProgramTitle()` (`dto/program-title.decorator.ts`, Nest's
  `applyDecorators`): a string, at most 200, `Matches(/\S/)` — "a
  non-whitespace character anywhere" ("The program's title can't be
  blank"). Whether the field may be absent stays with each DTO (required
  when creating, `@ValidateIf(isPresent)` on the PATCH, so `null` is a 400).
  Templates have the same gap (and a 500 on `{ title: null }`): roadmap
  "Blank titles refused everywhere", with the database CHECK
  (`deferred-improvements.md`). *(Done 2026-10-14 — below; the decorator is
  now `IsTitle('program')` in `src/common/validators/title.ts`.)*
- **A "Details" section** (`ProgramDetailsSection`), between the program's
  actions and Schedule & progress, open programs only: Title, Start date,
  End date — three `EditableField` rows, each saving ONE key through
  `useUpdateAssignedProgram` (`mutateAsync`: the field needs a promise).
  The header keeps showing title and dates (as the profile page shows a
  name above its fields).
- **The rules, pure** (`dateChange.ts`, the `scheduleChange.ts` split), the
  backend's order and words, stricter never looser (the viewer's today, no
  time-zone slack):
  - the start moves while it's TODAY or later (`canMoveStart` — on its first
    day nothing is judged yet); once started, read-only with why and what to
    do ("cancel the program and assign it again"). The picker offers today
    → the end;
  - a new start: not a date / in the past / after the end ("…choose that day
    or earlier, or move the end date first" — the backend's message is about
    the other field) / inside a planned pause (the backend's words);
  - a new end: '' = none (always fine), before the start first (the more
    basic explanation), then the past ("…to end the program now, complete or
    cancel it"). The picker offers today or the start, whichever is later.
- **Said before saving** (`describeDraft`), only for a value the rules
  accept — a note about a refused day would describe something that can't
  happen:
  - **start:** "The schedule moves with it: From Wed 28 Oct: …" — the version
    in force on the new day (`versionInForceOn`, the backend's
    `planStartDateMove` reading: the latest on or before it, else the first),
    its words saying the new weekday "N a week" weeks will start on; then
    "What was set to begin before that day will never apply: …". In a
    neutral box: it's what was asked for, told in full;
  - **end, only when it SHORTENS** (an earlier end, or an end for an
    open-ended program): the changes planned after it that will never apply,
    and for "N a week" a last week cut short — "The last program week will be
    Sat 17 Oct – Tue 20 Oct (4 days), so its target becomes 2 sessions instead
    of 3" (or "no session will be expected that week"). Computed over the
    STRETCH the summary uses (one program week under one version):
    `round(N × days / 7)` before and after, from the version's first day if it
    began mid-week, ending before at the week's end, the old end or the day
    before the next version — and said only when the rounded target really
    changes. Amber (the schedule editor's "Saving replaces…" classes).
    Extending or removing the end: nothing to say.
- **`EditableField` grew four generic, optional props** (rather than a second
  component): `min` / `max` (guide the date picker; the schema still
  decides), `describeDraft` (a polite live region, always present while
  editing, the input's `aria-describedby`), `clearLabel` ("Remove end date",
  saves null — a date input has no obvious "empty" gesture), `emptyText`
  ("No end date"). **Fixed with it:** TanStack Query v5 calls a `mutationFn`
  with a second argument (its context), and `mutationFn: save` handed it to
  every caller's `save`; now `(value) => save(value)`. `EditableTags` and
  `EditableAddress` have the same shape (roadmap item above). *(Fixed
  2026-10-14 — "Blank titles refused everywhere", below.)*
- **The cache:** a date sent → the summary AND closing-preview prefixes
  invalidated, awaited ("Saving…" until the progress matches the new dates);
  a title or `allowSwaps` alone → neither (the variables reach `onSuccess` as
  its second argument). Lists invalidated either way.
- `programTitleSchema` moved out of the assign form's schema (`assignForm.ts`),
  shared with the rename.
- **Tests:** backend 1,041 unit (+15: `program-title-validation.spec.ts`,
  `describe.each` over both DTOs), e2e 479 (+3, in
  `program-exercises.e2e-spec.ts`; only the 5 known Exercises pagination
  failures), lint 1038 (unchanged). Frontend 1,301 (+59); build 1,624.00 kB /
  416.93 kB gzip. Mutations: backend 6/6; frontend 58 — two first-round
  survivors: a redundant type check (`timesPerWeek` is null for every other
  kind — simplified) and a real gap (a refused end date showing a note — now
  tested); one documented equivalent left (a type guard for a program with no
  versions). Live in Chromium as Alex (1280 and 375 px): Jo's "3 a week" end
  moved to 20 Oct — the warning said "2 instead of 3", the totals became "3 of
  8" —, then removed; a blank rename refused by the page and the API; a
  program starting next Monday with "3 a week" planned the week after, its
  start moved past it — the schedule re-created on the new day, the first
  version gone; one complete audit entry per change (the start move with its
  replaced and added versions).

**Step 3 of "Assign + scheduling" is complete** (3a-1 → 3b-2), and with it
the roadmap item.

**Decided 2026-10-14 (with the person): editing a program exercise's
DESCRIPTION per patient** — its own small roadmap item after 3b. The
backend already accepts name, muscles, equipment and instructions on `PATCH
…/exercises/:rowId` (the program's own copy); the page shows them
read-only for now.
*Checked 2026-10-14, after 3b-2:* that PATCH answers `null` for `name`,
`primaryMuscles`, `secondaryMuscles`, `equipment` or `instructions` with a
500 (`@IsOptional()` on NOT NULL columns — the null trap), and stores a
blank `name`. To fix first, as 3b-2 did for titles — but the five fields
aren't alike (the person's point): `name`, `primaryMuscles` and
`instructions` are REQUIRED (never empty: `ArrayMinSize(1)` for the lists);
`secondaryMuscles` and `equipment` are OPTIONAL, and "none" is stored as an
empty list `[]` (all four list columns are NOT NULL DEFAULT '{}'), which the
DTO already accepts. So `null` is a 400 for the required three; for the two
optional ones, either a 400 too — "none" is spelled `[]`, one way only
(recommended) — or `null` read as `[]`. To confirm with the person in that
step.

**Settled 2026-10-14 — the description's rules, and what a session keeps**
(with the person, before building — asked in two sessions, the same answers):
1. **`null` on the two optional lists is a 400**, saying "send [] for none":
   one spelling for "none", matching the column (`'{}'`).
2. **A blank item in any list is refused by the backend** (`["  "]`, an empty
   step). The frontend's editor already refused them; now the API agrees.
3. **Sessions copy the description too** — not "accept it and say so": once a
   practitioner can rewrite a step for ONE patient ("stop at 90°"), a
   session's record must say what IT was told. Four columns on
   `session_exercises`, fixed by the 0033 guard (migration 0034).
4. **The library's DTOs are fixed in the same pass** — the same five fields,
   the same gaps, checked live.
5. **Instruction steps up to 1,000 characters** (was 500): 26 imported
   library exercises have a longer step (up to 744 — "Leg Extensions"), a
   program copies them as they are, and the page sends the WHOLE list when one
   step changes — with 500, fixing a typo in step 1 would be refused because
   of step 3.

Decided without asking (said in the delivery): **one name limit, 200**, for the
library and a program's copy (it was 200 / 255) — a copy comes from a library
entry, so it can't need more. In three passes: **D-1** (validation) and **D-2**
(the session's copy), backend, delivered together; **D-3**, the page.

**Steps D-1 and D-2 — built 2026-10-14** (backend; confirmed green by the
person 2026-10-14). Migration 0034 (generated, HAND-EDITED).
- **One definition of a valid description** —
  `src/common/validators/exercise-description.ts`, two composed decorators
  (`applyDecorators`, as `IsProgramTitle`):
  - `IsExerciseName()` — a string, ≤ 200, `Matches(/\S/)` ("The exercise's
    name can't be blank");
  - `IsExerciseList(field)` — the field's limits read from ONE table,
    `EXERCISE_LISTS` (required or not, max items, max item length, the
    item's noun): `IsArray` (an optional list's message adds "send [] for
    none"), `ArrayMaxSize`, then `IsString`, `MaxLength` and `Matches(/\S/)`
    with `{ each: true }` ("A primary muscle can't be blank", "An instruction
    step can't be blank"), and `ArrayMinSize(1)` for the two required lists
    ("An exercise needs at least one primary muscle").
  Used by `CreateExerciseDto`, `UpdateExerciseDto` and
  `UpdateAssignedProgramExerciseDto`. Whether a field may be ABSENT stays with
  each DTO: required when creating (name, primary muscles, instructions),
  `@ValidateIf(isPresent)` everywhere else — never `@IsOptional()`, since all
  five columns are NOT NULL.
- **`UpdateExerciseDto` is no longer `PartialType(CreateExerciseDto)`** —
  written out: `PartialType` makes a field optional with `@IsOptional()`,
  which let `null` through to Postgres (the null trap, its fourth appearance).
- **Before → after, checked live on both routes:** `null` for any of the five
  fields, 500 → 400 with nothing stored; a name `"   "` or `""`, stored → 400;
  `primaryMuscles: ["  "]`, counted as "one primary muscle" → 400; `[]` for
  `secondaryMuscles` / `equipment` → 200 ("none").
- **Existing data measured against the limits first** (the dev database: 878
  library exercises, 16 program copies): longest name 58 characters, at most
  24 steps and 10 items in a list, longest step 744 (hence 1,000). Two
  imported exercises carry a blank step 2 — editable once it's removed, which
  the page's editor already requires (`deferred-improvements.md`).
- **The session's copy of the description:** `session_exercises.
  primary_muscles`, `secondary_muscles`, `equipment`, `instructions` (`text[]`),
  NOT NULL with **no default** — unlike the program's columns: every row is
  written by `SessionsService.create` (`exerciseSnapshot`, renamed from
  `prescriptionSnapshot`) or the seed's `INSERT … SELECT`, so a copy forgotten
  in a future insert FAILS instead of recording "no instructions". 0034,
  hand-edited: added nullable → backfilled from the program exercise AS IT IS
  TODAY (nothing could edit a program's description from the app before this
  step, so today's value is, in practice, what older sessions were shown) →
  `SET NOT NULL` → `guard_session_exercise_prescription()` re-created (`CREATE
  OR REPLACE`, so 0033's trigger calls the new body) with the four columns in
  its OLD / NEW comparison: the copy is as fixed as the prescription. Reading a
  session needed no change — it returns its rows as they are, no join.
- **Tests:** backend 1,150 unit (+109 — the shared spec runs the real
  class-validator engine with `describe.each` over the three DTOs and over the
  four lists — limits and messages written out in the spec itself, never read
  from `EXERCISE_LISTS`, so a changed limit fails until the spec agrees; it
  replaces
  `update-assigned-program-exercise-validation.spec.ts`), e2e 494 (+15:
  `program-exercises.e2e-spec.ts` — each `null` a 400 with nothing stored and
  no audit entry, blanks refused, a real change audited item by item, a
  session keeping what it was given after the program changes, the patient
  unable to change the copy; `exercises.e2e-spec.ts` — the library's twins),
  lint 1038 (unchanged). 17 code mutations and 4 SQL mutations (each new column
  taken out of the guard), all killed; `drizzle-kit generate` shows no drift.

**Step D-3 — the page, built 2026-10-14** (frontend only; confirmed green by
the person 2026-10-14). The program exercise page
(`AssignedProgramExercisePage`) edits the program's own copy of the
description while the program is open — and with it, **the roadmap item
"Edit a program exercise's description per patient" is complete.**
- **The library's fields take a `save`** (the 3b-1b move, applied to
  `EditableExerciseTitle` and `EditableExerciseListField`): the library page
  passes `PATCH /exercises/:id` + the exercise's cache entry + the library
  lists marked stale; the program page passes `PATCH
  /assigned-programs/:id/exercises/:rowId` + the program's cache entry. The
  fields only know whether saving finished or failed; they pass `save`
  exactly one argument (the 3b-2 lesson).
- **One table of rules on the frontend too** — `src/exercises/
  descriptionRules.ts` (`EXERCISE_NAME_MAX_LENGTH`, `EXERCISE_LIST_RULES`:
  label, button, noun, min / max items, item length, multi-line), read by the
  New exercise form, the library page and the program page, so they can't
  drift the way the backend's DTOs had. Steps are 1,000 characters there too
  (the forms said 500 — stricter than the backend, which made an imported
  744-character step unsavable). `ExerciseDescriptionChanges` is the PATCH's
  shape; `ProgramExerciseChanges` = prescription + description, one `save`
  for both kinds of field.
- **Trimmed before checking AND sending:** the list field sends each item
  trimmed (it used to check the trimmed value but send the raw one); the New
  exercise form trims the name and items (zod's `.trim()` is a transform) —
  "   " was accepted there and is now refused before the request.
- **On the program page:** the exercise's name is an h2 under the program's
  h1 (`headingLevel`); the four lists in one block; instructions shown as a
  numbered list (on the library page too — `multiline`); a note while open —
  "This description is this program's own copy: changing it doesn't change the
  exercise in the library or in other programs. Sessions already done keep the
  description they were given." Read-only (no pencils, no note) on a closed
  program.
- **Also closed:** `ExerciseDetailPage` reads `returnTo` through `localPath`
  (the last open redirect on the deferred list).
- **Tests:** frontend 1,322 (+21); build 1,624.22 kB / 417.17 kB gzip. The
  field tests use a mock `save` (`save.mock.calls` with `toStrictEqual`, so a
  stray second argument fails); each page asserts literal request bodies, the
  answer on screen, and (library) the lists marked stale. 24 mutations, all
  killed. Live in Chromium (1280 and 375 px): Pat's "Heel Slides" renamed,
  secondary muscles emptied (`[]`), a required list refused, an 804-character
  step saved — one audit entry each, `from → to` — while Pat's 6 past sessions
  kept the old name, muscles and step (D-2); Robin's cancelled program
  read-only (as Sam); `returnTo=https://elsewhere…` → `/login`.

**Show past programs — built 2026-10-14** (frontend only; confirmed green by
the person 2026-10-14). On the patient page, completed and cancelled programs
wait behind the shared checkbox decided on 2026-10-13 (point 2 of "Settled
2026-10-13 — removing on the page, and showing what's hidden"). Settled with
the person before building (all four recommendations taken):
1. **"Past" = CLOSED (completed or cancelled), by status — not by date.**
   Nothing closes a program when its end date passes: an active program past
   its end still needs the practitioner to complete or cancel it, so it stays
   in view. Hiding it by date would hide work still to do. (Found while
   reading the backend: no code moves `active` to `completed` by itself.)
2. **Two empty states:** "No programs assigned yet." when the patient has
   none at all; **"No current program."** when every program is past — the
   first would be untrue — with the checkbox right under it saying how many.
3. **The checkbox sits under the current list** (as "Show N removed
   exercises" does), not in the header: the past rows then appear right
   below it, and the header keeps only "Assign a program" (less crowded at
   375 px). The two existing toggles sat in different places, so consistency
   didn't decide it.
4. **A past row leads with how it ended:** "Cancelled · ended October 3,
   2026 · ran from September 12, 2026". Past rows are ordered by END, the
   most recent first, completed and cancelled mixed (the order is time; the
   row says the outcome); same end → the later start first. Current rows
   keep their text ("Started … · Active" or the span).
- **Changed from the proposal, said in the delivery:** "Cancelled October
  3" became "Cancelled · ended October 3". A closed program's `endDate` is
  its LAST DAY, not the day someone clicked (cancelling on the 4th sets the
  3rd — `closingEndDate`), so "Cancelled October 3" would state the wrong
  cancellation date. The program page's banner already says "ended on".
- **The rules** (`patientPageRules.ts`, pure): `PROGRAM_GROUP:
  Record<status, 'current' | 'past'>` — a new status is a compile error until
  someone decides its group (a `!== 'active'` test would silently file it as
  past); `splitProgramsForPatientPage` → `{ current, past }` (replaces
  `sortProgramsForPatientPage`; `filter` returns new arrays, so sorting them
  never touches the cached input); `programRowSummary` (both row texts; a
  past program without an end date — not expected, closing always sets one —
  says "started …", never "ended null").
- **The section:** two lists, each NAMED (`aria-label` "Current programs" /
  "Past programs" — a screen reader says which list it enters), one row
  component for both; `ShowHiddenToggle` between them ("Show 1 past
  program"; nothing when none is past); plain `useState`, so off on every
  visit and on the next patient's page (the view's `key={patientId}`).
- **Tests:** frontend 1,336 (+14: 11 rule tests replace the 2 sort tests; 6
  page tests added, 1 rewritten, 2 tightened); build 1,624.94 kB / 417.34 kB
  gzip. 21 mutations, all killed — two first-round survivors were real gaps
  ("No current program." shown beside current programs, and under "No
  programs assigned yet."), now asserted absent. Live in Chromium as Sam
  (1280 px light, 375 px dark): Robin's current program, "Show 1 past
  program", the cancelled one revealed with its wording, unchecked again
  after leaving and coming back; Jo's page with every program past (closed
  in the database for the check, then the seed reset).

**Blank titles refused everywhere — built 2026-10-14** (backend and frontend;
confirmed green by the person 2026-10-14). The last open item of step 3b-2's
findings: templates had the gaps programs had before 3b-2, and neither title
had the database's half. Settled with the person first (all three
recommendations taken):
1. **An existing blank title becomes "Untitled template" / "Untitled
   program"** — it says plainly that nobody named it, and the practitioner
   renames it from the page. **Only blanks are touched:** a title with spaces
   around real words is valid and left as stored (trimming them would change
   more data than the CHECK needs, with no audit entry — see below).
2. **One shared decorator, each message naming its resource:**
   `IsTitle(resource)` in `src/common/validators/title.ts` — 3b-2's
   `IsProgramTitle()` moved there (the second module to use a rule is the
   moment it leaves the first one's folder). `resource` is the union `'template'
   | 'program'`, not any string: every message is one of two known sentences
   ("The template's title can't be blank"; the program's is 3b-2's, word for
   word), and a typo is a compile error. `blankTitleMessage(resource)` is
   exported for the second place that says it (point 4).
3. **One limit, `TITLE_MAX_LENGTH` = 200** (was `TEMPLATE_TITLE_MAX_LENGTH`
   and `PROGRAM_TITLE_MAX_LENGTH`, both 200): assigning copies a template's
   title into the program (the assign form prefills it), so two constants
   that drifted would open the form with a title "too long" before anyone
   typed. `duplicate()`'s "Copy of …" trims to it. The frontend mirrors it
   once, in `src/common/titleLimit.ts`, for both forms.

Built:
- **The template DTOs.** `CreateTemplateDto.title` → `@IsTitle('template')`
  (was `@IsString()` + `@MaxLength`). `UpdateTemplateDto` is no longer
  `PartialType(CreateTemplateDto)` (the null trap's fifth appearance:
  `{ title: null }` reached the NOT NULL column, a 500): title with
  `@ValidateIf(isPresent)` + the rule; the description keeps `@IsOptional()` —
  nullable, and `null` means "clear it" (tested). The description's 2,000 is a
  named constant shared by both DTOs.
- **The CHECKs** (`programs.schema.ts`): `program_templates_title_not_blank`
  and `assigned_programs_title_not_blank`, `length(btrim(title)) > 0` — the
  workouts' form. `btrim` removes spaces only, so a title of a tab alone would
  pass the database; the DTOs refuse it first (`\S` covers every whitespace).
  Kept consistent with the workouts; the difference is written down
  (`deferred-improvements.md`).
- **Migration 0035, hand-edited:** two `UPDATE … SET title = 'Untitled …'
  WHERE length(btrim(title)) = 0` — the CHECK's condition negated, so exactly
  the rows it would refuse change — then the generated `ADD CONSTRAINT`s
  (which check every existing row). Run as the tables' owner, which the
  closed-program guard (0031) exempts: a cancelled program with a blank title
  is renamed too. **No audit entry:** `audit_logs.performed_by` must name a
  user, and a migration has none — the file in version control is the record,
  as for 0032 and 0034's backfills. Proven on planted data (blank titles on an
  active program, a CANCELLED one and a template; spaced titles beside them):
  the blanks renamed, the spaced ones untouched, both CHECKs present,
  `drizzle-kit generate` → "No schema changes"; and without the UPDATEs,
  `ADD CONSTRAINT` fails ("violated by some row").
- **The filter translates both CHECKs into the DTOs' 400**
  (`HttpExceptionFilter`, `PROGRAM_TEMPLATES_TITLE_NOT_BLANK` /
  `ASSIGNED_PROGRAMS_TITLE_NOT_BLANK` in `pg-errors.ts`): unreachable through
  today's routes (the DTOs refuse first), but a future write path that skipped
  them would answer what's wrong, in the same words, instead of a 500. Any
  other CHECK stays a 500 — a test with a neighbour CHECK on the same table
  proves the match is on the constraint's name, not the table's.
- **Frontend:** `createTemplateSchema` — `.trim()` before `.min(1)` (a
  transform: `zodResolver` hands `onSubmit` the parsed value, so the trimmed
  title is what's sent; "   " shows "Title is required" and sends nothing).
  The template page's inline rename already trimmed. `EditableTags` and
  `EditableAddress` wrap `save` (`(next) => save(next)`), the 3b-2 fix to
  `EditableField`: TanStack Query v5 calls a `mutationFn` with a second
  argument (its context).
- **Found by the mutation check:** removing the DTO rule from
  `CreateTemplateDto` passed the e2e tests — the CHECK refused `''` and `'   '`
  and the filter gave the identical 400. Defence in depth working as designed,
  but the test could no longer tell WHICH layer refused. A tab-only title
  (`"\t"`), which only the DTO refuses, was added to the e2e loops; the
  mutation is now killed there as well as by the unit spec.
- **Tests:** backend 1,171 unit (+21: `title-validation.spec.ts` — moved from
  `assigned-programs/dto/` and rewritten with `describe.each` over the FOUR
  DTOs, each with its expected message; the filter's 400s and neighbours), e2e
  499 (+5: templates — blank, tab and null refused with nothing stored, spaced
  and 200-character titles kept; programs — `null` on the PATCH; the CHECKs on
  both tables as the owner, rolled back, with their neighbour), lint 1038
  (unchanged). Frontend 1,338 (+2: the form trims — a literal body —, and a
  blank is refused; the two exact-arguments assertions tightened to
  `toStrictEqual` on `mock.calls`); build 1,624.96 kB / 417.34 kB gzip.
  Mutations: backend 24 — 16 against the unit specs (each DTO's rule and noun,
  `\S`, the limit, the description's null and limit, the filter's four
  translations and the constraint's spelling), 4 against the e2e tests, 4 SQL
  (each CHECK weakened to `length(title) > 0` and to `true`); frontend 6
  (no trim, trim after `min`, a `refine` that checks trimmed but sends raw,
  each wrapper removed, the shared limit). All killed after the one gap above.
  Live in Chromium as Alex (1280 and 375 px): "   " refused in the New template
  form with no request, "  Live Check  " sent trimmed; on the running API,
  `PATCH /programs/:id` with `null`, a tab and spaces → 400.

**Exercise photos on a program — decided and built 2026-10-14** (backend and
frontend; confirmed green by the person 2026-10-14). The roadmap's "Exercise
image upload" turned out to be mostly built: the LIBRARY's photos had their
routes (upload / reorder / remove), `ExercisePhotosPage`, and a carousel on
the template exercise page. What was missing was photos on a PROGRAM's copy
of an exercise — the program exercise page showed none.

*Decided with the person — photos are read LIVE, not copied.* Four options
were weighed: (1) call the item done; (2) show the library's current photos;
(3) copy the photo KEYS into the program and keep any file a program still
points at; (4) copy the FILES per patient. I first recommended (3), for
consistency with "copy, not reference". The person's point carried it to
(2): "copy, not reference" protects the CLINICAL RECORD — the prescription,
and the description that tells the patient what to do (copied per program,
editable per patient since D-3, copied into every session since D-2).
Photos are illustrations, like a leaflet: a practitioner who uploads a
better photo should improve it once, for every patient doing that exercise,
not hunt through programs. Named so the choice is deliberate:
- a photo can disagree with a per-patient rewrite of the text ("stop at
  90°") — the text is the prescription, and the page says the photos come
  from the library;
- a colleague's change to a shared custom exercise reaches my patients —
  answered by a roadmap item of its own, **"Program-specific photos"**
  (Phase 4, below);
- no record of which photo a session showed — accepted: photos aren't part
  of what a session records (its prescription and description are);
- an archived library exercise keeps its files, so its photos still show on
  programs that use it (tested).

*"Program-specific photos" — its own item, sketched with the person:* a
per-exercise choice between the library's photos and photos uploaded for THIS
patient (own keys + `use_library_images`; routes under the program
exercise, audited, the existing triggers applying). Decisions taken in the
discussion: the choice is EXPLICIT (so "no photos" can be chosen); re-ticking
"library" keeps the uploads; "Assign again" COPIES the files (each program owns
its own — no shared files to reference-count); "Copy to workout…" goes back
to the library's photos; deleting a program exercise deletes its own files,
retiring keeps them. **Privacy:** such a photo may show the patient (face,
home) — health data, reachable only through the program's answer, as signed
URLs, never through the library's pages. Placed in Phase 4, when patients see
photos and the privacy question becomes real.

Built:
- **Backend — `images` on every program exercise** (active and retired), in
  `findProgramWithExercises`, which builds every program answer that carries
  exercises (so no route can forget them):
  - `libraryImageKeys(tx, rows)` — the library rows' `media_urls` for every
    row's `exerciseId`, in ONE `IN (…)` query (not one per exercise — the
    N+1 problem), inside the read's transaction under the actor's RLS
    context. `exercises_select` is `USING (true)`, so the patient reading
    their own program (Phase 4) gets the photos too (an e2e test, as the
    patient). No rows → no query (Drizzle refuses `IN ()`); ids not
    de-duplicated (a repeated id is harmless in `IN`, and a `Set` would be
    code no test could see).
  - `signImages(keys)` → `{ url }[]`, the library's `getPresignedUrl` (15
    minutes; local signing, no network call per photo). No object key: a
    program's screens only display photos (the key is visible in the URL's
    path anyway — this is about sending only what's used).
  - `StorageModule` imported by `AssignedProgramsModule`; the service spec's
    twelve testing modules got a fake signer (`signed:<key>`), so a test sees
    WHICH photos, in WHICH order, reached the answer.
- **Frontend.** `AssignedProgramExercisePage`: a "Photos" section (an h3)
  between the description and the prescription, with "Photos come from the
  exercise in the library, so a change there shows here too. They aren't
  part of this program's copy." — the same on a closed program (not the
  program's to freeze); "This exercise has no photos in the library." when
  there are none. `images: { url }[]` on `AssignedProgramExercise`.
- **`ExercisePhotoCarousel`, fixed along the way** (shared with the template
  exercise page — both benefit):
  - its prop asks only for `url` (`Pick<ExerciseImage, 'url'>`), and an
    optional `emptyText`;
  - **the position is clamped** to the list's end: a live list can SHRINK
    while open (a photo removed in the library, then a refetch), and the
    remembered position would read past it (`current.url` on `undefined`);
    Next / Previous step from the photo SHOWN;
  - **photos were cropped** (found by the person): `object-cover` in a
    160 px frame. Now `object-contain` (scaled to fit, whole, letterboxed on
    the muted background) in a 256 / 320 px frame. Thumbnails elsewhere keep
    `object-cover`. Checked in Chromium with bordered landscape and portrait
    photos (jsdom computes no layout);
  - **"the arrow sometimes does nothing"** (found by the person, no
    pattern): reproduced with slowed downloads — 300 ms after Next the
    counter said "2 / 2" over photo 1. Changing an `<img>`'s `src` keeps the
    OLD picture painted until the new one has downloaded; with two photos a
    second click goes back to the one on screen; and the wait comes back
    after every refetch, since each response signs NEW URLs (the browser
    caches by URL — `deferred-improvements.md`, "Signed photo URLs change on
    every response"). Fixed with `key={url}` (another photo = a NEW element,
    which starts empty: "Loading photo…"), the previous and next photos
    PRELOADED (`new Image()` in an effect — only the neighbours, not every
    photo: a phone's data plan), each photo's state remembered by URL (a
    photo seen once shows at once), and an error state ("This photo couldn't
    be loaded." — an expired URL, a missing file — instead of a broken-image
    icon). Checked in Chromium with 1.5 s of latency on every request
    (Chrome's network emulation — Playwright's request routing turns the
    browser cache off, so it can't show a preload working).
- **Tests:** backend 1,176 unit (+5: each exercise its own library's photos
  in the library's order, `toStrictEqual` so no key leaks; retired ones too;
  one query for the whole program; none for no exercise; a row the query
  didn't return), e2e 502 (+3, real uploads to storage: the signed URL serves
  the file; reordered, removed, then archived in the library — the program
  follows; the patient sees them) plus the 5 pagination tests, which passed
  in this run; lint unchanged. Frontend 1,350 (+12); build 1,626.13 kB /
  417.70 kB gzip. Mutations: backend 11 (8 unit-level, 3 e2e — including
  "keep the first read", a snapshot, which only the live e2e test catches);
  frontend 21 (the page, the clamp, each part of the loading fix) — all
  killed.

**Phase 3 is complete** with this item (2026-10-14).

**Pre-Phase-4 clean-up — reviewed and built 2026-10-14** (backend and
frontend; confirmed green by the person 2026-10-14). The person asked for a
review of `deferred-improvements.md`: what is worth doing BEFORE the patient
side is built on top? Chosen together, one pass:

1. **The last null traps.** Checked live: `PATCH /sessions/:id { "status":
   null }`, `PATCH /sessions/:id/exercises/:rowId { "completed": null }` and
   `PATCH /programs/:id/exercises/:rowId { "sortOrder": null }` were 500s
   (NOT NULL columns behind `@IsOptional()`). Now `@ValidateIf(isPresent)`;
   `sortOrder` is also left out of the template DTO's `PartialType` and
   redeclared, like `workoutId`. A sweep of every update DTO found no other.
   *Learned from the mutation check:* leaving `sortOrder` IN the `PartialType`
   changes nothing — class-validator drops an inherited metadata entry when the
   subclass declares one of the same kind (`conditionalValidation`) on the same
   property, so the redeclared `@ValidateIf` hides `PartialType`'s
   `@IsOptional()`. The `OmitType` is kept anyway: it says the intent without
   relying on that rule (a documented equivalent).
2. **The reason of a 500 in the log.** The deferred note feared the stack was
   logged as pino's `context`; a real 500 showed it WAS logged — but without
   its reason: `DrizzleQueryError`'s own text is "Failed query: …", and
   Postgres's message, code and constraint live in its `cause`, which a stack
   string drops. `HttpExceptionFilter` now logs `{ err: exception }` (pino's
   serializer writes message, stack and every `cause`); a thrown non-Error
   goes into the message as text.
3. **Blank instruction steps.** `cleanInstructions()` on import (trim, drop
   steps with no visible character — `\S`, the DTOs' test); migration 0036
   (custom) removes them from existing rows, in order, in the library and in
   programs' copies — NOT in sessions' copies (what a session was given is
   history; the 0033 guard would refuse it anyway). Removing an empty step
   loses nothing; no audit entry (a migration has no user — the file is the
   record, as for 0032, 0034, 0035). *Equivalent mutation:* after the trim,
   "has a visible character" and "isn't empty" are the same test.
4. **Focus after removing an exercise** (templates and programs —
   `src/workouts/`, shared since 3b-1a):
   - **Where:** chosen from the resource AS ANSWERED — the next exercise of the
     same workout (its Remove button, so tidying a workout can go on), else
     the previous one, else the workout's Add card (`focusAfterRemoval`, pure;
     `removedId` travels with the target). The hook reads the resource BEFORE
     writing the answer: only the old one knows the removed exercise's
     workout and position.
   - **When:** only once the removed card has LEFT the screen. TanStack Query
     tells components about new data after `onSuccess`, so for a render or two
     the old list is still drawn — on a program with the removal dialog still
     open, whose focus trap pulled focus straight back. Then `focusMoved()`
     clears the target, so it happens once.
   - **What the mutation check removed:** a ref telling the dialog not to
     restore focus (`onCloseAutoFocus` + `preventDefault`) — when the card
     unmounts, Radix restores focus to the Remove button, which is no longer
     in the page, and a browser can't focus a detached element: nothing to
     prevent (also checked in Chromium); and clearing the target when a new
     action starts — every removal sets a new one, and the list clears it
     after use. Both removed, with a comment saying why. A test that "focus
     moves once" passed with `focusMoved()` removed: it changed the cached
     data and checked at once, before TanStack Query had notified the list; it
     now waits for the new data on screen.
5. **Lint.** The e2e `no-unsafe-*` override (supertest's `res.body` is
   `any`): 1,034 → 69 errors other than formatting, in the assistant's
   sandbox. `npm run lint` reports only (`lint:fix` fixes). The formatting
   drift: one commit of its own by the person — `"endOfLine": "auto"` in
   `.prettierrc` first (otherwise `prettier --write` turns every CRLF file into
   LF), then `prettier --write` over the `format` script's scope (~125 files).
   *The person's question first:* would it break their formatting, e.g. double
   blank lines between sections? Measured before answering — prettier always
   collapses them to one, and only one existed in that scope — and the
   assistant's earlier suggestion ("just run `npm run format`") was withdrawn
   for the CRLF reason.

**Found and left for Phase 4's first step** (roadmap): a COMPLETED session
can be PATCHed back to `pending` and re-rated; any status may follow any
other; session writes aren't audited by the convention; what may change on a
session of a closed program. These are the session flow's own rules — decided
with it, not patched before it.

- **Tests:** backend 1,199 unit (+23: `not-null-fields.spec.ts` 16, the
  filter's logging 3, `exercise-import.spec.ts` 4), e2e 509 (+2); frontend
  1,360 (+10: `focusAfterRemoval` 5, the program section 5 — plus focus
  checks in its delete test —; the template page's removal test checks focus
  too). Mutations: backend 14 (11 unit-level, 3
  e2e; 2 equivalents above), frontend 17 (13 killed at once; of the 4
  survivors, 3 were the dead code above and 1 the weak test). Live in Chromium
  (1280 and 375 px): template — next, previous, Add card; program, through the
  dialog — the next card, then an emptied workout's Add card; Escape returns
  focus to Remove.

**Bundle size — code splitting and slim address data, built 2026-10-15**
*(Since 2026-11-04 the address data comes from Unicode CLDR, not
`country-state-city`, and the library is gone: §48. What follows is the
pass as built.)*
(frontend only; confirmed green by the person 2026-10-15). The build warned
of a 1.6 MB chunk; the person asked to deal with it before Phase 4 adds the
patient side. Measured first (a source-map breakdown): ~40% was
`country-state-city`'s country and state lists (latitudes, flags, time zones —
the forms use codes and names), 17% the app's own pages, all in the one file
every visitor downloads before anything shows.
- **Decided with the person: both fixes, one pass.** Rejected: raising
  `chunkSizeWarningLimit` (hides it); a vendor chunk alone (caching, not the
  first download — deferred as an option).
- **The address data is a generated SNAPSHOT.** The person's question: does it
  stay in sync with the library, in production too? The library was never
  live: its JSON was copied into the bundle at build time — a snapshot all
  along, only bigger. `scripts/generate-address-data.mjs` calls the library's
  own `getAllCountries()` / `getStatesOfCountry()` (their order — the latter
  sorts) and writes `[code, name]` pairs, one per line, CRLF (the repository's
  convention, same bytes on any OS), to `countries.generated.json` /
  `states.generated.json`; `addressData.ts` is the one reader
  (`ALL_COUNTRIES`, `findCountry`, `statesOfCountry`). Same values the forms
  stored (country = code, state = name): no migration. `addressData.test.ts`
  rebuilds the expected data from the installed library — written in the test,
  not imported from the script — and fails with "run `npm run
  generate:address-data`" after an upgrade. Committed rather than generated
  at build time: simpler, visible in review; the test makes forgetting loud.
  `test-setup.ts`'s two-country fixture now replaces `addressData` (the test
  of the real data uses `vi.importActual`). Kept in `dependencies` for now —
  moving it hit an unrelated peer conflict (`deferred-improvements.md`).
- **Every page lazy, the shell static.** `lazy: page(() => import('…'),
  (module) => module.SomePage)` on 31 routes; `page()` returns `{ Component }`
  and is typed, so a wrong export name fails to compile. Static: the guards,
  the layout, the `/` redirect, the login page (a signed-out visitor's first
  screen: another file would only delay it), "Coming soon". The current page
  stays on screen while the next one's file loads.
- **A root route** (no path) for what every page needs:
  `hydrateFallbackElement` ("Loading…" on the very first load) and
  `errorElement` = `RouteErrorPage` — "This page doesn't exist" for an
  unknown address (a 404 route response), or "This page couldn't be loaded"
  with a Reload button (details to the console). Plain `<a href>` links there:
  after a failure, a full load is the safe way out.
- **`NavigationProgress`** in the header: a 2 px bar while
  `useNavigation().state !== 'idle'`, plus an always-present status region
  ("Loading page…") for screen readers.
- **After a deploy** (the new failure mode splitting creates): content-hashed
  files of the old version are gone, so an old tab's first visit to a page
  gets a 404. Vite fires `vite:preloadError` when a dynamic import fails
  (checked in its source: the import itself, not only preloads);
  `staleChunkReload.ts` reloads ONCE onto the new version — at most one per
  10 s, the time remembered in `sessionStorage` (survives the reload), and
  never without storage (even reading `window.sessionStorage` can throw; a
  reload that can't count itself could loop). A second failure inside the
  window reaches the error page.
- **Enforced:** `routes.test.ts` — the one root route with both elements;
  every path route lazy except the listed shell pages; every lazy route loads
  a component.
- **Risks named with the person before applying** (asked for): a short wait
  (one round trip) the first time each page is opened, made visible by the
  bar; an old tab across a deploy (handled above); offline, an unvisited page
  can't load (the error page — its data would fail anyway); dev and build
  differ (checked on both).
- **Results:** first download (`index.html`'s files) 1,627 → 626 kB, 418 → 200
  kB gzip; main file 455 kB / 145 kB gzip (the person's Vite 8.2.2: 419 kB /
  134 kB); the whole app 1,116 kB in 107 files; no warning. Frontend 1,386
  tests (+26). Mutations: 22 — 21 killed by tests, 1 (the "no storage"
  check) by `tsc`, which refuses the mutant (`Storage | null` passed where a
  `Storage` is required). Live in Chromium: production build (`vite preview`)
  and dev; first load 12 files, a page's first visit +2–8 small files, a
  second visit none; the address form (France's 123 regions); the bar at 1280
  and 375 px with 1.5 s latency; a deleted page file → one reload, then the
  error page, then "Reload the page" once restored; an unknown address.

**Phase 4 step 1 — the session rules, settled 2026-10-15** (with the person,
before any code: the nine questions of `claude/handoff-phase-4.md`, the
person's follow-ups, then five details of the plan). Read first, it showed:
any status could follow any other through one `PATCH { status }` (a completed
session sent back to `pending` and re-rated); `completedAt` reset on every
re-send; `scheduledDate` settable by the client (any date); no limit on open
sessions; exercises tickable on a finished session; no audit entry of its own;
and — the finding that shaped point 3 — **the summary files a session under
its `localDate`, the day it STARTED**: a session started on a missed Monday
and completed on Thursday made Monday "done" (a late make-up nobody allowed).

1. **A completed session is FINAL.** The check-out (pain after, mobility,
   feedback, duration) is sent WITH Finish; the screen before it is where the
   patient reviews. No correction window. The practitioner never writes a
   patient's session (it is the patient's own report); something to add later
   is a message (Phase 5).
2. **Four statuses: `in_progress`, `completed`, `incomplete`, `skipped`.**
   - **`pending` is gone.** A row exists only once the patient ACTS (decisions
     §5, point 3, 2026-10-09). The person asked whether the practitioner side
     still needs it for sessions not done yet: no — those are never stored;
     the summary computes them (`due` / `upcoming` days, open week slots).
   - **The life:** start → `in_progress`; Finish → `completed`; Stop →
     `incomplete`; "Skip today" (never started) → `skipped`. Only
     `in_progress` changes; the three others are final.
   - **A reason** for stopping or skipping: a CATEGORY — `pain`, `illness`,
     `no_time`, `other` — plus an optional note (≤ 500, not blank). A
     category, so the practitioner's alerts can find "stopped for pain". Two
     more reasons are the APP's, never accepted from a client:
     `not_finished_in_time`, `program_closed`.
   - **In the summary:** a skip and an incomplete session count like a miss
     (not done) but are LABELLED (the missed day carries the attempt and its
     reason; totals split) — step 1b.
   - **Making up a skipped or missed day** (the person's question): inside the
     make-up window no special action is needed — make-ups are inferred. The
     patient home's Today card says it ("Catch up: Monday's A · Mobility",
     from `nextWorkout`), and the Sessions hub's missed-day row offers "Make it
     up today" on a FREE day inside the window (on a scheduled day, that day's
     own session comes first). Past the window: the late make-ups item, which
     brings the explicit "Make up this session" with `countsFor`.
3. **An unfinished session becomes `incomplete`** — named for how it ENDED;
   how much was done is visible from its ticks ("3 of 8"), so not
   `partially_done` (wrong with nothing ticked), nor `unfinished` (sounds
   open) or `abandoned` (sounds like blame).
   - **Completing happens on the session's own day** (`isPossibleToday`, the
     test starting uses — no new slack); stopping, any time (it counts for
     nothing).
   - **Closed at moments someone acts, not on a timer:** the patient's Stop;
     **starting a new session closes the program's older open ones**
     (`not_finished_in_time`, the starting patient signs the entry); **closing
     a program closes its open ones** (`program_closed`, step 1b). A nightly
     job was weighed and left for later: `audit_logs.performed_by` is NOT
     NULL (a timer has no user — a system actor would need deciding), plus a
     scheduler and a lock against two instances (`deferred-improvements.md`).
     A leftover open session is shown "Not finished" meanwhile.
   - **One open session per program** — a partial unique index.
4. **Audit: the convention everywhere, exercise ticks included** — about 50
   entries a patient a week, nothing for Postgres; the viewer can group them;
   no exception to explain, and an abandoned session's ticks are on record.
5. **Moments are the server's** — the database's `now()`; `completedAt` set
   once (finality); `scheduledDate` leaves the DTO; the app's own duration is
   kept but never longer than the time since the start.
6. **Every session write answers the whole session, with `exercises`.**
7. **Reading:** `GET /assigned-programs/:id/sessions?from=&to=` — same access
   as the program, newest first, no exercises; `GET /sessions` removed (step
   1b).
8. **Pain and mobility in this step's migration:** `pain_before`,
   `pain_after`, `mobility_after` (0–10, optional). **Mobility after only** —
   §6's open question closed: the check-in stays one question.
9. **Closing a program closes its open sessions** (the person's point: an
   open session in a closed program makes no sense) — this REPLACES decision 1
   of the closed-program guard (2026-10-11: "a session in progress may still be
   finished"). Step 1b: the care team / admin need a narrow UPDATE exception
   (sessions are patient-only to write — 0004), limited by the trigger to
   `in_progress` → `incomplete` with `program_closed`, on a closed program.

**The plan's details, confirmed:** (1) each change of status is its OWN route
— `POST /sessions/:id/complete`, `…/stop`, `POST /sessions/skip` — as
programs' `/cancel` and `/complete`; PATCH keeps the open-session edits;
(2) skipping only a scheduled day of a specific-days schedule, for that day's
workout (under "N a week" or a pause nothing is due on a given day);
(3) a skip has no checklist — and **a pain level only when pain is the
reason** (the person's addition); (4) a stop's pain after and mobility are
OPTIONAL (the person's point: they may stop for another reason); (5) the app's
two reasons refused from clients. Two parts: **1a** (rules, data, routes,
audit) and **1b** (reading, closing a program, summary labels, seed).

**Step 1a — built 2026-10-15** (backend only; confirmed green by the person
2026-10-15). Migrations 0037 (generated, HAND-EDITED) and 0038 (custom).
- **Data (0037):** `session_status` = `in_progress | completed | incomplete |
  skipped`, NO default (every insert says what it writes); new
  `session_end_reason` enum; `ended_at`, `end_reason`, `end_note`
  (varchar(500)), `pain_before`, `pain_after`, `mobility_after` (`smallint`).
  - **One CHECK per rule**, so a refusal names it: `sessions_status_moments`
    (which of `started_at` / `completed_at` / `ended_at` each status has — a
    skip has no start), `sessions_end_reason_matches_status` (a reason exactly
    when incomplete or skipped; a skip's is the patient's),
    `sessions_end_note_needs_reason`, `sessions_check_out_when_ended` (pain
    after / mobility only when completed or incomplete),
    `sessions_skip_records_no_work` (no duration, no feedback, pain only for a
    pain skip), three 0–10 ranges.
  - **Two partial unique indexes:** `sessions_one_open_per_program`
    (`WHERE status = 'in_progress'`) and `sessions_one_skip_per_day`. The
    guarantee "check, then insert" can't give: two racing requests both pass a
    check; the second insert fails (23505) → 409.
  - **Hand edits:** the old default dropped BEFORE the type (it depended on
    it); old rows given the new meanings while the column is text (`pending` →
    `in_progress`; a "skipped" row with anything recorded → `incomplete`; a
    missing start ← `scheduled_date`; ended rows ← the latest moment known and
    reason `other`; a stale `completed_at` cleared; older duplicate open
    sessions closed `not_finished_in_time`; duplicate skips → `incomplete`) —
    all before the CHECKs and indexes, which test every row. Proven on a copy
    of the seeded database with every awkward shape planted. No audit entry (a
    migration has no user; the file is the record). In practice only test
    databases hold such rows (the seed writes completed sessions).
- **Guards (0038, BEFORE triggers, the owner exempt as in 0031 / 0033):**
  `guard_session_update()` — a finished session never changes; what a session
  IS (program, workout, patient, day, `counts_for`, start, `scheduled_date`)
  never changes; `completed_at` / `ended_at` must equal `now()`; completing
  only while `local_date` is UTC's date ± 1 (→ `skipped` is already impossible:
  the start can't change, and a skip has none). `guard_session_exercise_open()`
  (INSERT and UPDATE on `session_exercises`) — the row's session must be
  `in_progress`; on UPDATE the session it ALREADY belongs to (`OLD`) — moving a
  row is the 0033 guard's refusal; reading `NEW`'s first answered "finished"
  for a session that didn't exist (found by the 0033 test). It reads the
  session **FOR SHARE**: a tick racing a Finish waits for the Finish to
  commit, then sees it completed (a plain read would see its snapshot — open —
  and let the tick land after).
- **API (`src/sessions/`):**
  - `POST /sessions` — created `in_progress`, `started_at` / `scheduled_date` =
    `now()`, optional `painBefore`; first, in the same transaction,
    `closeUnfinished` closes the program's open session of ANOTHER day (one
    `UPDATE … RETURNING` with `status = 'in_progress'` in the WHERE — a
    session finished meanwhile isn't matched); one open TODAY → the index →
    409 "A session of this program is already in progress today: finish it or
    stop it first". `scheduledDate` in the body → 400.
  - `POST /sessions/skip` `{ assignedProgramId, localDate, reason, note?,
    painBefore? }` → 201, no checklist; `skippedWorkoutId()` — in a person's
    order: before the start, after the end, paused, "N a week", not scheduled
    — each its own 400; a day with ANY session → 409 (index behind it).
  - `POST /sessions/:id/complete` `{ painAfter?, mobilityAfter?,
    totalDurationInSeconds?, sessionFeedback? }` and `POST /sessions/:id/stop`
    `{ reason, note?, painAfter?, mobilityAfter? }` → 200. Both LOCK the
    session first (`SELECT … FOR UPDATE`, with the database's `now()` beside
    it): two Finish taps are taken one after the other, the second gets the
    ordinary 409.
  - `PATCH /sessions/:id` `{ painBefore }` only (`status` → 400 "property status
    should not exist"); `PATCH …/exercises/:rowId` only while open. Only real
    changes written and audited (`changedFields`, moved to `src/common/` — the
    second module to use it).
  - Every write answers the session with `exercises`; finished → 409 "This
    session is finished, so it can no longer change" (the filter gives the
    checklist guard's refusal the same words).
  - Rules as pure functions (`session-rules.ts`): `assertSessionOpen`,
    `assertCompletableOnItsDay`, `assertDurationPossible`, `assertSkipPain`,
    `skippedWorkoutId`. Value rules once (`dto/session-fields.ts`): `IsScore`,
    `IsPatientEndReason`, `IsEndNote`.
- **Audit:** `@AuditedByService()` on all six writes; `SESSION_STARTED` (the
  session + each checklist row's prescription), `SESSION_SKIPPED`,
  `SESSION_COMPLETED` / `SESSION_STOPPED` (the session + each exercise's
  results — `SESSION_STOPPED` also when the app closes one, signed by the
  patient who started the new session), `SESSION_UPDATED` and
  `SESSION_EXERCISE_UPDATED` (from → to; the row's name).
- **Tests:** backend 1,328 unit (+129: the rules with clocks pinned in 2031,
  the DTOs through class-validator, `changedFields`, the service), e2e 577
  (+68: `test/sessions.e2e-spec.ts` rewritten — access, each route, finality,
  its own day at both edges, every CHECK and index as the owner with a
  neighbour, every trigger clause as the app's role, the audit trail and no
  generic duplicate per route). **The races are DETERMINISTIC**
  (`whileHolding`): another connection holds an uncommitted write — an open
  session, a skip, a completion as the patient — and the test proves the
  request WAITED, then got the right answer. Neighbour suites updated (owner
  inserts name a status; `PATCH { status }` → `/complete`; a second session
  needs the first stopped). **96 mutations, all killed** — 35 against the unit
  specs, 27 against the e2e tests, 34 SQL (every trigger clause, both
  boundaries of "its own day", FOR SHARE, OLD vs NEW, each CHECK and index
  dropped). One first-round survivor: removing the ROLE guard on skip — the
  service refuses staff with a 403 too, so the test now asserts the guard's
  own message (defence in depth again).
- **Lint:** the changed files 10 → 0 findings (Prettier-clean as wholes; the
  spec's Jest matchers typed `unknown`).
- **Live check** as Pat: skip on a free day 400; start without `workoutId`
  400; start 201; second start 409; old `PATCH { status }` 400; tick 200;
  complete with an impossible duration 400, then 200; re-rate / tick
  afterwards 409; one audit entry per write.
- **Until 1b:** `program-lifecycle`'s "lets the patient finish a session that
  was in progress" still held (decision 9 reversed it in 1b).

**Step 1b — built 2026-10-15** (backend only; confirmed green by the person
2026-10-15). Migration 0039 (custom). Shapes agreed first: **A.** a scheduled
day carries `attempts: {sessionId, status, endReason}[]` — all of them,
oldest first; **B.** a weekly stretch carries DATED attempts, any other goes to
a top-level `otherAttempts`; `totals.skipped` / `totals.incomplete` count
sessions; `missed` unchanged.
- **Reading — `GET /assigned-programs/:id/sessions?from=&to=`:** every status,
  newest first (`local_date` desc, then `id` desc — creation order within a
  day), the rows only (no checklist: `GET /sessions/:id` has it). `from` /
  `to` optional, both inclusive, validated with `@IsCalendarDate()`;
  `from > to` → 400 "from must be on or before to", checked BEFORE the
  program is looked up (an outsider learns nothing). Access =
  `assertCanView`; outsiders get 404 (row security hides the program).
  `GET /sessions` removed (the controller says why).
- **Closing a program closes its open sessions (decision 9):** `close()`,
  after the program's own UPDATE, in the same transaction, calls
  `closeOpenSessions()` — one `UPDATE … SET status = 'incomplete', ended_at
  = now(), end_reason = 'program_closed' WHERE program AND status =
  'in_progress' RETURNING`; nothing open → done; else every checklist in ONE
  query (`inArray`) and one `SESSION_STOPPED` entry per session, signed by the
  practitioner / admin who closed the program. The program's entry gains
  `closedSessionIds`. **The race** (a Finish at the same moment): the
  patient's request holds the session's row lock, the UPDATE waits, and
  `status = 'in_progress'` is re-checked after the wait — the session stays
  completed, `closedSessionIds: []`. The archive path (cancel with no session)
  is untouched — nothing can be open there. `GET …/closing` adds
  `openSessions` (how many will be closed) for the dialog.
- **Who may write it (0039) — a policy AND a trigger:** a policy says which
  ROWS may be updated, never which VALUES. New permissive policy
  `sessions_update_close_with_program` (admin, or
  `rls_practitioner_manages_patient(patient_id)`, the same function as every
  care-team policy); `guard_session_update()` re-created with a branch for
  anyone whose `app.current_role` isn't `patient`: ONLY `in_progress` →
  `incomplete`, `program_closed`, `ended_at = now()`, every other column equal
  (`to_jsonb(NEW) - 'status' - 'end_reason' - 'ended_at' = …(OLD)` — a column
  added later is covered without editing the guard), and only on a closed
  program (status ≠ active, or archived) — read in the same transaction as
  close()'s own UPDATE. Otherwise `session_staff_close_only`. And the patient
  can't write `program_closed` (`session_program_closed_reason`): the reason
  always means the program closed it. Chosen over a `SECURITY DEFINER`
  function: the write stays the actor's own, under their RLS context, with
  every other session rule.
- **Summary labels (`schedule-summary.ts`, step "8. Attempts"):** the service
  reads completed, skipped and incomplete sessions; only completed ones count;
  skipped / incomplete become attempts, sorted by day then id, filed into the
  scheduled day of their date, else the weekly stretch covering it (first and
  last days included), else `otherAttempts` (a free day, a pause, outside the
  program). Done LAST and on its own: nothing earlier reads them, so a label
  can never change what counts — a skipped day is still `missed`.
- **`src/sessions/session-audit.ts`:** `sessionForAudit` / `resultsForAudit`
  moved out of the sessions service — both services write session entries,
  which must read the same whoever writes them.
- **Seed:** Pat's history gains a session **stopped for pain** (pain 7 after,
  1 of 2 exercises ticked, 17:30–17:45) on week 1's 2nd scheduled day — the
  day made up next day — and a **skip for illness** (07:30) on week 2's
  missed day (`seedAttempts()`, tested; `dataset.spec.ts` checks the summary
  labels them and totals 1 skipped / 1 incomplete).
- **Tests:** backend 1,344 unit (+16), e2e 596 (+19): the list (order, every
  status, from/to edges, 400s, access — patient / care team / admin 200,
  others 404, `GET /sessions` 404); the summary's labels through the API;
  closing (the open one closed, its entry with its ticks, `closedSessionIds`,
  the completed one untouched, another program's open one untouched, ticks
  refused after); the deterministic race; the 0039 rules as the app's role
  (care team and admin may close on a closed or archived program; refused on
  an open program, for a finished session, and for any other change — other
  reason, status, moment, field; outsiders 0 rows; the patient refused
  `program_closed`). The new tests share programs where they can: the 60 a
  minute limit on `POST /assigned-programs` was reached. Neighbours: the
  lifecycle test of decision 1 (2026-10-11) flipped; previews expect
  `openSessions`; exact summary shapes expect `attempts: []`, `skipped: 0`,
  `incomplete: 0`.
- **64 mutations, 63 killed** (21 + 4 unit, 9 + 2 e2e, 14 + 2 SQL — the first
  round's 6 survivors got tests: a stretch's edge days, the summary reading
  skips, the preview's count, closing a FINISHED session, `skipped` with
  `program_closed`). **The one survivor is equivalent:** widening the new
  policy to `USING (true)` changes nothing observable — sessions' SELECT
  policy already hides the row from anyone outside the care team, so the
  narrow policy is defence in depth.
- **Live check** as Pat: the list (10 sessions, the skip labelled), the
  summary (28 Sep made up + the pain stop; 2 Oct missed + the illness skip;
  totals 1 / 1), `GET /sessions` 404, a backwards range 400.

**Phase 4 step 2 — the practitioner catch-up and the patient home, built
2026-10-15** (confirmed green by the person). Proposed first and agreed as a
whole: (1) three small backend additions for the home; (2) the session flow
right after the home, its buttons with it; (3) program cards not links yet;
(4) a short practitioner pass first, since the frontend types had to catch
up with step 1b anyway. Two deliveries.

*Delivery 1 — the practitioner pass and the backend for the home:*
- **Types caught up** with step 1b: `SessionEndReason` (a union of the six
  reasons), `SessionAttempt` / `DatedAttempt`, `attempts` on days and weekly
  stretches, `otherAttempts`, `totals.skipped` / `incomplete`,
  `openSessions` on the closing preview.
- **The program page labels attempts** (`attemptText`, `progressText.ts`):
  "Skipped (illness)" — a skip always carries the patient's reason;
  "Stopped (pain)" — the patient pressed Stop; "Not finished (the program was
  closed)" / "(left open until a later session started)" — the APP closed it,
  so "Stopped" would claim the patient did something. Under the day's own
  sentence; dated under a weekly count; "Sessions not completed" in its week
  for a free day or a pause (`groupProgressByWeek` files `otherAttempts` by
  date, like extras); outside the program's dates in the "outside" section.
  `END_REASON_TEXT` is a `Record` over the union (a new reason is a compile
  error).
- **Totals** add "1 skipped · 1 not finished" — counted SESSIONS, apart from
  "missed" (a skipped day is also missed); the comment says why.
- **The closing dialog** says "The patient's session in progress will be
  stopped, and kept as not finished." (`closingText(action, plan,
  openSessions, today)`) — "not finished" is the word the list will then show.
- **Backend, three additions:**
  - `openSession` in the summary — `{ sessionId, localDate, workoutId }` or
    null: the in-progress session, read by the summary's own query and kept
    AWAY from the pure module (an open session neither counts nor labels).
  - `workouts` on every program of `GET /assigned-programs` — one batched
    query (`withWorkouts`), ordered by `orderWorkouts`, in the caller's RLS
    context: the home names a day's workout without fetching every program
    in full (exercises, signed photo URLs).
  - `?through=YYYY-MM-DD` on the summary — cover AT LEAST to that day,
    rounded up to the end of its program week (whole weeks), never past an
    end date, never shorter than the default. Bounded by the service: on or
    after today, at most 366 days ahead (the module walks the program day by
    day — `through=9999-12-31` would be three million days). A subclass DTO
    (`ProgramSummaryQueryDto`), so the closing preview, which shares `today`,
    refuses `through` (400) instead of ignoring it.
- Backend 1,373 unit (+17), e2e 606 (+8; the 5 known pagination failures in
  the sandbox). Frontend 1,402 (+16). Mutations: backend 16/16, frontend
  21/21 (two assertions added first: "exactly one list" in the outside
  section — the "no empty list" guards were otherwise invisible). Live:
  Pat's labels and totals as Alex, the dialog after Pat started a session.

*Delivery 2 — the patient home (decisions §2, "Patient home"):*
- **One more backend change, found while writing the Today rule:** an "N a
  week" program must not offer a second session TODAY (it would count for
  nothing — `same_day`), and a weekly slot had a session id but no DATE.
  Each slot is now `{ workoutId, sessionId, date }` — the module had the
  session's `localDate` in hand when filling it. (One neighbour e2e test
  compared the whole week shape.)
- **Rules, pure** (`patientHomeRules.ts`): `todayStatus` — in this order:
  a session open TODAY (one left open on an earlier day is ignored: the next
  start closes it), a pause covering today, today's scheduled day (done /
  skipped / due), today's weekly stretch (a slot dated today → done; a target
  of 0 → nothing; met; the next OPEN slot), a missed day still in its window
  (`nextWorkout.forDay < today`); `upcomingItems`; `activePrograms`;
  `progressFraction`. Words apart (`patientHomeText.ts`), written for the
  patient.
- **Data** (`usePatientHome`): the list, then one summary per active program
  with `through` = today + 13 (`useQueries` — the rules of hooks forbid
  `useQuery` in a loop). `through` is part of the summary's cache key (a
  separate answer from the program page's), under the same `summary` prefix
  (a schedule change refreshes both). Today read once per page.
- **Changed after the live check:** Upcoming rows ran "· " separators into
  the workout label's own "·" — now a date column and "title: workout",
  the label kept whole (`whitespace-nowrap`, which also fixed a break inside
  "A · Mobility" at 375 px); a weekly program's line leads with the count
  ("A session" said nothing).
- **Found by the mutation check:** a last week scaled to a target of 0 is
  "met" in the summary — the home would have said "This week's 0 sessions
  are done". Now nothing. Two state checks proven dead (a stretch containing
  today is only `in_progress` or `met`) were removed, a date check in
  Upcoming too (`upcoming` already means after today, and a later day can be
  `done_early`, which the state check excludes — tested); two equivalents
  said in the code.
- **Moved before confirmation, at the person's question:** from
  `src/patient-home/` to `src/app/home/patient/` (§2).
- **A flaky test fixed on the way** (`RouteErrorPage.test.tsx`, from the
  bundle-size pass): it checked a `console.error` written by a `useEffect`
  the moment the heading appeared — React runs effects AFTER committing, so
  on a busy machine the check could come first (reproduced 2 in 12 under
  load; 0 in 12 after). It now WAITS for the log (`vi.waitFor`).
- Backend 1,374 unit (+1), e2e 606. Frontend 1,466 (+64); the home is its own
  12 kB chunk, the main file unchanged (455 kB). Mutations: frontend 41 — 37
  at once, the 4 survivors as above, then 4 re-run, all killed; backend 2 (1
  equivalent: the sessions of one day share their date). Live in Chromium
  (375 px dark, 1280 px light): Pat, Jo, Robin as seeded, then each state
  driven through the real API — due → in progress → stopped (pain) → done →
  skipped (illness); Jo's weekly week after a session today.

**The session flow — settled 2026-10-16** (proposed before any code; "Agree to
all"). Phone-first, in a new `src/sessions/` feature folder, pages lazy.
1. **Routes:** `/patient/sessions/start/:programId` ("before you start"),
   `/patient/sessions/:sessionId` (the running session), and — with pass (c) —
   `…/:sessionId/finish` and `…/:sessionId/stop` as ROUTES, not dialogs (a
   phone's Back button closes them; a reload keeps the place).
2. **Start has its own page, and nothing is written until "Start session".**
   `POST /sessions` opens the session at once; a tap just to look, then
   leaving, would leave an open session the practitioner later reads as "not
   finished".
3. **The start page names only the program** and works out today's workout
   again with the home's own rule (`todayStatus` → `startChoice`): a stale or
   edited link can't start the wrong workout; an open session of today
   redirects to it; done / paused / skipped / nothing says why.
4. **The home's buttons:** Start on due, catch-up and weekly rows; Resume on
   an in-progress row; **Skip today** (pass (c)) on due rows only — the one
   case the backend accepts.
5. **One exercise at a time** (pass (b)): "2 of 5", Previous / Next, an "All
   exercises" list to jump; each with the session's own copy of name,
   prescription (weights through `WeightValue`) and steps, the program's
   photos (`ExercisePhotoCarousel`, matched by `assignedProgramExerciseId`,
   retired exercises included), a Done toggle, an optional difficulty 1–10 and
   note. **Ticks optimistic** (shown at once, requests one at a time, undone
   with a message on failure).
6. **Finish** (pass (c)): a review — "4 of 5 done", optional pain after,
   mobility after, feedback — and a plain statement that a finished session
   can't change; unticked exercises get a sentence suggesting Stop, never a
   block (§6).
7. **A session left open on an EARLIER day: no Resume** — it can't be
   finished (completing happens on its own day) and the next Start closes it.
   One sentence on the home's row; its page shows it with Stop only (pass (c)).
8. **The 0–10 scales are 11 radio buttons**, not a slider: a slider always has
   a value, so it can't say "not answered".
9. **No duration sent, no per-exercise timer:** `startedAt` / `completedAt`
   already measure the session; the app's own timer would be a less reliable
   copy. A hold timer for timed exercises: a later nicety.
10. **Blank feedback refused** (backend, first): the per-exercise `feedback` and
    `sessionFeedback` accepted `"   "`; every other free text refuses it.
11. **Three passes**, each confirmed green before the next, as the roadmap's
    three lines: (a) start, (b) progress through exercises, (c) Finish / Stop /
    Skip.

**Pass (a) — built 2026-10-16** (confirmed green by the person).
- **Backend:** `IsFeedback()` beside `IsEndNote()`, both from one private
  builder (`isPatientText(noun, maxLength)` — `IsString`, `MaxLength`,
  `Matches(/\S/)` with "The feedback can't be blank: leave it out instead");
  `null` still clears (`@IsOptional()`). Used by `UpdateSessionExerciseDto`
  and `CompleteSessionDto`.
- **`todayStatus` moved to `src/sessions/todayStatus.ts`** (with its tests): its
  second reader (the start page) arrived, and a rule shared by two features
  lives with the feature it is about. `in_progress` now carries the open
  session's `sessionId` (Resume's target).
- **`startRules.ts`** (pure): `startChoice` (start / resume / none),
  `sessionLeftOpen`, `workoutExercises`. **`sessionText.ts`**: the flow's
  words (why this workout today, why nothing, the left-open sentence, a
  session's state — endings worded by the practitioner page's `attemptText`).
- **The start page:** the program and today's summary (the summary waits for
  the program — no request after a 404); the workout (named only with
  several), why today ("Catching up Wednesday's session…", "Session 2 of 3
  this week (…)"), its exercises with `PrescriptionSummary`, the pain
  question, Start. The body: `assignedProgramId`, `localDate`, `workoutId`
  ALWAYS, `painBefore` only when answered (0 is an answer), never `countsFor`.
  An emptied workout is said, with no button. After starting
  (`useStartSession`): the answer cached under `['sessions', id]`, the
  program's summaries marked stale (not the program), then the session page
  with `replace` — Back goes home.
- **`ScoreScale`:** native radios hidden inside labels styled as buttons
  (`has-[:checked]:`), a fieldset named by the question, the ends' meaning in
  the hint (`aria-describedby`), "Clear answer: <question>", `useId()` per
  scale (radios sharing a name are one group page-wide).
- **The session page (frame):** program and workout, "In progress · Started at
  2:05 PM" ("Started on Thu 15 Oct" on another day), the check-in, the
  session's own checklist with "Done" / "To do" in words, the left-open
  sentence. The program is read only for its title and workout names (a
  dependent query); the page still shows the session if it can't be read.
- **The home:** Start / Resume as links named with the program ("Start Knee
  Rehab — Pat"); the left-open sentence on a LINE OF ITS OWN (joined to the
  detail, it ran into "Stopped earlier today (another reason)", which has no
  full stop — found in the live check); a row of its own when today asks
  nothing of that program.
- **Tests:** backend 1,390 unit (+16), e2e 608 (+2); frontend 1,549 (+83).
  Mutations: backend 8/8; frontend 52, all killed — 3 first-round survivors
  were weak tests: "the program not invalidated" (an active query refetches at
  once, clearing its flag — now counted as requests), "left open, whatever
  the day" (today's case was never tested), "two scales sharing one radio
  name" (jsdom doesn't group them — the names are now compared). Main file
  unchanged (455.70 kB); the start page 5.5 kB, the session page 3.6 kB. Live
  in Chromium as Pat on the production build (375 px dark, 1280 px light):
  Start → pain 3 → the session; Back → home with Resume; the start link with
  a session open → the session; a session moved to yesterday → its sentence.

**Pass (b) — built 2026-10-16** (confirmed green by the person). Frontend only.
- **The player** (`SessionPlayer`) replaces the checklist while the session can
  still be done — `isRunnable`: open AND of today (an earlier day's open
  session would record ticks that can never count). "Exercise 2 of 5", the
  exercise, Previous / Next, then "All exercises" (each a button, "Done" /
  "To do" in words, `aria-current="step"` on the one shown). It opens on the
  first exercise not done (`firstToDoIndex`) — Resume lands where the patient
  stopped. The position is component STATE, not the address: the phone's Back
  leaves the session instead of stepping through exercises. Focus moves to the
  new exercise's name (`tabIndex={-1}`) after Next or a jump, never on opening.
- **One exercise** (`ExerciseStep`): the session's copy (prescription through
  `WeightValue`, numbered steps, the practitioner's note, "Works: … ·
  Equipment: …"), the program's photos (`photosFor` — by
  `assignedProgramExerciseId`, retired rows included; no carousel when none),
  **Done** as a toggle button (`aria-pressed`; its name "Done: Squat" never
  changes, the look does), **"How did it feel?"** — difficulty through
  `ScoreScale` with `min={1}` (the column's CHECK is 1–10; whole Tailwind class
  names per range, since classes built at run time get no CSS) and a note
  (a draft until "Save note"; trimmed; empty = `null`, "Remove note" when
  clearing a saved one; ≤ 2,000; a fresh draft per exercise via `key`).
- **Saving optimistically** (`useUpdateSessionExercise`): `onMutate` cancels a
  session re-read on its way, remembers the changed fields' values, writes the
  guess; requests go ONE AT A TIME (TanStack Query's mutation `scope` —
  `onMutate` still runs at once for a queued one); only the LAST answer is
  written (`isMutating() <= 1`), so an older answer can't wipe a newer guess;
  a failure puts back only ITS fields (not a snapshot, which would undo a
  change queued behind it), says what failed (`describeFailure`), and re-reads
  the session when nothing else is pending (a 409 — finished elsewhere — then
  turns the page read-only by itself).
- **Tests:** frontend 1,587 (+38). 43 mutations, all killed — 3 first-round
  survivors in the failure paths (no undo, undoing the whole row, no cancel),
  each closed by a test that HOLDS the next server answer (a gated re-read, a
  held second request, a re-read in flight during a tick); plus a test where
  the server's answer differs from the guess. The timing tests passed 6/6, and
  3/3 in parallel. Main file unchanged; the session page 9.7 kB (the carousel
  joined it). Live in Chromium as Pat (375 px dark, 1280 px light): Done,
  difficulty 4, a trimmed note, one audit entry each; a reload and Resume
  opened on the first exercise not done.

**Pass (c) — built 2026-10-16** (confirmed green by the person). Frontend
only. With it, the session flow is complete.
- **Finish** (`/patient/sessions/:id/finish`): "1 of 2 exercises done", an
  amber sentence with "Stop instead" when exercises aren't ticked (never a
  block), pain after and mobility after (two `ScoreScale`s), the session
  feedback (≤ 2,000), "Once finished, the session is recorded as it is and can
  no longer be changed." A finished session says so; one from an earlier day
  offers Stop (completing happens on its own day).
- **Stop** (`…/stop`): the reason REQUIRED but never pre-chosen (a default
  would record a reason the patient didn't give) — `ReasonPicker`, native
  radios; "Choose a reason first." with `aria-invalid` / `aria-describedby`
  and focus on the first choice; a note (≤ 500, `EndNoteField`); the optional
  check-out. Any open session, an earlier day's included.
- **Skip today** (`/patient/sessions/skip/:programId`, from the home's DUE rows
  only): like the start page, the address names the program and
  `skippableWorkout` (→ `todayStatus`) decides again; the pain question only
  for the reason "pain", and a level chosen before the reason changed is never
  sent.
- **What is sent** — `endingRules.ts` (pure): only answers (`=== null` checks —
  0 is an answer), texts trimmed, blank = nothing.
- **After each** — `useSessionWrite` (the start hook now uses it too): the
  answer cached, the program's summaries stale, home with `replace` and a
  notice (`readNotice`, moved to `src/common/` — its second reader).
- **Found in the live check — a page that DECIDES must not decide from the
  cache.** Start → Stop → Start again sent Pat back into the STOPPED session:
  the start page had cached, while still mounted after the first start, a
  summary saying "session 73 is open"; the stop marked it stale, but nothing
  refetched it; the next visit decided from it. Fixed: the summary hook's
  `fresh` option (`staleTime: 0`) for the start and skip pages, which wait for
  THIS visit's first answer (`isFetchedAfterMount`) — and only the first: a
  later background refetch keeps the form and the patient's answer.
- **Tests:** frontend 1,655 (+68). 56 new mutations, 55 killed, 1 equivalent
  (the reason picker's own radio name — one picker per page; said in the
  code); pass (a)'s 23 re-run against the refactored pages (4 re-aimed, 1
  assertion restored that pass (b) had dropped). Main file 456.71 kB (+1 kB:
  three route entries); each ending page 3–4 kB. Live in Chromium as Pat (375
  px dark, 1280 px light): Finish with check-out, Stop with reason and note,
  Skip for pain 6 — stored exactly, audited.

**Late make-ups — settled 2026-10-16** (proposed before any code, every point
agreed by the person; the "one session a day" refinement was the person's):
1. **What one is:** a session on a FREE day of a specific-days schedule with
   `countsFor` = an EARLIER scheduled day that was **missed** — its make-up
   window had closed (a scheduled day came) and nothing fulfilled it. It does
   that day's workout. Inside the window it isn't one: that's an ordinary
   make-up, inferred, with no link. "N a week" programs have none (each week
   stands alone — decided 2026-10-10).
2. **Opt-in per program: `assigned_programs.late_make_up_days`** — NULL = not
   allowed (the default: the practitioner's clinical call), 1–28 = up to that
   many days AFTER THE MISSED DAY (Mon 12 with 7 → until Mon 19). One nullable
   column, not a boolean plus a number: "off, but 7 days" can't be stored.
   Like `allowSwaps`, it governs NEW sessions only — recorded late make-ups
   keep counting if it is later turned off or shortened.
3. **Counted apart:** the day becomes `made_up_late` (`madeUpLateBy { sessionId,
   date }`), `totals.madeUpLate` — never in `madeUp`, never `missed`. Explicit
   only: the module never infers one. Reuses `sessions.counts_for` (no second
   column).
4. **One session a day — prevented, not only uncounted** (the person's point).
   Found while designing: on one day, a session for another day (a swap half,
   done early) and the day's own session or a make-up could BOTH count — the
   module judged the two kinds apart (measured on the real module). Decided:
   once a program's day has a COMPLETED session, nothing else starts that day
   (409, with a message saying what happened and why: "…Only one session a day
   counts, because sessions too close together can be too much for your body…");
   a STOPPED one doesn't block. The module keeps a rule for such rows anyway (a
   pure function answers any input): the session created first counts, the
   others are `same_day`. (This closes the "stopping the patient BEFORE a
   second session" left to Phase 4 on 2026-10-10.)
5. **What may be started today is the module's answer:** `lateMakeUps = { days:
   [{ forDay, workoutId, until }], blockedToday }` — the missed days still in
   reach, oldest first, each with the LAST FREE day it can be done on (`until`:
   "until Sun 18", not "Mon 19" when Monday is scheduled); `blockedToday`
   `not_a_free_day` | `session_done_today` | `catch_up_first` | null. The screens
   offer what it says, `POST /sessions` refuses what it doesn't. *(Corrected
   2026-10-17: `catch_up_first` removed — only RULES block; see "Corrected
   2026-10-17" below.)*
6. **An ordinary catch-up comes first:** while a missed day can still be made up
   on time, no late make-up is offered — the home shows an information line
   ("You can also make up Monday 12 late on another free day, until Sun 18")
   instead of a button. The home offers the OLDEST late make-up (it runs out
   first); the Sessions hub, later, lists every one with its own button.
   *(Corrected 2026-10-17, the person's point: "comes first" is the HOME's
   suggestion, not a rule — the backend no longer refuses a late make-up while
   an on-time catch-up is open, so the hub can let the patient choose. See
   "Corrected 2026-10-17" below.)*
7. **Case 3 of "done early is not a swap" (2026-10-12) is resolved:** a free day
   for an earlier day is a late make-up past the window, an ordinary make-up
   within it ("start the session without countsFor"). The two switches are
   separate: `allowSwaps` (swaps, done early — "rearranging the week") and
   `lateMakeUpDays`.
8. **"Assign again" copies both settings** (it copied neither: a continued
   program always started with swaps on).
9. **Not now** (explained to the person, agreed): *recording a session on an
   earlier day* — a late make-up says "today I did Monday's workout", which the
   database's clock confirms; backdating says "I did it on Monday", which the
   app can't check, would need an exception in the completed-on-its-own-day
   guard (0038), and its pain "before" would be remembered, not measured; *a
   minimum rest between sessions* — late make-ups happen only on free days, one
   session a day is now enforced, N limits how far back things bunch up, and
   counting them apart makes a "skip all week, catch up on Sunday" pattern
   visible.
10. **In three passes:** the backend; the practitioner's frontend (the setting,
    the badge with its sentence, the totals); the patient's (the home's line
    and button, the start page, "Make-up for Mon 12").

**Backend pass — built 2026-10-16** (confirmed green by the person).
Migrations 0040 (generated: the column and its CHECK
`assigned_programs_late_make_up_days_range`, 1–28) and 0041 (custom: the
trigger).
- **The module, one session a day:** each day's sessions that COULD count
  become candidates first — `{ session, apply }`, the effect not yet applied —
  then `settle()` lets the one created first (lowest id) apply and makes the
  others `same_day`. Decide, then apply: rules that each wrote as soon as they
  matched had no place that saw the whole day. Sessions done EARLY are now
  validated on the day they're done (`scheduledWorkoutOn(target)`: versions
  are known for every day), so the waiting list never holds one that can't
  count; a session linked to its own day never counts (explicit); a second
  link to the same day the same day is `swap_not_counted` (`claimed`). On a
  weekly-count day, the day's own sessions come first (they are counted later,
  by the week — a rare case: a schedule changing kind within a week).
- **The module, late make-ups:** from a free day of specific days, for a day
  still unfulfilled whose window has CLOSED (`windowEnd.has(day)` — a window's
  end is recorded only when it closes) and expecting that workout →
  `made_up_late`; otherwise `swap_not_counted`. `lateMakeUps` computed after
  the days are settled (`isFreeDay`: inside the program, a specific-days
  version, not scheduled); the search for `until` looks at most N + 1 days.
  `ExtraReason` `swap_not_counted` now covers every session for another day
  (its name predates done early and late make-ups).
- **The swap rules classify first:** `sessionForOtherDay()` (was
  `swapWorkoutId`) → `{ kind: 'swap' | 'done_early' | 'late_make_up',
  workoutId }`; `allowSwaps` and the same-week rule apply to the first two; a
  late make-up has no week limit and its own message on a weekly count ("…a
  weekly count starts again each week").
- **The late make-up check reads the summary:** `assertLateMakeUpAllowed(summary,
  countsFor, lateMakeUpDays)` (`session-rules.ts`, pure), in a person's order —
  still in its window (400, "…start the session without countsFor…", answered
  whatever the setting) → already done (409) → turned off (400) → not a free
  day (before "too late": on such a day nothing may be listed) → not listed
  ("…is more than N days ago…") → a session done today (409) → catch up first
  (400, naming the day). *(That last check removed 2026-10-17 — below.)* The summary comes from **`summarizeProgram()`**
  (`src/assigned-programs/program-summary.ts`, NEW): the reads behind the
  summary moved out of `AssignedProgramsService` (`readScheduleVersions`
  with them), so `GET …/summary` and `POST /sessions` use ONE function.
- **One session a day in the service:** `create()` asks first — before reading
  the workouts — whether the program's day has a completed session
  (`ONE_SESSION_A_DAY_MESSAGE`). **And in the database (0041):** a BEFORE INSERT
  trigger, `guard_session_one_a_day()`, reads the program's sessions of that day
  **FOR SHARE** and refuses any insert next to a completed one
  (`session_one_completed_per_day`, translated by `HttpExceptionFilter` into the
  same 409). FOR SHARE closes the race the service's read can't: a Finish
  holding the row lock makes the trigger WAIT, then re-read the row — completed.
  It works because sessions are inserted only by their patient, whose UPDATE
  policy covers all their sessions (checked before relying on it). The owner is
  exempt, as in 0031 / 0033 / 0038.
- **The setting:** `lateMakeUpDays` on `PATCH /assigned-programs/:id`
  (`@IsOptional()` — null means "off", as for `endDate`; `@IsInt`, `@Min(1)`,
  `@Max(LATE_MAKE_UP_DAYS_MAX)`, each with its own message), written and
  audited by the existing generic update (`changes { lateMakeUpDays: { from,
  to } }`). `ASSIGNED_PROGRAM_CREATED` now records `allowSwaps` and
  `lateMakeUpDays` (a creation's entry is the full record); "Assign again"
  copies both (`ResolvedSource.settings`).
- **Tests:** backend 1,442 unit (+52), e2e 627 (+19; the 5 pagination tests
  green in the sandbox this time). 61 distinct mutations, all killed — 43 unit,
  12 e2e, 6 SQL (each clause of the trigger, `FOR SHARE` among them — without
  it the race test's start succeeds; the owner exemption; the CHECK); two
  first-round survivors were real gaps (the reason given to a second link to
  the same day; a version starting before the program), and two conditions
  were removed as dead (a due day TODAY implies a scheduled day, already
  `not_a_free_day`). Lint adds nothing (one unused import caught). Live on Pat's
  seeded program: with 20 days, Oct 2 offered "until Oct 22"; with 14, nothing
  (Oct 16, the last chance, is a scheduled day); 0 refused.
- **Before the frontend's types catch up:** `DAY_STATE_BADGE` doesn't know
  `made_up_late` — unreachable until a practitioner can turn late make-ups on;
  the frontend pass's `Record<DayState, …>` makes it a compile error until the
  badge exists.

**Practitioner pass — built 2026-10-16** (frontend only; confirmed green by the
person).
- **Types caught up:** `made_up_late`, `madeUpLateBy`, `totals.madeUpLate`,
  `lateMakeUps` (`LateMakeUp`, `LateMakeUpBlock`), `lateMakeUpDays` on a program
  and in the PATCH input (`| null` — a real value, "off", like `endDate`). The
  `Record<DayState, …>` badge table refused to compile until the badge had its
  words, and the compiler listed every test fixture building a full summary or
  program (18 files).
- **"Fulfilled" counts it in FOUR places** — found by searching, not by the
  compiler (a sum of fields compiles without the new one): the totals headline,
  each week's result (`FULFILLED` in `programProgress.ts`), the patient home's
  progress bar (`progressFraction`), `todayStatus`'s set. Without them the badge
  would say done while the counts said not.
- **Words:** badge "Made up late" (the fulfilled colour — the WORD says late,
  never the colour alone), "Made up late on Tue, Oct 6" under it, "1 made up
  late" as its own part of the totals, never folded into "made up".
- **The setting** (`LateMakeUpsSetting.tsx`), beside "Let the patient rearrange
  the week", open programs only: a checkbox "Let the patient make up missed
  sessions late" (ticking saves 7 — a week —; unticking saves `null`) and, when
  ticked, "Up to [N days] after the missed day" — a native select of 1 to 28,
  each choice saved at once. A select, not a typed number: every choice is a
  whole valid value, so no Save button and no messages for 0, 29 or "abc". Not
  optimistic (the switch's rule): both controls show what the server holds,
  disabled while saving, unchanged with the reason on a refusal. The select's
  name starts with the words beside it ("Up to how many days after the missed
  day"), those words hidden from screen readers so they aren't read twice. A
  hint says what it allows (specific days, a free day, never a second session
  on a day, counted apart, stops new ones only).
- **Cache:** `useUpdateAssignedProgram` marks the summary (and the closing
  preview) stale when `lateMakeUpDays` is sent, as for dates — the summary's
  `lateMakeUps` is computed from it. Refreshing the closing preview only for
  dates was the first version; that preview is asked for only while its dialog
  is open, so the distinction could never be observed — one rule now.
- **Tests:** frontend 1,667 (+12). 19 mutations, 18 killed; the survivor is
  equivalent (`todayStatus` asks about TODAY's day, which can't be made up late
  on its own date — said in the code, as for `made_up`). Main file unchanged
  (456.71 kB); the program page's chunk 37.5 kB. Live in Chromium as Alex on
  Pat's program (production build, 1280 px light, 375 px dark), with a late
  make-up planted as the owner: the badge, its sentence, "9 sessions done · 1
  made up late", the setting saved (7, then 14 — two audit entries, `from → to`)
  and kept across visits. To check by the person: the select's open list in dark
  mode on Windows.

**Patient pass — built 2026-10-16** (frontend only; confirmed green by the
person). With it, late make-ups are complete end to end.
- **One rule decides, every screen reads it.** `todayStatus` gained a sixth
  question, after the on-time catch-up: `late_make_up` — the OLDEST of
  `lateMakeUps.days` (the first to run out), with `until`, only when
  `blockedToday` is null. Nothing is worked out on the frontend: the backend's
  summary already checked a free day, nothing completed today, the setting, the
  window. The home's row, its button and the start page all read that one
  answer, so they can't disagree, and `POST /sessions` accepts what they offer.
  `StartableStatus` is a union, so adding the kind made the compiler point at
  every `switch` that didn't handle it yet.
- **Decided without asking, said in the delivery (the person was away):** when
  late make-ups exist but today is blocked, the home shows ONE quiet line with
  no button under the row — "You can still make up A · Mobility from Fri, Oct 2
  on another free day, until Thu, Oct 22." (+ "1 other missed session can be
  made up too."). Why today is blocked isn't said: the row above already shows
  it. `lateMakeUpWaiting(summary, status)` gives the oldest and the count.
  *(Its wording under an on-time catch-up changed the next day — "Corrected
  2026-10-17".)*
- **The home's row:** "Make up: A · Mobility from Fri, Oct 2" / "Missed — you
  can still make it up today, or on another free day until Thu, Oct 22.", the
  button **"Make it up"** (a Start to the same start page — named for what it
  does, so it isn't read as today's session). A row's notes are a LIST now (a
  session left open AND a waiting make-up can both apply; with nothing asked
  today, the first note becomes the row's line).
- **By date, not weekday, and no possessive on a date.** A catch-up is within a
  few days ("Monday's"); a late make-up can be 28 days old, when "Monday" no
  longer says which. The live check found "Fri, Oct 2's A · Mobility" (US
  short dates have a comma) — the unit tests were pinned to en-GB ("Mon 2
  Jun's"), which hid it. Now "A · Mobility from Fri, Oct 2", or "the session
  of Fri, Oct 2" with one workout.
- **The start page** sends `countsFor: status.forDay` for that kind only (a
  spread of `{}` otherwise — an on-time catch-up still sends none: the backend
  infers it and refuses a `countsFor` inside the window); its context line
  "Making up Fri, Oct 2 — late: it was missed, and will count as made up
  late.". It already decides from a FRESH summary (pass (c)), so an old link
  can't start a make-up that expired. The one-a-day 409 reads well through
  `describeFailure` (tested with the backend's exact sentence).
- **The session page** says "Counts for the session of Fri, Oct 2"
  (`countsForText`) — not "Make-up for…": the page doesn't load the schedule,
  can't tell a late make-up from a swap half, and the wording is true of both.
- **Tests:** frontend 1,697 (+30). 19 mutations, all killed — one first-round
  survivor only `tsc` caught (an unused variable): no test covered a row with
  nothing asked today but TWO notes; added. Live in Chromium as Pat (1280 px
  light, 375 px dark): the waiting line under a scheduled Friday; Alex switched
  the schedule to Mon / Wed from today → "Make it up" → the start page → the
  session created with `countsFor` → "Counts for…"; finished → Oct 2
  `made_up_late`, "9 sessions done", "Nothing to do today", a second start 409.

**Corrected 2026-10-17 — an on-time catch-up is a SUGGESTION, not a rule**
(the person's point, after reading the delivery's wording; confirmed green the
same day). The patient pass's line "…on another free day" under an on-time
catch-up suggested that the late one was forbidden today — and it was: the
backend's `catch_up_first` turned "the home shows the on-time one first" into
"the server refuses the other". The Sessions hub ("they can still have access
to the other ones from the hub if they want to choose", the person, 2026-10-16)
would have met a 400. **The app shouldn't decide for the patient.**
- **The principle: the server enforces what MUST hold; the screens decide what
  to SUGGEST.** `blockedToday` mixed two kinds of reason: rules
  (`not_a_free_day` — a late make-up is done on a free day; `session_done_today`
  — one session a day) and a preference (`catch_up_first`). A preference
  enforced by the server becomes a rule for every future screen.
- **Backend:** `catch_up_first` removed from `LateMakeUpBlock`, from the
  summary's computation and from `assertLateMakeUpAllowed`. The counting needed
  no change: on a free day with an on-time window open, a session naming a late
  `countsFor` is already a late make-up (it's a candidate of its own), and the
  on-time day stays open — one session a day still applies (the first created
  counts). The consequence, accepted: on the last free day of the on-time
  window, choosing the late one leaves the on-time day missed (it may become
  late-make-up-able itself). The hub can say it in a sentence.
- **Frontend:** the home still SUGGESTS the on-time catch-up (its Start — the
  one whose window closes first; `todayStatus` asks it before the late
  make-up). `lateMakeUpWaiting(summary, status)` now answers in two cases, with
  `alsoToday`: today blocked by a rule → "…on another free day, until …";
  today's row is an on-time catch-up → "You can also make up A · Mobility from
  Fri, Oct 2 late, until Thu, Oct 22." — never "another free day". Nothing
  while a session is in progress (it may be the make-up itself).
- **A gap the live check found, fixed with it:** after a late make-up done
  today, the home still offered the on-time catch-up ("you can still make it up
  today", Start) — and Start would meet the one-a-day 409. Not new (any extra
  session on a free day did the same since 2026-10-16), only easier to reach.
  `todayStatus`'s catch-up step answers "Done for today" when
  `lateMakeUps.blockedToday` is `session_done_today` — computed for every
  program, late make-ups allowed or not. The catch-up returns the next free day
  of its window.
- **Tests:** backend 1,442 unit (one test replaced), e2e 626 (a refusal row
  removed; a new test: the late one chosen over an open on-time catch-up → 201,
  then Oct 2 `made_up_late`, the on-time day still `due`). Frontend 1,699.
  Mutations: 9, 8 killed; the survivor ("blocked for ANY reason" instead of
  `session_done_today`) is equivalent — at that step today is already known to
  be a free day. The summary's unit test fails on the old code; the guard's
  unit test can't (it never passes the removed value) — the e2e test covers it
  (400 on the old code). Live as Pat on a Saturday: Friday's catch-up suggested
  with "You can also make up … late", the late start accepted (201), then
  "Done for today".

**Program-specific photos — settled 2026-10-17** (proposed before any code; the
person agreed to the plan and added one thing):
1. **Two independent columns on `assigned_program_exercises`:**
   `use_library_images` (NOT NULL, default true) and `media_urls` (`text[]`, NOT
   NULL, default `'{}'`). True = the library's photos, read live (unchanged);
   false = the row's OWN photos — possibly none, which is how "no photos" is
   chosen on purpose. Switching back to the library KEEPS the own photos. The
   defaults make every existing row behave as before: no backfill.
2. **No mixing** of library and own photos: one source or the other — simpler
   to explain to the patient and to audit.
3. **"Add the library's photos" — the person's addition.** A practitioner
   usually has no copy of a library photo (most came from the seeded import),
   so choosing own photos would mean losing them. Settled as a one-time COPY
   (S3 `CopyObject`), not a live "keep the library's" toggle: a copy can't be
   changed by a colleague's library edit (the reason for this item), each copy
   can be removed or reordered on its own, and there is one list in one order.
   **Always offered** (asked: hiding it once copied needs a record of where
   each own photo came from — a second column or a table of photos; the person
   chose the simple version): asked twice, it copies twice; a duplicate is
   removed like any photo.
4. **Removing a photo deletes its file** (after the row, best-effort) — a photo
   of a patient's home shouldn't outlive its use; the audit entry keeps who
   removed which key, and when. **Sessions don't record which photos they
   showed** (2026-10-14's decision, unchanged: the description is the record).
5. **At most 10 own photos per program exercise** (the library: 5 per upload,
   no total). Checked by the service — saying how many more fit — and by a
   database CHECK.
6. **Keys `patients/<patientId>/exercise-photos/<uuid>.<ext>`** — changed from
   the sketch's `programs/<programId>/exercises/<rowId>/…`: "Assign again"
   copies files BEFORE its transaction (a storage call is a network call; inside
   a transaction it would hold locks while waiting), when the new program's and
   rows' ids don't exist yet — the patient's does; and "everything stored about
   this patient" is then one prefix (an export, an erasure).
7. **Unchanged from the sketch:** "Assign again" copies the choice and the own
   files; "Copy to workout…" goes back to the library's photos (it adds the
   library exercise); deleting a program exercise deletes its files, retiring
   keeps them; the closed-program (0031) and retired-exercise (0033) triggers
   apply as they are — every photo write is an UPDATE of the row.
8. **Decided without asking, said in the delivery:** adding photos never
   switches the choice — the practitioner can prepare photos, then switch (the
   screen may do both in one go).

**Backend pass — built 2026-10-17** (confirmed green by the person). Migration
0042 (generated, no hand edits).
- **Routes** (care team or admin, each `@AuditedByService()`, each answering the
  full program): `POST …/exercises/:rowId/images` (multipart `files`, ≤ 5 —
  the library's `imageUploadOptions`; none → 400 "No files uploaded"), `POST
  …/images/from-library` (no body; 201), `PATCH …/images { order }` and `DELETE
  …/images { objectKey }` — the LIBRARY's two DTOs reused, so both photo pages
  speak the same shapes. The switch: `useLibraryImages` on `PATCH
  …/exercises/:rowId` (`@ValidateIf(isPresent)` + `@IsBoolean()`: `null` and
  `"false"` are 400s), audited by the existing UPDATED entry (`changes {
  useLibraryImages: { from, to } }`).
- **The answer:** every exercise (active and retired) carries `images: { url
  }[]` — what the PATIENT sees, the library's or the own photos — plus
  `ownImages: { objectKey, url }[]` (whichever is chosen) and
  `useLibraryImages`. The raw `mediaUrls` column is renamed, not sent beside —
  code still reading it fails to compile. The library is queried only for rows
  that show its photos.
- **The order of storage and database** (the point of the design):
  - adding: check what can be checked (program open, managed, row of THIS
    program, not retired, room for the files) → store the files (upload or
    copy, one at a time, under new keys) → ONE transaction: lock the row, check
    again (retired meanwhile? room taken meanwhile?), append, one entry → if
    anything fails after storing, the stored files are deleted (nothing points
    at them). `putPhotos` undoes its own partial work too (the 2nd of 3 uploads
    failing deletes the 1st).
  - removing a photo / deleting an exercise: the row first, the file after the
    commit (`deleteUnreferenced`, best-effort — the order of every photo
    removal in the app). A retired exercise keeps its files.
  - "Assign again": `copyPhotos()` before `insertProgram()` (create()'s
    transaction, extracted), `undoPhotosOnFailure()` around it.
- **`StorageService.copy(source, destination)`** — S3 `CopyObject`: the storage
  server copies the bytes; nothing passes through the backend. `CopySource` is
  `bucket/key`, each path segment URL-encoded (it travels in a header). The
  content type is copied with the file (checked live: a copied library photo is
  served as `image/jpeg`).
- **Rules, pure** (`src/assigned-programs/program-photos.ts`):
  `PROGRAM_EXERCISE_PHOTO_LIMIT`, `assertPhotoRoom` (409, "…this one has 8, so
  2 more can be added" / "…so no more can be added"), `programPhotoKey`,
  `extensionOfKey` (a copy keeps its source's type), `assertSamePhotos` (a
  reorder: same keys, none added, dropped or doubled — 400), `assertOwnPhoto` (a
  removal: one of THIS row's own — 404 otherwise; a library photo is never
  deleted from here). 409s for the limit and an empty library: the request is
  fine, the row's state refuses it.
- **The database's half:** CHECK `assigned_program_exercises_photo_limit` —
  `cardinality(media_urls) <= 10` (`cardinality`, not `array_length`, which is
  NULL for an empty array and passes a CHECK); `HttpExceptionFilter` turns it
  into a 409 ("A program exercise can have at most 10 photos").
- **Audit:** `ASSIGNED_PROGRAM_EXERCISE_PHOTOS_ADDED` `{ exerciseRowId, name,
  added, source: 'upload' | 'library', copiedFrom? }`, `…_PHOTOS_REORDERED`
  `{ …, from, to }` (the same order → nothing), `…_PHOTO_REMOVED` `{ …,
  objectKey }`. The added / removed / retired exercise entries and
  `ASSIGNED_PROGRAM_CREATED`'s exercises now carry `useLibraryImages` and
  `ownPhotos` — after a DELETE, the entry is what says the files existed.
- **Who sees what:** a practitioner off the care team gets a 404 on every photo
  route (row security hides the program — as on every program route); the
  patient gets the role guard's 403; the patient's own UPDATE of the photo list
  changes 0 rows (proven as the app's role).
- **Tests:** backend 1,487 unit (+45: the pure rules, the service's ORDER of
  storage calls and writes with storage mocks recording into the same list as
  the database — including the undo paths and an exercise retired WHILE
  uploading —, the answer's shape, `copy`'s request, the filter), e2e 651
  (+25, new `test/program-exercise-photos.e2e-spec.ts`, against moto: real
  files uploaded, copied, served, deleted; the patient's view; the limit, the
  people, retired, closed; "Assign again" making new files; the CHECK as the
  owner, the patient's UPDATE as the app's role, the closed-program trigger on
  the new columns). 41 mutations: 39 killed (the SQL CHECK dropped included),
  2 pieces of dead code found and removed (a `Math.max` the CHECK makes
  unreachable; cutting a key to its file name before a regex that can't cross
  a `/`). Live as Alex and Pat on the running API.

**Frontend pass — built 2026-10-17** (the plan agreed with the person; confirmed
green). Frontend only.
- **The program exercise page's Photos section**
  (`AssignedProgramExercisePage`): a fieldset "Which photos does the patient
  see?" with two radios, "Photos from the library" / "This patient's own
  photos" — NOT optimistic (a radio that flips back after a refusal is worse
  than "Saving…" for a moment), disabled while saving, an alert on failure
  ("Couldn't change the photos. …"); the carousel shows `images` (what the
  patient sees), with `noPhotosText`; one sentence says where they come from
  and what that means (`photoSourceText`: library → "a change there shows here
  too"; own, none yet → "The patient sees no photos…"; own → "a change in the
  library doesn't reach them"); a link "Manage this patient's photos (N)".
  Read-only on a closed program.
- **The photo page** (`ProgramExercisePhotosPage`,
  `/practitioner/programs/assigned/:id/exercises/:rowId/photos`, lazy, `returnTo`
  through `localPath`): whether the patient sees these photos (adding never
  switches it — the page says "Not shown to the patient yet…"); "N of 10
  photos"; "Add the library's photos (N)" — the count read from `GET
  /exercises/:id`, disabled WITH its reason beside it (`libraryCopyProblem`:
  none in the library / no room); a drop zone and "Browse files"; the gallery
  dragged to reorder (the library page's `SortableExerciseImage` and
  `computeReorderedKeys`); "Removing a photo deletes it for good" said once.
  Files checked before any request with the library's rules plus the room left
  (`uploadProblem`). A closed program shows the photos read-only.
- **The writes** (`useOwnPhotoEditing`): upload, copy, remove answer with the
  full program, written into its cache (the photo page, the exercise page and
  the program page read the same entry); the reorder is OPTIMISTIC like every
  drag in the app (cancel a re-read on its way, remember, guess — `images` too
  when the own photos are the ones shown —, roll back on failure); one message
  area; `isBusy` disables every photo control while any write is on its way
  (a second change built on a list about to be replaced could name photos that
  no longer exist), and a drop or a chosen file is ignored then.
- **Rules, pure** (`programPhotos.ts`): the limit (the backend's 10, written once
  here), `photoRoom`, `photoCountText`, `uploadProblem`, `libraryCopyProblem`,
  `photoSourceText`, `noPhotosText` — so the two screens can't word one fact two
  ways.
- **Tests:** frontend 1,753 (+54; main file 457.09 kB): the rules, the page,
  the hook's optimistic reorder (held server answers). Mutation-checked: the survivors closed — one
  unreachable branch removed (`photos(1)`), the link-count and remove-key
  fixtures strengthened, the drop-while-busy assertion moved after settling.
  Live in Chromium against the running API.

**Found in the person's live testing, 2026-10-17** (three reports, three
different causes — each found by narrowing, not guessing):
1. **Storage uploads waited 6 s per photo ≥ 2 MB** (backend). The AWS SDK adds
   `Expect: 100-continue` to bodies of 2 MB or more (`expectContinueHeader`'s
   default, 2,097,152) and Node waits a fixed 6 s for a "100 Continue" the
   server may never send; photos are stored one after another — 30 s for five
   phone photos. Reproduced with a proxy that never sends it (4.5 MB: 6.2 s;
   three: 18.3 s → 0.15 s / 0.26 s after). Fixed in `storageClientConfig()`
   (`StorageService`): `expectContinueHeader: false` (storage is local, the
   backend has checked everything first) and, since the client had NO
   timeouts, `connectionTimeout` 5 s, `requestTimeout` 30 s,
   `throwOnRequestTimeout: true` — a storage server that never answers now
   fails the call (and the compensating delete runs) instead of hanging the
   request forever. Two wire-level tests against a real local HTTP server (no
   `Expect` header and the whole body at once for 3 MB; a `TimeoutError` from
   a server that never answers). Not what the person hit — their photo was
   450 KB — but real for most phone photos.
2. **The person's stuck upload: their Chrome, not Stride.** Ruled out step by
   step: RustFS directly (a probe script: every call OK), the backend from Node
   (the same photo, 201 in 167 ms), Firefox and Edge (fine); Chrome — normal
   and Incognito, no policies — stalls the request BEFORE sending ("Stalled" in
   DevTools; the backend never logs it). Uploads made in the page (the avatar's
   canvas blob) are not affected. Left for later (`deferred-improvements.md`,
   "Chrome stalls file uploads on the person's machine").
3. **The carousel's arrow "sometimes does nothing" — again, another cause.**
   A console log of pointer events showed the press on "Next photo" and the
   release on the IMG. The shared `Button` nudges itself while pressed
   (`active:not-aria-[haspopup]:translate-y-px`); the arrows were centred with
   `top-1/2 -translate-y-1/2`; in Tailwind v4 both write the one `translate`
   property, so while pressed the button jumped 15 px down (−50% → +1 px), out
   from under a pointer in its upper half — and the browser fires `click` only
   when press and release are on the same element. Automated clicks never saw
   it (instant release; the `transition-all` takes ~150 ms). Fixed by centring
   without a transform (`inset-y-0 my-auto h-7`); the press effect kept. A test
   guards the cause (no `translate` class of the arrow's own; the press effect
   present, else the test would prove nothing); a 150 ms press-and-hold in
   Chromium moved the button 15 px before, 1 px after, and every click counts.
   After both fixes: backend 1,489 unit (+2), e2e 651; frontend 1,754 (+1).

**The Sessions hub — settled 2026-10-17** (proposed before any code — the
screens drawn as text, four questions; every recommendation taken except the
exercises, which the person wants):
- **A. `/patient/sessions`** — one card per ACTIVE program, in the home's
  order: from whom, the schedule in force in words, the progress, **the home's
  own Today row**, and **"To make up": the on-time catch-up AND every late
  make-up, each with its own button** (the patient chooses — 2026-10-16/17).
  Past programs behind "Show N past programs".
- **B. `/patient/sessions/programs/:programId`** (pass 2) — one program, active
  or past: header, "To make up", totals, the WEEKS (the practitioner page's week
  list extracted into a shared component), "View session" on days with one,
  "Make it up today" on a missed day's row, **and the program's exercises,
  read-only by workout** (the person's choice). Under `/patient/sessions/…` so
  the tab stays highlighted (NavLink matches by prefix).
- **C. The start page takes a chosen day** — `?for=YYYY-MM-DD`, checked against
  a FRESH summary, never trusted.
- **D. The home's "My programs" cards link to B** (pass 2, with the page).
- **The backend adds the on-time catch-up's last day** (`nextWorkout.until`) —
  one rule, the module's own, rather than the frontend re-deriving the window
  ("On time · until Thu" and the last-day warning need it).
- **Two passes**, green confirmed between them.

**Pass 1 — built 2026-10-17** (confirmed green by the person 2026-10-18).
- **Backend — `nextWorkout.until`**: for a DUE day (today's own, or a missed
  day whose window is open), the last day it can still be done on time; null for
  an upcoming day or a weekly count. Looked AHEAD with the walk's own closing
  rule (the next scheduled day, a pause, a change to "N a week"; never past the
  end date), because the walk's `windowEnd` holds `lastDay` for a window still
  open when it stops — for an open-ended program that's the end of the current
  program week, not the window's end. A specific-days version always has a day,
  so a closing day comes within a week; a 366-day bound only guards bad input.
  No migration. Backend 1,495 unit (+6), e2e 652 (+1 — the case `windowEnd`
  would get wrong: until 5 days ahead when the summary covers 3).
- **Moved, not copied** (a rule moves with its second reader): the Today row
  (`todayRow.ts` + `TodayRowView.tsx`) and its words (`todayText.ts`) to
  `src/sessions/`; `activePrograms` / `progressFraction` (`patientPrograms.ts`),
  the progress bar (`ProgramProgressBar.tsx`) and the data hook
  (`usePatientHome` → `useActiveProgramSummaries`, `git mv`) to
  `src/assigned-programs/`. The home's tests passed unchanged. The hub reuses
  the practitioner's past-program rules (`splitProgramsForPatientPage`,
  `programRowSummary`) from `src/patients/` as they are.
- **`todayRow(…, 'apart')`**: on the hub, make-ups have their own list, so the
  Today row leaves catch-ups and late make-ups out (and the "late ones wait"
  note); a free day says "Nothing scheduled today".
- **`makeUps(summary, today)`** (`makeUpRules.ts`): the offers (the on-time
  catch-up first, then the late ones oldest first), `blocked` = the summary's
  `blockedToday`, and `lastDay` — the catch-up when today is its last day and
  nothing blocks: the hub then says "Today is the last day to make up … on
  time. If you make up a late one today instead, it will be missed." — a
  sentence, never a refusal.
- **Screen choices, said as such** (the server refuses none of these):
  - **No list while a session of the program is in progress TODAY** — found in
    the live check: Pat's open session WAS the Oct 5 make-up, and the list
    still offered Oct 5. `openSession` doesn't say which day it counts for, and
    nothing can be started meanwhile; the list returns when it ends.
  - An offer whose last day is today, on a blocked day, isn't listed (its
    button could never work).
- **Server rules, said as rules:** `not_a_free_day`, `session_done_today` —
  every button disabled, one sentence, each button `aria-describedby` it.
- **The start page's `?for=`** (`startChoiceFor`): resume a session open today;
  otherwise the day must be among the fresh summary's offers — else
  "This missed session can't be made up any more…" or the block's sentence; a
  late make-up sends ITS day as `countsFor` (not the oldest), a catch-up sends
  none. From the hub, "Back to Sessions".
- **Accessibility caught by a test:** "To make up" was an `h3` like the card's
  title — beside it in a screen reader's outline, not under it; the level is a
  prop (`h4` in a card, `h2` on pass 2's page).
- Frontend 1,813 (+59); main file 457.48 kB; the hub its own 5 kB chunk.
  Mutations: backend 8/8 (one through e2e); frontend 40 distinct, all killed
  (one first-round survivor — "Back to Sessions" on an emptied workout — was
  an untested behaviour, tested). Live in Chromium (375 dark, 1280 light), as
  Pat through the real API: both make-ups, the last-day warning, a late one
  started while the on-time one was open, in progress, finished; Robin's weekly
  program and cancelled one; the home unchanged.

**Pass 2 — built 2026-10-18** (frontend only; confirmed green by the person
2026-10-18). The Sessions hub is complete.
- **`/patient/sessions/programs/:programId`** (`PatientProgramPage`, lazy),
  active or past: header (`programRowSummary` — the practitioner side's row
  words — and the schedule in force), "To make up" (`headingLevel={2}`, open
  programs only), Progress — `ProgramTotals` and the weeks — and the
  exercises read-only by workout (folded: photos from `images`, steps, the
  practitioner's note, equipment; weights through `WeightValue`). The summary
  is read with the hub's key (`through` added to `useAssignedProgramSummary`),
  so it comes from the cache after the hub.
- **One week list for both sides:** `ProgramWeeks.tsx` — the practitioner's
  `Weeks` / `WeekDetails` / `WeeklyCount` / `AttemptList` / `ExtraList` and
  `Totals` (now `ProgramTotals`) moved out of `ProgramScheduleProgress`, with
  two optional slots: `sessionLink(sessionId, date, kind)` — wherever a
  session exists (counted, extra, stopped; never a skip) — and
  `dayAction(day)`. The practitioner page passes neither: its 480 tests passed
  unchanged. `daySessionId(day)` (`programProgress.ts`) names the session that
  fulfilled a day, by state.
- **On the patient's rows:** "View session" (named by date and kind — "View
  session of Wed, Oct 4 (stopped)"), "Make it up today" on a missed day the
  hub would offer (`?for=`), only when nothing blocks today (a blocked button
  belongs beside its reason, in "To make up").
- **Links in:** "View program" on the hub's cards and the home's "My
  programs" (`ViewProgramLink`, `programPagePath`), a past program's title on
  the hub.
- **Found live, fixed:** "To make up" as an `h2` was styled as a small label
  (looked like part of the header) — its style follows its level now; the
  exercises folded with the browser's ▶ while the weeks use the app's chevron
  — alike now (and a `<p>` that had landed inside a `<span>`).
- Frontend 1,842 (+29). 29 mutations, all killed (one first-round survivor:
  the shared cache key, untested — now a test seeds the hub's entry and expects
  no summary request).

**The session page's way back — built 2026-10-18** (asked by the person:
"returns the user to the program page it was accessing the session from";
confirmed green the same day). `sessionReturn.ts`:
- **Navigation state, read defensively.** "View session" puts `{ from:
  'program', programId }` on the session's history entry; the session page
  then shows **"Back to the program"** — believed only when it names the
  session's own program; otherwise "Back to home" (Resume, a new tab, a pasted
  address). The link's target is computed from the session, never taken from
  the state.
- **Back, not forward.** A plain click is `navigate(-1)`: pushing a new copy of
  the program page would leave program → session → program, and the phone's
  Back would return to the session (a loop). The link keeps its real `href`;
  `isPlainClick` leaves Ctrl / Cmd / Shift / Alt / middle clicks to the
  browser (a new tab).
- **Coming back restores the place.** Just before leaving, the program page
  writes `{ viewedSession: { sessionId, date } }` on its OWN entry (`replace`);
  back on it, `ProgramWeeks`' `openWeekOf` reopens that week and focus returns
  to the link (an accessibility practice: focus where the user left off).
- Frontend 1,871 (+29). 16 mutations, all killed (two first-round survivors:
  a fixture with no week on either side of the reopened one — a test with both
  added). Live: back to the same entry, week 2 open, focus on its link, and the
  browser's Back from there to the home — no loop.

---

## §6 — Pain and mobility tracking

**Backend:** per-exercise difficulty rating (1–10) and feedback text, plus
overall session feedback — and, since Phase 4 step 1a (2026-10-15, §5),
`sessions.pain_before`, `pain_after`, `mobility_after` (`smallint`, 0–10,
nullable, a CHECK each): the pain check-in on `POST /sessions` (correctable
while open, `PATCH /sessions/:id`), the check-out with Finish or Stop. A skip
records a pain level only when pain is its reason.

**Decided:**
- **Pain:** optional 0–10 score (the standard clinical Numeric Rating
  Scale, 0 = no pain), recorded **before and after** each session.
- **Mobility:** optional, **self-assessed** 0–10 ("how freely could you
  move"), recorded **after** the session. Subjective by design — it
  captures how the patient feels. (Practitioner-measured range of motion
  is a separate feature — §36, 2026-10-31.)
- **All optional** — the UI must never nag or block a session over them.
  Asking before a session delays its start, so the check-in stays at one
  question (pain) and the check-out at two.
- **Display:**
  - Never average before/after — that hides whether sessions relieve or
    aggravate pain (6→3 and 3→6 both average to 4.5).
  - Full chart: **two lines** (before / after) over time, one point per
    session. The trend shows progress over weeks; the gap between the
    lines shows each session's effect.
  - Home page: a small trend of pain-after, with the latest value and a
    trend arrow.
  - Charts are **per program** (or filterable by program) — a knee
    program and a shoulder program are pain in two different places.
  - Mobility gets its **own chart** — its scale runs the opposite way
    (10 = best, where pain's 0 = best), so sharing an axis would make
    "up" mean better for one line and worse for the other.
  - Missing values leave gaps; nothing is interpolated.

**The progress page — settled and built 2026-10-18** (confirmed green by the
person the same day). Proposed as screens first; the person chose every
recommended option:
- **Where:** a "Pain and mobility" section of the program page, not a page of
  its own — on the PATIENT's (`/patient/sessions/programs/:id`, inside
  "Progress", between the totals and the weeks, `h3`) and, with the same
  component, on the PRACTITIONER's (`/practitioner/programs/assigned/:id`, a
  section of its own after "Schedule & progress", `h2`; not for a program
  deleted before any session). Only the empty sentences differ by reader
  (`viewer: 'patient' | 'practitioner'`).
- **Drawn by hand in SVG**, no chart package (the TypeScript 5/6 peer conflict
  makes installs fragile; the person preferred the instructive option).
- **No new backend route:** `GET /assigned-programs/:id/sessions` already
  returned whole rows (scores included). One request for the whole program;
  "last 12 weeks" is a view of it.
- **The pain chart:** before and after as two lines, 0 at the bottom (the
  scale's own direction, never flipped — the sentence "0 = no pain, 10 =
  worst pain" says which end is good); a DATED time axis (one band per day: a
  week without sessions is empty space; two sessions of one day side by
  side); a filled dot per answer, HOLLOW for a session not completed
  (stopped, skipped for pain, in progress) with a legend line explaining it
  only when one is drawn; end labels ("After 2") unless they would collide.
  **The mobility chart** apart ("0 = could hardly move, 10 = moved freely"),
  one line, no legend box.
- **"Missing values leave gaps", made precise:** a line BREAKS at a session
  that was ASKED and didn't answer, and goes on past one that was never asked
  (`wasAsked`): pain before is asked at every start and on a skip only for
  pain; the check-out only at Finish or at the patient's own Stop — never for
  a session the app closed, a skip, or one in progress.
- **Reading one session:** hover, tap, or focus the chart and use the arrow
  keys (Left / Right, Home / End, Escape); the readout sits UNDER the chart —
  a finger would cover a floating tooltip — and lists every series ("Not
  answered" vs "—" for never asked). A summary sentence per chart ("9 sessions
  with a pain score. Latest (Fri, Oct 16): 3 before, 2 after." — each latest
  value dated apart when they come from different sessions); "Show the scores
  as a table" (newest first). The picture is `aria-hidden`; the group is
  described by the summary and the live readout.
- **Twelve weeks by default**, one button for the whole program, above both
  charts and the table (one filter scopes every view); "None in the last 12
  weeks — show the whole program" only when older answers exist.
- **Colours:** orange (before), blue (after), violet (mobility) from the
  dataviz reference palette, each with a dark-mode step, validated (≥ 3:1
  against both pages; before / after apart under colour-blindness
  simulation) — tokens `--score-*` in `index.css`.
- **The home's trend** (this section's "small trend of pain-after"): on each
  "My programs" card, "Pain after sessions: 2 (Fri, Oct 16)", the direction
  in WORDS with an arrow ("↓ lower over your last 3 sessions" — an arrow
  alone is ambiguous for pain and hidden from screen readers), and a sparkline
  of the last 8 (by order, on the full 0–10 scale, broken where unanswered).
  The arrow: the MEDIAN of the last 3 pain-after answers against the median of
  up to 3 before them, at least 4 answers, a change under one point "steady"
  (the person's choice: one bad session doesn't flip it). Quiet by design:
  nothing while loading, on an error, or before any answer — never a nudge.
- **Seed:** every seeded session got scores (Pat easing, a check-out left
  blank; Jo a skipped check-in; Robin's sessions making pain WORSE — the case
  the two lines exist for); the stop for pain has pain before 5, after 7.
- Backend 1,507 unit (+12, the seed's). Frontend 1,985 (+114); main file
  458.08 kB (the chart code in the program pages' shared chunk). 109
  distinct mutations (14 backend, 95 frontend): all killed but 2 equivalents (commented in the code), 1 dead
  condition removed, 2 weak tests strengthened — one a real bug class: the
  default `sort()` compares text, putting 10 before 2.

**Open:** nothing currently. (*Mobility before the session too?* — settled
2026-10-15 with the person: **after only**, so the check-in stays one
question.)

---

## §7 — Messaging (Phase 5)

**Proposed as screens before any code, 2026-10-19** (the way every Phase 4
item started), after reading what the backend already allowed. The backend
existed since before Phase 3 (REST routes, a Socket.IO gateway signed in with
the session cookie, per-conversation rooms) but fell short of the Phase 3–4
standards in nine ways, listed in the proposal and all fixed in the backend
pass below.

**The screens proposed** (built in the frontend passes, next):
- **Messages tab** (`/patient/messages`, `/practitioner/messages`): one row
  per conversation — photo, name, a preview ("You: …" for my own), time,
  unread count — newest activity first; **New message** picks from CURRENT
  care-team links only; a past member's thread stays, with "No longer on your
  care team · Read only"; archived ones behind "Show N archived".
- **A conversation** (`/…/messages/:conversationId`), phone-first: live over
  the socket, day separators, **Seen** under my last message once read,
  **Delete** only while it would succeed (mine, unread, ≤ 15 min — and it
  disappears when the time runs out), older messages loaded as one scrolls up.
- **Entry points:** the practitioner home's Messages slot becomes a count; a
  badge on the Messages tab (both roles); **"Message"** buttons on the
  patient's My Team profile and the practitioner's patient page (held back
  since Phase 3, §2: "no button leads to a placeholder").
- **The connection:** one socket per tab, opened only after `/auth/me`
  confirms a session, closed on logout, reopened on a role switch; events
  update the TanStack Query cache; after a reconnect the list and the open
  thread are fetched again.

**Decided with the person (2026-10-20)** — every recommended option:
1. **The client: `socket.io-client`** (4.8.3, the version the backend's
   scripts use), installed with `--legacy-peer-deps` like the rest of the
   tree. Rejected: rewriting the gateway on plain WebSockets
   (`@nestjs/platform-ws` + the browser's `WebSocket`) — instructive, but
   reconnection, acknowledgements and rooms would be ours to write and test.
2. **A practitioner leaves the care team → the conversation is READ-ONLY,
   history kept.** Both still read it; sending is refused at both layers until
   they are on a team together again. Rejected: hiding it from the patient
   (their own clinical history), or leaving writing open (the old behaviour:
   the care team was checked only when STARTING a conversation).
3. **Admins read no message content.** Removed at both layers (no route — 403;
   no row — 0048's policies); oversight is the audit trail (who wrote to whom,
   when). Messages are clinical content and admins aren't on care teams —
   HIPAA's "minimum necessary". A first, narrow step of the deferred "Admins
   can read and change all clinical data".
4. **A new message brings an archived conversation back — for both** (like an
   email inbox): archiving clears a conversation until something new happens,
   so nothing clinical sits unseen in an archive. Rejected: archive as a mute.

**Backend pass — built 2026-10-20** (deep-dive `claude/phase-5-deep-dive.md`
§1–§7). Migrations 0047 (generated, hand-edited) and 0048 (custom).
- **Each rule twice — the service, then the database (0048):**
  `conversations_select` without its admin branch (messages follow — their
  SELECT policy is "you see the conversation"); `messages_insert` requires
  `rls_care_team_member()` — the function `conversations_insert` uses, and the
  one the list selects as `canSend`; triggers: a message's text, sender,
  conversation and moment are fixed; `sent_at` is the database's `now()`; a
  message starts unread and not deleted; `read_at` set once, by the recipient,
  at `now()`, never on a deleted message; `deleted_at` set once, by the sender,
  at `now()`, while unread and ≤ 15 minutes old; a conversation's participants
  and start are fixed (closes a real hole — a participant could re-point a
  conversation at someone else). The owner is exempt (the seed backdates).
- **The database alone decides "read-only".** A service pre-check
  (`if (!canSend)`) was written, then removed: no test could tell it from the
  policy (a mutation removing it survived), and only the policy is atomic. The
  service inserts and turns the policy's refusal (42501,
  `isRowSecurityViolation`) into 403 "You're no longer on a care team
  together, so this conversation is read-only".
- **Text rule `IsMessageBody`** on both doors (REST and socket): a string,
  ≤ 5000 (`MESSAGE_MAX_LENGTH`, one constant with the CHECK), not blank (`\S`,
  the same test as `messages_body_not_blank`). 0047 fixed existing rows first
  (blank → "(empty message)", over-long cut) — reachable only through the
  socket, which validated nothing.
- **Deleted text never served:** `messageBody: null` + `deletedAt` for
  everyone (was: hidden only in the delete's own answer, served again by the
  history). The placeholder string "[message deleted]" is gone — words belong
  to the screens. The row keeps the text (soft delete).
- **The list** (`GET /conversations`): `ConversationSummary { id,
  otherParticipant {id, firstName, lastName, avatarUrl}, lastMessage |
  null, unreadCount, archivedAt (mine), canSend, createdAt }` — listed only
  with a message (an empty conversation opened by a "Message" button doesn't
  appear in the OTHER person's list), archived ones included, newest activity
  first; three queries whatever the count. `GET /conversations/:id` the same
  for one (even empty). `conversations.created_at` added.
- **The thread** (`GET …/messages?before=&limit=`): `{ messages (oldest
  first), hasMore }`, cursor by message id, 50 by default, ≤ 100; index
  `(conversation_id, id)`; partial index for unread counts.
- **Writes:** start (idempotent, `ON CONFLICT DO NOTHING` — two starts at once
  give one conversation), send (unarchives both), read (`PATCH …/read` →
  `{ conversationId, readAt, messageIds }`, nothing new = nothing written),
  archive / unarchive (mine only, idempotent, allowed when read-only), delete
  (403 not mine, **409** read or too old — were 403, an already deleted one
  answers the same again; the "still unread" condition repeated in the UPDATE
  closes the race with a read). Each writes ONE audit entry in its
  transaction: `CONVERSATION_STARTED`, `MESSAGE_SENT` (points at the message,
  never copies its text), `CONVERSATION_READ`, `CONVERSATION_ARCHIVED` /
  `_UNARCHIVED`, `MESSAGE_DELETED`.
- **Live events, both doors alike:** `MessagingEvents` holds the Socket.IO
  server (the gateway attaches it), so the service emits after its commit —
  a message sent by REST is pushed like one sent by the socket. Each
  connection joins `user:<id>:<role>` (every conversation's events, no
  joining) and `session:<sessionId>` (logout and switch-role close exactly
  that session's sockets). `joinConversation` and its script are gone.
  Events: `newMessage`, `messageDeleted`, `conversationRead`,
  `conversationArchived` (my other tabs only).
- **Socket answers through the acknowledgement:** `{ ok: true, data }` or
  `{ ok: false, status, message }` (the filter reads the ack — argument 2 of
  Nest's handler call); the old `exception` event stays for a client without
  one. The gateway has its own `ValidationPipe` (the global one is HTTP-only).
  Admin connections are refused at the handshake.
- **Seed:** Pat ↔ Alex (2 unread for Pat), Jo ↔ Sam (1 unread for Sam), Robin
  ↔ Blake (archived by Robin); started through the service, messages written
  as the owner with past moments.

**Frontend pass 1 — decided with the person (2026-10-20):**
1. **The connection lives in a React provider**
   (`MessagingConnectionProvider`), mounted by `AuthenticatedLayout` for
   practitioners and patients, `key`ed by user id + role: logout unmounts it
   (its cleanup closes the socket), a role switch remounts it (a new socket
   for the new identity). Tests hand it a fake through a `createSocket` prop.
   Rejected: a module-level socket opened and closed by hand.
2. **Sending waits for the acknowledgement** — the text stays in the box
   (read-only) with "Sending…", the box empties once the server has stored
   the message, a refusal shows the server's own reason and keeps the text.
   Rejected for now: an optimistic bubble (stays the Phase 7 item — it needs a
   "failed, retry" state per message).
3. **Two panes on desktop** (the person's choice, against my single-column
   recommendation): the list beside the open conversation from `md` (768px)
   up; one at a time on a phone.

**Frontend pass 1 — built 2026-10-20** (confirmed green by the person;
deep-dive `claude/phase-5-deep-dive.md`, part 2). All in `src/messages/`.
- **One adapter knows `socket.io-client`** (`messagingSocket.ts`): a four-
  method interface of our own (`onServerEvent`, `onConnectionChange`, `send`,
  `close`), typed events, `withCredentials`, WebSocket transport only (no
  long-polling — no sticky sessions needed), acknowledgements with a 10 s
  limit (`emitWithAck` + `timeout`). `test-setup.ts` replaces it globally
  with a socket that never connects, so the ~170 unrelated files rendering
  the layout open nothing; messaging tests pass a `FakeSocket`; the
  adapter's own test unmocks it and fakes the library instead.
- **The cache is the single source of truth.** Keys under one prefix:
  `['conversations','list']`, `['conversations', id]` (the header),
  `['conversations', id, 'messages']` (an infinite query — page 0 newest,
  "next" = older, cursor `before`). Events are WRITTEN into it
  (`messageCache.ts`: pure functions + appliers), never refetched one by one;
  a message is counted once whether the acknowledgement or the event comes
  first (it changes a summary only if its id is newer); a conversation the
  list doesn't hold makes the list refetch rather than inventing a row; a
  deletion refetches list and header (rare, and the unread arithmetic isn't
  worth it). **On every (re)connection everything under `['conversations']`
  is invalidated** — the server never replays missed events, REST is the
  truth and the socket only keeps it fresh.
- **The unread total costs no request:** `useUnreadMessageCount` is the
  list's query with `select: unreadTotal` — the tab badge, the home slot and
  the list share one request, kept current by the connection.
- **Routes:** `/practitioner/messages` and `/patient/messages` are LAYOUT
  routes (lazy `MessagesLayout`) with a lazy index (`MessagesIndexPage`, the
  desktop placeholder) and a relative `:conversationId` child
  (`ConversationPage`). The URL says which conversation is open (`useMatch`
  in the layout, `useParams` in the page); CSS hides the panes per width.
  `routes.test.ts` now checks index routes are lazy too.
- **The conversation page:** `<Conversation key={conversationId}>` (a draft
  never follows you to someone else); 404 and 403 both say "Conversation not
  found" (no hint which ids exist); read-only = a sentence where the box
  would be, not an error after a failed send; `role="log"` thread with the
  sender in screen-reader text; "Load earlier messages" button (not
  infinite scroll — explicit, and testable); `useStickToBottom` opens at the
  newest, follows new messages only if the reader is at the bottom or sent
  it, and keeps the view still when older messages load above
  (`useLayoutEffect` — corrected before paint); marked read while the tab is
  visible (`useMarkConversationRead`, once per newest unread id). The box:
  Enter = new line, Ctrl/Cmd+Enter = send; blank or over 5000 can't be sent;
  a "N characters left" line in the last 10%; "Connecting…" while the socket
  is down; a 403 refetches the header so the page turns read-only.
- **New message** lists only people on a CURRENT care-team link — a
  practitioner's patients (`GET /users`), a patient's current team
  (`splitTeam(...).current`) — each a button (one click starts or opens the
  conversation). **"Message" buttons** (`MessageButton`, accessible name
  "Message Pat Lee") on the patient's My Team profile and the practitioner's
  patient page. **Home slot** `MessagesSlot` ("N unread" → Messages); **tab
  badge** through a generic `badges` prop on `SectionNav` (keyed by the
  section's `to`; the link's name becomes "Messages, 3 unread"; capped at
  99+).
- **The list's "now" is read once** (`useState(() => new Date())`), like
  every "today" in the app — a render stays pure (oxlint's `react/purity`).
- `ComingSoonPage` (and its test) deleted: Messages was its last user.
- Checks: tsc, eslint, oxlint clean for the new files; 2,194 tests (+109,
  three time zones for the date-formatting tests); 41 hand-written mutations,
  all killed (three survived the first run and got sharper tests); live in
  Chromium, two windows (Pat at 375 px, Alex at 1280 px): badge, read on
  open, live delivery, New message.

**Frontend pass 2 — decided with the person (2026-10-20):**
1. **"Seen" under my newest message only, with the time** — "14:02 · Seen
   14:05" — and only while it is still the newest message standing (deleted
   ones skipped): once the other person replies, the reply says they read
   it. One label is enough because the server marks every unread message
   read at once. Rejected: "Seen" on each read message (noise); without
   the time.
2. **Delete = a trash ICON next to the time** (the person's change to the
   proposed text link: "people are used to it and it doesn't overload the
   screen"), visible — found without a long-press, reached with Tab — not
   a "⋮" menu per bubble.
3. **A small confirmation before deleting** ("Delete this message?", the
   message quoted, Cancel / Delete): a deletion can't be undone and shows
   for both. Rejected: immediate delete.
4. **Archive / Unarchive in the conversation's header; archiving goes back
   to the list.** Rejected: staying on the archived conversation; a "⋮"
   menu on every list row (room on a phone, and the row is one big link).

**Frontend pass 2 — built 2026-10-20** (confirmed green by the person;
deep-dive `claude/phase-5-deep-dive.md`, part 3). All in `src/messages/`;
no backend change.
- **Rules as pure functions** (`messageRules.ts`): `seenMessage(messages,
  myId)` — the newest undeleted message, if mine and read;
  `deletableUntil(message, myId)` — `sentAt + DELETE_WINDOW_MS` (15
  minutes, the backend's constant repeated), or null when not mine, read or
  deleted. The window INCLUDES its last instant, like the trigger.
- **Words** (`messageText.ts`): `seenText(readAt, sentAt)` — the time alone
  when read the day it was sent (the day separator above says the day), the
  weekday within six days, the date beyond (the year only if it changed) —
  compared with the SENDING, not "now", so it needs no clock;
  `deleteMessageLabel(sentAt)` ("Delete your message sent at 14:02" — the
  icon's accessible name says WHICH); the dialog's title and description.
- **The window on screen** (`useBeforeDeadline`): one `setTimeout` to the
  exact moment, not a ticking clock; "now" read at mount (`useState`'s
  initializer — a message loaded past its window never shows the button)
  and in the effect, never during a render; state set only in the timer's
  callback; cleared on unmount and when the deadline goes (read → null).
  **Found by the tests:** `setTimeout` holds at most 2³¹−1 ms (~24.8 days)
  and treats a longer delay as 1 ms — a device clock weeks behind the
  server's would have hidden Delete at once. The wait is now done in pieces
  of at most that, each checking the clock.
- **The server stays the judge of time.** `sentAt` is the server's clock,
  the countdown this device's: a fast or slow clock shifts the button by
  its error, and the server's 409 (shown in the dialog with its own words)
  catches the rest; a 409 refetches the thread so the screen catches up (a
  read message loses its button).
- **The dialog outlives its button:** if the window closes while someone is
  confirming, the trash goes, the dialog stays; Delete then gets the
  server's answer. Focus after a deletion (or a Cancel once the button is
  gone) goes to the bubble (`tabIndex={-1}`, not a Tab stop) — Radix would
  otherwise return it to a removed button, i.e. the top of the page.
- **Deleting over the socket** (`useDeleteMessage`, `deleteMessage` event):
  the ack and the `messageDeleted` event both go through
  `applyDeletedMessage`. Sending and deleting unwrap the acknowledgement
  with one helper (`socketAnswer.ts`: `dataOrThrow`, `MessageRefusedError`
  — moved from `useSendMessage.ts`). "Connecting…" disables Delete while
  the socket is down.
- **Archiving** (`useArchiveConversation`, `ArchiveConversationButton`):
  REST `PATCH …/archive` / `…/unarchive`; the answer goes through
  `applyArchived`, the applier my OTHER tabs run on `conversationArchived`
  — every tab holds the same thing. After archiving: the list, `replace`d
  (Back doesn't reopen what was put away). No confirmation (nothing lost;
  a new message brings it back). The icon alone on a phone, "Archive" /
  "Unarchive" beside it from `sm`; disabled while the request travels.
- Checks: tsc, eslint, oxlint unchanged (27); 2,233 tests (+39); main file
  510.08 kB (+0.46); 43 mutations, 41 killed, 2 equivalent (documented in
  the code); live in Chromium, two windows (Pat at 375 px, Alex at 1280
  px): trash → confirm → "Message deleted" on both, "Seen" arriving live,
  archive → list, a new message unarchiving, unarchive from the header.

**The Phase 5 demo — confirmed by the person 2026-10-20** (two live windows).
**Phase 5 is complete.** Logging READS of messages beyond "mark as read"
stays with the Phase 6 audit review; an optimistic send stays the Phase 7 item.

**Pre-Phase-6 clean-up — decided with the person (2026-10-20)**, from a review
of every open entry in `deferred-improvements.md` against the code: most belong
inside a Phase 6 item already (case-insensitive emails → "Change email"; the
admins' clinical access → decided at the start of medical files; retention,
read logging, database halves of service rules → the audit review) or have no
Phase 6 dependency. Done first:
1. **`openapi-typescript` removed** (recommended, chosen): the generated
   `types.generated.ts` was imported by NOTHING (the deferred entry said two
   files — they only mentioned it in comments) and was 596 lines behind the
   API, while the package's TypeScript-5 peer requirement forced
   `--legacy-peer-deps` on every frontend npm command. Rejected: regenerating
   and adopting it for Phase 6's auth screens (the conflict stays); writing the
   workaround into an `.npmrc` (the file stays unused). `shadcn` and
   `country-state-city` moved to `devDependencies` in the same commit — `npm
   audit --omit=dev`: 0. (`country-state-city` was removed altogether on
   2026-11-04: §48.)
2. **Messaging leftovers:** a visually hidden `<h1>` "Messages" in the
   conversation pane on phones (not the name as `<h1>`: a level can't change
   with the width, and the loading / not-found states have no name);
   `wrap-break-word`.
3. **Backend lint, 66 → 8, every one fixed rather than suppressed** — the
   person asked for the auth spec, the `connect-pg-simple` declaration, then
   the controller / serializer / users specs too. Two findings beyond style:
   socket.io's `next` and Express's `NextFunction` are different types (the
   adapter's `any`s hid it — now bridged by `toExpressNext`, a failure always
   an Error); and a serializer test that hung on an unexpected throw now fails
   with its reason (`.catch(reject)`).

---

## §8 — Medical files (Phase 6)

**Chosen with the person as Phase 6's first item (2026-10-20)**, over forgot /
reset password, MFA enrolment and the audit review. Read first: the module
(`src/medical-files/`), its policies (0001, re-created in 0019) and its e2e
tests. It predated the audit convention: free-form `clinical_data jsonb`
(`@IsObject()` + 50 KB), the create and both reads logged AFTER the commit on
another connection, the interceptor skipping `/medical-files` by URL prefix,
admins reading every file, care-team pre-checks repeating the policies, no
seed data. Brought to the Phase 3–5 standards first (as messaging was), the
screens after.

**Decided with the person (2026-10-20)** — every recommended option:
1. **Admins read no medical file** — the same answer as messages (§7):
   clinical content, admins aren't on care teams, HIPAA's "minimum
   necessary". 403 on every route (the role guard), 0 rows under row
   security. An account that is also a practitioner reads them acting as a
   practitioner on the care team, like anyone else.
2. **A typed SOAP note** — an entry type (Initial assessment / Progress note
   / Discharge summary) and four text sections (Subjective, Objective,
   Assessment, Plan), real columns with CHECKs; `jsonb` dropped. Rejected:
   the same fields inside `clinical_data` (the database checks less); a title
   and one free text (less clinical structure to show reviewers). **The
   person's addition:** practitioner-defined templates recorded for later
   (`deferred-improvements.md`, "Medical file templates").
3. **Corrections are amendments linked to the entry they correct** — a new,
   complete entry with `amendsId` and a reason; the original stays, marked
   "Amended" with a link to the newer version. Nothing is ever edited (the
   usual model of HIPAA's right to amend). Rejected: "just add a new entry"
   (a correction no one can tell from a new note).
4. **Reads logged: the list AND a single entry, in the read's transaction**,
   for every viewer, the patient included. Rejected: the list only (it
   returns the entries in full, so opening one adds little — but the
   difference between "saw the list" and "opened that note" is worth a line).

**Backend pass — built 2026-10-20** (confirmed green by the person
2026-10-21; deep-dive `claude/phase-6-deep-dive.md` §1). Migrations 0049
(generated, hand-edited) and 0050 (custom).
- **The entry** (`medical-files.schema.ts`): `entry_type` (enum
  `medical_file_entry_type`), `subjective` / `objective` / `assessment` /
  `plan` (nullable text — a short note may have only a plan), `amends_id`,
  `amendment_reason`, `created_by`, `created_at`. One constant per limit
  (`MEDICAL_FILE_SECTION_MAX_LENGTH` 10,000, `AMENDMENT_REASON_MAX_LENGTH`
  500) read by the CHECKs and the DTO.
- **0049, hand-edited three ways:** `entry_type` added nullable → filled →
  NOT NULL (the 0032 pattern); the old `clinical_data` carried into
  `subjective` BEFORE the column is dropped (`{ "note": "…" }` alone → its
  text; any other object → its JSON text; empty → "(no content recorded)";
  cut to 10,000); the UNIQUE `(id, patient_id)` created BEFORE the foreign key
  that points at it (generated the other way round, which Postgres refuses).
  `drizzle-kit generate` asks seven times whether a new column is a rename of
  `clinical_data`: "create column" each time.
- **The database's rules:**
  - an amendment points at an entry of the SAME patient — a COMPOSITE foreign
    key `(amends_id, patient_id) → (id, patient_id)`;
  - an entry is amended at most once — `UNIQUE (amends_id)`: corrections form
    a chain, "the latest version" has one answer, two simultaneous amendments
    can't both win (the second waits on the index, then 409);
  - not itself — a CHECK (the foreign key alone accepts a row referencing its
    own future id);
  - at least one section — `num_nonnulls(...) >= 1`; each section NULL or
    visible text (`\S`) ≤ 10,000; the reason present exactly with `amends_id`,
    visible, ≤ 500;
  - (0050) `medical_files_select` without `rls_is_admin()`; the INSERT policy
    unchanged since 0019 (a practitioner, as themselves, on the care team); no
    UPDATE and no DELETE policy (append-only); an insert trigger writes
    `created_at = now()` (no backdating; the owner exempt, for the seed).
- **The service judges less, the database more** (the §7 lesson):
  - **create:** no care-team pre-check — the INSERT policy refuses (42501) and
    the service answers 403 "You can only add entries to the medical file of a
    patient on your care team"; "at least one section" is the CHECK ALONE
    (class-validator checks one field at a time, and a DTO copy no test could
    tell apart) → 400 "An entry needs at least one section: Subjective,
    Objective, Assessment or Plan"; the foreign key or the not-self CHECK →
    400 "The entry to amend isn't in this patient's medical file"; the unique
    index → 409 "This entry has already been amended — amend its latest
    version instead" (`translateInsertError`, exported and unit-tested);
  - **the list keeps its pre-check, on purpose:** row security alone would
    answer `[]` — "no entries" — when the truth is "you may not look"; the 403
    ("You do not have permission to view this patient's medical file") is
    distinguishable, so tested. A patient naming someone else's id → 403 "You
    can only view your own medical file" (it was silently ignored);
  - **one entry:** row security alone — hidden = 404, like a missing id.
- **The DTO:** `IsSection(section)` (optional, string, `\S`, ≤ 10,000, a
  message naming the section: "Plan can't be blank"); `entryType` `@IsIn` the
  enum's own `enumValues`; the reason's rule depends on `amendsId`, so a custom
  `ValidatorConstraint` (it receives the whole object) applied without
  `@IsOptional()` — it runs when the reason is missing too. `?patientId=` goes
  through `ParseIntPipe({ optional: true })` ("abc" was `NaN`).
- **The answer:** `MedicalFileEntry { id, patientId, entryType, subjective,
  objective, assessment, plan, createdAt, author { id, firstName, lastName },
  amendsId, amendmentReason, amendedById }`, newest first (id breaks a tie);
  `amendedById` from a self-join (`alias()`), never stored twice. The same
  shape for the patient and the practitioner (HIPAA's right of access: a
  patient reads their whole file).
- **Audit — one entry per request, in the request's transaction:**
  `MEDICAL_FILE_ENTRY_CREATED` / `_AMENDED` (`details: { entryType,
  createdAt, amendsId? }` — no copy of the text: the row is the record and
  can't change), `MEDICAL_FILE_VIEWED` (`details: { entryIds }` — what was
  shown) and `MEDICAL_FILE_ENTRY_VIEWED`. A read is never served without its
  trace: if the audit insert fails, the request fails. POST tagged
  `@AuditedByService()`; the interceptor's `/medical-files` prefix removed
  (only `/auth` keeps the old way). Old rows keep the old action names
  (`CREATE_MEDICAL_FILE`, `ACCESS_MEDICAL_FILE[_LIST]`).
- **`MaxJsonSize` deleted** (decorator and spec): medical files were its only
  user. Backend lint 8 → 6.
- **Seed:** `MEDICAL_FILES` in `dataset.ts`, written as the owner with past
  moments, in order (an amendment needs its original's id): Pat (Alex) —
  initial assessment, a progress note with the wrong knee AMENDED the same
  morning, a two-section note; Jo (Sam); Robin (Sam's initial and discharge
  summary, Blake's note). The dataset spec checks each against the
  database's rules first (authors on the care team, sections, amendments of
  an earlier entry of the same patient, once).
- **Tests:** backend 1,657 unit (+42: the DTO spec 36, the service spec 20,
  the dataset 4; the old spec's 13 and `MaxJsonSize`'s 5 gone); e2e
  medical-files 12 → 38 (who may do what, creating, amending with a
  deterministic race, a care-team link ending, the database's rules as the
  app's role, the audit trail with reads), care-team's three medical-file
  uses updated (an admin control → the patient's). 40 mutations (30
  TypeScript, 10 SQL), all killed — 2 after new tests (the id tie-break; the
  policy's role check: the same account acting in another role sees nothing).
  Live: the seed, REST as Pat (her file, the amendment linked both ways) and
  as the admin (the guard's 403).

**The screens — decided with the person (2026-10-21):**
1. **The practitioner's medical file is its OWN page**
   (`/practitioner/patients/:id/medical-file`), reached from a link card on the
   patient page placed after Programs — the person's choice over a section
   (a long page to scroll) and over an accordion. The reason that settles it:
   **the audit trail must say "viewed" only when someone looked** — a list
   loaded with the patient page would log `MEDICAL_FILE_VIEWED` on every visit
   (even one to adjust a program); an accordion fetching on open keeps the
   trail honest but adds a spinner and `<details>` quirks. Its own page also
   gives an address (Back, bookmarks, a future alert link), a lazy chunk, and
   the same shape as the patient's page.
2. **The link card shows no data** ("Clinical notes: assessments, progress
   notes and their amendments. Opening it is recorded in the audit log." +
   "Open medical file") — a count or a latest date would need a request,
   i.e. a logged read, or a new metadata route. Rejected for now.
3. **Writing an entry or an amendment is its own page too**
   (`…/medical-file/new`, `?amends=<id>` prefilled with that version and a
   required reason): four roomy text areas, usable at 375 px. "Amend" only
   on the LATEST version of a note.
4. **An amended entry is folded under its correction:** the list shows each
   note's latest version, with "Amends the entry of Oct 9: <reason>" and
   "Show the original" revealing the older text, marked as amended — nothing
   hidden for good. Rejected: both in date order with a badge (duplicates in
   the history).
5. **The patient's "My records" is its own page** (`/profile/records`), linked
   from the account menu and from a row on the profile page — the profile
   stays about personal details. Read-only, the same entry list component.

**The screens — built 2026-10-21** (confirmed green by the person;
deep-dive `claude/phase-6-deep-dive.md` §2). Frontend only, `src/medical-files/`:
- **Pure rules** (`medicalFileRules.ts`): `groupIntoNotes` (latest = nobody
  amended it; earlier versions by walking `amendsId`, stopping at a missing
  link or after as many steps as entries), `draftFrom` (an amendment starts as
  a copy, the reason empty), `draftProblems` (type, at least one section, an
  amendment's reason, an amendment identical to its original — compared as it
  would be STORED — in the order of the form), `entryBody` (sections trimmed
  at their edges, blank ones left out). The limits are the fields'
  `maxLength` — no message can be needed, so none is written.
- **Words** (`medicalFileText.ts`), two audiences: SOAP names for the
  practitioner; "What you reported" / "What was observed" and "Corrects the
  entry of …" for the patient.
- **Reads are page-scoped:** the patient page makes no `/medical-files`
  request (tested); the file page one list read; the amend page one entry
  read (`GET /medical-files/:id`); a save invalidates `['medical-file', id]`
  so the next screen reads again rather than showing a list patched in the
  browser.
- **Found live:** focus went to the reason while the first message shown was
  "Nothing has changed" — the problems now come in the form's order (a test
  pins it).
- **Paths written once** (`medicalFilePaths.ts`); three lazy routes; the
  account menu's "My records" and the profile's "Medical records" row by the
  ACTIVE role (patient).

**Open:** nothing. The honest empty / error states of the other RLS-404
resources stay their own Phase 6 item (the medical file's are done here).

---

## §9 — Forgot / reset password (Phase 6)

**Chosen with the person (2026-10-21)** after medical files. The backend
existed and was covered end to end (2026-09-28): `POST /auth/forgot-password`
(204 always — no account enumeration; one pending token per account, 1 hour,
SHA-256-hashed, never for an account without a password) and `POST
/auth/reset-password` (204; the token cleared; every session of the account
destroyed).

**Decided with the person:**
1. **Check the link first** (the person's choice over "find out on submit"):
   a dead link is said before anyone types a password. Needed one backend
   route — see below. Rejected: frontend only (a rare dead link found on
   submit).
2. **"Forgot your password?" carries the address already typed** — in
   navigation state, not the URL (an address in a query string lands in
   history and server logs).
3. **After the reset, the sign-in page** with the email filled in and "Your
   password has been changed, and you've been signed out on every device" —
   explaining a sign-out elsewhere. Rejected: a success page of its own.

**Built 2026-10-21** (confirmed green by the person; deep-dive §3):
- **`POST /auth/reset-password/check { token }`** → 200 `{ email, expiresAt }`
  or the reset's own 400 ("This password reset link is invalid or has
  expired"). A POST although it reads: the token stays out of URLs. A pure
  read — nothing changes, not audited. The email is for the page's read-only
  username field (a password manager saves the new password under the right
  account); only the token's holder gets it, and the token went to that
  inbox. Throttled like the reset (5 a minute). `findUserByResetToken` is the
  ONE lookup behind the check and the reset (never issued, used, replaced,
  expired, no password — one refusal), so the page and the reset can't
  disagree; `INVALID_RESET_LINK_MESSAGE` exported.
- **Frontend (`src/auth/`):** `/forgot-password` under `RequireGuest`
  ("If an account exists for …", "try again", "Back to log in" with the
  address); `/reset-password` under NO guard (a signed-in visitor asked to
  log out first, like `/accept-invitation`): the token read once
  (`useState` initialiser) and removed from the address (`replace`), the
  check (never retried, never refetched), the dead-link page ("Request a new
  link"), the form (read-only email, the shared `newPasswordSchema`), "This
  link works until <time>", then `navigate('/login', { replace, state: {
  email, passwordReset } })`. `isDeadLink` tells the dead-link 400 from the
  reset's other 400s (a refused password) by its message.
- **One password rule:** `auth/newPasswordSchema.ts` (moved from
  `invitations/schemas.ts`, which re-exports it under its old name).
- **The side gutter** (found in the live check): the signed-out pages had
  `mx-auto max-w-sm` and no padding — text touched the screen edge at 375 px
  (the sign-in page included). `px-4` on the five signed-out pages, then (the
  person's request) on the admin forms and lists (Create user, Users, Create
  clinic, Clinics, Clinic edit — whose loading / error lines had no column at
  all).
- **Left for the audit review:** forgot / reset still audit after the commit
  (the interceptor's `/auth` prefix).

**Open:** nothing.

---

## §10 — Audit review (Phase 6)

**Chosen with the person as the next Phase 6 item (2026-10-21)**, over change
email, MFA enrolment and the smaller UI passes; the audit log viewer comes after
it, so the viewer shows a trail worth reading. Benchmark: HIPAA's audit controls
and integrity rules (an engineering standard to design to, not legal advice).
The checklist is `deferred-improvements.md`, "Audit review".

**Step 1 — the inventory (2026-10-21).** A script read every controller (113
routes, 83 writes) and every audit call in `src/`:
- 38 writes already followed the convention (sessions, assigned programs,
  messaging, medical files, alerts);
- 21 account / organisation writes (users 7, clinics 9, care team 2,
  invitations 3) had only the generic interceptor's entry ("POST /users/6": no
  content, written after the response, fire-and-forget) — several ALSO an
  explicit entry written after the commit on another connection, so
  duplicates (`CARE_TEAM_JOINED` + `POST /users/6/care-team`);
- 11 auth routes logged after the commit (the interceptor skips `/auth` by URL
  prefix); `switch-role` and `mfa/setup` wrote nothing;
- 18 library / template writes: the generic entry only (decided 2026-10-10 as
  enough — no patient data);
- reads: only medical files logged them;
- `audit_logs`: append-only for the app, readable by any admin (one deployment
  = one organisation — right), no index on `target_user_id`.
- Medical-file and message entries point at rows WITHOUT copying text, so the
  audit log is no back door around "admins read no medical file / message".

**The person's choices (2026-10-21), all four recommended options:**
1. **Write scope — everything:** library and template writes move to the
   convention too; then the generic interceptor is DELETED, and a test fails if
   any write route is untagged. One kind of entry everywhere.
2. **Reads — others' reads only:** log when a practitioner or admin reads a
   patient's programs, sessions, messages or profile; a patient reading their
   own data is not logged (it isn't an access by the workforce, which is what
   HIPAA asks to trace). Medical files keep logging every viewer, as chosen in
   §8.
3. **Granularity — every request:** one entry per read, in the read's own
   transaction (the medical files' pattern); the viewer can group them.
4. **No patient "Who viewed my records" page now** — a deferred idea
   (`deferred-improvements.md`).

**Delivered in slices, each confirmed green before the next:** 1a users, care
team, invitations; 1b clinics and auth (the `/auth` prefix → the decorator);
1c library and templates, the interceptor removed, the "every write route is
tagged" test; then step 2 (reads, the `target_user_id` index, retention) and
the viewer.

### Slice 1a — users, care team, invitations (built 2026-10-21, green)

- **ONE entry per request that changes something, in its own transaction**
  (`logInTransaction(tx, …)`), the 12 routes tagged `@AuditedByService()`;
  every after-commit `log()` in these services removed. A request that changes
  nothing writes nothing (a PATCH re-sending stored values, removing a missing
  avatar, deactivating twice).
- **The entries:** `USER_CREATED` (`record` = the request as validated, plus
  `careTeamLinkId` when the creator joined the care team and `invitationId`) —
  ONE entry for what used to be three (`CARE_TEAM_JOINED`, `INVITATION_SENT`,
  the generic one); `USER_ROLE_GRANTED` (`role`, `profile` = the profile row
  inserted, `null` when an existing one was kept); `USER_UPDATED` (`changes`:
  `{ field: { from, to } }` over user AND profile fields); `USER_AVATAR_CHANGED`
  / `_REMOVED` (storage keys — a signed URL expires); `USER_DEACTIVATED` /
  `_REACTIVATED` (the latter had no `targetUserId` before);
  `CARE_TEAM_JOINED` / `_MEMBER_ADDED` / `_ENDED` (with `startedAt` /
  `endsAt` — the period the link granted access); `INVITATION_SENT` /
  `_RESENT` (`expiresAt`, `replacedIds`), `_REVOKED`, `_ACCEPTED` (performed by
  the account itself).
- **The email is no longer in the entry:** it goes out after the commit; the
  invitation row records it (`email_sent_at`).
- **"Before" read under a row lock:** `lockUser()` = `SELECT … FOR UPDATE`
  inside the transaction — a second edit of the same account waits, then
  reads what the first wrote, so each entry's `from` is exact. Under row
  security FOR UPDATE asks `users_update` (self, admin, managing practitioner —
  exactly the controller's callers); a hidden row is a 404.
- **`definedFields()` written, then removed:** Drizzle stores jsonb with
  `JSON.stringify`, which already drops `undefined` keys — `record: dto` stores
  the same JSON (a mutation would have survived).
- **Tests:** `test/account-audit.e2e-spec.ts` (14): each route's exact entry,
  nothing on refusals or no-ops, no generic entry (read after 200 ms — the
  interceptor writes late); the SAME transaction proven by a trigger planted to
  refuse the audit insert (the PATCH answers 500 and the name is unchanged);
  the lock proven deterministically (another connection holds an uncommitted
  change; the request waits and records replacing THAT value). Invitation ids
  start at 100,000 in that suite so an invitation id can't pass for a user id
  (a wrong-performer mutation survived once by coincidence).
- **Counts:** backend 1,669 unit (+6), e2e 780 (+14). 42 mutations, 41 killed;
  1 equivalent until slice 1c (untagging `POST /invitations/accept` — the
  interceptor skips requests with no signed-in user). Lint on the changed
  files 0 → 0. The seed runs and writes the new entries.

**Noted for the viewer:** `entity_type` is `'assigned-programs'` (24 places,
the interceptor's URL-segment habit) where every other module uses the table
name (`care_team_members`, `medical_files`, `users`…). History isn't rewritten
— the viewer maps both, or the code changes going forward (to decide then).

### Slice 1b — clinics, sign-in and account security (built 2026-10-21, green)

**The person's choices (2026-10-21), all three recommended options:**
1. **Sign-in events are AWAITED, on AuditService's own connection** — signing
   in, failing to, being blocked, signing out and switching role change no
   data, so there is no transaction to join; the request waits for its entry,
   and fails if it can't be written. (A failed attempt for an email matching
   no account stays unlogged: `performed_by` must name a real user, and
   storing typed-in addresses of non-users would keep personal data about
   people who aren't users.)
2. **Three events added:** `MFA_LOGIN_FAILURE` (a wrong code after a right
   password — the brute-force signal), `ROLE_SWITCHED { from, to }` (the role
   decides what the session can read; switching to the active role writes
   nothing), `MFA_SETUP_STARTED` (a new secret stored).
3. **Removing someone from a clinic: one entry per patient** — the agreed
   exception to "one entry per request": `CLINIC_MEMBER_REMOVED` about the
   member (`endedCareTeamLinkIds`), then one `CARE_TEAM_ENDED` per link it
   ended, about ITS patient (`startedAt` / `endsAt` — `EndedLink` now
   carries them), all in the removal's transaction. "Everything that happened
   to patient X" stays one query on `target_user_id`.

**Built:**
- **Clinics (8 tagged routes):** `CLINIC_CREATED` (`record`),
  `CLINIC_UPDATED` (`changes`, read under `lockClinic()` = `FOR UPDATE`),
  `CLINIC_LOGO_CHANGED` / `_REMOVED` (storage keys), `CLINIC_DEACTIVATED` /
  `_REACTIVATED`, `CLINIC_MEMBER_ADDED` / `_REMOVED` (`user_clinics`, about
  the person); nothing for a no-op (an unchanged PATCH, no logo to remove,
  deactivating twice, removing a non-member). Organisation entries have no
  `targetUserId`.
- **Auth, data changes in their transaction:** `REGISTER_CLINIC` (names the
  clinic and the admin — never the request, which carries the password),
  `PASSWORD_RESET_REQUESTED` (`expiresAt`, never the token),
  `PASSWORD_RESET_COMPLETED`, `MFA_SETUP_STARTED`, `MFA_ENABLED`,
  `MFA_DISABLED` (never the secret). Sign-in events awaited (above), each
  with `targetUserId`.
- **The interceptor's `/auth` URL exception is gone:** every auth route is
  tagged. **`@NotAudited(reason)`** (new,
  `src/common/decorators/not-audited.decorator.ts`) marks a mutating route
  that changes nothing — `POST /auth/reset-password/check`; the reason is
  required. The interceptor skips either tag; an untagged `/auth` route now
  gets a generic entry like any other (tested).
- **Tests:** 9 new e2e (`test/account-audit.e2e-spec.ts`: clinics, the
  founding entry, sign-in / failure / sign-out, a refused `LOGIN_SUCCESS`
  entry failing the sign-in — no session —, MFA end to end with real TOTP
  codes and the secret absent from every entry, role switch, reset); unit
  specs reworked (`lockRow()`, an audit stub refreshed before every test).
  Backend **1,676 unit (+7), e2e 789 (+9)**. 48 mutations, all killed (one
  after a test: every logo-entry test started from NO logo, so "from: null"
  passed by coincidence). Backend lint 6 → 3 (`clinics.service.spec.ts`'s 3
  fixed: a typed mock call, the exact uploaded key compared).

### Slice 1c — library, templates; the interceptor deleted (built 2026-10-21, green)

**Step 1 is complete:** every route that can change data says how it is
audited, and the generic "METHOD /url" entry no longer exists.

- **Exercises (6 tagged routes),** `entity_type 'exercises'`, no
  `targetUserId` (library entries concern no person): `EXERCISE_CREATED`
  (`record`), `EXERCISE_PHOTOS_ADDED` (`added`: storage keys),
  `EXERCISE_UPDATED` (`changes`), `EXERCISE_PHOTOS_REORDERED` (`order: { from,
  to }`), `EXERCISE_ARCHIVED`, `EXERCISE_PHOTO_REMOVED` (`removed`). Read under
  `lockExercise()` (`FOR UPDATE`). The reorder's permutation check and the
  removal's "is this photo on this exercise" check moved INSIDE the
  transaction, on the locked row — checking what is about to change, not a
  copy read earlier.
- **Templates (12 tagged routes),** `entity_type 'program_templates'`,
  `entity_id` = the TEMPLATE even for a change to one of its workouts or
  exercise rows (that row's id is in the details) — "what happened to this
  template" is one query: `TEMPLATE_CREATED` (`record`, `workout` = the
  first workout made with it), `TEMPLATE_UPDATED`, `TEMPLATE_ARCHIVED`
  (`title`), `TEMPLATE_DUPLICATED` (on the COPY: `sourceTemplateId`, `title` —
  the source didn't change), `TEMPLATE_EXERCISE_ADDED` / `_UPDATED`
  (`templateExerciseId`, `changes`) / `_REMOVED` (the row as it was, from
  `DELETE … RETURNING`) / `TEMPLATE_EXERCISES_REORDERED` (`workoutId`, `from`,
  `to`), `TEMPLATE_WORKOUT_ADDED` / `_RENAMED` (`name: { from, to }`) /
  `_REMOVED` (name and position when it went) /
  `TEMPLATE_WORKOUTS_REORDERED`. The same shapes as assigned programs'
  entries. Nothing for a no-op (unchanged PATCH, same order, same name,
  archiving twice, a row already gone).
- **`AuditLogInterceptor` DELETED** (and its spec, and its `APP_INTERCEPTOR`
  registration in `app.module.ts`). In its place **`src/audit/audit-tags.spec.ts`**
  reads the metadata Nest builds its router from (`CONTROLLER_WATERMARK`,
  `PATH_METADATA`, `METHOD_METADATA`) for every `*.controller.ts` and fails
  if a route with a verb other than GET / HEAD / OPTIONS has neither
  `@AuditedByService()` nor `@NotAudited(reason)`, has both, or has an empty
  reason. The `@NotAudited` list is pinned (`POST /auth/reset-password/check`,
  `POST /invitations/lookup` — the latter tagged in this slice); fixture
  controllers prove the checker catches each problem. A forgotten tag now
  fails the build instead of being recorded vaguely.
- **Tests:** `test/library-audit.e2e-spec.ts` NEW (7): each route's exact
  entry, nothing for no-ops and refusals (403, 404), and a trigger refusing
  `TEMPLATE_UPDATED` undoing the rename. Unit specs: exercises 22, programs
  31. 26 mutations, all killed (one after a test: the same template-exercise
  order sent twice). Lint on the changed files clean; the old `cb: any` in
  `programs.service.spec.ts` typed. The older suites' "no generic entry"
  checks were kept — they guard against a generic logger coming back.

### Step 2 — others' clinical reads, the index, retention (built 2026-10-21, green)

**The person's choices (2026-10-21), all recommended options:**
1. **Which reads:** programs and sessions, and pain alerts — not patient
   profiles (identity, not clinical; a flood of entries), not messages (only
   the two participants ever read a conversation).
2. **A list showing several patients: one entry PER PATIENT** — the same
   exception as removing someone from a clinic; "who has seen patient X's
   data" stays one query on `target_user_id`.
3. **Retention: 6 years, documented** — HIPAA's period for required
   documentation; no purge job now (nothing can be that old for years) —
   noted in `deferred-improvements.md`.

**Built:**
- **`AuditService.logReads(entries)`** — the one rule for reads: drops an
  entry whose target is its author (a patient reading their own data — "others'
  reads only", decided once, here), writes the rest in ONE insert (one
  statement: all or none), and is AWAITED by every caller before it answers:
  the data is never served without its trace. NOT in the read's transaction
  (unlike the medical files' reads): these reads span several transactions,
  and the alerts are computed in memory after theirs — a read has nothing to
  roll back, so "no answer without the entry" is the guarantee that matters.
- **`perPatient(rows, patientIdOf)`** (`src/audit/clinical-reads.ts`, pure):
  a list's rows grouped by patient, in order of first appearance.
- **The entries** — `entity_type 'assigned-programs'` (the module's existing
  spelling) unless said: `PROGRAMS_VIEWED` (per patient, `programIds`),
  `PROGRAM_VIEWED`, `PROGRAM_SUMMARY_VIEWED`, `PROGRAM_SESSIONS_VIEWED`
  (`sessionIds`), `PROGRAM_CLOSING_PREVIEWED` (entity = the program);
  `SESSION_VIEWED` (`'sessions'`, entity = the session); `ALERTS_VIEWED`
  (`'alerts'`, per patient shown, `programIds` = attendance alerts,
  `sessionIds` = sessions to review). Nothing for a refused read (404 / 403
  thrown before) or an empty list. Not recorded: the exercise-removal preview
  (a count of sessions, no clinical value), messages (above).
- **Migration 0051 (generated):** `audit_logs_target_user_id_created_at_idx`
  on `(target_user_id, created_at)` — Postgres never indexes a foreign key by
  itself; the two columns in this order answer "patient X, newest first" with
  one ordered index scan.
- **Tests:** `test/clinical-reads-audit.e2e-spec.ts` NEW (8): each route's
  entries, an admin's reads, nothing for the patient's own reads / a refusal
  (404 — row security) / an empty list, and a trigger refusing every
  `…VIEWED` insert making all 7 read routes answer 500. Four older suites'
  "change trail" helpers now leave out `action ~ '_(PRE)?VIEWED$'`;
  `program-lifecycle`'s preview test expects its read entries. Backend
  **1,685 unit (+9), e2e 804 (+8)**. 23 mutations, all killed (two after
  tests: an UNAWAITED program read — the 500 test covered only sessions, now
  every route; "one entry per alert" — X had one alert, now two).

**Step 1 and step 2 of the audit review are complete.**

**Open:** the audit log viewer — now §11.

---

## §11 — Audit log viewer (Phase 6)

**Decided with the person 2026-10-21** (a new chat, after the audit review).
What existed: `GET /audit-logs` (admins; `page` / `limit`, filters `action`,
`entityType`, `performedBy`; raw rows with ids only). One deployment = one
organisation, so an admin seeing every clinic's entries is intended (§10,
step 1).

**The person's choices, all recommended options:**
1. **Reads next to changes: a "Kind" filter** — All / Changes / Views /
   Sign-ins, opening on All; the SERVER decides each entry's kind from one
   list.
2. **Filters (all four):** the patient an entry is about (`targetUserId` —
   the 0051 index), the person who acted (`performedBy`, existed), a date
   range, and a specific action.
3. **`entity_type` spellings: mapped, never rewritten** — the stored values
   stay as written (an audit trail is append-only); one server-side map turns
   each into a readable AREA ("Programs", "Medical files"…).
4. **Admins only**, as before — practitioner access and the patient's "Who
   viewed my records" stay deferred ideas.

### Backend pass (built 2026-10-21, green 2026-10-22)

- **The vocabulary — `src/audit/audit-vocabulary.ts` NEW:** `AUDIT_ACTIONS`
  (95 actions → `change` / `view` / `sign_in`; actions no longer written stay
  listed, old rows have them) and `AUDIT_AREAS` (15 stored entity types → a
  label). `AuditEntry.action` / `.entityType` are now typed with their keys
  (`as const satisfies …`): writing an action the list doesn't know is a
  COMPILE error — the completeness check is the compiler. (A source scan was
  tried first and rejected: it missed `LOGOUT` and caught `POSTGRES_DB`.) The
  only call site that needed a change: `logProgramRead(action: AuditAction)`.
- **Kinds:** views = the 9 `…_VIEWED` / `PROGRAM_CLOSING_PREVIEWED`; sign-ins
  = `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_BLOCKED_DEACTIVATED`,
  `MFA_LOGIN_FAILURE`, `LOGOUT`, `ROLE_SWITCHED`; everything else a change —
  `CONVERSATION_READ` included (it writes `read_at`), password resets and MFA
  set-up too (they change the account). "Change" in SQL = NOT IN the other
  two lists, so a stored action the list doesn't know (the old interceptor's
  rows) is a change — `kindOf()` follows the same rule: a row's label and the
  filter that finds it agree.
- **`GET /audit-logs`:** new filters `kind`, `targetUserId` (≥ 1), `from` /
  `before` (all combined with AND); each entry answers `{ id, action, kind,
  entityType, area, entityId, details, createdAt, performer { id, firstName,
  lastName }, target | null }` — `users` joined twice (`alias(users,
  'target')`, LEFT for the target). The flat `performedBy` / `targetUserId`
  are no longer in the answer. Order `created_at DESC, id DESC`: one
  `logReads` INSERT writes several entries at one instant, and without the
  tie-break a page boundary could show one twice and another never.
- **Dates as instants:** `from` (included) and `before` (excluded) are
  timestamps WITH their offset (`@IsInstant()`, `src/common/validators/
  is-instant.ts` NEW — the twin of `@IsCalendarDate`); the browser sends its
  local midnights, since only it knows the admin's zone. Half-open, so
  neighbouring ranges never share an entry; `from` not before `before` → 400
  "`from` must be earlier than `before`" (compared as instants). Not
  `Date.parse` for validation: it rolls 30 February over and accepts `T24:00`.
- **`GET /audit-logs/actions` NEW** → `[{ action, kind }]` sorted by name,
  from the vocabulary (no database) — the screen's action filter.
- **Tests:** `test/audit-log-viewer.e2e-spec.ts` NEW (15) — seven entries
  PLANTED as the owner at chosen instants after the set-up's are deleted (ids
  from 100,000): two at one instant (the tie-break, and paging one at a time
  sees each once), range bounds ON entries written `+01:00`, an unknown action
  and an unknown entity type, the empty range written so its text sorts the
  wrong way; `audit-vocabulary.spec.ts`, `is-instant.spec.ts`, `actions()` in
  `audit.service.spec.ts`; `audit.e2e-spec.ts` reads `performer.id`. Backend
  **1,715 unit (+30), e2e 819 (+15)**; lint clean. 43 mutations, all killed
  (18 unit, 24 e2e, 1 by `tsc`).

### The screen (built 2026-10-22, green the same day)

**The person's choices (2026-10-22):** an "Audit log" admin nav item only
(not the home's Activity slot, nor a link from the user page); SENTENCE rows
(when · kind · area, the action in words, "who → whom", a Details toggle);
a HAND-WRITTEN phrase per action (not words made from the constant);
details made readable with the raw entry behind a toggle.

**Built — `src/audit-log/` (frontend only):**
- **`/admin/audit-log`** (lazy, admin guard): Show (All / Changes / Views /
  Sign-ins), Action (grouped by kind, sorted by words; only the chosen kind's
  actions; choosing a kind drops an action of another kind), Who acted and
  About (every account, deactivated ones marked), From / To, Clear filters;
  a live count; Previous / Next; "There are no entries on page N" with a way
  back; the two empty states apart ("Nothing has been recorded yet" / "No
  entries match these filters"); results kept, dimmed and `aria-busy`, while
  the next ones load (`keepPreviousData`).
- **The filters live in the address** (`?kind=view&about=6&from=…&page=2`,
  `auditFilters.ts`): Back, a reload and a shared link show the same view;
  anything malformed in the address is dropped; days become the viewer's
  LOCAL midnights, `before` = the day after the last (the backend's
  `[from, before)`); a backwards range is said on the page and never sent.
- **The wording table** (`auditWording.ts`) is typed `Record<AuditAction,
  string>` over a frontend mirror of the 95 actions: a missing phrase is a
  compile error; an unknown action shows words made from its name, a
  non-constant one (`POST /users/6`) as stored. One name when the entry is
  about the person who acted; "→" read as "about" by screen readers.
- **Details** (`auditDetails.ts`): `changes` as a Field / Before / After
  table, every other key a labelled value (ids "#7", empty lists "none",
  null "—", nested values as compact JSON), the record ("Programs #7"), and
  "Show the raw entry" (the JSON as answered).
- **Found live — a flicker:** under the data router a navigation lands AFTER
  the click's handler returns, and React restores controlled inputs in
  between: a clicked radio read "not checked" for 20–60 ms (measured in
  Chromium). `flushSync` didn't help. `useFiltersInAddress.ts` keeps the
  choice in state until the NEXT navigation (the location's `key` changing,
  reset during render) — comparing addresses was wrong: Back returns to the
  same address, and a test caught the old choice coming back.
- Frontend **2,419 tests** (+90); 76 mutations, all killed but one,
  equivalent in jsdom (the flicker — measured in Chromium instead); first
  download +0.82 kB, the page its own 17 kB chunk. Live in Chromium (1280
  light, 375 dark); the person checked the native lists in dark mode on
  Windows.

### After the person's live test (2026-10-22, green)

- **"To-do" → "For review"** as the area of `alerts`, `session_reviews` and
  `program_alert_reviews` (backend `AUDIT_AREAS` — the label only; stored
  values unchanged): the home has said "For review" since 2026-10-19, and
  "To-do" stays free for a real to-do list (Phase 7).
- **Dates inside details** read like the entry's own time: a MOMENT in the
  viewer's zone ("Oct 21, 2026, 7:23 PM"), a calendar DAY never shifted by a
  zone (`formatEntryDay`, read in UTC); not inside compact JSON; the raw
  entry exact. Backend 1,715 unit; frontend **2,424**. 15 mutations, 13
  killed, 2 equivalent in V8 (the pattern's anchors — kept: the spec leaves
  non-ISO `Date.parse` to each engine).

**The audit log viewer is complete.**

**Open:** nothing. Deferred ideas stay deferred: practitioners reading
entries about their patients, the patient's "Who viewed my records", the
retention purge job.

## §12 — Change email (Phase 6)

**Chosen 2026-10-22** as the next Phase 6 item (the roadmap's "Change email
address", decided as an item 2026-09-25 — §4, "Email"). Email is the sign-in
name AND the password-reset address, which is why changing it is its own
flow. Built in passes, each confirmed green before the next:
1. case-insensitive emails (backend) — **done**, below;
2. the change flow (backend) — request, confirm, cancel, three emails;
3. the screens.

### The person's four choices (2026-10-22)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| How emails become case-insensitive | **Store one spelling** (trimmed, A–Z lowercased) + a CHECK | the UNIQUE then means "ignoring case", every lookup stays `email = $1` (index used), no query can forget a `lower()`. Rejected: keep the typed spelling with a `lower(email)` index (one forgotten `lower()` brings the bug back); `citext` (an extension, a custom drizzle type) |
| A change to an address that already has an account | **Reveal nothing**: always "check your inbox"; the new address gets "this address already has a Stride account" instead of a link | a 409 would let any signed-in user test whether someone has an account — for a patient, that they are a patient somewhere (PHI-adjacent). Account creation by STAFF keeps its 409 |
| Protecting the old address | **A notice with a cancel link** when the change is requested, a second notice when it's done; a password reset also cancels a pending change | someone who knows the password could otherwise move the account to their own inbox; the owner can stop it before it is confirmed |
| Who may change an email | **Self-service only** | a staff path (an admin changing any address) is an account-takeover path if an admin account is compromised; correcting a wrong address on a pending invitation is a small item of its own, later |

My defaults, stated with the plan and not contested: the confirmation link
lasts 24 hours; confirming needs no sign-in (the link proves the new inbox,
the password was checked at the request); a new request replaces the open
one; sessions are kept (they hold only the user id); the pending change lives
in its own table (`email_change_requests`, like `invitations`) rather than in
columns on `users`, so `toPublic()` has nothing more to strip.

### Pass 1 — case-insensitive emails (built 2026-10-22, green the same day)

- **One definition of the spelling:** `normalizeEmail()`
  (`src/common/email-address.ts`) — `trim()`, then A–Z lowercased by a regex.
  **Only A–Z, on purpose:** the database checks the same rule, and the two must
  agree on every input. Postgres's `lower()` follows the database's locale
  (measured: `lower('É')` is `é` on a C.UTF-8 database, `É` under
  `COLLATE "C"`); JavaScript's `toLowerCase()` always lowercases it. Pinned to
  A–Z on both sides — a regex here, `lower(email COLLATE "C")` in SQL — the
  rule is the same on every server. Consequence, accepted: `Émile@x.com` and
  `émile@x.com` stay two spellings (providers ignore the case of A–Z in
  practice; the standard leaves the part before the @ to the provider).
- **Applied at the boundary:** `@NormalizeEmail()` (a class-transformer
  `@Transform`) on `LoginDto`, `ForgotPasswordDto`, `CreateUserDto` and
  `RegisterClinicDto.email`. With the global pipe's `transform: true` it runs
  while the JSON becomes the DTO — BEFORE validation — so `@IsEmail()` judges
  the trimmed value, and the service, the audit entry and the invitation email
  all get the normalised address. `RegisterClinicDto.clinicEmail` is NOT
  normalised: a clinic's contact address, not a sign-in. A value that isn't a
  string passes through for `@IsEmail()` to refuse.
- **The database's half:** CHECK `users_email_normalized` — `email =
  btrim(lower(email COLLATE "C"))`. NOT translated into a 400: every write
  normalises first, so reaching it is a bug, and a loud 500 is the right
  signal (unlike the title CHECKs, which back a rule a future route might
  forget).
- **Migration 0052 (generated, hand-edited):** (1) a `DO` block refuses to run
  — `RAISE EXCEPTION` listing each normalised address with its user ids, a
  HINT saying what to do — when two accounts would collide (which one keeps the
  address is a human decision; nothing is merged); (2) an `UPDATE` normalises
  the rest (`WHERE` = the CHECK negated); (3) the CHECK. No audit entries (a
  migration has no user; the file is the record, as for 0035). Tried on a copy
  of the test database: two colliding pairs refused with nothing changed, then
  resolved and normalised, `Émile@x.com` kept.
- **The 409 from the constraint, not a read first:** `UsersService.create()`
  and `AuthService.registerClinic()` used to check "is this email taken?" and
  then insert — a TOCTOU race (two requests both read "free"; the loser hit the
  constraint as a 500). Now the insert runs and `translateDuplicateEmail` /
  `rethrowDuplicateEmail` turn 23505 on `users_email_unique` into the 409 ("A
  user with this email already exists"); any other error passes unchanged.
  `create()` composes it with the license translation (`translateDuplicateAccount`);
  `registerClinic` attaches `.catch(rethrowDuplicateEmail)` to its transaction
  (keeps the long callback in place). Cost, accepted: a refused setup spends
  one bcrypt hash — the route runs once per deployment.
- **Tests:** unit `email-address.spec.ts` (15 — the rule, the decorator on each
  of the four DTOs, the translation), `registerClinic` / `create` specs
  rewritten for the constraint; e2e `test/email-address.e2e-spec.ts` (13 —
  setup, sign-in and reset with other capitals, creation, the race, the CHECK,
  and a parity test: the SQL expression and `normalizeEmail()` give the same
  spelling for É, İ, ß, ǅ and spaces). The race test is the one that separates
  old from new: with the old read-first code it gets a 500, every other test a
  409. 18 mutations (15 code, 3 SQL on the CHECK), all killed. Backend **1,731
  unit, e2e 832**. No frontend change.
- **Found during the person's run, fixed (2026-10-22):**
  `auth-recovery.e2e-spec.ts` › "refuses an expired link" backdated the expiry
  with the DATABASE's clock (`now() - 1 second`) while the code compares with
  NODE's (`new Date()`); the person's Postgres container ran ahead of the host
  (WSL2 drift) and the link was still alive. The test now backdates with
  `new Date(Date.now() - 1000)`; reproduced with Node shifted 2 s behind (old:
  200, new: 400). The rule: a test that moves a time uses the clock of whatever
  compares it.

### Three more choices, before pass 2 (2026-10-22)

| Question | Chosen | Why |
| --- | --- | --- |
| How much of the new address the OLD inbox sees | **Masked** — `p•••@g•••.com` (first character of each part, the domain's last label) | the owner recognises their own change; an old or shared inbox doesn't receive the new address in full |
| A pending change in the app | **Yes: read and cancel** (`GET` / `DELETE /auth/email-change`) | the profile can say a change is waiting, and a typo is cancelled without waiting for the expiry |
| Other sessions when the change is confirmed | **Signed out everywhere else** (the person's choice over my "keep them") | the recovery address just changed; whoever confirms from the account's own browser keeps that session |

In the app the pending request shows the new address IN FULL (said in the
delivery, not contested): its reader is the owner, and it's how a typo is
spotted. Only the old inbox sees it masked.

### Pass 2 — the change flow (built 2026-10-22, green the same day)

- **`email_change_requests`** (migration **0053**, generated): the new
  address (normalised — the users CHECK's expression), SHA-256 hashes of the
  CONFIRM token (emailed to the new address) and of the CANCEL token (to the
  old one), `created_at`, `expires_at`, `confirmed_at`, `cancelled_at` +
  `cancel_reason` (`replaced`, `cancelled_in_app`, `cancelled_by_email_link`,
  `password_reset`). The state is derived from the timestamps, never stored.
  CHECKs: confirmed OR cancelled, never both; a cancellation has its reason;
  expires after it was created. A partial unique index: ONE open request per
  account. Its own table, so the tokens never sit on `users`.
- **Row security and a guard trigger** (migration **0054**, custom). Policies:
  the owner (signed in), or the holder of ONE link — each link through its
  own transaction-local setting (`app.email_change_token_hash`,
  `app.email_change_cancel_token_hash`; `withEmailChangeTokenContext`), so
  the old inbox's link can never confirm. No admin branch (self-service), no
  DELETE. The trigger (`guard_email_change_request`, the owner exempt):
  a new request starts open at the database's moment; a closed one is final;
  what it asks for never changes; confirming needs the confirm link and
  `expires_at > now()`; a cancellation "by email link" needs the cancel link.
  Each refusal a 23514 with its own constraint name.
- **One clock:** `expires_at = now() + 24 hours` written in SQL, compared with
  `now()` in SQL.
- **Routes** (`src/email-change/`, under `/auth/email-change`, every one
  audited by the convention): `GET` (pending or null), `POST { newEmail,
  currentPassword }` (5/min; wrong password / own address → 400), `DELETE`
  (cancel; nothing open → nothing written), `POST /confirm { token }` and
  `POST /cancel { token }` (public, 5/min).
- **Reveal nothing, fully:** a taken address still stores the request and
  sends the old inbox its notice; only the new inbox's email differs (the
  link, or "this address already has a Stride account" — no link, no name);
  emails after the commit, fire-and-forget, so the timing is the same; "taken"
  is not in the audit entry.
- **The request** locks the account's row (two tabs run in turn), closes an
  open request as `replaced`, inserts the new one, writes
  `EMAIL_CHANGE_REQUESTED` (`newEmail`, `expiresAt`, `replacedRequestId`).
- **The confirmation**, ONE transaction: the request locked (by its link),
  then the account (acting as it — the reset's synthetic self-context; a
  deactivated account refused), the email changed, the request closed, the
  account's OTHER sessions deleted (`RETURNING sid`; the confirming browser's
  session kept — it can only match if it IS the account's), the entry
  `EMAIL_CHANGE_CONFIRMED` (`changes.email` from → to, `signedOutSessions`).
  After the commit: the sockets of the ended sessions closed, the "changed"
  notice to the old address. An address taken since → the UNIQUE refuses,
  everything undone, 409.
- **Cancel by link:** locked, closed as `cancelled_by_email_link`, an entry
  performed by the owner; already cancelled → the same answer, nothing
  written; already confirmed → 409 ("contact your clinic" — the old address
  is no longer the account's, so a reset from it would find nothing).
- **A password reset cancels a pending change** in its transaction
  (`cancelledEmailChangeRequestId` in `PASSWORD_RESET_COMPLETED`).
- **Emails** (`EmailService`): the confirm link; "address taken"; the
  requested notice (masked, cancel link, "reset your password"); the changed
  notice (masked, "signed out on your other devices", "contact your clinic").
- **Audit vocabulary:** `EMAIL_CHANGE_REQUESTED` / `_CONFIRMED` / `_CANCELLED`
  (98 actions); `email_change_requests` → area "Accounts". The frontend's
  wording comes with pass 3.
- **Tests:** e2e `test/email-change.e2e-spec.ts` (31), unit `mask-email`
  (7), the emails (7), the reset (1). Three races made deterministic (two
  requests of one person, a confirmation vs a deactivation, a cancel link vs a
  confirmation). 46 mutations: 41 killed at once, 4 gaps closed with tests
  (three locks, the one-open index), 1 equivalent — the "is it the same user?"
  test before keeping a session, REMOVED as dead code. Backend **1,746 unit,
  e2e 863**.

### Found on the way, fixed (2026-10-22, both green)

- **A password reset left its sessions' sockets open.** Deleting a session
  ends its HTTP requests, but a messaging socket is authenticated once, at
  its handshake — a signed-out device kept receiving messages.
  `destroyAllSessionsForUser` now answers the ids (`RETURNING sid`),
  `resetPassword` returns them, the controller closes each socket (as logout
  does for its one). The e2e reset test compares the sessions read just before
  with the sockets closed — never a count: the session table outlives each
  suite's TRUNCATE, and earlier suites' sessions carry the same user ids (12
  in the person's run).
- **Deactivating an account left its sessions and sockets.** HTTP was safe
  (`SessionSerializer` refuses an inactive account on every request), but the
  socket stayed. `setActive` now deletes the sessions in the deactivation's
  transaction (`USER_DEACTIVATED` gains `signedOutSessions`), `softDelete`
  returns `{ user, endedSessionIds }`, `DELETE /users/:id` closes the
  sockets and answers the user as before. Reactivating ends nothing (an
  inactive account holds no session — the equivalent mutant is documented in
  the code). Backend **1,746 unit, e2e 864**.

### Pass 3 — the screens (built 2026-10-22, green the same day)

The person's three choices: the form on **its own page** (`/profile/email`);
a **notice on the Email row** while a change waits; the link pages act **on a
button, then lead to sign-in** (mail scanners open links by themselves).

- **`src/email-change/`** (frontend): `ChangeEmailPage` (new address +
  current password, a hidden `autoComplete="username"` field for password
  managers; a wrong password said at its field — cleared and focused —, "already
  your address" at the address field, anything else under the form; back to
  the profile with `replace`, the answer written into the cache),
  `EmailRow` (on `/profile` only — `ProfileFields`' `ownProfile`; staff pages
  say "Only the person can change their email address, from their own
  profile."), `ConfirmEmailPage` and `CancelEmailChangePage` (no guard; the
  token read once and removed from the address — `useLinkToken`; dead link,
  "taken since" and "too late" each explained), `emailChangeRules.ts` (a
  refusal read by status AND words), the audit wording for the three actions.
- **After confirming,** who is signed in here is FETCHED again (the
  current-user query is disabled, so an invalidation wouldn't refetch it —
  caught by a test) and only when someone is signed in (for a visitor
  `/auth/me` is a 401, which the global handler turns into a trip to
  sign-in): "Back to my profile" if this browser is the account's, "Log in"
  with the new address filled in otherwise. A failed re-read still says the
  change is made.
- **Tests:** 33 (rules 7, row 4, form 7, confirm 9, cancel 6) with a harness
  recording `{ method, path, body }`. 37 mutations under
  `TZ=America/Montreal`: 35 killed, 2 survivors were DEAD CODE, removed (a
  second trim — the schema's parse already trims; a refetch after cancel — the
  204 already says nothing is pending). Frontend **2,457 tests**; first
  download +0.73 kB (764.11 kB / 235.05 kB gzip). Live in Chromium (375 px
  light and dark, 1280 px) against the real backend and real emails.

**Change email is complete.**

### Re-asking the password (the person's question, 2026-10-22)

Asked: should changing the email require the password again, or is the
pipeline safe enough? It ALREADY requires it (pass 2: `currentPassword`,
checked with bcrypt before anything is stored), and it should — this is
"step-up authentication": a session proves someone signed in at some point,
not that the person is at the keyboard now. Without it, a stolen session
cookie or a browser left signed in would be enough to move the account's
recovery address to an attacker's inbox — after which "forgot password"
works for THEM, and the real owner is locked out. The other layers (the
new inbox must confirm; the old inbox is told, with a cancel link; a reset
cancels a pending change; confirming signs out every other session) each
narrow a different path, but none replaces the password: confirming only
proves the attacker controls the inbox THEY chose. Remaining gaps, recorded
in `deferred-improvements.md` ("Email change: further step-up hardening"):
the MFA code isn't asked of accounts with MFA on; wrong current passwords
aren't audited nor counted per account.

**Open:** nothing for this item. Deferred: further step-up hardening.
Changing the password from the profile — built 2026-10-22/23, §13.

---

## §13 — Change password (Phase 6)

**Chosen 2026-10-22** as the next Phase 6 item, from the plan recorded in
`deferred-improvements.md` at the end of "Change email" (the person asked for
it then). Until now a signed-in person could change their password only
through "Forgot your password?" — signing out, asking for a link, opening it.
Built in one pass, backend and frontend together; **green 2026-10-23.**

### The person's four choices (2026-10-22)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| A change of email waiting for confirmation when the password changes | **Cancelled, with its own reason** `password_changed` (a new enum value, migration 0055) — and the form says so before sending | as a reset does (§12): whoever changes the password may be locking out someone who knew the old one and asked to move the account to their inbox. Rejected: reusing `password_reset` (no migration, but the record would claim a reset happened); keeping it (an attacker's request would survive) |
| The person's other devices | **Always signed out** (this browser stays) | the point of a new password is often to lock someone out; a checkbox would be one more choice to explain and test, for a rare need. Same as confirming an email change |
| A wrong current password | **Refused and throttled, not audited** | the same as the email change; auditing failed step-ups (and counting them per account) stays in `deferred-improvements.md`, "Email change: further step-up hardening", for BOTH forms at once |
| Where on the profile | **A new "Sign-in and security" section** with the Email and Password rows | the two things that could hand the account to someone else, together; two-factor sign-in would join them. Staff pages unchanged (the email read-only among personal details) |

My defaults, stated with the plan and not contested: its own page
(`/profile/password`, like the email change); a hidden username field for
password managers; the shared password rule (8–128); a notice email; the new
password refused when it equals the current one.

### What was built

- **Backend — `POST /auth/password { currentPassword, newPassword }`**
  (`src/password-change/`: module, controller, service, DTO; signed in,
  every role, 5 a minute, `@AuditedByService()`), 204:
  1. the two values compared first ("Your new password must be different
     from your current one");
  2. the new hash computed BEFORE the transaction (bcrypt is slow on purpose
     — no reason to hold a lock while it runs);
  3. ONE transaction: the account's row LOCKED (`FOR UPDATE`) and the current
     password checked against what the lock returned; the new hash; an
     unused reset link cleared; a pending email change cancelled
     (`password_changed`); every OTHER session deleted (`RETURNING sid`); ONE
     audit entry `PASSWORD_CHANGED` with `signedOutSessions`, and
     `cancelledEmailChangeRequestId` / `cancelledResetLink` only when
     something was cancelled — never the password or a hash;
  4. after the commit: those sessions' sockets closed, the notice emailed
     ("Your Stride password was changed" — with the forgot-password PAGE, no
     token, for "if it wasn't you").
- **Why check UNDER the lock:** checking first and writing later leaves a gap
  — two changes made at once (two tabs; an attacker racing the owner) could
  both pass against the same old password, the later silently replacing the
  earlier. With the lock the second waits, then reads the NEW hash and is
  refused. A "time of check to time of use" race, closed; an e2e test holds a
  change open on another connection to prove it.
- **One step-up rule:** `src/common/current-password.ts` (`isCurrentPassword`,
  `WRONG_PASSWORD_MESSAGE`) — the email change now uses it too. The frontend
  mirror: `src/auth/currentPassword.ts`.
- **Frontend:** `src/password-change/` — `ChangePasswordPage` (current, new,
  confirm; the warning when an email change waits; a wrong current password
  at its field, cleared and focused; afterwards back to the profile,
  `replace`d, with "Your password is changed. Any other devices signed in to
  your account are signed out." and the cancelled email change removed from
  the cache), `PasswordRow`, `passwordChangeRules` (`newPasswordSchema`
  extended with `safeExtend` — in Zod 4 a refined object can't be
  `.extend()`-ed — plus "not the current one"). `ProfileFields`' `ownProfile`
  now renders the "Sign-in and security" section; `ProfilePage` shows a
  handed-over notice. The two copies of the API-error helpers
  (`hasMessage`, `failureText`) moved to `src/api/apiErrors.ts`.
- **Audit wording:** "Changed a password" (99 actions).

### What was verified

Backend 1,736 unit (+5), e2e 878 (+14: `test/password-change.e2e-spec.ts` 13,
a rate-limit test for both current-password routes). Frontend 2,477 (+20).
Mutations: backend 33 (32 killed; the survivor — the service's "this
account's requests" filter — is equivalent: both the UPDATE and the SELECT
policies already limit it; a test pins the outcome and fails once all three
are gone), frontend 32/32. First download +0.39 kB. Live in Chromium (375 px
light and dark, 1280 px, a real notice email).

**Found in the person's run** (2026-10-23): their test database hadn't
received migration 0055 — every successful change answered 500 (Postgres
checks an enum literal even when no row matches); and a test compared a list
sorted by the database with one sorted by JavaScript — equal only under a
byte-order collation (the sandbox's `C.UTF-8`), not the person's
`en_US.utf8`. The helper now sorts in JavaScript. Also fixed then, older and
unrelated: a medical-file test counted reads before React Query had started
them (it now waits for what the read shows).

**Open:** nothing for this item. Deferred: further step-up hardening (the MFA
code for MFA accounts, failed-attempt auditing) — for both forms.

---

## §14 — Two-factor sign-in: MFA enrolment (Phase 6)

**Chosen 2026-10-23** as the next Phase 6 item (the recommended option, over
the honest empty states, the two remaining read-then-insert races and the
admin home metrics). The backend routes existed (`/auth/mfa/setup`,
`/enable`, `/disable`, and the sign-in's `/auth/mfa/verify` with the
frontend's `mfa-pending` step), but reading them before planning found five
gaps — so the item starts with the backend. In three passes, each confirmed
green before the next: **pass 1, harden what exists; pass 2, recovery codes
and the admin reset; pass 3, the screens — all three green 2026-10-23. MFA
enrolment is complete.**

### What reading the code found (2026-10-23)

1. **A bug: set-up never looked at `mfaEnabled`.** It replaced the WORKING
   secret, with no code asked — the person's authenticator app stopped
   matching and their next sign-in failed. Clicking "set up" twice did it;
   so could anyone holding a stolen session cookie.
2. **No way back from a lost phone** — no recovery codes, no admin reset.
3. **A stolen session could enrol its OWN authenticator** on someone else's
   account (set-up and enable asked for the session only) — the owner then
   locked out.
4. **A race:** `enable` read the secret before its transaction; a set-up in
   another tab could change it between "the code matches" and "MFA is on",
   turning MFA on with a secret nobody scanned.
5. **Smaller:** the code DTO accepted any 6 characters; a code could be
   replayed within its 30-second window; no notice email for on / off.

### The person's choices (2026-10-23)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| A lost authenticator | **Both: recovery codes AND an admin reset** | codes are self-service (nobody else can bypass the factor); the reset is the last resort for someone who lost the codes too. Rejected: either alone (codes get lost; a reset alone means any admin can weaken any account — so it asks the admin's password, below) |
| What starting set-up and turning off ask for | **Set-up: the current password. Off: the password AND a current code** | set-up with a session alone is gap 3; turning off removes a factor, so it asks for both factors. Rejected: today's checks (gap 3 stays open) |
| The code in the email and password changes' step-up | **Yes, in this item** — for an account with MFA on, the step-up is the password AND a code | closes the MFA half of the deferred "further step-up hardening", in its one place (`src/common/current-password.ts`) |
| Who uses MFA | **Optional for every role** | requiring it for admins changes the sign-in flow and every admin test — noted as a later option |
| A lost phone after signing in with a recovery code (pass 2) | **A recovery code is accepted wherever a code is asked** (turning off, the step-ups) | someone who signed in with a recovery code has no authenticator; without this they couldn't turn MFA off to set up a new phone |
| The codes (pass 2) | **10 single-use codes shown once when MFA is turned on**, and "generate new codes" (password + code), which cancels the old ones | the usual shape (GitHub, Google); shown once because only their hashes are stored |
| The admin reset (pass 2) | **Asks the admin's own password; an admin can't reset their own** | the reset weakens an account: a stolen admin session alone must not do it, and an admin's own lost phone goes through another admin (or their recovery codes) |

My defaults, stated with the plan and not contested: MFA in its own module
(`src/mfa/`, like `src/password-change/`) at the same addresses; turning MFA
on signs out the other devices (sessions opened with the password alone),
like a password change; a set-up while MFA is on is a 409 (change of phone =
off, then set up again); a replayed code has its own message.

### Pass 1 — hardening what exists (built 2026-10-23, green the same day)

- **The module:** `src/mfa/` — `totp.ts` (the one rule for "is this code good
  now?"), `mfa.service.ts` (setup / enable / disable / the sign-in check),
  `mfa.controller.ts` (`/auth/mfa/setup|enable|disable` — the same
  addresses), `mfa.module.ts` (exports the service: `AuthController`'s
  `mfa/verify` asks it), two DTOs. `AuthService` lost its MFA methods (159
  lines) and their 9 unit tests — the behaviour is now proven by e2e tests
  against the database and by `totp.spec.ts`.
- **No code works twice** (RFC 6238 §5.2): `users.mfa_last_used_step` holds
  the time step (floor(unix seconds / 30)) of the last code the account
  accepted; a code is good only if its step is LATER (`<=` refused — a clock
  moved back can't reopen a window). Recorded in the transaction of the
  action the code allowed: if that action is refused or rolled back, the code
  isn't spent. A replayed code: "This code has already been used — wait for
  your app to show a new one"; at sign-in, `MFA_LOGIN_FAILURE { reason:
  'code_already_used' }` (a wrong one: `wrong_code`).
- **Every MFA method LOCKS the account's row first** (`SELECT … FOR UPDATE`)
  and checks what the lock returned, in ONE transaction with its write and
  its ONE entry — two requests with one code can't both find it unused, and
  a set-up in another tab can't change the secret under an "enable". Both
  races have deterministic e2e tests (`whileHolding`).
- **Set-up:** `{ currentPassword }`; a wrong one 400, nothing stored; MFA on →
  409 "Two-factor sign-in is already on for this account", the working secret
  untouched; a set-up not yet confirmed is replaced, its entry saying
  `replacedUnconfirmedSetup: true`. Throttled 5 a minute (it checks a
  password now).
- **Enable:** a code from the set-up secret; already on → 409, nothing
  written; then every OTHER session deleted and its socket closed
  (`endOtherSessions`, `src/common/other-sessions.ts` — shared with the
  password change), `MFA_ENABLED { signedOutSessions }`, a notice email.
- **Disable:** `{ currentPassword, code }` — the step-up (`confirmStepUp`),
  then "not on" → 400; the secret AND the last-used step cleared;
  `MFA_DISABLED`; a notice email with the forgot-password page.
- **The sign-in check** (`verifySignIn`): acts as the pending account (its id
  and role, for row security); MFA turned off meanwhile (even set up again,
  not yet confirmed) → refused; the code recorded on success, the failure
  recorded with its reason otherwise; the 401 carries the refusal's words.
- **The step-up** (`confirmStepUp`, `src/common/current-password.ts`): the
  password FIRST (a code isn't even looked at — or spent — with a wrong
  password); for an account with MFA on, a code: none → "Enter the 6-digit
  code from your authenticator app"; wrong or used → `totp.ts`'s words. Used
  by the email change (its check moved UNDER the row lock — a code is
  recorded), the password change and disable. `IsCurrentPassword()` (one
  decorator, four DTOs); `mfaCode` optional on the two change DTOs, with
  `ValidateIf(isPresent)` — `null` is refused, not "no code".
- **The database's half:** CHECK `users_mfa_enabled_has_secret` (on ⇒ a
  secret); the code still refuses that state (fails closed), since TypeScript
  can't see a CHECK. Migration **0056** (`mfa_replay_guard`, generated, not
  hand-edited): the column and the CHECK.
- **Smaller:** codes are 6 DIGITS (`IsMfaCode()`, "The authentication code
  is 6 digits"); `toPublic` strips `mfaLastUsedStep`; the `mfaSecret`
  comment in `users.schema.ts` corrected (it IS encrypted at rest).
- **The two notices:** "on" says to contact the clinic — NOT to reset the
  password (an attacker's phone as the second factor isn't removed by a new
  password; the admin reset, pass 2, is); "off" gives the forgot-password
  page.

### What was verified (pass 1)

Backend 1,756 unit (−9 moved + 29: `totp.spec` 17, the step-up 8, the
emails 4), e2e 899 (+21: `test/mfa.e2e-spec.ts`); the 5 sandbox-only
pagination failures. 44 mutations: 43 killed, 1 equivalent (`!result.valid`
— a refused otplib result carries no `timeStep` either; kept as the library's
documented answer, said in the code). Found by the mutation run: two tests
timed out (5 s) whenever `freshCode` waited for a new 30-second window — the
suite now allows 40 s a test, account-audit's MFA test 20 s. Lint clean on
all 30 changed files. Live against the built app (a real SMTP inbox): the
whole flow, the replay refused, the notices sent. **Green on the person's
machine 2026-10-23.**

### Pass 2 — recovery codes and the admin reset (built 2026-10-23, green the same day)

My defaults, stated in the delivery and not contested: `enable` answers 200
with the codes (was 204); each recovery-code use writes its OWN entry
`MFA_RECOVERY_CODE_USED { remaining }` besides the action's (a stated
exception to "one entry per request", like a clinic removal's) and sends a
notice; the reset ends EVERY session of the account; rotating
`MFA_ENCRYPTION_KEY` invalidates the codes, as it already does the secrets.

- **The codes** (`src/mfa/recovery-codes.ts`): 10 per account, `xxxxx-xxxxx`
  from 31 symbols (no 0 / o, 1 / l / i) — ≈ 49.5 bits each; typed in either
  case, with a hyphen, a space or nothing between the groups. Stored as an
  **HMAC-SHA256** under a SUBKEY of `MFA_ENCRYPTION_KEY` (domain separation):
  50 bits survive online guessing (5 a minute) but not an offline GPU against
  a plain SHA-256 of a stolen table — without the key a guess can't even be
  checked. A pinned value in the spec guards the derivation (a change would
  silently invalidate every code given out).
- **`mfa_recovery_codes`** (migration **0057**, generated: `UNIQUE (user_id,
  code_hash)` — its index also serves "this account's codes", so no separate
  `user_id` index —, a CHECK on the hash's shape) and **0058** (custom): row
  security (own rows; admins SELECT + DELETE for the reset, never INSERT) and
  a guard trigger (born unused, used once at the database's moment, otherwise
  fixed; the owner exempt).
- **"A recovery code wherever a code is asked"** (`src/mfa/second-factor.ts`):
  `IsSecondFactorCode()` (trimmed; 6 digits or a recovery code) on sign-in,
  disable, new codes and the step-ups; `IsTotpCode()` on enable only (the
  proof that the APP holds the new secret). `trySecondFactor` spends a
  recovery code with ONE statement (`UPDATE … WHERE used_at IS NULL …
  RETURNING`) — the second of two concurrent uses waits on the row, re-reads
  it and changes nothing.
- **`StepUpService`** (`src/mfa/step-up.service.ts`, exported by `MfaModule`;
  `confirmStepUp` moved there from `current-password.ts`, which keeps the
  password half): `confirm()` returns a RECEIPT; a recovery code's entry is
  written in the caller's transaction, its notice sent by `afterCommit()`
  after the caller's commit. The email and password changes inject it.
- **Routes:** `POST /auth/mfa/enable` → 200 `{ recoveryCodes }`; `GET
  /auth/mfa/recovery-codes` → `{ remaining }`; `POST /auth/mfa/recovery-codes
  { currentPassword, code }` → 201 `{ recoveryCodes }` (the old ones deleted,
  `MFA_RECOVERY_CODES_REGENERATED { replacedUnused }`); disable deletes them.
- **The admin reset:** `POST /users/:id/mfa/reset { currentPassword, mfaCode? }`
  (`MfaAdminController`, admins, 5 a minute) — the ADMIN's step-up; 403 on
  one's own account; 400 when MFA is off; 404 unknown; both rows locked in ONE
  statement in id order (no deadlock between two admins resetting each
  other); MFA off, codes deleted, every session ended and its socket closed;
  `MFA_RESET_BY_ADMIN { signedOutSessions }`; a notice to the account.
- **Audit vocabulary:** 102 actions (`MFA_RECOVERY_CODE_USED` a sign-in event;
  `MFA_RECOVERY_CODES_REGENERATED`, `MFA_RESET_BY_ADMIN` changes) — the
  frontend's wording table follows in pass 3.

### What was verified (pass 2)

Backend 1,797 unit (+41), e2e 917 (+18; the MFA suite 39). 67 mutations: 65
killed, 2 equivalent — the spend's account condition (row security says it
too; removing BOTH fails "refused for another account") and the reset's
`ORDER BY` (Postgres returns those rows in id order anyway; a deadlock can't
be produced deterministically — argued, not tested). First-round survivors
closed with tests: a client choosing `created_at`, another account's code,
each caller's notice, the emails' wording; three mutants that were invalid
code ("killed by tsc") replaced by real ones. Lint clean (38 files). Live
against the built app: sign-in with a recovery code typed in capitals with a
space, reuse refused, new codes, the admin reset. **Green on the person's
machine 2026-10-23.**

### Pass 3 — the screens (built 2026-10-23, green the same day)

The person's choices (2026-10-23):

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| How the ten codes are handed over | **Copy all + Download (.txt) + a tick "I've saved my recovery codes" before Done** | they're shown once; the tick makes "saved" a deliberate act. Rejected: Done alone (too easy to skip), print (needs a print style for one panel) |
| The sign-in step with a recovery code | **The same field, with a hint** ("Lost your phone? Enter one of your recovery codes instead.") | one field, the backend takes either shape. Rejected: a "Use a recovery code" link switching the field (two modes to test, one more click when it matters least) |
| Set-up left halfway | **Start over next time** | the backend already replaces a set-up never confirmed; nothing to resume. Rejected: keep the QR code across visits (the secret would have to be kept in the browser) |
| Where the admin's reset lives | **A "Two-factor sign-in" section on the admin's user page**, after the invitation status | beside the account's other states. Rejected: a menu action (hidden), the users list (crowded) |

My defaults, stated in the delivery and not contested: one page
(`/profile/two-factor`) with two faces (off: set up; on: the count, new
codes, turning off); the code field only when the account has MFA on
(`mfaEnabled` from `/auth/me`); every refused code said AT its field,
cleared and focused; the step-ups' code field without a number pad (a
recovery code has letters), the set-up's first code with one (it can only be
an app code).

- **`src/two-factor/`** (frontend, 15 files): `twoFactorRules.ts` (the
  backend's two code shapes and its refusal words, `codeRefusal`, the three
  forms' schemas, the notices, `groupSecret`, `recoveryCodesLeftText`,
  `recoveryCodesFile`), `api.ts` (the seven calls), `SecondFactorField`,
  `StepUpForm` (password + optional code, owning its request so each refusal
  lands at its field), `RecoveryCodesPanel`, `TwoFactorPage`, `TwoFactorRow`
  (the profile's row: Off → "Set up"; On + "N recovery codes left" →
  "Manage"; none left in red), `useRecoveryCodesLeft` (asked only while on),
  `ResetTwoFactorSection` (the admin's: On / Off, the dialog saying what a
  reset does, the ADMIN's password — and their code when their account has
  MFA on —; on their own account, what to do instead).
- **Edited:** the email and password change pages send `mfaCode` (their
  `api.ts` leave it out when there is none — the backend refuses an empty
  one); the sign-in step takes a recovery code (`mfaCodeSchema` = the shared
  field), hint, refusal at the field; `/profile/two-factor` (lazy); the
  profile row; the user page's section; the three audit actions' wording
  ("Signed in with a recovery code", "Made new two-factor recovery codes",
  "Reset two-factor sign-in for an account").
- **Found in the browser, fixed:** after turning on, the profile still said
  "Off" — the page told the session's current user, but the profile shows
  the account as `GET /users/:id` answered it (a second cache entry).
  `setOwnMfaEnabled` writes both; the test's stub profile now reads the same
  query as the real one.
- **The download** is made in the click handler (a Blob, a temporary link
  with `download`, the URL revoked straight after) — not in an effect feeding
  state (oxlint's `set-state-in-effect`; render stays pure).
- **Seed (backend):** `casey@stride.test`, a patient with MFA ON — turned on
  the real way (set-up, a generated code, enable: the app's own audit trail),
  then the random key and codes swapped for PUBLISHED ones
  (`DEMO_MFA_SECRET`, `DEMO_RECOVERY_CODES` in `scripts/seed/dataset.ts`;
  listed in `dev-test-accounts.md`) through the owner connection — like the
  expired invitation, the one thing the app can't make on demand. Found while
  running it on a fresh database: turning on deletes the account's other
  sessions, and the `session` table exists only once the SERVER has started
  (connect-pg-simple's `createTableIfMissing`) — the seed now creates it the
  same way (the library's `table.sql`) when missing.

### What was verified (pass 3)

Frontend **2,548 tests** (212 files; +71); tsc clean; ESLint the one known
warning; oxlint 27 = the base. 62 mutations, all killed. First download
+2.4 kB (+0.9 kB gzipped); the page a lazy chunk of 7.1 kB. Backend 1,802
unit (+5: the demo's data and doc). Live in Chromium against the built app,
375 px light and 1280 px dark: set up with a code computed from the shown
key, copy, download (the file's name and account), the tick, the profile On
with 10, a recovery code refused then one accepted in capitals at sign-in,
the password change asking a code, 9 left, turning off, the admin's reset of
Casey; no horizontal scroll; the only console errors the expected 401 before
signing in. The seed run end to end; Casey signs in with an app code from the
published key and with a recovery code, the same code refused the second
time. **Green on the person's machine 2026-10-23. MFA enrolment is complete.**

## §15 — Honest "not available" and load-error states (Phase 6)

**Chosen 2026-10-23** as the next Phase 6 item — the only Required one left
(roadmap: "Honest empty/error-state copy for the four RLS 404-ambiguous
resources"), over the admin home metrics, the loading / skeleton pass and the
security leftovers (failed step-up auditing, the `grantRole` / `addMember`
races, admins' access to sessions and programs). Frontend only; one pass;
**green on the person's machine 2026-10-23.**

### What reading the code found

The item was half built already, page by page: every page reading one of the
four resources (assigned programs, sessions, conversations, medical-file
entries — 13 pages) avoided saying whether a hidden record exists. But in
five different ways: some with a heading and links (the practitioner's
program page, the session review), some a bare sentence (the patient's session
flow: "This session doesn't exist, or isn't yours."), three practitioner pages
a dead end with no way out ("This program doesn't exist, or isn't one you can
see."), the conversation pane "Conversation not found" with no explanation,
and a malformed id answered "Invalid program." on the practitioner side while
the patient side treated it as not available. Any other failure said
"Couldn't load this … Try refreshing the page."

### Why the page can't say which case it is

Row-level security hides another patient's record, so the backend answers 404
exactly as for a record that doesn't exist — on purpose: "not yours" would
confirm that program 4 exists, and ids could be probed. The honest page names
BOTH possibilities, and the rule behind the second where there is one ("Only a
patient's care team can open their programs") — the rule reveals nothing about
any particular record.

### The person's choices (2026-10-23)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| The heading | **"… not available"** ("Program not available") | true in both cases — the record may well exist. Rejected: "… not found", the common wording but untrue when the record is only hidden |
| Other load failures | **A "Try again" button** (the query's refetch) | a refresh reloads the whole app to repeat one request and loses the rest of the page. Rejected: keeping "Try refreshing the page" |

My defaults, stated in the delivery: one shared shape (heading, one sentence
as an alert, links out), the words per resource; a malformed id gets the same
page as a 404 (it reveals nothing a typed id couldn't); the conversation's 403
(the service's own check behind row security) counts as "not available" too;
the rest of the app's 42 "Couldn't load …" messages in 34 files (lists,
home cards, progress sections) left for the "Loading / skeleton states" pass.

### Built

- **`src/common/NotAvailable.tsx`** — heading (`<h1>`, or `<h2>` inside a page
  that has its own, the conversation pane), the sentence as `role="alert"`
  (it replaces "Loading…" without moving focus), a row of links (not a
  `<nav>`: a landmark per error page is noise). At least one link — the type
  says so (`[NotAvailableLink, ...NotAvailableLink[]]`).
- **`src/common/LoadError.tsx`** — `LoadError` ("Couldn't load this
  program." + "Try again" + optional ways out) and `LoadFailure` (the one
  decision: "not available" on any failed request → the resource's
  NotAvailable, else LoadError). Both take the QUERIES: "Try again" refetches
  only the requests that failed (the start page waits on a program then its
  summary — only the failed one is asked again); "retrying" is derived, not
  wired per page.
- **`isNotFound(error)`** in `src/api/apiErrors.ts`.
- **Per resource, its words:** the patient's (`SessionPageParts.NotAvailable`
  / `LoadFailed`, six pages: "This program doesn't exist, or it isn't one of
  yours." · Back to home · Your sessions); the practitioner's programs
  (`assigned-programs/ProgramNotAvailable.tsx`, four pages · My patients ·
  Programs); the session review (· Back to home · My patients); the
  conversation ("…or you aren't part of it." · Back to messages, an `<h2>`,
  403 included); the medical-file entry ("Entry not available" · Back to the
  medical file). The medical file page and My records got "Try again".

### Found in the browser: TanStack Query forgets the error while retrying

Every unit test passed, but in Chromium a failed retry lost keyboard focus and
never said "Still couldn't …". Cause, read in query-core 5.104.5
(`fetchState`): a refetch of a query that never had DATA resets it to
`status: 'pending', error: null`. The page shows its "Loading…" again, the
error block (and the focused button) unmounts, and a NEW block appears if the
retry fails. The fix: `LoadError` remembers the press at module level (the
pressed component is gone when the answer comes) — matched by `what`,
forgotten after 30 seconds or once used, cleared when the retry worked; the
block that replaces it says "Still couldn't load …" and focuses its button.
When the query HAD data (a later refetch failed), it stays in error while
retrying: the block stays, the button reads "Trying again…" with
`aria-disabled` (not `disabled`, which drops focus), and a failure seen in
place changes the words the same way. A screen reader speaks a live region
only when its text changes or appears — hence "Still".

### What was verified

Frontend **2,579 tests** (214 files; +31); tsc clean; ESLint the one known
warning; oxlint 27 = the base. **69 mutations, all killed by tests** (one was
first stopped only by `tsc` — an unused component — which exposed an untested
link; the test was added and a valid mutant run). First download +0.54 kB
(+0.15 kB gzipped; 767.93 / 236.43 kB). Live in Chromium on the production
build against seeded data: Pat (375 px, dark) opening Jo's program, Robin's
session and conversation, the start page of Jo's program, and a faked 500 —
"Try again" → "Loading…" → "Still couldn't load this session." with focus on
the button → success; Alex (1280 px, light) opening Robin's program, its
exercise, a malformed id, Robin's session and conversation, and an entry of
another patient's file; his own program still opens. Found there too: the
button and an inline "Back to home" on one line at 375 px — the button now
has its own line. **Green on the person's machine 2026-10-23.**

## §16 — Privacy and security pass (Phase 6)

**Chosen 2026-10-23** as the next Phase 6 item, on my recommendation, over
the admin home metrics and the loading / skeleton pass. It gathers the
security and privacy leftovers: admins' access to programs and sessions (the
last part of `deferred-improvements.md`, "Admins can read and change all
clinical data"), auditing failed step-ups, and the `grantRole` / `addMember`
races. Two passes: **pass 1** (admins out of the clinical data) is **green
on the person's machine 2026-10-24**; **pass 2** (failed step-ups and the two
races) **green the same day — the item is complete.**

### The person's choices (2026-10-23)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| Admins and programs / sessions | **Remove reads AND writes** | the line already drawn for messages (§7) and medical files (§8): an admin runs clinics and accounts, and clinical access comes with the practitioner role and a place on the care team. Rejected: keeping reads (a read IS the privacy exposure) and keeping writes (an admin could change a prescription without being able to see it) |
| A "break-glass" read for emergencies | **No, not now** | a logged emergency door is real HIPAA practice, but it needs its own screens, a reason and a review. The care team already gives a practitioner access in a few clicks. Stays an idea in `deferred-improvements.md` |
| Failed step-ups (pass 2) | **Audit + sign out after 5** | each wrong password / code in a step-up writes an entry, and 5 failures in a row end that session. Rejected: auditing alone (it records a guessing session but doesn't stop it) |
| Audit entries about clinical data | **Keep them stored, hide their details from admins** | the audit log's details hold clinical content (a prescription before → after, a session's scores). Deleting or trimming them would lose the only record of a prescription's earlier values. Rejected: showing them (it reopens through the audit log what the pass closes) and storing less |

My defaults, stated in the delivery: a practitioner + admin account (Morgan)
acting AS ADMIN gets nothing either (`rls_practitioner_manages_patient`
checks the active role); "who, what, when, about whom" stay visible in the
audit log (an admin reviewing access needs them); an area the vocabulary
doesn't know is withheld (the safe side).

### Pass 1 — admins out of programs and sessions (built 2026-10-23, green 2026-10-24)

- **The API:** `AssignedProgramsController` is guarded at class level,
  `@UseGuards(SessionAuthGuard, RolesGuard)` + `@Roles(PRACTITIONER,
  PATIENT)` (the medical files' pattern). The write routes narrow it with
  their own `@Roles(PRACTITIONER)` (the guard reads the handler's first,
  `getAllAndOverride`); the 18 method-level `@UseGuards(RolesGuard)` went,
  and 17 `@Roles(PRACTITIONER, ADMIN)` became `@Roles(PRACTITIONER)`. `GET
  /sessions/:id` got `@Roles(PRACTITIONER, PATIENT)`. An admin gets the
  guard's 403 ("You do not have permission to access this resource")
  everywhere.
- **The services:** the admin branches are gone from
  `AssignedProgramsService` (`findProgramRows`, `assertCanView`,
  `assertCanManage`) and `SessionsService.assertCanView`. The list refuses
  any role but practitioner before its practitioner path (a defence behind
  the guard).
- **The database — migration 0059 (custom):** 17 `ALTER POLICY` statements,
  each the policy as it was minus `rls_is_admin() OR`. They cover
  `assigned_programs` (select / insert / update), `assigned_program_exercises`
  and `program_workouts` (insert / update / delete), `program_schedules`
  (insert / delete), the schedule days' and rotation's inserts,
  `sessions_select`, `sessions_update_close_with_program`, and the SELECT
  policies of `session_reviews` and `program_alert_reviews`. The child
  tables' SELECT policies read through the parent's (an `EXISTS` on
  `assigned_programs` runs under its own policy), so they follow with no
  change.
- **The audit log:** `CLINICAL_AREAS` in `audit-vocabulary.ts` classifies
  every area (`satisfies Record<AuditEntityType, boolean>`: a new area left
  out fails to compile). `GET /audit-logs` answers a clinical area's entry
  with `details: null, detailsWithheld: true`, and the viewer says "Clinical
  details aren't shown to admins." instead of the Details button. Programs,
  sessions, reviews, alerts, conversations, messages and medical files are
  clinical; accounts, clinics, care teams, invitations, the library and
  templates are not. Nothing changes in the database.
- **Seed doc:** `dev-test-accounts.md` says admins read no program and no
  session.

### What was verified (pass 1)

Backend **1,804 unit** (admin "actors" in the specs replaced by a care-team
practitioner; the "allows an admin" tests became refusals), **e2e 917**: 8
suites changed, with two new tests. "Hides every session and program from an
admin, at the row level" runs SELECT / SELECT / UPDATE as the admin (0 rows,
with a practitioner control) and an INSERT (42501). "Withholds the details of
clinical and unknown areas…" covers the viewer. **27 backend mutations: 23
killed, 4 equivalent.** The 4 survivors put back the admin branch of a WRITE
policy alone (`assigned_programs_update`, `sessions_update_close_with_program`,
`program_workouts_insert`, `program_schedules_insert`). Each write checks
through the parent's SELECT policy, which already hides the rows, so the
branch can't be reached (the 2026-10-16 note on `sessions_update_close_with_
program` again). Undoing the whole of 0059 is killed. **Frontend 2,580 tests**
(+1); 3 mutations, all killed.

**The person's first run: 11 e2e failures**, all of them database-level admin
tests (an admin still seeing or inserting rows). The API-level 403 tests
passed. Reproduced in the sandbox by putting the pre-0059 policies back (the
same 11 failed). 0059 hadn't run on their databases: Docker Desktop had just
started, and the migrate commands ran before the containers were ready. Run
again, they applied it, and **all green 2026-10-24**.

### Pass 2 — failed step-ups and the two races (built 2026-10-24, green the same day)

**The item is complete.** My defaults, stated in the delivery and not
questioned: the count is per ACCOUNT and resets on a step-up that passes; the
5th failure in a row signs out only THE SESSION THAT FAILED (the other
devices stay signed in) and emails the owner; starting two-factor set-up (a
password-only step-up) counts too, so 6 routes; an admin's MFA reset counts
against the ADMIN. Not counted: a refusal that isn't a wrong proof (a
missing code from an MFA account, "already your email", "already on").

- **The refusal:** `StepUpService.confirm` / `confirmPassword` throw
  `StepUpRefusedException`, the same 400 with the same words, carrying a
  `reason` (`wrong_password` or the second factor's own). A step-up that
  passes sets `step_up_failures` to 0 in the change's transaction, so the
  reset rolls back if the change then fails anyway.
- **The record:** each caller adds `.catch(stepUp.failureRecorder(actor,
  sessionId, purpose))` to its transaction. It runs once that transaction
  has rolled back and released the row lock, and opens one of its own: `+ 1`
  computed by the database, ONE `STEP_UP_FAILED { purpose, reason,
  consecutiveFailures[, signedOut] }` entry (action 103, kind `sign_in`),
  awaited. At 5 it also resets the count to 0 and deletes the session's row
  (`endSession`). After the commit: the socket is closed, a notice is
  emailed (`sendStepUpSignOutNotice`), and the request is answered 401
  `STEP_UP_SIGNED_OUT_MESSAGE`. The controllers pass `req.sessionID`.
- **Schema:** `users.step_up_failures` (integer, NOT NULL, default 0, CHECK
  `>= 0`), migration **0060** `step_up_failures` (generated); stripped by
  `toPublic`.
- **The races:** `grantRole` and `addMember` no longer read before inserting.
  A 23505 on `user_roles_user_role_unique` / `user_clinics_user_clinic_unique`
  becomes the 409 (`rethrowDuplicateRole` / `rethrowDuplicateMembership`,
  narrow: any other error passes through).
- **Frontend:** the 401 handler passes the backend's words; the sign-in page
  shows "You were signed out after 5 wrong attempts to confirm a change. Log
  in again to continue."; the audit wording "Entered a wrong password or code
  to confirm a change".

### What was verified (pass 2)

Backend **1,820 unit** (+16), **e2e 928** (+11: `step-up-failures` 7,
`admin-races` 4). The two race tests answered **500 on the old code**:
`whileHolding` holds an uncommitted insert of the same row, the request
waits, then gets its 409. **46 backend mutations, all killed** (2 after
tests for "a duplicate on ANOTHER constraint passes through"). Frontend
**2,588 tests** (+8, 215 files); **12 mutations, all killed** (one after a
test pinning the mirrored message). Main file 421.48 kB (133.87 gzip, about
+0.5 kB).

**Found in Chromium** (every unit test was green):
- **The sign-in notice never showed.** A 401 navigates to sign-in twice: the
  handler, with the flag, and `RequireAuth`, with `{ from }` only, once the
  cached user is cleared. The guard's navigation landed last. The reason now
  lives in module memory (`rememberSignOutReason`), read once by the page.
- **"Failures in arow":** the details key was renamed `consecutiveFailures`.

Live: Jo at 375 px, dark, five wrong passwords (attempts 1–4 refused at the
field, the 5th on sign-in with the notice); the admin's audit log. Seed
reset after. **Green on the person's machine 2026-10-24.**

## §17 — Admin home: metrics and recent activity (Phase 6)

**Chosen 2026-10-24** as the next Phase 6 item, on my recommendation, over
the loading / skeleton pass and the small ideas. It was the last "Coming
soon" an admin saw first in a demo: the admin home's summary card (decisions
§3) had two placeholder slots, **Metrics** and **Activity**. Built in one
pass, backend and frontend. **Green on the person's machine 2026-10-24.**

### What reading the code found

- The admin lists (`GET /users`, `GET /clinics`) return every row, with no
  pagination and no count. Counting in the browser would download every
  account just to show a number.
- Admins already read users, roles, clinics, memberships, care-team links,
  invitations and the audit log under row security. Since §16 they read no
  program, session, message or medical file.
- `care_team_members` and `invitations` have FORCE ROW LEVEL SECURITY: a
  query without the admin's context sees no rows at all.
- **Deactivating a practitioner doesn't end their care-team links**, and
  deactivating a clinic keeps its memberships. A patient whose only
  practitioner was deactivated still has a "current" link.
  *(Changed 2026-10-25: a practitioner's deactivation now ends their
  links — §18.)*
- The code's word "open" for an invitation means "neither accepted nor
  revoked" and includes EXPIRED ones (`openInvitation()`); "pending" is
  `invitationStatus()`'s word for "can still be accepted".
- `GET /audit-logs` already filters by kind and pages: "recent activity"
  needs no backend change.

### The person's choices (2026-10-24)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| How to compute the numbers | **A count route** (`GET /admin/metrics`) | SQL `COUNT` sends a few numbers, not every account. Rejected: counting in the browser from the lists (every account downloaded, slower as the clinic grows) |
| Which numbers | **All four groups** | active accounts by role (deactivated apart), clinics (active / deactivated), invitations waiting, and **needs attention**: patients without a care team, practitioners without a clinic |
| Clinical activity (active programs, sessions this week) | **No — accounts only** | admins read no clinical row since §16; counting them would need a function that counts past row security. A count is still clinical information about the practice. Kept out |
| Activity | **The 5 newest changes** | in the audit log's own words, with "See all changes" to the log filtered to changes. Rejected: every kind (sign-ins would fill it), a bare link |
| Layout | **Sections of their own** | the summary card puts each slot in one equal column; five numbers and two lists don't fit a third of a 375 px screen. The card keeps Today; Metrics and Recent activity sit under the shortcuts, like the practitioner's "For review" (§3) |

### The rules, as built (my defaults, stated in the delivery)

- **Accounts by role:** ACTIVE accounts holding the role; a two-role account
  counts in both (the page says so). Invited accounts without a password are
  active, so they count — and in "invitations waiting" too.
- **Invitations waiting** = `invitationStatus()`'s pending: not accepted, not
  revoked, `expires_at > now()` (the same `>`), for an ACTIVE account (a
  deactivated account's invitation stays open — the accept page refuses it).
  The field is named `pendingInvitations`, not "open".
- **Patients without a care team:** no link passing `clinicalAccess()` (the
  rule every clinical permission uses — exported from
  `care-team.service.ts`, not copied) **to a practitioner whose account is
  active**. "Can someone treat this patient right now?"
- **Practitioners without a clinic:** no membership in an ACTIVE clinic.
  "Is this practitioner placed anywhere?"
- **Each group lists its first 5 accounts** by last name, first name, id —
  names an admin already reads on the users list — each a link to the user
  page, where the fix is (the care-team section for a patient, clinic
  memberships for a practitioner); "and N more" beyond.
- **No audit entry:** a read of counts and of names admins already list;
  the audit review records others' CLINICAL reads (§10, step 2).

### Built

- **Backend:** `src/admin-metrics/` (module, controller —
  `@Roles(UserRole.ADMIN)`, service). **One SQL statement** under the admin's
  row security (`withRlsContext`): two named subqueries (`WITH
  patients_without_care_team …, practitioners_without_clinic …`), each used
  to count and to list (`json_agg` of the first 5), and one-row subqueries
  side by side (`count(*) FILTER (WHERE …)`, `::int`). `clinicalAccess()`
  exported. No migration.
- **Frontend:** `src/app/home/admin/` (`api.ts`, `adminHomeText.ts` + test,
  `AdminMetricsSection.tsx`, `RecentActivitySection.tsx`); `AdminHomePage`
  (the card keeps Today; the two sections under the shortcuts);
  `ComingSoonSlot` deleted (no user left). Errors use `LoadError` with **Try
  again** (§15). Recent activity reuses the audit log's own fetch, query key
  (`['audit-log', …]`) and wording.

### What was verified

Backend **1,820 unit** (unchanged), **e2e 933** (+5, new
`test/admin-metrics.e2e-spec.ts`). **25 backend mutations: 24 killed, 1
equivalent** (the `ORDER BY` inside `json_agg` — Postgres keeps the
subquery's order in practice, SQL doesn't promise it; kept, said in the
code). Two first-round survivors were gaps, closed: the expiry instant
(built in ONE transaction where `now()` is one moment) and the first-name
order (the 5-name cut now falls between two people with the same last
name). Frontend **2,611 tests** (+23, 216 files); **29 mutations, all
killed**. Main file +0.06 kB (423.49 kB); the admin home's own chunk 1.14 →
5.86 kB. Live in Chromium on the production build (375 px dark, 1280 px
light): the numbers checked by hand, the links, "See all changes", a faked
500 recovering with Try again. **Green on the person's machine 2026-10-24.**

### Follow-up: a seeded example and a filter (chosen and built 2026-10-24, green the same day)

The person asked for two follow-ups ("is that a good idea?" — yes: without
the seed a reviewer only ever saw "Nothing needs attention", and without the
filter "and N more" led nowhere), and chose:
- **The demo seed** shows the feature: a patient whose practitioner's link
  ENDED (the care team's history explains it) and a practitioner in no
  clinic — today the seed shows "Nothing needs attention".
- **A "needs attention" filter on the users list**, so "and N more" leads
  somewhere: done on the BACKEND (`GET /users?attention=…`) with the same SQL
  as the metrics, so the count and the list can't disagree; reached by a
  "Show" select on the users list (kept in the address) and by links from
  the home.

**Built:**
- **One rule, two readers:** `src/admin-metrics/attention-rules.ts`
  (`ATTENTION_KINDS`, `isAttentionKind`, `needsAttention(kind, row)`) — each
  group's condition as a SQL fragment about ONE users row, given as
  expressions (`u.id` in the metrics statement, `"users"."id"` in the list),
  so both queries use the same text. `metricsQuery()` now uses it.
- **`GET /users?attention=patients-without-care-team |
  practitioners-without-clinic`** (`UsersService.findNeedingAttention`):
  admins only (403 "Only admins can filter users by what needs attention" —
  a practitioner's `GET /users` means "my patients"), an unknown value 400
  naming the two; every account of the group, by last name, first name, id —
  the home's order, so the list continues where the home's names stop; under
  the admin's row security (the rule reads `care_team_members`). The core
  builder (`select().from(users)`), not `db.query.users.findMany`: the
  relational builder renders every column of its `where` against its own
  table (`care_team_members.practitioner_id` came out as
  `users.practitioner_id`, a 500 the e2e test caught).
- **Seed:** `dana@stride.test` (patient, created by Sam, who then LEAVES her
  care team — `CareTeamService.endMembership`, so the history and the audit
  log say it) and `taylor@stride.test` (practitioner, created at Harbour, then
  REMOVED from it by the admin — `ClinicsService.removeMember`); a new seed
  step 9 after the content; `leftCareTeam` / `removedFromClinics` in the
  dataset, three new dataset rules; `docs/dev-test-accounts.md` gains "The
  admin home".
- **Frontend:** `src/users/attention.ts` (the groups' words, `readAttention`,
  `attentionHref`, `refreshAttention`); a **Show** select on the users list
  kept in the address (`?attention=`, each choice a history entry; an unknown
  value reads as all users; the "deactivated" checkbox only for all users;
  each group's own empty sentence); the users list's error now `LoadError`
  with Try again; the home's group titles and "and N more" are links to the
  filter. **`refreshAttention`** — the home's numbers and every users list
  marked stale — after a care-team link is added or ended and after a clinic
  membership is added or removed (without it a fixed patient stayed listed
  for the 30 s the app trusts its cache).

**Verified:** backend **1,825 unit** (+5), **e2e 938** (+5); 19 mutations, all
killed (each rule, the list without row security, its order, both controller
checks, the seed's rules). Frontend **2,611 → 2,624 tests** (217 files); 21
mutations, all killed (one test caught a mock handing out ONE `Response`
twice — a body reads once). Main file +0.17 kB (423.66 kB); the users list's
chunk 2.54 kB. Live in Chromium (375 px dark, production build): the home
flags Dana and Taylor, the title opens the filtered list, adding Alex to
Dana's care team and going Back shows "Every patient has someone on their
care team.", the home then lists only Taylor. **Green on the person's machine
2026-10-24.**

## §18 — Deactivation and care-team links (Phase 6)

**Chosen 2026-10-24**, with the small audit / attention bundle after it, over
the loading pass. Found while building the admin metrics (§17): deactivating
a practitioner left their care-team links "current", so a patient whose only
practitioner had left still looked looked-after everywhere except the
metrics (which skip deactivated practitioners, `p.is_active`). **Designed with
the person 2026-10-25; built and green the same day.**

### The design discussion (2026-10-25)

The first proposal ended EVERY deactivated account's links, patients' too,
as a clinic removal does. The person stopped it: "if a practitioner is
deactivated they shouldn't have access to anything, but a patient should be
able to access their own file — and there needs to be a way to export
medical records after a patient has been deactivated." The design that came
out of it separates three things a deactivation could touch:

| Thing | What it is | Changed by a deactivation? |
| --- | --- | --- |
| The **account** | who can sign in | yes: signed out, sign-in refused |
| The **care team** | who is treating the patient now | a PRACTITIONER's links end; a PATIENT's stay |
| The **record** | the clinical history | never (kept for years; read through the care team, or exported) |

- **A practitioner who can't sign in treats nobody**, so their links end —
  the data then says what is true: the practitioner is a past member, the
  conversation read-only, the patient on the admin home's "Patients without a
  care team" until an admin adds someone.
- **Deactivating a patient isn't a discharge.** It means "this person can no
  longer sign in" (moved away, account closed, misuse). Ending treatment is a
  clinical act that already exists: the practitioner writes a discharge
  summary and uses Leave care team. If deactivation ended the links, NOBODY
  could read the file any more (adding someone to an inactive patient's team
  is refused) — not even to answer a records request. So the care team keeps
  its read access, and the practitioner's page says the account is
  deactivated.
- **A former patient's own access is a separate feature: a records export**
  (the person agreed, as its own roadmap item after the audit / attention
  bundle). A deactivated patient can't sign in, so their right of access
  (HIPAA 45 CFR 164.524; PIPEDA's access principle) is met with a COPY: a
  "Download my records" for an active patient, and for a former one an admin
  pressing "Email the patient a download link" (a one-time, expiring link, the
  reset link's machinery; the admin never sees the contents — §16's rule).
  Considered and set aside: a "read-only account" a deactivated patient could
  still sign in to — every guard in the app would need a third state.

### The person's choices (2026-10-25)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| Whose links a deactivation ends | **A practitioner's only** | the three-things table above. Rejected: both roles (no one could read a former patient's file or answer a records request) |
| Accounts deactivated before this change (open links) | **No migration** | every database is dev / test data; `seed:dev -- --reset` rebuilds it through the new code; the metrics keep `p.is_active` as a safety net. Rejected: a backfill from the audit log (accounts with no `USER_DEACTIVATED` entry have no moment or actor; a migration writing audit rows is odd) |
| What the dialog says | **One fixed sentence per role** | no new route. Rejected: an exact count through a preview route |
| The records export | **Its own roadmap item, after the bundle** | needs its own choices (what's in it, the format, a PDF package) |

### The rules, as built (my defaults, stated in the delivery)

- **Only CURRENT links end** (`activePeriod()`: started, not ended): a link
  that already ended keeps its real end; a cover with a planned end ends now.
  A link that hasn't started yet is left alone (the API never makes one).
- **In the deactivation's transaction**, with the sessions: the account's
  `USER_DEACTIVATED` entry lists `endedCareTeamLinkIds` (`[]` for an account
  that had none — every deactivation says what it ended), and each link gets
  one `CARE_TEAM_ENDED` about its patient, reason "The practitioner's account
  was deactivated" — §10's exception (one act, several records), as a clinic
  removal does. `CareTeamService.recordEndedLinks` writes those entries for
  BOTH, so an ended link is described one way.
- **Reactivating restores nothing** — an admin adds the practitioner back
  where needed; the reactivate dialog says so. An account deactivated BEFORE
  this change (old data) keeps its open links through a reactivation.
- **Who may deactivate a practitioner's account: an admin, or the
  practitioner acting as one** (new, 403 "Only an admin, or the practitioner
  themselves, can deactivate a practitioner's account"). The links' UPDATE
  policy lets exactly those two end links; the route also lets a managing
  practitioner deactivate a patient and an account act as a patient — for a
  practitioner + patient account either would match no link and leave them
  open SILENTLY (row security filters, it doesn't raise). Refused instead.
- **The screens:** the deactivate dialog says "Their current care-team links
  end too. Reactivating the account doesn't restore them." for a
  practitioner, "Their care team keeps access to their records." for a
  patient (both for both roles); the reactivate dialog, for a practitioner,
  that the links don't come back; the practitioner's patient page shows
  "Account deactivated. … can't sign in, so they won't see new programs or
  messages. You're still on their care team and can read their record."
  Both buttons now refresh the admin home's numbers (`refreshAttention` —
  they never did); a deactivation also marks every cached care team stale.

### Built

- **Backend:** `CareTeamService.endLinksOfDeactivatedPractitioner(tx,
  practitionerId, performedBy)` and `recordEndedLinks(tx, links, performedBy,
  reason, context)`; `ENDED_NO_SHARED_CLINIC_REASON`,
  `ENDED_PRACTITIONER_DEACTIVATED_REASON`; `ClinicsService.removeMember`
  uses the shared helper (same entries); `UsersService.setActive` ends the
  links on deactivation; `softDelete` refuses as above
  (`DEACTIVATE_PRACTITIONER_MESSAGE`). New `test/practitioner-deactivation.
  e2e-spec.ts` (8); the admin metrics suite deactivates Dex as the OWNER now
  (old data — else nothing would prove `p.is_active`). No migration.
- **Frontend:** `DeactivateUserButton` / `ReactivateUserButton` take `roles`
  (passed by `UserEditPage`); the notice on `PatientPage`.

### What was verified

Backend **1,833 unit** (+8), **e2e 946** (+8; in the sandbox 940 — the 5
known pagination ECONNRESETs and an alerts test that fails on a Paris-time
database on the day the clocks change, identically on the base code, and
passes on UTC — `deferred-improvements.md`). **21 mutations, all killed**;
the 11 that matter most also killed by the e2e suite alone (the conditions,
the transaction, the refusal, reactivation — the last only after a test of
the old-data case). Frontend **2,634 tests** (+10, 217 files); **13
mutations, all killed** (two survivors first: nothing proved the user page
passes the roles — tested). First download unchanged (770.33 kB, 237.08 kB
gzipped). Live in Chromium against the real backend: deactivating Alex
ended his 6 links (each entry about its patient), the home listed 6 patients
without a care team, reactivating restored none; Sam's page for Frank at
375 px dark. **Green on the person's machine 2026-10-25.**

## §19 — The small audit / attention bundle (Phase 6)

**Chosen 2026-10-24** with the deactivation item (§18) before it: two small
ideas from `deferred-improvements.md`, one at a time.

### Part 1 — plain words for stored detail values (built and green 2026-10-25)

**What reading the code found:** an admin saw stored code words in three
actions' details — `STEP_UP_FAILED` (`purpose`: `email_change`,
`password_change`, `mfa_setup`, `mfa_disable`, `recovery_codes`, `mfa_reset`;
`reason`: `wrong_password`, `wrong_code`, `code_already_used`,
`wrong_recovery_code`), `MFA_LOGIN_FAILURE` (the three code reasons) and
`EMAIL_CHANGE_CANCELLED` (`cancelled_in_app`, `cancelled_by_email_link` — not
in the deferred note; found in the code). Role names are already words;
clinical areas' details are withheld from admins (§16).

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| Where the words live | **A frontend table** | the stored value never changes (evidence; the code matches on it); the frontend already owns the 95 action phrases. Rejected: labels in the API (English text in the backend's answers, a change on both sides) |
| Scope | **The three actions, keyed by action AND key** | `reason` means a different thing in each action. Rejected: a generic "snake_case → words" rule ("Mfa setup", and it could rewrite real text) |
| Show the stored value too | **Words only** | "Show the raw entry" already shows it |

**Built:** `src/audit-log/detailWording.ts` — hand-written mirrors of the
backend's value types (`StepUpPurpose`, `StepUpFailureReason`,
`SecondFactorRefusal`, the two cancel reasons), each word table checked with
`satisfies Record<…, string>`; labels where they read better (`purpose` →
"For", `consecutiveFailures` → "Failures in a row", `signedOut` → "Signed
out: Yes — this session was ended"); lookups with `Object.hasOwn` (the data
names the action, key and value); a value the table doesn't know shown as
stored. `describeDetails(details, dates, action)` uses it, and shows those
actions' details in the TABLE's order (found live: Postgres reorders `jsonb`
keys, shorter first — "Reason" came before "For"). `AuditEntryDetails`
passes `entry.action`.

**Verified:** frontend **2,649 tests** (+15, 218 files); 15 mutations — 14
killed by tests, 1 by `tsc` only (the guard for a missing action:
`Object.hasOwn(table, undefined)` looks up `"undefined"` and finds nothing —
equivalent at runtime). First download unchanged. Live in Chromium (375 px
dark): real entries made through the API. **Green on the person's machine
2026-10-25.**

### Part 2 — invitations to send again (built 2026-10-25, green 2026-10-26)

**What reading the code found:** three states leave an invited person with
no way in on their own — an EXPIRED invitation, a pending one whose EMAIL
COULDN'T BE SENT (`email_sent_at` empty, the user page's amber warning), and a
REVOKED one with nothing newer. An account has at most one OPEN invitation
(not accepted, not revoked — a partial unique index; a resend revokes the old
one).

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| Who is listed | **Expired + email failed** (active accounts) | stuck by accident, nobody decided it. Rejected: expired only (an unsent link is as stuck), all three (a revoke is someone's decision — perhaps the account is about to go) |
| The group's name | **"Invitations to send again"** | says the fix, matching the user page's buttons. Rejected: "Invited but can't join" |

**Built:** a third kind in `attention-rules.ts`
(`invitations-to-send-again`: active account, open invitation, `expires_at <=
now()` — `invitationStatus()`'s "expired", the complement of the home's
"waiting" count — or `email_sent_at IS NULL`), counted and listed by
`metricsQuery()` (`invitationsToSendAgain`) and `GET /users?attention=`. An
unsent PENDING invitation is in both "waiting" and "to send again" (valid,
but the person never got the link). Frontend: the group's words
(`attention.ts`), the home's third group and "nothing" sentence
(`nothingNeedsAttention` over every group), the Show option; `refreshAttention`
after an invitation is sent or revoked (`InvitationStatus`), sent again after
a create (`InvitationSentNotice`), and after a create (`CreateUserPage`). No
seed change: Lena (expired) and Stu (email failed) were there;
`dev-test-accounts.md` names them.

**Verified:** backend **1,833 unit** (dataset rule extended), **e2e 948** (+2;
the metrics suite's data makes each condition change the answer — Hal
revoked, Zed deactivated, Pia accepted, each with an unsent email; the expiry
instant in one transaction). Frontend **2,653 tests** (+4). **17 mutations
(8 + 9), all killed.** Live in Chromium (375 px dark): the group, the
filtered list, "Send again" taking Stu off. **Green on the person's machine
2026-10-26. The bundle is complete.**

## §20 — Medical records export (Phase 6)

**Agreed 2026-10-25** (§18: a deactivated patient can't sign in, so their
right of access is met with a copy); **designed with the person 2026-10-26**;
pass 1 built and green the same day; pass 2 (the emailed link) green
2026-10-27.

### The distinction underneath

The export is the patient's **right of access** (HIPAA 45 CFR 164.524) — not
a new way to READ the record, but a **copy handed to the patient**. Three
rules follow:

1. **Only the patient ever receives it.** Practitioners read the file in the
   app; admins never see its content (§16).
2. **Made when it's downloaded, never stored.** No PDF waits in storage: a
   stored copy would be one more place holding clinical content, and out of
   date the next day.
3. **One generator, two ways in.** An active patient downloads their own; a
   former (or any) patient gets an emailed link. Both read AS THE PATIENT,
   under the patient's own row-security policies — `medical_files_select` and
   the program / session policies don't look at `is_active`, so a redeemed
   link can act as the patient the way accepting an invitation does
   (`applyUserContext`). No new read policy.

### The person's choices (2026-10-26)

| Question | Chosen | Why (the trade-off) |
| --- | --- | --- |
| What it contains | **The medical file, the programs and the sessions** | the clinical record: what was observed (notes, amendments with their originals), what was prescribed, what the patient reported (pain, mobility, feedback). Rejected: the file alone (half the record); everything incl. messages (correspondence, the biggest file — can be added later as a section; the PDF says they're not included) |
| Format, and so the package | **One PDF, made with pdfkit** (+ an open font) | pure JavaScript, maintained, streams; laying pages out (text flow, page breaks, footers) is the instructive part. Rejected: Puppeteer (a ~150 MB browser in the image), pdf-lib (no text wrapping, no release since 2022), a self-contained HTML file (no package, but not an official-looking document), a machine-readable JSON alongside (deferred) |
| The emailed link | **One download, 72 hours** | the first download uses it up; a failed download → the admin sends a new one, which replaces the old (like a reset). Rejected: 7 days (a longer window if the inbox is compromised); repeatable until expiry (a forwarded email works again) |
| A check besides the link | **The date of birth** | stored for every patient; a second check if the inbox is no longer theirs; 5 wrong tries end the link (like the step-ups). Rejected: the link alone (whoever holds the email gets the whole record) |
| Which patients the admin can send a link to | **Every patient** (the person's change to my "deactivated only") | people ask the clinic for their records without checking they could download them; an invited patient who never set a password can't sign in either. The email then adds, for an ACTIVE patient, that they can also download from My records; `RECORDS_EXPORT_LINK_SENT` records `patientActive` |

### My defaults (stated in the delivery)

- **Contents and order:** the medical file newest first (as My records), each
  note's latest version with the versions it replaced under it ("Earlier
  version, replaced on …"); programs newest first, each with its prescription
  as it stands (a retired exercise left out — the sessions that had it still
  list it, from their own copy) and its sessions in date order (outcome,
  length, pain before / after, mobility, the patient's note and feedback, each
  exercise done or not with its difficulty and feedback).
- **Words:** the patient's words with SOAP's name after them ("What you
  reported (Subjective)") — the copy may go to another clinician; the
  progress page's outcome words ("Stopped (pain)", "Not finished (the program
  was closed)"); "Not included: your messages with your care team."
- **Dates:** the browser sends its time zone (`?timeZone=`, an IANA name —
  offsets refused: an offset isn't a place); without it, UTC, said on the
  first page. Days without a time never pass through a zone. en-US with the
  month written out ("October 9, 2026").
- **Audit:** `RECORDS_EXPORTED` (a view, area "Records exports", CLINICAL —
  admins see the entry, not its details): `via`, the zone, and the ids of
  every note, program and session that went in — never content.
- **5 downloads a minute** (the password routes' limit): each request reads
  the whole record and draws a PDF.
- **The file:** `stride-health-record-YYYY-MM-DD.pdf` (the patient's day),
  `Content-Disposition: attachment`, `Cache-Control: no-store`. US Letter,
  one-inch margins, "Page N of M" and the patient's name on every page.

### Pass 1 — the generator and the patient's own download (built and green 2026-10-26)

**Built (backend only):** `src/records-export/` —
- `record-loader.ts`: the reads, in a transaction acting as the patient —
  seven reads whatever the record's size (plus one for the moment, `now()`),
  grouped in memory; the medical
  file through `loadMedicalFileEntries` (the medical files service's query,
  now an exported function — the PDF and My records can't disagree on an
  entry);
- `record-content.ts`: PURE — the record → a document model (headings,
  "Label: value" fields, free text, paragraphs, lists); every word and date
  decided here, so the tests compare strings;
- `record-pdf.ts`: the model → a PDF with pdfkit (Noto Sans, regular and bold,
  bundled under the SIL Open Font License — pdfkit's own fonts only know
  Western European letters); a heading keeps room for what follows it; the
  footers written last (`bufferPages`);
- `records-export.service.ts`: one transaction at **REPEATABLE READ** (every
  statement sees one moment — `withRlsContext` gained an optional transaction
  config), the PDF made, then `RECORDS_EXPORTED`, then the bytes leave — a
  failed drawing or audit insert sends nothing;
- `records-export.controller.ts`: `GET /records-export?timeZone=` (patients,
  acting as one), a `StreamableFile`; `IsTimeZone` (`src/common/validators/`)
  asks Intl itself whether it can format in the zone.

**Verified:** backend **1,899 unit** (+66), **e2e 959** (+11: the new suite's
10 — the whole record and nobody else's, the exact audit entry, one moment
proven with a held lock, no copy without its entry, orderings set up so the
written order differs from the shown one, a retired exercise, refusals; and
the 5-a-minute limit). 92 mutations, 90 killed, 2 equivalent (the loader's
`WHERE patient_id` on the file and programs — row security already limits the
rows). Live: Pat's copy, 6 pages, looked at page by page. **Green on the
person's machine 2026-10-26** (once the font files were in place — a
download that hadn't landed in `fonts/`).

### Emoji: a fallback font (the person's question, built 2026-10-26)

**The question:** "should we use a different font than Noto Sans?" — No: no
font holds every character (at most 65,535 glyphs; emoji live in fonts of
their own), so every text font has the gap. A browser borrows a missing
character from another font by itself (FONT FALLBACK); pdfkit draws each text
in ONE font, and a missing character prints as a box. Noto is a family made
for exactly this — a font per script, all alike. **Chosen:** keep Noto Sans,
add **Noto Emoji** (black and white, OFL) as a fallback, with **fontkit** as a
direct dependency (the library pdfkit itself uses — pinned to pdfkit's
version, one shared copy) to ask which font has which glyph.

**Built:** `font-runs.ts` — `splitIntoRuns(text, candidates)`: the text in
grapheme clusters (`Intl.Segmenter`: 👨‍👩‍👧 is five code points, one
character), each in the first font with a glyph for EVERY code point, neighbours
joined; a character no font has stays with the first (a box — nothing
dropped). Every text in the PDF goes through one writer: line by line, the
runs one after another (`continued`). Found on the way: a run holding a line
break lost pdfkit's place; `align: 'center'` centred each run alone (the
footer is now centred by hand, measured run by run); `text('')` neither moves
nor ends a label's line (an empty line is written as one space — the bug was
in pass 1 too); pdfkit's `list()` takes plain strings (the dots are drawn by
hand); the invisible characters needed no special case (Noto Emoji carries
zero-width glyphs for the joiner, the variation selectors and the flag tags,
so "©️" goes to the emoji font as U+FE0F asks).

**Limits, stated in the code:** emoji print black and white; a skin tone
prints as the plain emoji (and copies out without it); Chinese, Japanese,
Arabic, Hebrew… still print as boxes (`deferred-improvements.md`).

**Verified:** backend **1,922 unit** (+23), e2e 959 (the patient's feedback
in the suite now has an emoji, read back from the downloaded PDF). 34
mutations on the final code, 33 killed, 1 equivalent (a re-added tag skip: a
tag only follows 🏴, which only the emoji font has). **Green on the person's
machine 2026-10-26.**

### Pass 2 — the emailed link (built 2026-10-26, green 2026-10-27)

**Three open points, decided by me with my recommendation** (the person had
said "Let's go"; stated in the delivery as easy to change, none changed):
a link replaced by a newer one is **kept, with `replaced_at`** (not deleted —
the history stays readable, like invitations); a failed email is **recorded
on the link** (`email_sent_at` left NULL, `emailSent: false` for the admin);
a wrong date of birth has **its own audit action**,
`RECORDS_EXPORT_LINK_REFUSED` (kind sign-in, like a failed sign-in). And two
of my own: the entry records **where** the link went (`sentTo` — the
question "which address did this record go to?" must survive an email
change), and the "download it from My records" line goes only to an account
that **can sign in** (active AND with a password — an invited patient can't
either); `patientActive` is still recorded as decided.

**Built:**
- `records_export_links` (migrations 0061 + 0062): one row per link sent —
  patient, token HASH, sender, `created_at`, `expires_at` (`now() + 72
  hours` in SQL), `email_sent_at`, `used_at`, `replaced_at`, `dob_failures`
  (0–5). The status (open / used / replaced / locked / expired) is derived,
  never stored (`records-export-link-status.ts`, pure, with the DATABASE's
  `now()`). At most one OPEN link per patient (a partial unique index; two
  sends at once → 409).
- Row security: an admin reads and writes; the token holder sees and changes
  only its link (the hash in `app.records_export_token_hash`,
  `withRecordsExportTokenContext`); nobody else. A guard trigger: a new link
  starts open; what a link is never changes; the email is recorded once;
  closed stays closed; a wrong date adds exactly one, through the link; a
  link is spent only through it and before its expiry; only an admin
  replaces one; every moment is the database's.
- `GET`/`POST /users/:id/records-export-links` (admins): send = close the
  open link, insert, ONE `RECORDS_EXPORT_LINK_SENT { sentTo, patientActive,
  expiresAt, replacedLinkId? }`, commit, THEN the email (subject "Your
  health record from Stride", link to `/records-download?token=`).
- `POST /records-export/download { token, dateOfBirth, timeZone? }`
  (public, 5 a minute, `no-store`): one REPEATABLE READ transaction — the
  link checked, the date compared, then acting as the patient, the link
  spent, pass 1's generator (`exportInTransaction`, shared — both ways in
  make the same document), `RECORDS_EXPORTED { via: 'emailed_link', linkId
  }`. A wrong date throws out of it and is counted AFTER the rollback in a
  transaction of its own (the step-up pattern): 400 with `attemptsLeft`, or
  410 `locked` at the fifth. 410s carry `reason` (used / replaced / locked /
  expired); an unknown token is a 404.
- **The lesson of the pass — serialization failures.** At REPEATABLE READ,
  Postgres refuses (40001) to change a row another transaction changed after
  this one's snapshot; the cure is to run the transaction again
  (`retriedOnce`). Two tabs with the same link: the second is refused, runs
  again, sees the link used — a clean 410 (under read committed it would have
  met the guard: a 500).

**Verified:** backend **1,930 unit** (+8), **e2e 992** (+33: the new suite's
32 — sending, replacing, the failed email, the 409 race, who may send; the
download once, five wrong dates, expiry, refusals; three races proven with a
held row lock (the retry, the second tab, a link closing while a wrong date
is counted); every trigger rule and policy run as the app role — and the
download's 5-a-minute limit). 72 mutations (45 code, 27 database), 68
killed; the misses: two dead pieces removed (a trigger condition, the PDF
response's explicit length — Express sets it), one tie-breaker removed (no
two links share a `created_at`), and two equivalent (retrying on ANY error
answers the same — a rolled-back attempt leaves nothing; the update policy's
`USING` — Postgres applies the read policy to an update's rows too).
**Green on the person's machine 2026-10-27.**

### Pass 3 — the screens (built and green 2026-10-27)

The plan agreed with pass 2 ("Next" below it), built as planned, plus one
backend change found on the way. **Two choices of mine, stated in the
delivery as easy to change (none changed):** a signed-in visitor may use the
link's page (unlike the invitation and reset pages, it changes no account and
uses no session); and the "can't be used" page has ONE heading for every
reason, like the app's other link pages — a heading per reason ("This link
has already been used") only repeated the server's first sentence, seen in
Chromium.

**Found on the way — the browser hid two headers.** The app (`:5173`, or its
own domain) calls the API on another origin. For such a response JavaScript
may read only the CORS-safelisted headers (Cache-Control, Content-Language,
Content-Length, Content-Type, Expires, Last-Modified, Pragma); any other is
received but hidden — `headers.get(…)` answers null — unless the server names
it in `Access-Control-Expose-Headers`. The backend named none, so the page
couldn't read the file name (`Content-Disposition`), and the frontend's
`retryAfterSeconds` (a 429's `Retry-After`) had ALWAYS been undefined in a
real browser. Measured with a request carrying an `Origin`. Fixed:
`src/config/cors-options.ts` (`corsOptions()`, `EXPOSED_HEADERS`), used by
`main.ts`; its spec runs the options in a real Nest app (the e2e suites build
their apps without `main.ts`, so nothing else would notice a header dropped).

**Built (frontend):**
- **The funnel learns files** (`api/client.ts`): `send()` — the request, the
  cookie, the body, an error turned into `ApiError`, the 401 handler — shared
  by `apiRequest` (JSON) and the new `apiDownload` (`blob()` and the name from
  `Content-Disposition`, `fileNameFromDisposition`). A PDF read as text would
  be corrupted; a refused download answers JSON like any refusal.
- **Saving** (`common/saveFile.ts`): an object URL to the bytes, a link with
  `download` clicked while in the page, then removed; the URL released after
  40 s (some browsers read the blob after the click returns).
- **My records → "Download a copy"** (`records-export/DownloadMyRecords.tsx`):
  a mutation (each press is a new, audited copy; nothing cached), the device's
  zone (`Intl…resolvedOptions().timeZone`, escaped by `URLSearchParams`), a
  busy state, "Downloaded as <name>. Look in your downloads.", a 429 in plain
  words with the wait. Shown whatever the notes' list does.
- **The admin's "Health record copy"** (`RecordsExportLinksSection.tsx`) on
  every PATIENT's user page, active or not: a dialog saying where it goes (the
  address on the account), how it works (once, 72 hours, the date of birth, 5
  wrong dates lock it) and which open link stops working; green / amber after
  sending (`emailSent`); every link with a label and a sentence
  (`describeLink`: not used yet, email not sent (amber), downloaded, replaced,
  locked, expired; wrong dates counted); the list fetched again after a send
  AND after a refusal (the 409 race is when it's out of date).
- **The link's page** `/records-download?token=` (`RecordsDownloadPage.tsx`,
  public, lazy): the token read once and taken out of the address; NOTHING
  sent on load (mail scanners); the date of birth (`type="date"`,
  `autocomplete="bday"`) and a button; a wrong date with "4 tries left" (a
  warning before the last); the 410 ("This link can't be used", the server's
  next step, and for `used` / `locked` "if that wasn't you, tell your clinic"
  — someone else may have the link); the 404; a 429 / 5xx / no answer keeps
  the form. After the download: the link is spent, said so.
- **The audit log:** words for `RECORDS_EXPORTED` (missing since pass 1),
  `RECORDS_EXPORT_LINK_SENT` and `_REFUSED`; the link entries' details ("Sent
  to", "Works until", "Account: Deactivated (the patient can't sign in)",
  "Replaced the open link #4"; "Wrong dates of birth so far", "Link
  locked"). `RECORDS_EXPORTED`'s details stay withheld (clinical).

**Found and fixed on the way:** `auth/passwordResetRules.test.ts` failed
anywhere west of UTC−4 — on the base code too: `hour: 'numeric'` writes "8:05"
in en-GB before 10 a.m., the test wanted two digits. The person's Paris clock
never showed it; the reviewers' would have.

**Verified:** frontend **2,734 tests** (223 files, +81), green under
Europe/Paris and America/Montreal; backend **1,932 unit** (+2); e2e unchanged (neither file is loaded by the suites). 85
frontend mutations + 4 backend, all killed but one, which found dead code (a
`!== 'locked'` that could never matter); three first-round survivors closed
with tests (the cache key without the patient, a list of exactly one link,
the address the user page passes). Live in Chromium: Pat's download at 375 px
saved under the server's name (the header readable), the 429 with "60
seconds"; the admin sending twice to Frank (the first then "Replaced"); the
emailed link in a signed-out phone browser — no request on load, "4 tries
left", the PDF, then "used". Main file +0.27 kB. **Green on the person's
machine 2026-10-27. The records export is complete.**

### Next

Chosen 2026-10-27: a deactivated patient's care team (§21).

---

## §21 — A deactivated patient's care team (Phase 6)

**Found** in the records export's live check (2026-10-27): on Frank's user
page (`former.patient@`, deactivated) the Care team section said "Couldn't
load the care team". Reading the code showed it was wider than the admin:
`CareTeamService.assertActivePatient` answered **404 "Patient N not found"**
for ANY deactivated patient, on three routes — the team's list (the admin's
user page AND the practitioner's patient page: Sam, on Frank's team, couldn't
see it either), the candidates and adding. Ending a link had no such check
and worked. It contradicted §18 ("a deactivated patient keeps their care
team; the team must still read the file"); §18's tests had checked the link
rows and the file, never this route.

### The distinction underneath

The same as §18's — account ≠ care team ≠ record. "Active" is a fact about
the ACCOUNT (can this person sign in?); the helper used it to answer another
question, "is this a patient whose care team exists?". Two questions, two
answers: `findPatientOrThrow` (404 unless the id holds the patient role,
active or not) returns `{ isActive }`, and each route decides what an
inactive account means for it.

### The person's choices (2026-10-27)

Both as recommended:
- **Adding someone → refused, honestly:** a **409** "This patient's account is
  deactivated. Reactivate it to add someone to their care team." (and the
  candidates the same). Giving a NEW person access to a former patient's
  record should be deliberate: reactivate first (audited), then add.
  Considered: admins only, or everyone — simpler, but it opens a closed record
  to new people with no extra step.
- **Ending a link → kept, and tested:** the practitioner leaving, an admin
  ending any — how access to the file is CLOSED, which matters most after
  someone leaves.
- (Mine, unchanged:) **reading** — allowed to whoever could read it before
  (the admin, a clinic-sharing practitioner, the patient).

### Built

- **Backend** (`care-team.service.ts`): `findPatientOrThrow` /
  `findPatientAccount` replace `assertActivePatient`; the list reads any
  patient; `addMember` and `listCandidates` refuse a deactivated one with
  `DEACTIVATED_PATIENT_ADD_MESSAGE` — AFTER the 403 (someone who may not act
  on the patient learns nothing new about the account). `hasActiveRole` now
  serves practitioners only. No migration.
- **Frontend:** `CareTeamSection` takes a REQUIRED `patientActive` (the
  compiler then named every page — and the test harness — that renders it);
  when false, no "Add" (no candidates request either) and a sentence for
  whoever would have had the button: "Nobody new can join Frank's care team
  while their account is deactivated." + "Reactivate the account to add
  someone." (admin) / "An admin can reactivate it." (practitioner). End /
  Leave stay. `PatientPage` and `UserEditPage` pass `isActive`.

**Verified:** backend **1,938 unit** (+6), e2e **996** (+4, a new block in
`practitioner-deactivation`: read by the admin, the team and a clinic
colleague; 409 for joining, adding and the candidates with nothing written
and no entry; Rory leaving and the admin ending a link with their
`CARE_TEAM_ENDED` entries; a non-patient still 404 — three of the four fail on
the old code). Frontend **2,738 tests** (+4). 5 + 6 mutations, all killed.
Live in Chromium (Sam at 375 px, the admin at 1280 px ending Sam's link).
**Green on the person's machine 2026-10-27.**

### Next

Choose the next Phase 6 item with the person — the loading / skeleton pass
(the 40 "Couldn't load" messages), plain words for every 429, or other ideas
in `deferred-improvements.md`.

## §22 — What a deactivated patient's care team may still write (Phase 6)

§18 decided that a deactivated PATIENT keeps their care team, because the
team must still read the file, and §21 made reading and ending links work.
That left WRITING: the team could still assign a program, change one, send a
message, and their To-do kept raising attendance alerts — all aimed at someone
who can't sign in. Nothing refused it; the page only said "Account
deactivated". Meanwhile the practitioner's own patient list left the patient
out, so the team could reach them only by address.

### The distinction underneath

The same as §18 and §21: account ≠ care team ≠ record. Writing to the RECORD
(a medical file entry, an amendment, closing a program, reviewing a session)
documents care already given — a late discharge summary is exactly what
should happen after someone leaves. Writing TO THE PATIENT (a new
prescription, a change to one, a message) is care aimed at someone who can
no longer receive it. The line falls between those two, not between "read"
and "write".

### The person's choices (2026-10-27)

All four as recommended:
- **Programs → no new one, no change; closing allowed.** A **409** "This
  patient's account is deactivated. Reactivate it to assign or change a
  program (completing or cancelling one is still possible)" — for a new
  program and "Assign again", and for every change to an open one. Cancel,
  complete, delete (a program with no session — the same as cancelling) and
  the closing preview stay: an open program shouldn't stay open forever
  because the account went away. Considered: allowing changes (nobody would
  see them), or hiding the buttons only (a second tab or the API would still
  write).
- **Messages → read-only, in the service AND the database.** The history
  stays readable; `canSend` is false; sending and starting a conversation are
  refused. The database decides (a new SQL function in the insert policies,
  migration **0063**), like an ended care-team link since Phase 5.
- **For review → no attendance alerts; session alerts stay.** Every planned
  day of a patient who can't sign in reads as missed: an alert nobody can act
  on. A session finished before the deactivation can still need a look, and
  leaves the list like any other (reviewed, or 14 days old).
- **My patients → "Show deactivated patients"** (off by default, rows marked
  "Account deactivated") — the backend's `GET /users?includeInactive=true`
  for a practitioner, as the admin's list already had.
- **Kept allowed, and tested:** medical file entries and amendments, closing
  a program, reviews.
- **Two passes:** the backend rules first, then the screens.

### Pass 1 — the backend rules (built and green 2026-10-27)

- **Programs** (`assigned-programs.service.ts`): `assertProgramChangeable`
  = `assertProgramOpen` (409 "closed", first — reactivating wouldn't make a
  closed program changeable) then `assertPatientAccountActive` (409,
  `DEACTIVATED_PATIENT_PROGRAM_MESSAGE` in `program-state.ts`), at the 12
  change sites (15 routes: the edits, the workouts, the exercises, the
  schedules, the removal preview, the four photo routes); `create` checks
  after its 403. Close, archive and the closing preview call
  `assertProgramOpen` alone. Behind it `UsersService.isAccountActive(id)`
  (false for a missing id too). A service check only — no database rule for
  programs: a change already past the check when the account is deactivated
  lands, harmlessly, and the next is refused.
- **Messages:** migration **0063** (custom) — `rls_can_message(practitioner,
  patient)` = `rls_care_team_member(…)` AND the patient's `users.is_active`
  (readable under the caller's own row security — `users_select` is
  `USING (true)`, so no `SECURITY DEFINER`); `messages_insert` and
  `conversations_insert` recreated to call it; the list's `canSend` selects
  it, so the list and the write still share one definition. The service words
  the refusal: `writeRefusal()` asks the care team first (ended → the existing
  403s), then the account (deactivated → **409**
  `DEACTIVATED_PATIENT_MESSAGING_MESSAGE`, "This patient's account is
  deactivated, so the conversation is read-only until the account is
  reactivated") — a 409 because the writer still has the right; the patient's
  state is in the way. A new field `readOnlyReason: null | 'care_team_ended'
  | 'patient_deactivated'` on every `ConversationSummary`, from the same two
  SQL functions (`readOnlyReason()` in `message-rules.ts`), for pass 2's
  words.
- **Starting a conversation now has sending's shape:** no check before the
  INSERT, the policy's refusal (42501) caught and worded. The care-team
  pre-check that stood there since Phase 5 became redundant once the refusal
  was caught (a mutant removing it would have survived), so it went; the
  answers didn't change. Postgres checks the INSERT policy BEFORE `ON
  CONFLICT` looks for the pair, so an existing conversation isn't "got"
  either when writing is refused — measured.
- **Alerts** (`alerts.service.ts`): the names query reads `isActive`; a
  deactivated patient's programs are skipped for attendance; sessions
  untouched.
- **Roster:** `findPatientsForPractitioner(id, includeInactive = false)`; the
  controller passes `includeInactive === 'true'` for a practitioner too
  (still only their own care teams' patients). The programs and sessions
  lists keep the default.

**Verified:** backend **1,963 unit** (+25), e2e **1,009** (+13: a new suite,
`test/deactivated-patient.e2e-spec.ts` — Dee deactivated, Pia the active
control, Eve with BOTH an ended link and a deactivated account (the ended link
wins); the database refusing Rory's direct INSERTs; reactivation undoing it
all), and one strict-equality assertion in `messaging.e2e-spec.ts` given the
new field. The new tests fail on the old code — per file (old alerts alone,
old messaging alone) and with the old policies put back in `stride_test`. 24
mutations (23 TypeScript + the SQL function), all killed. Live: Sam's two
409s on Frank, Frank only with the flag. No frontend change. **Green on the
person's machine 2026-10-27.**

### Pass 2 — the screens (built and green 2026-10-27)

As planned, with one change of mine stated in the delivery (none changed by
the person): the My patients switch is plain state, off on every visit — the
app's rule for every "Show N hidden" switch (`ShowHiddenToggle`) — not kept
in the address as first planned. **The item is complete.**

- **One rule, `programLock(program, patientActive)`**
  (`assigned-programs/programLock.ts`): null (can change), `'closed'` (first,
  as on the backend), `'patient_deactivated'`. A patient not loaded yet counts
  as "can change" — the usual case draws at once, the backend's 409 stands
  behind every control. `useProgramLock(program)` for the pages that only have
  the program (exercise, photos, add exercise — the patient read from
  `GET /users/:id`'s cache entry).
- **The program page:** `isOpen` (still running) keeps Complete / Cancel and
  "Up next"; `canChange` (open AND the account active) gates Details, Change
  schedule / Pause, the two switches and the exercise editor
  (`ProgramScheduleProgress` and `ProgramExercisesSection` take `canChange`).
  The header's box: "This patient's account is deactivated, so this program
  can't change until an admin reactivates it. You can still complete or cancel
  it." A closed program's "Assign again" becomes "…can be assigned again once
  an admin reactivates it."; the assign-again page reads My patients WITH the
  deactivated ones, to say that instead of "isn't one of your patients".
- **The patient page:** no Message button; Programs says "No new program while
  the account is deactivated." instead of the button (`patientActive`, a
  REQUIRED prop); the notice lists what still works (the record, the file,
  completing or cancelling).
- **The conversation:** `readOnlyReason` on the frontend's
  `ConversationSummary`; `readOnlyText()` — "Frank's account is deactivated,
  so this conversation is read-only until an admin reactivates it." A 409 on
  sending refetches the conversation, like the 403.
- **My patients:** `GET /users?includeInactive=true` (one request);
  `splitByAccount()` — the active list, then "Show N deactivated patients"
  and a named "Deactivated patients" list, each row "Account deactivated";
  the clinic filter applies to both; "None of your patients has an active
  account." when all are deactivated.
- **Left as it is (said in the delivery):** a practitioner may still delete
  their own message in a deactivated patient's conversation within the 15
  minutes — taking back, not writing (the backend allows it, as for an ended
  care team).

**Verified:** frontend **2,763 tests** (224 files, +25); 38 mutations, all
killed; oxlint unchanged (27); main file +0.12 kB. Live in Chromium (Sam with
Frank at 375 px and 1280 px: the roster, Frank's page, the read-only
conversation, the program page). No backend change. **Green on the person's
machine 2026-10-27.**

### Next

Choose the next Phase 6 item with the person — the loading / skeleton pass
(the 40 "Couldn't load" messages), plain words for every 429, or other ideas
in `deferred-improvements.md`.

## §23 — Plain words for every failure (Phase 6)

Chosen 2026-10-27 from `deferred-improvements.md` ("Every other screen shows a
429 as 'ThrottlerException: Too Many Requests'"). Two passes, each confirmed
green before the next.

### The distinction underneath

A failure the user sees can come from three different places, and each needs a
different answer:

- **The server refused** (a 4xx): the request was understood and turned down,
  and the backend says why — in words written for people (they are part of the
  API's contract, mirrored as constants in each feature's rules file). Show
  them.
- **The server failed** (a 5xx): its words ("Internal server error") help
  nobody and may say more than a visitor should read. One plain sentence; the
  request itself may have been fine, so "try again".
- **No answer came** (the network, a timeout): there are no words to show. The
  screen says what failed, when it knows, so the reader knows which action to
  repeat.

The 429 was a refusal whose words weren't written for people: the throttler's
own default, a class name. And the deferred entry's "one place either way" was
only true on the backend: besides `failureText()` (13 users), about 55
components read `error.messages` themselves — 45 joined with `', '`, 13 with
`' '`, 38 fell back to "Something went wrong", a dozen to sentences of their
own, and every 5xx showed the server's words.

### The person's choices (2026-10-27)

- **Both:** the sentence written by the backend, AND the frontend consolidated
  into one wording rule (recommended: the backend sentence alone).
- **The wording:** "Too many attempts in a short time. Try again in N seconds."
  (recommended) — "attempts" reads right for a sign-in, a code and a save alike.
- **For pass 2:** several messages joined with a SPACE (the backend's messages
  are sentences); a 5xx replaced by "Something went wrong on our side. Try again
  in a moment."; with no answer, an OPTIONAL per-site sentence (the site's own
  "Couldn't upload the photo."), else "Something went wrong. Check your
  connection and try again." (all three recommended).

### Pass 1 — the 429's sentence (backend; built 2026-10-27, green the same day)

- **`@nestjs/throttler`'s own hook:** the module options' `errorMessage`
  (string or `(context, detail) => string`), read by the guard's
  `getErrorMessage()` — ONLY for the object form of the options (an array of
  throttlers falls back to the library's text; ours is the object form, and the
  comment says so). No subclass, no package. One line in `throttlerOptions()`
  (`src/config/rate-limits.ts`), beside `skipIf`, so the global limit and every
  `@Throttle` override share it.
- **The wait is the guard's own number:** `detail.timeToBlockExpire` — the
  value it has just written into `Retry-After` — so the words and the header
  can't disagree (`timeToExpire`, beside it, is when the counting window ends:
  a different clock).
- **`tooManyAttemptsMessage(seconds)`**, pure: "1 second" / "N seconds"; a
  value that isn't a whole number of at least 1 (a storage of our own one day)
  → "Wait a minute, then try again." rather than "NaN seconds".
- `error` stays `ThrottlerException`; the records export keeps its own, more
  exact "Too many downloads…".

**Verified:** backend **1,971 unit** (+8), e2e **1,010** (+1: the 6th login and
the 61st ordinary request each answer the literal sentence with `Retry-After:
60`). 9 mutations, all killed — including the other clock, which only the unit
fixture (37 vs 12) can catch. **Green on the person's machine 2026-10-27.**

### Pass 2 — one wording rule on every screen (frontend; built 2026-10-27, green 2026-10-28)

- **`failureText(error, noAnswer = NO_ANSWER_TEXT)`** (`api/apiErrors.ts`):
  not an `ApiError` → `noAnswer`; a status ≥ 500 → `SERVER_PROBLEM_TEXT`;
  otherwise the messages joined with a space. The caller's sentence replaces
  only the no-answer case.
- **51 sites converted** (45 files) from the repeated ternary; the special
  shapes by hand: the "<what failed>. <why>" builders (`describeFailure`,
  `useOwnPhotoEditing`, the photos choice — `failureText(error, 'Try again.')`,
  so a 5xx now names the server's side), the assign form's list of paragraphs
  (one line now), the refusal parsers (`linkRefusal`, the invitation page's
  refusal, `downloadFailureText`'s last line), and `isDeadLink` (the existing
  `hasMessage`).
- **The socket's refusals** (`MessageRefusedError`, sending and deleting a
  message) take `SERVER_PROBLEM_TEXT` for a status ≥ 500 — not through
  `failureText`, which would make the API module depend on messaging.
- **A convention test** (`api/failureTextConvention.test.ts`): every source
  file's TEXT (Vite's `import.meta.glob` with `?raw`), and a failure naming any
  application file but `apiErrors.ts` that reads `<…error>.messages` — the
  frontend twin of the backend's `audit-tags.spec.ts`.
- **Tests that changed and why:** 30 existing tests (in 31 files) — a 500 used only to get
  "some refusal with words" became a 400 (the test keeps its subject); a test
  whose subject IS the 5xx keeps its 500 and expects the shared sentence. 24
  new: the rule (6), the convention (2), the socket's 500s (2), and 14 for the
  per-site no-answer sentences — the mutation run showed none but the avatar
  upload's was pinned by any test, before or after.

**Verified:** frontend **2,787 tests** (226 files, +24); 31 mutations, all
killed (2 after the photo pages' no-answer tests existed); oxlint the same 27
warnings in the same files as the base; main file 423.97 kB (−0.08). Live in
Chromium (the 6th sign-in at 1280 and 375 px). No backend change. **Green on
the person's machine 2026-10-28. The item is complete.**

### Next

Choose the next Phase 6 item with the person — the loading / skeleton pass
(the 40 "Couldn't load" messages, the focus after a working retry), a
patient's "Who viewed my records", a break-glass read.

## §24 — Loading and error states, across the whole app (Phase 6)

Chosen 2026-10-28 with the person, from the roadmap's last Recommended item
("Loading/skeleton states pass across the whole app"), with skeletons
included. Split in two so no screen is edited twice for the same reason:
**pass 1 — load errors** (every "Couldn't load …" on one rule, with "Try
again"); **pass 2 — loading states and skeletons**. Each confirmed green
before the next.

### The distinction underneath

A screen that asked for data can end in three ways besides success, and each
needs its own answer:

- **The record doesn't exist** (a 404 on a page about one record — an
  exercise, a template, a user, a clinic). Asking again gets the same
  answer, so a "Try again" — or the old "Try refreshing" — is a dead end. The
  page says it plainly and offers a way out.
- **The record may exist but is hidden** (the four row-security resources:
  programs, sessions, conversations, medical file entries): already answered
  by §15's "… not available" pages, unchanged.
- **The request failed** (a 5xx, a 429, no answer): asking again may work. One
  sentence saying WHAT couldn't be loaded and WHY — from §23's rule — and "Try
  again", which repeats only the failed requests.

Before this pass, ~40 lists, cards and sections still said "Couldn't load …
Try refreshing the page." — a refresh reloads the whole app to repeat one
request, and the sentence never said whether the problem was ours, the
network, or a rate limit.

### The person's choices (2026-10-28)

- **The reason after every load error** (recommended): "Couldn't load your
  patients. Something went wrong on our side. Try again in a moment." — the
  same `failureText` rule as a failed action, so a load and a save that fail
  for one reason say the same thing.
- **Pages about one record get a "not found" page for a 404 or a malformed
  id** (recommended): "Exercise not found" — "There's no exercise at this
  address. The link may be wrong or out of date." — with links out, and no
  Try again. "Not found" (not §15's "not available") because it is TRUE here:
  no row-security rule hides these records, so there is nothing to keep
  ambiguous.
- **After a Try again that WORKS, focus goes to the new content's heading**
  (recommended; closes the `deferred-improvements.md` entry of 2026-10-23):
  the pressed button is gone with its error block, so focus would otherwise
  fall to the top of the page.

### Pass 1 — load errors (frontend; built 2026-10-28, green the same day)

- **One sentence, one place:** `common/loadErrorText.ts` —
  `loadErrorText(what, error, again)` = "Couldn't load {what}." (or "Still
  couldn't load {what}." after a failed retry) + `failureText(error,
  LOAD_NO_ANSWER_TEXT)`, where no answer reads "Check your connection and try
  again." (the first sentence already said what went wrong). `LoadError`
  draws it, with the FIRST failed request's reason.
- **Every remaining load error converted** — lists, home cards, sections,
  dialogs, sub-pages: exercises, templates and their exercise pages, the
  workout add view, patients (page, list, programs, care team, the add
  dialog's colleagues, the directory search), users, profile, clinics, the
  team pages and a clinic's contact details, the patient home and the admin
  home's sections, the sessions hub and session pages, the program pages and
  their previews (removal, cancel, complete), pain and mobility, messages
  (list, recipients, conversation), alerts and the review page, invitations,
  the audit log, the medical file pages, the records-export links. 115 files
  changed, 10 new.
- **`RecordNotFound` / `RecordLoadFailed`** (`common/RecordNotFound.tsx`): the
  "not found" page (on §15's `NotAvailable` shape) and, for any other
  failure, `LoadFailure` with the same links under Try again — a failed page
  is never a dead end. The template exercise page distinguishes a missing
  template ("Template not found") from a missing row in an existing one
  ("Exercise not found" + "Back to the template"). The patient page:
  malformed id → "Patient not found"; its 403 page kept.
- **The retry memory moved out of `LoadError`** into `common/retryMemory.ts`,
  with two outcomes: `'waiting'` (no answer yet, or a failure waiting for the
  block that replaces the pressed one — "Still couldn't …" with focus on its
  button) and `'worked'` (only the content's heading may take it). Matched by
  `what`, forgotten after 30 s, spent once, and an older press's late answer
  can't touch a newer one.
- **Focus after a working retry:** `useRetryFocus(what, shown)` returns a ref
  for the heading (`tabIndex={-1}`, `outline-none`); `useFocusAfterRetry` for
  a heading shared by several parts (the patient home's "Today", one row per
  program — `RetryFocus` places one per row). Shared headings take a
  `headingRef` prop (React 19 passes `ref` as a plain prop):
  `EditableExerciseTitle`, `EditableTemplateTitle`, `PatientPageSection`,
  `ProgramHeader`, `ProgramPageSection`, `HomeGreeting`, the workout add view.
  A dialog's load error focuses the dialog's title.
- **Lists that keep their previous results** (`placeholderData`): a retry
  reports `isSuccess` while the OLD results are still shown, so the heading
  waits for `isSuccess && !isPlaceholderData` (the directory search, the add
  patient page, the audit log, the users list).
- **Fixed on the way:** `NewProgramExercisePage` waited on "…" forever when a
  read failed; the patient home showed the summary's failure twice (the Today
  row and the My programs card) — one alert now.
- **A convention test** (`common/loadErrorConvention.test.ts`): no
  application file but `loadErrorText.ts` may write "Couldn't load" or "Try
  refreshing" (comments stripped first) — the twin of §23's
  `failureTextConvention.test.ts`.

**Verified:** frontend **2,854 tests** (230 files, +67); 96 mutations, all
killed (survivors of the first round closed with tests: the 30-second edge,
the older-press guard, two placeholder guards); `tsc -b` clean; ESLint the
known `button.tsx` warning; oxlint 27 (= base); main file 423.39 kB (−0.58),
first download −0.30 kB gzipped. Live in Chromium on the production build
(errors forced in the browser: the home's greeting and "Today" focused after
a working retry, "Still couldn't" with focus on the button, no network → "Check
your connection", the not-found pages, a 429's wait, a section and a dialog).
No backend change, no package. **Green on the person's machine 2026-10-28.**

**Left as they are (seen, not this pass):** four failed ACTIONS still read
`error.message` directly (`MessageButton` and `NewMessageDialog`'s start,
`SessionReviewPage` and `ProgramAlertBanner`'s review — a 5xx there shows
"Internal server error"); the Finish and Stop pages' "already finished" and
"started on another day" states have no heading to focus; the navigation
slots' "Unavailable", `RegisterClinicPage`'s setup check and the token pages
keep their own words (`deferred-improvements.md`).

### Pass 2 — loading states and skeletons (frontend; built 2026-10-28, green the same day)

**The person's choices (2026-10-28, all recommended):** skeletons for lists
and the homes' cards, a short sentence elsewhere; the loading state waits
~200 ms before showing; the four actions above fixed in the same pass.

- **One component, `common/Loading.tsx`** (+ `useDelayedShow.ts`):
  `Loading` (a sentence), `ListSkeleton` (rows in one frame, or separate
  cards; an optional round photo), `GridSkeleton` (the library's grid),
  `LinesSkeleton` (lines inside a card already drawn), `Skeleton` (one
  shape). Nothing is shown for 200 ms (`LOADING_DELAY_MS`) — a fast answer
  goes straight to the content, without a flash.
- **For screen readers:** a `role="status"` region present from the first
  render, EMPTY during the delay, the sentence put INTO it (a change of a live
  region's content is announced reliably; a region appearing with its text
  already in it is not). A skeleton's shapes are `aria-hidden`, its sentence
  `sr-only`. `motion-reduce:animate-none` stops the pulse for people who ask
  for less motion.
- **The rule applied:** a LIST of rows — a page's or a section's — and the
  homes' cards get a skeleton (My patients, the directory, users, clinics,
  the library and the picker, the Programs hub, the care team and its add
  dialog, conversations and New message, My team, the sessions hub, the
  medical file and My records, the audit log, For review, recent activity,
  the links sent, the patient home's Today / Upcoming / My programs, the
  admin metrics); a page about one record, a form, a chart or a preview gets
  the sentence. Labels follow the load error's `what`: "Loading the
  clinics…".
- **Tests see no delay:** `test-setup.ts` mocks `useDelayedShow` to `true` —
  with the delay, every "nothing while it loads" and "no loading when
  cached" assertion would pass for nothing. `Loading.test.tsx` unmocks it and
  tests the real timing (199 ms nothing, 200 ms the sentence, no timer left).
- **The four actions:** "Message", New message, and both "Mark as reviewed"
  through `failureText` — a 5xx is the shared sentence, no answer the site's
  own (`START_CONVERSATION_FAILED_TEXT`, "Couldn't save. Try again.").
  `failureTextConvention.test.ts` now also catches `<…error>.message`; the
  socket's two files are listed as allowed.
- **A second convention** (`common/loadingConvention.test.ts`): no
  application file but `Loading.tsx` writes JSX text starting "Loading".
  Mutation found all THREE convention tests passing with a filter that
  dropped every file — each now checks real files are inspected.

**Verified:** frontend **2,885 tests** (232 files, +31); 64 mutations, all
killed (one by `tsc` first, then pinned by a test); oxlint 27; first download
+2.1 kB (+0.6 gzipped — the shared component is in the main file). Live in
Chromium on the production build with 1.5 s of latency (the patient home at
375 px dark, My patients, the library, the admin home dark), on a normal
network no "Loading" text ever shown on the patient home or the sessions
hub, and with reduced motion the shapes' animation `none`. No backend change.
**Green on the person's machine 2026-10-28. The item is complete — and with it
the roadmap's last Recommended item of Phase 6.**

### Leftovers — the Finish and Stop pages' headed states (built 2026-10-28, green the same day)

**Chosen by the person 2026-10-28** from the candidates left after Phase 6
(`deferred-improvements.md`, "Load-error pass, leftovers"): the session pages'
two states with no heading, so nothing could take focus there after a working
"Try again".

**Found on the way:** both pages said "This session is already finished." for
ANY session that had ended — a stopped one (`incomplete`, by the patient or
closed by the app) and a skipped one too, which the rest of the app calls "not
finished". The person chose to fix the words in the same pass.

**The person's choices (2026-10-28, both recommended):**

| Question | Chosen | Why |
| --- | --- | --- |
| An ended session at Finish or Stop | **One heading, "Session already ended", and the status in the session page's own words** ("It's recorded as: Stopped (pain). It can no longer be changed.") | one name per ending across the app (`sessionStatusText`); rejected: a heading per status (three headings for one situation), keeping the sentence (wrong for stopped and skipped sessions) |
| Finish, for a session open from an earlier day | **"This session can no longer be finished"**, the sentence naming the session's day ("It was started on Tue 27 Oct. You can stop it instead: it will be kept as not finished.") | the heading says the consequence; the day matches the home's "left open" line. Rejected: "Session from another day" (names the situation, not what it means) |

**Built (frontend only):**
- **The words, pure:** `sessionText.ts` — `ALREADY_ENDED_HEADING`,
  `alreadyEndedText(session)` (reuses `sessionStatusText`),
  `CANNOT_FINISH_HEADING`, `earlierDayText(localDate, locale?)` (the
  session's own `localDate`, not today).
- **One shared state:** `SessionAlreadyEnded` in `SessionPageParts.tsx` (the
  heading, the status, "See the session"), used by both pages.
- **The focus hook moved up** into each page's view
  (`useRetryFocus('this session', session.isSuccess)`), above every branch —
  the start page's pattern: the form and each state attach the same ref to
  their `<h1>`; the forms take it as a `heading` prop.

**Verified:** frontend **2,897 tests** (232 files, +12); the 9 new page tests
fail on the old pages; 15 mutations, all killed (one first written with a
constant the file doesn't import — replaced by a valid one, a plain string,
killed by a test); `tsc -b` clean; ESLint the known `button.tsx` warning; oxlint 27 (=
base); first download unchanged (773.57 kB — the session pages are lazy).
Live in Chromium on the production build as Pat at 375 px, dark: a completed,
a stopped and a skipped session at Finish / Stop and an earlier-day open
session at Finish, each after three forced 500s and a "Try again" — focus on
the new `<h1>` every time; in the browser's US locale the date reads "Tue, Oct
27" inside the sentence. No backend change. **Green on the person's machine
2026-10-28.**

**Left as they were (from the same deferred entry, on purpose):** the
navigation slots' "Unavailable", `RegisterClinicPage`'s setup check and the
token pages keep their own words.

### Next

Chosen with the person 2026-10-28: a tidy-up before Phase 7 — §25.

---

## §25 — Phase 6 tidy-up: who may read a record beyond the care team (decided 2026-10-28)

**Asked by the person 2026-10-28**, before Phase 7: do we need a patient's
"Who viewed my records", and a break-glass read — why, and what would they look
like? Researched first (sources in the conversation: HHS's guidance and FAQs,
45 CFR 164.310 / 164.312 / 164.501 / 164.512 / 164.528, the 2011 access-report
proposal, Ontario PHIPA commentary). Not legal advice — an engineering standard
to design to; a real clinic's privacy officer decides each case.

### "Who viewed my records" — CLOSED, not built

- **Not required:** HIPAA's accounting of disclosures (164.528) leaves out
  treatment, payment and operations — a care-team practitioner reading their
  patient's file is never in it. The 2011 proposal that would have required an
  "access report" of every internal access drew strong opposition and was never
  finalised, as far as could be found. Ontario's 2020 amendment requires
  custodians to KEEP per-patient electronic audit logs — Stride does (one view
  entry per patient, the `(target_user_id, created_at)` index).
- **Little added value in Stride** (the person's conclusion): only the care team
  can read clinical data (admins out since §16), and every join is already
  visible to the patient on their Team page, past members included. The page
  would mostly say "your practitioners read your file".
- **What comes back in its lawful form:** the record of releases OUTSIDE the
  clinic (below, "accounting of disclosures").

### A "break-glass read" — reframed as RECORD ACCESS

- **Emergency access already exists.** HIPAA's Security Rule requires an
  emergency access *procedure* (164.312(a)(2)(ii)) — a procedure, not a
  button. "Add to my patients" is break-glass in shape (§3): immediate, no
  approval, audited (`CARE_TEAM_JOINED`), visible to the patient. A second
  emergency door would duplicate it and reopen §16 for admins.
- **The person's case is different: a complaint.** An admin needs to see what was
  done. That isn't an emergency or treatment — HIPAA's "health care operations"
  (164.501) lists "resolution of internal grievances", "evaluating practitioner
  and provider performance" and "conducting or arranging for medical review": a
  legitimate, PLANNED use, under minimum necessary. Hence a deliberate, narrow,
  visible access rather than a door anyone can break.
- **And the law can require a record without the patient's approval**
  (164.512: required by law; judicial and administrative proceedings — a court
  order, or a subpoena with "satisfactory assurances"; law enforcement; health
  oversight; coroners — Ontario similar). The clinic must then produce exactly
  what the order covers (messages possibly), and such releases go in the
  patient's accounting of disclosures (164.528 — litigation disclosures when the
  clinic isn't a party).
- **A downloaded copy is allowed if safeguarded** (the person's question):
  HIPAA asks for device and media controls (164.310(d)), encryption is
  addressable, and minimum necessary applies — it doesn't forbid copies. An
  in-app viewer wouldn't prevent copying either (screenshots, printing); the
  protection is accountability: a grant with a purpose, a stamp on every page,
  the ids of what went in recorded. The patient can already download the same
  file (§20).

### The person's choices (2026-10-28, all recommended)

| Question | Chosen | Why |
| --- | --- | --- |
| "Who viewed my records" | **Closed** | care-team-only access + visible joins: little to add |
| Notice when someone joins a patient's care team | **An in-app item in each current member's "For review" list** ("Mark as reviewed"), no email | nothing leaves the app; reuses §3's list |
| Who opens a complaint review | **The admin, with a required reason** | a single-admin practice can use it; accountability instead of approval. Rejected: a second admin's approval (blocks single-admin clinics) |
| How the admin reads the record | **The records export's PDF, stamped "Review copy"** | reuses §20's generator (one REPEATABLE READ moment, ids recorded). Rejected: read-only practitioner screens for admins (admin branches back on every clinical route) |
| Legal disclosures | **Yes, a third pass** | an order must be answerable precisely and on the record |
| Messages | **Only in a legal disclosure** | the Phase 5 promise (§7) holds for everything routine; an order covering messages is the one, recorded, exception |
| The accounting of disclosures | **In My records and in the patient's own export** | self-service, like the right of access |

### The plan — three passes, each confirmed green before the next

1. **The care-team join notice:** when someone joins a patient's care team, or
   is added to it (`CARE_TEAM_JOINED` / `_MEMBER_ADDED`), every OTHER current
   member sees an item in "For review", until they mark it reviewed. Computed
   from the links like the other alerts.
2. **Complaint review:** an admin opens a review access on one patient — a
   required reason, an optional case reference, 7 days, endable early;
   read-only; the content = the export's (file, programs, sessions); each PDF
   stamped "Review copy — made by … for …" and recorded with its ids; the care
   team told through the same "For review" list. §16 stands: no STANDING admin
   access, only a time-boxed, recorded one per case.
3. **Legal disclosure:** the recipient, the legal basis (court order / subpoena
   with assurances / required by law / …), its reference; the parts chosen
   (messages possible); each copy stamped "Disclosed to … under … on …"; listed
   for the patient ("Your record was shared") on My records and in their
   export; the care team told.

### Pass 1 — the care-team join notice (built 2026-10-28, green the same day)

**The person's choices for the rule (2026-10-28, all recommended):** told — the
members ALREADY on the team (a newcomer isn't told about the team they just
joined; never the one who joined, never the colleague who added them); 14 days
in "For review"; a member who has left since is still announced ("left …").

- **Computed, never stored:** like every alert, from `care_team_members` on each
  request. One pure rule, `isJoinNoticeFor(link, me, myStart, cutoff)`
  (`alert-rules.ts`): my CURRENT link started before the new one; not my link;
  not created by me; created by someone (the 0019 backfill announces nothing);
  started within 14 × 24 hours (`joinNoticeCutoff` — a link starts at an
  instant, not on a calendar day).
- **The list:** `GET /alerts` adds `{ kind: 'care_team_join', patient, link: {
  id, practitioner, addedBy (null when they joined by themselves), startedAt,
  endsAt } }`, newest first, AFTER the clinical alerts; read on its own (a
  patient with no program still has a team); names read after the access
  decision, on the service's connection (an admin's row may be hidden from a
  practitioner). Join notices are NOT in `ALERTS_VIEWED` — who is on a care
  team is directory-level.
- **"Mark as reviewed":** `POST /alerts/care-team-joins/:linkId/review` → 200 `{
  reviewedAt }`; 404 "Care-team link N not found" (unseen, or not my patient);
  409 "This change to the care team is not in your For review list";
  idempotent (`ON CONFLICT DO NOTHING`); ONE `CARE_TEAM_JOIN_REVIEWED` entry
  (area `care_team_join_reviews`, not clinical — 107 actions).
- **The table** `care_team_join_reviews` (migration 0064 generated; 0065 custom:
  row security — own rows only, as a practitioner; insert for oneself on a
  patient whose team one is on; no UPDATE / DELETE — and a trigger writing
  `reviewed_at`). The link's foreign key is NAMED (`care_team_join_reviews_link_fk`):
  drizzle's would have been 66 characters, Postgres cuts at 63.
- **The screen:** a row in "For review" — "Avery Admin added Morgan Reyes to the
  care team · Wed, Oct 28 (· left / · until …)", **Mark as reviewed** in place
  and **View care team**; after success, focus to the section's heading and a
  status sentence (the row leaves with its button); "now" read once per row.

**Verified:** backend **1,980 unit** (+9), e2e **1,021** (+11; the 5 pagination
ECONNRESETs in the sandbox only); frontend **2,906** (+9). Mutations: backend 33
— 30 killed, 3 equivalent (said in the code: the SQL window narrowing, the
service's "own reviews" filter beside the policy — both removed at once fails a
test —, the list's current-link condition under insertion-ordered rows);
frontend 21, all killed. A first backend run was INVALID (a test depending on
earlier blocks failed under the `-t` filter on unmutated code, so every mutant
"died"); the runner now checks a green baseline first, and the honest re-run
found an untested case — a practitioner who left and REJOINED — now tested.
Live in Chromium on the production build (Alex 375 px dark, Sam, the admin's
addition through the API). First download unchanged. **Green on the person's
machine 2026-10-28.**

**Next:** pass 2, the complaint review.

### Pass 2 — the complaint review: the person's choices (2026-10-28, all recommended)

| Question | Chosen | Why |
| --- | --- | --- |
| Lifetime | **7 days**, endable early | a working week for a complaint; a new review needs a new reason |
| Copies | **Any number, each recorded** (its own `RECORDS_EXPORTED`, the ids of what went in) | the record may change during the review; every copy stays accountable |
| The care team's notice | **Who opened it, when, until — WITHOUT the reason** | the reason may name a colleague or the complaint; it stays on the admin's page and in the audit log |
| The patient | **Not told in the app** | an internal operations use (164.501), not a disclosure; the clinic answers the complaint through its own process |

**How it reads the record (decided with the plan):** the admin's request checks an
open grant, then the transaction switches to the PATIENT's own context
(`applyUserContext`) and calls the export generator — the emailed link's path
(§20). No clinical policy gains an admin branch: §16 holds at the database.

### Pass 2 — the complaint review (built 2026-10-28, green the same day)

**Choices made while building (stated to the person, each easy to change):**
several reviews of one patient may be open at once (one per case); only the
admin who OPENED a review makes copies with it (another admin → 403, not 404 —
they can see it exists); ANY admin may end one early (less access is always
allowed; the ending is signed); the care team told = the members on the team
WHEN it opened (the join notices' rule), not its opener if they are also a
practitioner, for 14 days, until each marks it reviewed.

- **Three tables, because row security filters ROWS, never columns:**
  `complaint_reviews` (patient, opened_by, opened_at, expires_at, ended_at /
  ended_by — admins AND the care team read it), `complaint_review_reasons`
  (reason ≤ 1,000, case reference ≤ 100 — ADMINS ONLY), and
  `complaint_review_notice_reviews` (each practitioner's "seen" — 0065's shape).
  The care team sees that a review exists; the database itself keeps the reason
  from them. Migrations **0066** (generated; the notice table's FK named by hand
  — 73 characters otherwise) and **0067** (custom).
- **The guard trigger writes the dates:** `opened_at := now()`, `expires_at :=
  now() + 168 hours` (no review longer than 7 days, whatever is sent; hours, not
  days, across a DST change); what a review IS never changes; an ending is final,
  refused once expired, signed by the session user, dated by the database. The
  reason's INSERT policy requires `r.opened_by = rls_current_user_id() AND
  r.opened_at = now()` — `now()` is the transaction's start, so a reason is
  written by the opener, in the opening transaction, or not at all. No UPDATE /
  DELETE policy on any of the three.
- **A copy:** `GET /users/:id/complaint-reviews/:reviewId/copy?timeZone=` — ONE
  REPEATABLE READ transaction: as the admin, the review checked (theirs, open by
  the database's clock); then `applyUserContext` → the PATIENT; then
  `exportInTransaction` with a third `ExportSource`, `{ via:
  'complaint_review', adminId, stamp }` — RECORDS_EXPORTED performed by the
  ADMIN, details `{ via, reviewId, timeZone, ids… }`. File
  `stride-review-copy-<id>-<day>.pdf`. The document is EXACTLY the patient's
  own, preceded by an account of the copy (made by, review, case reference,
  reason, open until) and titled "Health record — review copy"; every page
  carries "Review copy — made by … for complaint review N (case …)" in bold above
  its footer. 5 a minute, `no-store`. Refusals: 404 (not this patient's review),
  403 (not the opener), 410 (ended / expired).
- **Routes (admins):** `GET` / `POST /users/:id/complaint-reviews` (`{ reason,
  caseReference? }`; 400 blank reason / blank reference / too long, 400 not a
  patient, 404 no account), `POST …/:reviewId/end` (200; 409 already ended /
  expired). **Care team:** `GET /alerts` adds `{ kind: 'complaint_review',
  patient, review: { id, openedBy, openedAt, expiresAt, endedAt } }` — no reason,
  no case reference — merged with the join notices newest first;
  `POST /alerts/complaint-reviews/:reviewId/review` (200 / 404 / 409,
  idempotent).
- **Audit:** `COMPLAINT_REVIEW_OPENED` (details: reason, case reference, open
  until), `COMPLAINT_REVIEW_ENDED`, `COMPLAINT_REVIEW_NOTICE_REVIEWED`; areas
  `complaint_reviews` ("Complaint reviews") and `complaint_review_notice_reviews`
  ("For review"), both not clinical — **110 actions**.
- **Screens:** the admin's "Complaint reviews" section on a patient's user page
  (open with reason / case reference — the dialog says who will know; each review
  with its status, reason, "Download a review copy" for its opener, "End now"
  with a confirmation; focus to the heading after ending via the dialog's
  `onCloseAutoFocus`); the practitioner's For review row ("Avery Admin opened a
  complaint review of the record · Wed, Oct 28 · until Wed, Nov 4", a sentence
  on what it means, Mark as reviewed, no link). Join and review rows share one
  `NoticeRow`.

**Verified:** backend **1,991 unit** (+11), e2e **1,049** (+28); frontend
**2,935** (+29). Mutations: backend 42 — 41 killed, 1 equivalent by design (the
notice review's TypeScript care-team check: row security answers 404 anyway);
frontend 24, all killed. The first run's four survivors were all WEAK TESTS:
`INSERT … RETURNING` is also checked against the SELECT policy, which refused
before the INSERT policy mattered; an "another admin" case also refused by "same
transaction"; an admin (who sees every review) writing a "seen"; no check that
the form shows no error before a first try. Live in Chromium on the production
build (admin desktop light + 375 px dark, Alex 375 px dark; the PDF read back —
6 pages, stamped on each; Alex's `/alerts` without the reason's words). Seed
reset after. **Green on the person's machine 2026-10-28.**

**Next:** pass 3, the legal disclosure.

### Pass 3 — the legal disclosure: the person's choices (2026-10-28)

| Question | Chosen | Why |
| --- | --- | --- |
| Parts of the record | **Chosen each time + a date range** (medical file, programs, sessions, messages — messages possible ONLY here) | an order covers what it covers, often a period; minimum necessary. Each part filtered by its own date: a note by when it was written, a session by its day, a message by when it was sent, a program if it overlaps the range |
| Holding it back from the patient | **Yes, until a date** (HIPAA 164.528(a)(2): law enforcement or a health-oversight agency may ask the clinic to suspend the patient's accounting for a time), with the agency's statement recorded | the law provides it; the disclosure then appears on My records after that date |
| What the patient sees (My records + their own export) | **Who, why, when, what**: recipient, legal basis, date, parts included (and the range) | what an accounting of disclosures lists (164.528(b)) |
| The care team | **Told in "For review": who made it, when, the recipient** — not the reference or the order's details | as pass 2, with the recipient |

Decided while designing (to state when building): any admin makes one, with the
order's details (recipient — name and organisation —, legal basis from a list:
court order, subpoena with satisfactory assurances, required by law, law
enforcement, health oversight, coroner / medical examiner, other with an
explanation; the order's reference; the date it was received); one PDF per
disclosure, stamped "Disclosed to … under … on …" on every page, recorded with
the ids of what went in; read as the patient (the pass 2 path), messages through
the conversations the patient can read.

### Pass 3 — the legal disclosure (built 2026-10-28, green 2026-10-29)

**Choices made while building (stated to the person, each easy to change):**
recording the disclosure and downloading its copy are ONE request — the PDF is
the answer of the POST, so a lost download means recording a new disclosure (a
limitation, `deferred-improvements.md`); a deleted message appears as "deleted"
with no text (its words were never kept); a hold is stored as the START of the
chosen day in the admin's zone, and the care team is told at once — their row
says "Pat sees it from …" and asks them not to mention it before; the period is
optional on both sides, its days read in the admin's zone (the copy says which);
the disclosed copy carries no patient email; the patient's own copy and a review
copy end with "Disclosures of your record" (the accounting, held ones left out).

- **Four tables, because row security filters ROWS, never columns:**
  `legal_disclosures` (patient, made_by, made_at, recipient name and
  organisation, withheld_until — admins, the care team and, once released, the
  patient read it), `legal_disclosure_details` (legal basis — enum
  `legal_basis` —, its explanation for "other", the four part flags, the
  period — admins, and the patient through an `EXISTS` on the parent: ONE
  release rule), `legal_disclosure_orders` (order reference, received on, the
  agency's withholding statement — ADMINS ONLY), and
  `legal_disclosure_notice_reviews` (each practitioner's "seen", 0065's
  shape). CHECKs: names / reference / statement not blank, an explanation
  exactly with "other", at least one part, the period in order, and — in the
  orders' INSERT policy — a statement exactly with a hold. Migrations **0068**
  (generated; the notice table's FK named by hand) and **0069** (custom).
- **The hold is enforced by the database:** the patient's SELECT policy is
  `withheld_until IS NULL OR withheld_until <= now()`. The guard trigger stamps
  `made_at := now()` and refuses a hold that isn't in the future
  (`legal_disclosure_hold_in_future`); the children's INSERT policies require
  `d.made_at = now()` (the pass 2 trick — written in the making transaction or
  never). No UPDATE / DELETE policy on any of the four.
- **Making one:** `POST /users/:id/legal-disclosures` (admins; 5 a minute;
  `no-store`) `{ recipientName, recipientOrganisation?, legalBasis,
  basisExplanation?, orderReference?, receivedOn, parts, periodFrom?,
  periodTo?, withheldUntil?, withholdingStatement?, timeZone? }` → 201 the PDF.
  The cross-field rules (`disclosureRequestRefusal`, pure) answer 400 with their
  sentence; 404 no account, 400 "Only a patient has a health record to
  disclose". ONE REPEATABLE READ transaction: the four rows, then
  `applyUserContext` → the PATIENT, then `exportInTransaction` with a fourth
  `ExportSource` `{ via: 'legal_disclosure', adminId, stamp }`.
- **What the copy holds:** `loadRecord(tx, id, { messages, disclosures })` reads
  conversations AS THE PATIENT (what their policies show — every care team,
  current or past), then `scopeRecord` (pure) keeps only the chosen parts, each
  by its own date in the copy's zone: a note by when it was written, a session
  by its day, a message by when it was sent, a program if its dates overlap the
  period (its sessions still filtered; a note corrected after the period says
  so). Titled "Health record — disclosed copy", a "Not included:" line, every
  page stamped "Disclosed to {organisation or name} under {basis} (ref. …) on
  {day} · disclosure N". File `stride-disclosure-<id>-<day>.pdf`.
- **Audit — two entries, the one exception to "one per route":**
  `LEGAL_DISCLOSURE_MADE` (area `legal_disclosures`, NOT clinical — the order's
  details shown to admins) and `RECORDS_EXPORTED { via: 'legal_disclosure',
  disclosureId, …ids, messageIds }` (clinical, performed by the admin). One says
  what was ORDERED, the other what LEFT; each area keeps its own rule about who
  reads details. `LEGAL_DISCLOSURE_NOTICE_REVIEWED` for the care team's "seen" —
  **112 actions**.
- **Reading:** `GET /users/:id/legal-disclosures` (admins: everything, with
  `shownToPatient` judged by the database's clock); `GET /legal-disclosures`
  (the patient: released ones only — recipient, basis, date, parts, period).
  **Care team:** `GET /alerts` adds `{ kind: 'legal_disclosure', patient,
  disclosure: { id, madeBy, madeAt, recipientName, recipientOrganisation,
  withheldUntil } }` — never the reference or the order's details;
  `POST /alerts/legal-disclosures/:disclosureId/review` (200 / 404 / 409).
- **Screens:** the admin's "Legal disclosures" section on a patient's user page
  (active or not) with "Record a disclosure" (a dialog: recipient, basis — no
  default, a default would be a legal claim nobody made —, explanation for
  "other", reference, received on, parts, period, "Hold it back from the
  patient" with its date and statement; checks before sending, focus to the
  first problem; "Record and download"); each disclosure in words, the hold
  said as running or over. The patient's "When your record was shared" on My
  records. The practitioner's For review row ("… disclosed Pat's record to …",
  "· Pat sees it from …" while held). Audit wording for the three actions.

**Verified:** backend **2,028 unit** (+37), e2e **1,080** (+31; the 5 known
sandbox pagination ECONNRESETs); frontend **2,979** (+44, 237 files). Mutations:
backend 72, frontend 53 — all killed; first-round survivors were untested
behaviour (who wrote each message, the notices' order in reverse, the order of
two detail rows), each closed by a test. Lint clean on changed files; oxlint 27.
First download 773.70 kB (+0.16). Live in Chromium on the production build
(admin desktop light + 375 px dark, Alex and Pat at 375 px; the PDFs read back;
a held disclosure absent for Pat). Seed reset after. **Green on the person's
machine 2026-10-29. The tidy-up is complete.**

**Next:** choose the next item with the person (deferred ideas, or Phase 7).

## §26 — Dependencies and two-factor leftovers (2026-10-29)

Chosen by the person from the list of every open deferred entry: the backend
`npm audit`, and the two-factor extras — **except** making two-factor required
for admins (it would make the reviewers' sign-in harder; left open).

### The person's choices (all recommended)

| Question | Chosen | Why |
| --- | --- | --- |
| multer (high) — Nest 11 pins 2.4.0 exactly | **An npm `overrides` entry to 2.5.0** | a small diff, read; the upload suites green; removed once Nest 11 updates (Nest 12 is a project of its own) |
| A code that passed, then a change that failed | **Spent anyway — app codes AND recovery codes** | RFC 6238 §5.2: a validated code isn't accepted again, whatever happened next; one rule for both kinds |
| The authenticator's label after an email change | **Say so; keep the email as the label** | the clearest label at set-up; the codes don't depend on it |

Found while reading the code, no choice needed: the deferred entry's "turned
ON on another device" can't happen (enabling signs every other device out);
turning OFF doesn't — so the change pages now read the account again.

### Built 2026-10-29, green the same day

- **Dependencies:** `npm audit fix` (in range) and `overrides.multer = 2.5.0`
  (`npm pkg set …`); `--omit=dev` left with 2 moderate (js-yaml under Swagger,
  not reachable — `deferred-improvements.md`).
- **`StepUpService.attempt(actor, sessionId, purpose)`** replaces `confirm` /
  `confirmPassword` / `failureRecorder`: made before the transaction, its
  `confirm(tx, account, proof)` used inside, its `failed` in the `.catch`. The
  attempt remembers what passed (`SecondFactorUse` now carries the app code's
  `step` or the recovery code's `codeHash`); `failed` records a failed proof as
  before, or — the proof passed, the change failed — spends it again in its own
  transaction (`spendAgain`): `mfa_last_used_step = GREATEST(stored, step)`
  (never lowering a later code's step), a recovery code marked used if still
  unused, with its `MFA_RECOVERY_CODE_USED { remaining, changeNotMade: true }`
  entry and notice. Never throws over the change's own error. Six callers moved
  (password change, email change, MFA set-up / new codes / off / admin reset).
- **The label:** `AUTHENTICATOR_LABEL_NOTE` in the "email changed" notice when
  two-factor is on (the confirmation reads `mfa_enabled` from the locked row);
  `AUTHENTICATOR_LABEL_TEXT` on the Two-factor page while on.
- **`useRefreshedCurrentUser()`** (frontend): the email change, password change
  and Two-factor pages `fetchQuery` the current user with `staleTime: 0` as they
  open; the form follows (react-hook-form reads its resolver every render); a
  failed read keeps the cached account.

**Verified:** backend **2,036 unit** (+8), e2e **1,085** (+5; the 5 known
sandbox pagination ECONNRESETs); frontend **2,986** (+7). Mutations: backend 12,
all killed; frontend 8, 7 killed, 1 equivalent (two fetches in flight for one
key are one request). The new e2e tests failed on the old code. Live in Chromium
(Casey, 375 px dark, the production build): a recovery code spent by a refused
email change, then refused; two-factor turned off from another session — the
password page lost its code field without a reload. First download 774.04 kB
(+0.34). **Green on the person's machine 2026-10-29.**

**Count correction:** pass 3's e2e total was **1,080**, not 1,081 (the
legal-disclosure suite holds 31 tests).

## §27 — Leftover storage files, and duplicate patient accounts (2026-10-29)

Two items from `deferred-improvements.md`, chosen by the person together: the
three "leftover storage files" entries, and "Duplicate patient accounts:
detecting and merging them". Planned as four passes: (1) the storage clean-up,
backend; (2) detecting a duplicate when a patient is created, backend +
frontend; (3) the merge, backend; (4) the merge's screens.

### The person's choices (2026-10-29, all four recommended)

- **An archived program's own photos:** deleted when the program is archived —
  the rows emptied in the archiving transaction, the keys listed in its entry,
  the files deleted after the commit. Not left to a sweep: a deleted program is
  never shown again, and a photo of the patient kept without a use is data held
  for nothing.
- **The sweeper:** run BY HAND (`npm run storage:sweep`), a dry run by default,
  `--delete` to delete, a minimum age of 24 hours. Not scheduled: no scheduler
  package, no "system" actor to sign audit entries.
- **A possible duplicate at creation:** a WARNING, never a refusal. A match in
  a clinic the practitioner works at points them to that patient; a match
  elsewhere says only "a patient with this name and date of birth already
  exists — check with an admin", with "Create anyway". The override is recorded
  in the creation's audit entry.
- **A merge:** traceable, no "Unmerge": the merge record lists every row moved,
  the losing account stays deactivated with a `merged_into_id`; a mistaken
  merge is repaired by hand from that record.

### Three kinds of leftover file, three fixes

- **A file that never got attached** (an upload whose database save fails):
  undone by the code that stored it — `src/storage/compensation.ts`
  (`storeAll`, `undoStoredOnFailure`, `deleteAllUnreferenced`), the program
  photos' former private helpers made shared, now used by the library's photo
  upload, the avatar and the clinic logo too. Plain functions taking the
  storage, not `StorageService` methods: the services' specs replace
  `StorageService` with a fake, and the undo would never run in their tests.
- **A file the app forgot** (an archived program's own photos): dropped at
  archive time, as chosen.
- **A delete that failed** (`deleteUnreferenced`'s warning), and the files
  `seed:dev -- --reset` leaves: the sweeper.

### Archiving and the closed-program guard

The guard (0031) refuses every change to a closed program's children, and a
COMPLETED program with no session may still be archived — so "empty the photos
before closing" isn't open. Migration **0070** (custom) re-creates
`guard_closed_program_child()` with ONE exception: an UPDATE of
`assigned_program_exercises` whose program is ARCHIVED, setting `media_urls`
to empty and changing nothing else (the row as JSON without `media_urls`,
before and after, equal). The service archives the program row first, then
empties the photos (`dropOwnPhotos`, every exercise locked `FOR UPDATE`), then
writes `ASSIGNED_PROGRAM_ARCHIVED` with `deletedOwnPhotos` (only when there
were some). A cancelled program WITH sessions is not archived and keeps its
photos (part of the record). Library photos are the library's and are never
touched — an archived LIBRARY exercise keeps its photos too (programs show
them live).

### The sweeper's rules

`scripts/storage-sweep.ts` (the command) and `scripts/storage/sweep.ts` (the
logic): list storage FIRST, then read the database; files younger than the
minimum age left alone; the database read with `SET LOCAL row_security = off`
(every key-holding table has FORCE ROW LEVEL SECURITY — a role it would filter
gets an error, never a short list that would make every hidden file look
orphaned); only the four app folders (`avatars/`, `clinics/`, `exercises/`,
`patients/`); refused against a database ending in `_test` (the e2e suites
share the bucket with the development database); an unknown argument refused;
exit code 1 if a delete failed. No audit entry: an unreferenced file is no
one's record; the printed report is the trace. `REFERENCE_COLUMNS` lists the
four key-holding columns, and a test fails if the schema gains a `…_path` /
`media_urls` column not listed.

### Built 2026-10-29 (pass 1), green the same day

Backend only: `src/storage/compensation.ts` + spec NEW;
`StorageService.listObjects` (an async generator over `ListObjectsV2` pages) +
spec; `exercises.service.ts` (`addImages`: `storeAll` + undo),
`users.service.ts` (`updateAvatar`), `clinics.service.ts` (`updateLogo`);
`assigned-programs.service.ts` (`archive`, `close`, `dropOwnPhotos`, the
helpers moved out) + spec; `program-photos.ts` (`deletedPhotosDetail`) + spec;
migration **0070** `archived_program_photos` (custom);
`scripts/storage-sweep.ts`, `scripts/storage/sweep.ts` + spec NEW;
`scripts/seed-dev.ts` (the reset's sentence names the sweeper); `package.json`
`"storage:sweep"` (added by the person); e2e `storage-cleanup` NEW (6, a planted
failing trigger per upload), `storage-sweep` NEW (5, folders unique to the run),
`program-exercise-photos` (+10: the three ways of archiving, a cancelled program
with sessions, the guard's exception edges).

**Verified:** backend **2,072 unit** (+36), e2e **1,106** (+21; the 5 known
sandbox pagination ECONNRESETs). Mutations: 33, 32 killed, 1 equivalent (the
migration's outer "this table, an UPDATE" test — the inner test is false on
other tables and operations anyway; kept so other tables skip building JSON,
and said in the migration). The command run live: dry run, the `_test`
refusal, a mistyped flag. **Green on the person's machine 2026-10-29.**

### Pass 2 — detecting a possible duplicate (built 2026-10-29, green the same day)

**The rule** (`src/users/possible-duplicates.ts`, pure): the same date of birth
AND the same name — both names equal once normalised, or first / last SWAPPED.
`identityName()`: lower case → a few letters Unicode can't decompose written
out (ß → ss, æ → ae, œ → oe, ø → o, ł → l, đ / ð → d, þ → th, ı → i) → NFKD →
every character that is neither a letter nor a digit removed (`\p{L}` /
`\p{N}`, so any script; spaces, hyphens, apostrophes and the split-off accents
go). A name that normalises to "" never matches (no warning rather than a
false one).

**Two changes from the plan stated in "Next" below, told to the person in the
delivery:**
- **No `unaccent`.** The names are compared in TypeScript; the database only
  narrows the candidates by `date_of_birth` (an exact `date` comparison). One
  normaliser, unit-tested (25 tests), no extension to enable.
- **No SECURITY DEFINER function.** The SELECT policies of `users`,
  `patient_profiles`, `user_roles` and `user_clinics` are `USING (true)` — the
  practitioner's own connection can already read every candidate. What a
  requester may be TOLD is decided in the service instead.

**Where it runs:** inside the creating transaction, before the insert —
`UsersService.create()` for a new PATIENT, `grantRole()` when it creates a
patient profile. A match answers **409** `{ message, reason:
'possible_duplicate', … }` (well-formed, nothing created yet, conflicting with
what exists — and `reason` tells it from the route's other 409, an email
already taken). The same request with `allowPossibleDuplicate: true` (an
optional boolean on both DTOs) goes ahead; `USER_CREATED` /
`USER_ROLE_GRANTED` record `possibleDuplicateOf: [ids]` — the trace pass 3
starts from.

**What each role is told** (`possibleDuplicateRefusal`):
- **an admin:** every match — id, names, `isActive`, clinics;
- **a practitioner:** `inYourClinics` — the matches their clinic directory
  would show, as directory rows (`CareTeamService.directoryEntries`, sharing
  `directoryRows` / `describeForDirectory` with the directory search, so the
  two can't disagree) — and `elsewhere: boolean`: that OTHER matches exist,
  nothing about them. A deactivated patient counts as elsewhere. Without this
  the warning would be a side door: "is there a patient called X born on Y at
  another clinic?" answered by trying an invite.

**Screens:** the practitioner's invite page shows the warning INSTEAD of an
error — matches from their clinics as directory rows (`DirectoryPatientRow`,
extracted from `AddPatientPage`) with "Add to my patients" (or "Open"), the
elsewhere sentence ("check with an admin"), then "Invite *Name* anyway". The
admin's "Add a user" and "Grant a role" list every match, each a link to its
user page in a NEW TAB (said in the `aria-label`: leaving would lose the form),
"· Deactivated", its clinics. Focus moves to the warning's heading. The 409 is
read by parsers that check each field's shape (`possibleDuplicate.ts`). The
audit log words `possibleDuplicateOf` "Possible duplicate of (user ids)".

**Known limits (accepted):** a warning, not a constraint — "anyway" creates
the duplicate (recorded); two creations of the same person at the same moment
don't see each other's uncommitted row, so neither is warned (a lock or a
unique constraint would refuse real namesakes — the merge is the remedy); an
API client creating a matching patient now gets a 409 where it got a 201.

**Built:** backend `possible-duplicates.ts` + spec NEW, `users.service.ts` +
spec, both DTOs, `care-team.service.ts`; e2e `possible-duplicates` NEW (11);
eleven e2e files' fixture helpers send `allowPossibleDuplicate: true` (their
patients share a name and birth date — 154 failures before), `account-audit`
gives each patient its own last name instead. Frontend
`users/possibleDuplicate.ts` + test, `patients/DirectoryPatientRow.tsx`,
`patients/PossibleDuplicateNotice.tsx`, `users/PossibleDuplicatesNotice.tsx`
NEW; `InvitePatientPage`, `CreateUserPage`, `GrantRoleForm` (+ tests),
`AddPatientPage`, both `api.ts`, `audit-log/detailWording.ts` + test.
**Verified:** backend **2,097 unit** (+25), e2e **1,117** (+11; the 5 known
sandbox ECONNRESETs); frontend **3,006** (+20, 238 files); first download
774.04 → 774.26 kB. Mutations all killed after two fixes (a dead `\p{M}` step
removed; a test added for two matches in different clinics). Live in
Chromium (375 px dark and 1280 px). **Green on the person's machine
2026-10-29.**

### Pass 3 — the merge: the person's choices (2026-10-29)

- **The survivor:** the ADMIN picks it on the merge screen (usually the account
  the patient signs in with). The other is deactivated with `merged_into_id`.
- **Profile details:** the survivor keeps its own; only its EMPTY fields are
  filled from the other account, each listed in the merge record. A
  field-by-field choice was left for later (deferred entry "Merging patients:
  choosing each profile field").
- **Two threads with the same practitioner:** combined into ONE — the other
  account's messages move into the survivor's conversation, keeping their
  times and senders (the one-thread-per-pair rule stays).
- **Who is told:** the care team, by a For review notice (like the join
  notice); the patient, by an email to the surviving address.

### Pass 3 — two more choices (2026-10-29, both recommended)

- **The mechanism:** ONE `SECURITY DEFINER` function, `merge_patients()` — the
  project's first. The merge must move rows admins are forbidden to read
  (§16); a "merge in progress" branch in ~10 policies and ~6 triggers was the
  alternative. The function runs as the tables' owner, whom every guard
  trigger already exempts.
- **Step-up:** the admin's password (and code) asked again — purpose
  `patient_merge`, failures audited and counted like every step-up.

### Pass 3 — the merge, backend (built 2026-10-29, green the same day)

**Route:** `POST /users/:id/merge { intoUserId, currentPassword, mfaCode? }`
(admins, 5 a minute) — `:id` merged AWAY into `intoUserId` → 200 `{ mergeId,
mergedId, survivorId }`. Refusals (`patient-merge-rules.ts`, pure): the same
account 400; a missing one 404; not both patients 409; the merged one also
staff 409 (it would be deactivated); either already merged 409; a deactivated
survivor 409. The step-up comes first (the MFA reset's order); the three rows
(admin, both accounts) locked in one statement, in id order.

**Migrations:** 0071 (generated: `patient_merges` — survivor, merged
(UNIQUE), by, at; `patient_merge_notice_reviews`), 0072 (custom: their row
security — staff read merges, nobody writes them but the function; the
review's clock trigger; the function). No `users.merged_into_id`: the merge
row IS that link, stored once.

**The function's hardening:** `SECURITY DEFINER`; `SET search_path = public,
pg_temp`; `SET row_security = off` (an owner that row security WOULD filter
gets an error, never a merge that moved nothing); EXECUTE revoked from PUBLIC
and granted to the app's role — by the migration when the role exists, by
`create-app-role` otherwise (checked with `to_regprocedure`); the caller
checked inside (admin context + the admin role held + active); every rule
checked again (`patient_merge_allowed`, 23514).

**What it moves:** programs, sessions, medical files (one statement — the
amendment FK is checked at the statement's end); threads combined with the
same practitioner (messages keep times and senders; the empty thread deleted)
or moved; what the merged account SENT is the survivor's; care-team links —
moved when they don't overlap the survivor's with that practitioner, else
the uncovered pieces (a `tstzmultirange` difference) become new survivor
links and the original stays, ended if open; clinics united; open complaint
reviews ended, then moved; legal disclosures moved; pending invitations
revoked, open export links closed; the survivor's EMPTY phone / address
(one block) / photo filled; the merged account deactivated, signed out, and
never reactivated (409, `UsersService.setActive`); left out of the pass-2
duplicate check.

**Audit:** TWO entries, like a legal disclosure — `PATIENT_MERGED`
(`patient_merges`, shown to admins: accounts, links, clinics, invitations,
fields, sessions ended) and `PATIENT_MERGE_RECORDS_MOVED`
(`patient_merge_records`, clinical, withheld: every program, session, file,
message id). Vocabulary 112 → 114. **Email** to the survivor only, naming no
other address ("Your Stride accounts were combined").

**Moved to pass 4:** the care team's notice — the current frontend can't draw
an unknown alert kind.

**Verified:** backend **2,112 unit** (+15), e2e **1,142** (+25; the 5 known
ECONNRESETs). Mutations: 56, all killed after two redundant function
conditions were removed and two tests added. Live: wrong password 400, merge
200, reactivation 409, the email. **Green on the person's machine
2026-10-29.**

### Pass 4 — the merge's screens and the care team's notice

**The person's choices (2026-10-29, all recommended):**
- **Entry points:** "Merge into another account…" on a patient's admin user
  page, AND a "Merge…" link beside each match of the admin's possible-
  duplicate warning.
- **The comparison:** identity only — name, date of birth, email, phone,
  address, clinics, care team, active, created, invitation state. No record
  counts (§16 stays whole).
- **A merged-away account:** its user page says "Merged into … on … by …"
  with a link, its actions hidden; the users list shows a "Merged" badge.
- **The care team's notice** (chosen in pass 3) ships here, backend + row
  together.

### (pass 3's open questions, before the design)

Admin only; traceable, no Unmerge (chosen). Open questions: which account
survives (and the loser's email); how each kind of row moves — programs,
sessions, medical files, conversations (two threads with the same
practitioner?), care-team links (the exclusion constraint: overlapping
periods combined), clinic memberships, invitations, the avatar; the merge
record's shape (`merged_into_id`, a `PATIENT_MERGED` entry listing every row
moved); the loser's sessions and sign-in data ended; what the patient and the
care team are told.

### (pass 2's plan, as first stated — see "Pass 2" above for what changed)

The same patient = first name, last name and date of birth (`patient_profiles.
date_of_birth`, NOT NULL), compared ignoring case, accents, hyphens and extra
spaces, and with first / last swapped; compared in ONE place, Postgres (the
`unaccent` extension — trusted, so a migration can enable it). Checked at
creation (practitioner and admin) and when the patient role is granted; the
backend answers a 409 with a reason (`possible_duplicate`) saying whether a
match is in the requester's clinics; "Create anyway" resends with an explicit
flag, recorded in `USER_CREATED` with the matched ids (for the merge). The
check crosses clinics, which the requester's row security can't — so it runs
through a narrow database function answering only what the warning needs.

### Pass 4 — built 2026-10-29, green the same day. THE ITEM IS COMPLETE.

**One choice not built as agreed:** the "Merge…" link in the possible-
duplicate WARNING. Neither warning has two patient accounts to merge — on
"Add a user" the new account doesn't exist yet, on "Grant a role" it isn't a
patient until the grant — so the link could only lead to a refusal. Each
match already opens its user page (new tab), which has the merge action.
Told to the person in the delivery.

**Backend:** `GET /patient-merges` (admins — its own path: Nest would try
`/users/merges` as `/users/:id` and answer 400); the notice
(`alerts/patient-merge-notices.service.ts`, `isPatientMergeNoticeFor` = the
complaint review's rule on the merge's admin and moment; `POST
/alerts/patient-merges/:mergeId/review`; `PATIENT_MERGE_NOTICE_REVIEWED`,
vocabulary **115**). Practitioners may READ every merge row (pass 3), so the
care-team check is the only thing hiding other clinics' merges — tested (404).

**Frontend:** `src/patient-merges/` — `/admin/users/:id/merge?with=`:
choose the other account (patients not merged away, namesakes told apart by
email and birth date), compare (identity only; "These differ: …" said in
words; a failed read shows "—" and LoadError), choose the account kept
(either way round; a refused choice disabled WITH its reason via
`aria-describedby`), the consequences, StepUpForm. A merged account's page:
the "Merged into …" notice and nothing else (a patient's page waits for the
merges first). The users list: a "Merged" badge. For review: the merge row
("Open patient"), and the section's introduction names merges. Audit
wording: the three actions, the step-up purpose, every detail label.

**Verified:** backend **2,115 unit**, e2e **1,146** (all — the pagination
ECONNRESETs didn't occur); frontend **3,039** (241 files); first download
774.26 → 774.73 kB, the merge page its own 8 kB file. Mutations: 33 + a fix
round, all killed. Live in Chromium (1280; 375 dark — no horizontal scroll).
One failure on the person's machine first: `loadErrorConvention` — the
comparison wrote "Couldn't load" itself; fixed with LoadError (the sandbox's
stale vitest cache had hidden it). **Green on the person's machine
2026-10-29.**

---

## §28 — Phase 6.5: the database's half of two service rules (2026-10-29)

Chosen by the person from `deferred-improvements.md`, after the duplicate
patients item, and placed in a new roadmap **Phase 6.5** (leftovers and
defence in depth) together with that item. Two rules the services kept, which
a direct query under the app's role could still break.

### The person's choices (2026-10-29, both recommended)

- **Care-team links: exactly what the API does.** Not only "the other columns
  are frozen" (the deferred entry): also an ended link is final, and the end
  is `now()`. The other options offered: columns + ended-is-final (still
  allowing a backdated or extended end), and columns only (re-opening an
  ended link — clinical access back with no `CARE_TEAM_JOINED` entry — left
  possible). Consequence accepted: a future "change a planned cover's end"
  feature needs a migration of the trigger.
- **End date: open programs only.** The trigger judges an end-date move only
  while the program is active before AND after the change. Closing (Complete
  / Cancel) keeps its own rule, `closingEndDate` — the practitioner's
  yesterday, which can be two days before UTC's today — and the closed-program
  guard (0031) freezes the row afterwards. Offered and not chosen: also bound
  a close's end by the earliest day `closingEndDate` could give (a looser
  rule than the real one).

### How (migration 0073, custom, `care_team_and_end_date_guards`)

- **Triggers, not column GRANTs** (the deferred entry's other option): a GRANT
  needs the app role's name, an environment variable a migration can't read
  (it would live in `scripts/create-app-role.ts`); it can say which columns,
  never how (ended-is-final, the end is now); and its refusal is 42501, the
  same SQLSTATE as a row-security refusal.
- **The 0031 / 0033 pattern:** BEFORE UPDATE, the tables' owner exempt
  (`pg_has_role(current_user, relowner, 'MEMBER')`), SQLSTATE 23514 with a
  constraint name — `care_team_member_end_only`, `assigned_program_end_date_not_past`
  (`pg-errors.ts`).
- **Translated by `HttpExceptionFilter`,** like every database refusal a client
  can cause: the end date as the service's own 400 in its words
  (`END_DATE_IN_PAST_MESSAGE`, now exported from `end-date.ts` and used by
  both), a care-team change as a 409 "A care-team link can only be ended, and
  only while it is current" (no route asks for one — the conversation-
  participants guard's reasoning: a future route gets a readable answer).
- **"Yesterday in UTC"** is `(now() AT TIME ZONE 'UTC')::date - 1`, the
  schedule policies' expression (0025). The service judges with the request's
  clock, the trigger with the transaction's: they differ only within a moment
  of midnight UTC, and the client then reads the same 400.

### Built 2026-10-29, green the same day

Backend only: migration **0073**; `pg-errors.ts` (two constants);
`end-date.ts` (`END_DATE_IN_PAST_MESSAGE`); `http-exception.filter.ts` (+
spec: both translations, a neighbouring CHECK still a 500);
`care-team.schema.ts` (a comment). Tests as the app's role directly —
`care-team.e2e-spec.ts` › "only ending a link (the database)" (9, on a patient
of their own) and `program-exercises.e2e-spec.ts` › "the end date's database
half" (6, including a real Complete on the practitioner's yesterday, two days
back in UTC). Every refused statement was shown to SUCCEED with the trigger
disabled. Backend **2,118 unit, e2e 1,161**; 17 mutations, all killed (one
first-round survivor closed by a test — deep-dive §37.3). No frontend change.

---

## §29 — Phase 6.5: the paged users list, and an admin home that stays current (2026-10-29)

Two leftovers of the admin screens (`deferred-improvements.md`, "Admin home:
ideas left out of the metrics"), chosen by the person after the guards (§28).

### The person's choices (2026-10-29)

- **A new paged admin route** (recommended): `GET /admin/users` → `{ data,
  meta }`, the audit log's shape. `GET /users` stays the WHOLE list: three admin
  screens pick from every account (the audit log's person filters, the merge
  page, the merged-account notice) and a practitioner reads it as "my
  patients". Not chosen: paging `GET /users` and turning the three pickers
  into search-as-you-type fields — the scalable end state, now its own deferred
  entry ("The admin pickers still load every account"). `?attention=` moved
  from `GET /users` to the new route (one list, one set of filters).
- **All four filters:** search (part of a name, "first last", or an email —
  case-insensitive; accents still count), role (a two-role account under each),
  clinic (one, or "No clinic"), and a Status select (active / deactivated /
  all) replacing the "Show deactivated users" checkbox, which lived in page
  state and was lost on reload. All combine (AND) with the "Show" groups.
- **The audit log's pager, 25 a page** (recommended): Previous / Next, "Page
  N of M", the count in a live region, the page in the address. Not chosen:
  "Show 50 more" (a deep position can't be linked or kept on reload).
- **Admin home: BOTH** a refetch every minute and a Refresh button (the
  recommendation was the minute alone, with an "Updated" line).

### How

- **Backend:** `ListUsersQueryDto` (extends the shared pagination DTO, its own
  default of 25; `clinic` = an id of at most 9 digits — it must fit Postgres's
  integer — or `none`; a blank search is no search), `userListWhere()` in
  `users/user-list.ts` — ONE condition for the rows and their count; role and
  clinic as `EXISTS` / `NOT EXISTS` subqueries (a join would list and count a
  two-role account twice); the search through the directory's
  `containsPattern` (wildcards literal); the groups through
  `attention-rules.ts`, so the home's numbers and the list agree.
  `UsersService.findPage` orders by last name, first name, id — a total order,
  which LIMIT / OFFSET paging needs — under the admin's row security (the
  attention rules read care-team links). `AdminUsersController`
  (`@Controller('admin/users')`, admins only, no audit entry: account data, not
  clinical). `findNeedingAttention` and `ATTENTION_ADMINS_ONLY_MESSAGE` removed.
- **Frontend:** `userListFilters.ts` (address ↔ filters, pure; unreadable
  values read as their defaults), the audit log's address hook generalised as
  `common/useAddressFilters.ts` with a `replace` option; the search box keeps
  what is typed apart from the address and commits 300 ms after the last
  keystroke, REPLACING the history entry; the previous page stays (dimmed,
  `aria-busy`) while the next loads.
- **Admin home:** `useAdminHome.ts` (both queries, `refetchInterval` 60 s —
  paused while the tab is hidden); `AdminHomeFreshness` ("Updated … · refreshes
  every minute", the OLDER answer's time; Refresh with `aria-disabled`, a
  status announced only after a press). Found by thinking about polling: a
  background refresh that failed used to replace the numbers with an error —
  the sections now keep their data and the line says "Couldn't refresh.
  Showing the numbers from …".

### Built 2026-10-29, green the same day

Backend: `users/admin-users.controller.ts`, `users/user-list.ts`,
`users/dto/list-users-query.dto.ts` NEW; `users.service.ts`,
`users.controller.ts`, `users.module.ts`; e2e `admin-users-list` NEW (24),
`admin-metrics` (the attention tests moved to the new route). Frontend:
`users/userListFilters.ts` + test, `common/useAddressFilters.ts`,
`app/home/admin/useAdminHome.ts`, `AdminHomeFreshness.tsx` NEW;
`UsersListPage` (+ test, rewritten), `users/api.ts`, `useUsers.ts`,
`attention.ts` (+ test), `AdminMetricsSection`, `RecentActivitySection`,
`adminHomeText.ts` (+ test), `AdminHomePage` (+ test),
`audit-log/useFiltersInAddress.ts` (a wrapper now). Backend **2,118 unit, e2e
1,185**; frontend **3,096**. Mutations: backend 18 (one equivalent — the
status fallback the DTO's default makes unreachable), frontend 35, all others
killed. Live in Chromium (1280 light, 375 dark, 38 accounts). No migration, no
package.

## §30 — Phase 6.5: the clinical leftovers (chosen 2026-10-29, green 2026-10-29/30)

Four open entries of `deferred-improvements.md` (five roadmap lines), chosen
together by the person: each closes a gap a practitioner or a patient would
notice. One pass each, each confirmed green before the next.

### The person's choices

- **New-message emails: a sweep, 15 minutes after the message** — and,
  asked by the person, never the same unread message emailed again ("it
  might feel a bit like harassment"): **at most ONE email per conversation
  until it is read**, and at most one email per person per sweep (several
  conversations waiting → one email naming them).
- **The email names the sender** ("Alex Chen sent you a message on Stride"),
  never the text.
- **A pause's end is a "Back on" date** (the first day the schedule applies
  again), optional on the same form.
- **Copying several exercises: a dialog from the workout's menu**, checkboxes
  for the exercises, the target an existing workout or a new one.
- My choices, stated in the deliveries (none changed): the setting is ON by
  default and lives in the settings menu ("Email me about new messages"),
  changeable only by the person themselves; a thread read is logged only when
  text is SHOWN (an empty page or only deleted messages logs nothing); the
  resumed schedule is the last non-paused version before the pause.

### Pass 1 — roster badges (frontend only)

On My patients and the patient page, a clinic the practitioner doesn't work at
is drawn with a DASHED outline, and says so in words for a screen reader (a
hidden " (not one of your clinics)") — a style alone never carries a meaning
(WCAG 1.4.1). The text keeps its contrast; a one-line key ("Dashed outline: a
clinic you don't work at — the patient is also seen there.") appears only when
a dashed badge is on screen. The directory search passes no clinic ids (its
clinics are shared by definition) and looks as before. `ClinicBadges`
(`myClinicIds`), `OtherClinicsKey`, `roster.ts` (`isOtherClinic`,
`showsOtherClinic`).

### Pass 2 — logging thread reads

`GET /conversations/:id/messages` writes `MESSAGES_VIEWED { messageIds }`
(target = the patient, area `conversations`, clinical → details withheld from
admins) through `AuditService.logReads`, AWAITED before the answer — the step-2
rule (§10): no answer without its trace. The patient's own reads are dropped by
`logReads` itself. Only messages whose text is shown are listed
(`shownMessageIds`): a deleted message's text is gone, so nothing was read.
Vocabulary 116.

### Pass 3 — a pause with an end

`POST /assigned-programs/:id/schedules { type: 'paused', effectiveFrom,
resumeOn? }` writes BOTH versions — the pause, and from `resumeOn` the schedule
in force before it (`contentBeforePause`: the last non-paused version
starting before the pause, its days / rotation copied) — in ONE transaction,
with ONE `ASSIGNED_PROGRAM_SCHEDULE_SET` carrying `resumeOn` and `resumed`.
Refusals (400): the back-on date not after the pause's start; on or after the
program's end ("to pause until its end, leave the back-on date empty"); nothing
before the pause to resume. `resumeOn` is accepted only with a pause
(`OnlyForType(PAUSED)`). The form gets "Back on (optional)" under the pause's
date.

### Pass 4 — copying several exercises, or a workout

`POST /programs/:id/exercises/copy` and `POST
/assigned-programs/:id/exercises/copy { exerciseIds (1–50), targetWorkoutId |
null, newWorkoutName? }` copy the ROWS — on a program the patient's own
description, prescription, notes and photo choice, own photo files copied in
storage — appended to the target in their current order, in one transaction
under the program's lock, ONE audit entry (`TEMPLATE_EXERCISES_COPIED` /
`ASSIGNED_PROGRAM_EXERCISES_COPIED`; vocabulary 118). `targetWorkoutId: null`
creates the workout first. The photos are copied BEFORE the transaction (a
network call doesn't belong inside it) and undone if it fails
(`undoStoredOnFailure`); the sources are re-checked under the lock — changed
meanwhile → 409, nothing written. The old one-exercise "Copy to workout…" now
goes through the same route, which closes "takes the library's current
description".

### Pass 5 — "you have a new message" emails

- **Who is due:** a side of a conversation not emailed since it last read,
  with a message from the other side unread, not deleted, at least 15 minutes
  old (the sender's delete window — a message deleted in time never sends an
  email), an active account with `users.message_email_notices` on.
- **How a job with no user reads it:** `claim_message_notices(min_age_minutes)`
  — the project's second SECURITY DEFINER function (migration 0075, custom),
  hardened like `merge_patients()`; it refuses to run inside a request's context
  and returns only what an email needs, never a message's text.
- **Never twice:** `conversations.practitioner_notified_at` /
  `patient_notified_at` (0074, generated) are set in the same statement that
  claims the rows (`FOR UPDATE SKIP LOCKED` — two sweeps never claim one
  conversation), and cleared when that side reads. The guard trigger lets the
  app only CLEAR a marker (`conversation_notified_by_sweep_only`).
- **At most once, not at least once:** the marker is set before the email is
  sent; a failed send is logged, not retried (a lost notice costs little — the
  message and its badge are still there).
- **The setting:** `PATCH /users/:id { messageEmailNotices }`, the person
  themselves only (403 otherwise); a checkbox item in the settings menu for
  practitioners and patients, optimistic.
- **The sweep:** `MessageNoticesService`, a `setInterval` of 60 s started in
  `main.ts` after `listen` (not in the e2e apps), one sweep at a time.

### Built and green

Backend **2,184 unit, e2e 1,235** (1,230 + the 5 sandbox-only pagination
tests); frontend **3,155**. Migrations **0074** `message_email_notices`
(generated) and **0075** `claim_message_notices` (custom); vocabulary **118**
actions. Mutations: badges 16, read logging 8, pause 18 + 17, copy 24 + 18,
emails SQL 16 (15 killed, 1 equivalent — the outer prefilter) + TS 15 + FE 8;
all others killed. No package.

---

## §31 — Phase 7: exercise thumbnails, and the library list's order (2026-10-30)

Phase 7 started 2026-10-30. Asked which item to start with, the recommended
order was: the thumbnails (the phase's only 🟡, small, a visible gap), error
tracking / observability, snackbars, a small Playwright suite built from the
phases' demo targets, then one larger feature (range of motion, or the session
timer) — the roadmap's Phase 7 note keeps the reasons. The person started
with the thumbnails.

### Thumbnails — what the code showed first

- `GET /exercises` sent each row's `mediaUrls` as RAW storage keys, where the
  detail routes answer signed URLs (`withImages`).
- `ExerciseCard` (the Library and the exercise picker) drew a dumbbell on every
  card; its comment and `types.ts`'s said exercises had no signing step yet —
  no longer true.
- Signing is local (no request to storage), so signing 20 covers is cheap. The
  real problem: a signature carries its signing time, so every refetch hands
  out NEW URLs for the same photos and the browser downloads them all again;
  and a practitioner's own photo can be 5 MB.

### The person's choices (2026-10-30, all recommended)

- **Stable URLs**, not real thumbnails: sign with a time rounded down to the
  hour (2-hour lifetime) and ask storage for `Cache-Control: private,
  max-age=3600`. Real thumbnails (`sharp`, a column, a backfill) deferred.
- **The whole photo** (`object-contain`, like the carousel) — not cropped to
  fill.
- **The Library and the picker only** — not the template / program exercise
  rows.

### Stated, not asked

`coverUrl` (or `null`) replaces `mediaUrls` in the list — no keys leave the
backend; the dumbbell when there's no photo OR it fails to load; `alt=""`
(the name is below); lazy loading in a fixed frame; the two stale comments
corrected. One `now` per request for every cover.

### The library list's order (found on the thumbnails' live check)

"Frog Hops" among the A's: `findAll` had no `ORDER BY`, so page 2 (a separate
query) could repeat or skip rows. **The person's choice:** `ORDER BY
lower(name), id` — case ignored whatever the database's collation; the id
makes the order total (the users list's and the audit log's rule).

### Built 2026-10-30, green the same day

- **Backend:** `src/storage/cacheable-url.ts` + spec NEW;
  `storage.service.ts` (`getCacheablePresignedUrl`) + spec (real signatures,
  no server); `exercises.service.ts` (`toListItem`, the order) + spec;
  `test/exercises.e2e-spec.ts` (+4: the cover served with its header and
  following a reorder, `null` without a photo, the order on both collations,
  equal names paged once each). Backend **2,194 unit**; e2e +4.
- **Frontend:** `ExerciseCard.tsx` + test, `types.ts`, two fixtures. **3,161
  tests.**
- Mutations: backend 14 + 4, frontend 11 — all killed. No migration, no
  package.
- Not changed, on purpose: the detail pages and a program's photos still sign
  fresh 15-minute URLs (`deferred-improvements.md`, "Signed photo URLs…").

### Seen on the way: the alerts test's fixture and the clocks

`alerts.e2e-spec.ts` › "brings the alert back 14 days after the review" fails
where the database session runs on a zone that changed its clocks in the last
14 days (the sandbox, Europe/Paris, after 2026-10-25) — on the base code too.
The cause is the TEST, not the app: it sets `reviewed_at = now() - interval
'13 days 23 hours'`, and Postgres subtracts "days" as CALENDAR days in the
session's zone (one of them 25 hours), landing exactly 14 × 24 hours back. The
app's rule is a fixed 14 × 24 hours (correct). The person's run (UTC) is green.
The fix, if wanted: write the fixture's intervals in hours (`'335 hours'`).

## §32 — Phase 7: error tracking and observability (designed 2026-10-30)

Chosen with the person 2026-10-30 (every recommended option). Read first:
`main.ts`, the pino set-up in `app.module.ts`, `HttpExceptionFilter`,
`ws-exception.filter.ts`, `MessageNoticesService`'s sweep, the frontend's
`api/client.ts`, `queryClient.ts`, `RouteErrorPage`, `staleChunkReload.ts`.

### What existed, and the gaps

- JSON logs in production (pino-http); cookie, `authorization` and the two
  password fields redacted; a 500 logged with its whole `cause` chain;
  tokens always in bodies, never in URLs.
- **Gaps:** nothing notices an error unless someone reads the logs (no
  grouping, no alert; nothing catches `unhandledRejection` /
  `uncaughtException`); the browser's errors die in its console
  (`RouteErrorPage` → `console.error`); pino-http's default request id is a
  per-process counter (1, 2, 3… again after every restart), never returned
  to the client, so a user's "it broke at 14:05" can't be matched to a log
  line; and `send()` calls `response.json()` on every refusal, so a proxy's
  HTML 502 (Caddy, Cloudflare) throws a `SyntaxError` instead of the "on our
  side" sentence.

### The deployment it is designed for

Not deployed today; deployed once before (pipeline test) and again before the
review: a DigitalOcean droplet, 2 GB / 1 vCPU, behind Cloudflare and Caddy.
**Better Stack** (uptime, and logs shipped by its Docker Vector agent) is
planned for the deployment phase. Better Stack's security page says it is
"currently not HIPAA compliant" (no BAA) — so the shipped LOGS are a
third-party copy too, exactly like an error report.

### The rule

**Nothing that leaves the server — a log line or an error report — names or
locates a patient.** User ids, request ids, route templates, status codes,
stack traces are fine; email addresses, names, search terms, request and
response bodies, message text, IP addresses are not.

### The person's choices

1. **Self-hosted GlitchTip**, with the official Sentry SDKs (`@sentry/nestjs`
   backend, `@sentry/react` frontend — exact versions pinned, a release at
   least two weeks old; GlitchTip's support for that SDK major checked live
   before building on it). GlitchTip is open source and speaks Sentry's
   envelope protocol: only the DSN would change to move to Sentry later
   (which would then need a BAA — business plans only).
2. **Scope: backend AND frontend errors.** Performance tracing left out
   (spans carry URLs and queries — more to scrub, a different topic). Uptime
   left to Better Stack — it watches from OUTSIDE, which is the only place
   that can see the droplet down (GlitchTip's own uptime checks would run on
   the box they watch).
3. **A server-made request id, shown.** The backend makes a random id per
   request (`randomUUID()`, pino-http's `genReqId`), answers it in
   `X-Request-Id` (exposed through CORS) and in the error body
   (`requestId`); every log line of the request carries it; the backend's
   report is tagged with it; the frontend's report carries the id of the
   failed answer; the error screens show a short "Reference: 7f3a…" a user
   can quote. An id sent by the browser is NOT trusted (a client could
   choose or forge ids in the logs). One reference finds the error in
   GlitchTip and every log line of that request in Better Stack.
4. **Log hygiene, all of it, in the app** (not left to Vector's VRL — it
   can't fix free-text messages, and it's easy to forget): the ~12 log lines
   naming an email say the user id instead; logged URLs lose their query
   string (`/admin/users?search=Jane Doe` → `/admin/users`), in pino-http's
   request serializer AND the exception filter's message; no bodies; IPs
   dropped from request lines (Stride's audit log stores none, so nothing
   else is lost). A convention test fails if a log call interpolates an
   email.
5. **The browser's reports go through our API**: the Sentry SDK's `tunnel`
   option posts envelopes to `POST /monitoring`; the backend accepts only
   this project's DSN (not an open relay), size-limits and rate-limits,
   scrubs again, and forwards to GlitchTip on the internal Docker network.
   GlitchTip's UI is never public (reached over an SSH tunnel), and
   ad-blockers don't drop the reports.
6. **GlitchTip gets its own small Postgres container** — Stride's server is
   untouched by its settings (`max_locks_per_transaction` is
   instance-wide), upgrades and load. GlitchTip itself all-in-one
   (`GLITCHTIP_EMBED_WORKER=True`) and Postgres-only (`VALKEY_URL=""`): its
   docs give 256 MB minimum, 512 MB recommended. Swap (1–2 GB) on the
   droplet suggested for the deployment phase.

### Scrubbing, by layer

- **Backend `beforeSend`:** no `request.data`, cookies, headers other than an
  allow-list, query strings, `user` other than `{ id }`; `sendDefaultPii:
  false`; no local variables; breadcrumbs limited to our own log
  messages (already clean by rule 4).
- **Frontend:** no Session Replay; no console breadcrumbs; `ui.click`
  breadcrumbs dropped (their selector and text can contain a patient's name);
  fetch/xhr breadcrumbs reduced to method, route without query, status;
  URLs stripped of query and hash; `user` = `{ id }` only.
- **The tunnel** applies the same URL / user rules again on the server — the
  browser's code can't be trusted to have done it.
- Tests send a report full of planted PHI (an email, a name in a query, a
  message body) through each layer and assert none of it arrives.

### Passes (proposed)

1. **Backend: request ids and log hygiene** — no new package. `genReqId`,
   the header and `requestId` in the error body, CORS exposure, URL and IP
   serializers, emails → user ids, the convention test, the 502 fix on the
   frontend (`send()` reading a non-JSON refusal).
2. **Backend: GlitchTip and `@sentry/nestjs`** — docker-compose (GlitchTip +
   its Postgres), `instrument.ts` loaded first, the exception filters and
   the sweep reporting, process-level handlers, `beforeSend`, the
   `/monitoring` tunnel.
3. **Frontend: `@sentry/react`** — init with the tunnel, the router's
   error page and an error boundary reporting, a 5xx answer reported with its
   request id, "Reference: …" on the error screens, the scrubbing rules.

### Pass 1 — built 2026-10-30, green the same day

Request ids and log hygiene, as designed; no package, no migration
(`claude/phase-7-deep-dive.md` §3).

- **Backend, `src/observability/` NEW:** `request-id.ts` (`assignRequestId` —
  `randomUUID()`, made once, reused by the filter; the client's `X-Request-Id`
  never read; no header once the answer has started), `log-scrub.ts`
  (`pathOnly`, `scrubText` — emails → `[email]`, Drizzle's `params` and
  Postgres's repeated input value → `[redacted]` —, `serializeError`: an
  ALLOW-LIST of fields, the cause chain followed to 5 levels),
  `logger-options.ts` (`pinoHttpOptions()`: `genReqId`, `quietReqLogger`,
  `customProps` → `userId`, the `req` / `res` / `err` serializers, a
  `hooks.logMethod` scrubbing every message, the old redact list kept as a
  second line), `logging-convention.spec.ts` (a source scan: no logger call or
  `new Error(…)` interpolating an email or a recipient, no raw `request.url`).
- **Found while building:** pino-http hands a custom err serializer pino's OWN
  serialized copy (every property, Drizzle's `params` included) with the
  original on a `raw` getter — the allow-list reads `raw`. pino's default
  request line held every header (the `Referer` carries the users list's
  `?search=`), the IP and the port. The convention scan found TWO more lines
  naming an email than first counted (the merge notice, the invitation's
  "sent, but recording failed") — 14 in all.
- **Elsewhere:** `app.module.ts` (`LoggerModule.forRoot({ pinoHttp:
  pinoHttpOptions() })`); `HttpExceptionFilter` (`requestId` in every error
  body — after the extra fields —, the log line with the path and the id);
  `WsHttpExceptionFilter` (a socket 500 gets its own id, in the answer and
  the line); `cors-options.ts` (`X-Request-Id` exposed); the SMTP and Resend
  transports (no address in their log lines or error messages); the services
  logging failed notices (auth, MFA ×2 files, email change — "to the new /
  current / old address of user N" —, password change, invitations ×2,
  records export ×2, patient merges).
- **Frontend:** `api/client.ts` — `readErrorBody` checks the body's shape; a
  proxy's HTML 502 (or any body not the backend's) becomes an `ApiError` with
  the real status and no words; `ApiError.requestId` (body first, then the
  header); `REQUEST_ID_HEADER`. `failureText` gives a wordless refusal the
  "on our side" sentence.
- **Tests:** backend unit (filters, CORS, transports, the services' log
  texts, the four new specs — `logger-options.spec.ts` builds a REAL pino-http
  logger from the same settings in front of a plain Node server and reads
  every line back), e2e `request-ids` NEW (the real AppModule logger: success,
  refusal, unknown route, a body the parser refuses), `mfa` and
  `patient-merges` +1 each (a failed notice logged by the right user's id),
  `possible-duplicates` (the error body's key list gains `requestId`).
  Frontend +9 (`client.test.ts`, `apiErrors.test.ts`). Mutations: backend 52
  (48 killed by unit specs, 4 by e2e), frontend 9 — all killed (5 after new tests).
- **Live:** `GET /admin/users?search=Jane%20Doe` with a forged
  `X-Request-Id` → 401 with the server's id in the header and the body; the
  log line says `url: "/admin/users"`; no "Jane", no IP anywhere in the log.

### Pass 2 — built 2026-10-30, green the same day (live with GlitchTip)

GlitchTip and `@sentry/nestjs` **11.7.0** (exact; the person installed it —
`npm install --save-exact @sentry/nestjs@11.7.0`). No migration
(`claude/phase-7-deep-dive.md` §4). The person's local run confirmed what the
sandbox couldn't (no Docker there): GlitchTip `6` accepts the v11 envelope,
the backend's 500 arrived tagged with its request id, and nothing of the
planted query.

- **What changed from the plan, and why:**
  - `sendDefaultPii: false` is not enough in v11: the SDK collects cookies,
    headers, request and response bodies, database values and local
    variables BY DEFAULT through `dataCollection`. Every key is set off
    explicitly (`frameContextLines: 5` kept — the source lines are our code).
  - The SDK's ~20 default integrations are replaced by a CHOSEN list of 8
    (`defaultIntegrations: false`): event filters, dedupe, function names,
    linked errors (Drizzle → Postgres), uncaught exception, unhandled
    rejection in `'strict'` mode (report, then exit — Node's own behaviour;
    the SDK's `'warn'` would keep the process alive), context lines, Node
    context. No http / console / fetch integrations: `maxBreadcrumbs: 0` (the
    request id ties a report to its log lines instead), no `requestData` (it
    reads the http integration's scope — the filter tags the route itself).
  - `tracesSampleRate: 0`, not unset: unset, the SDK reads
    `SENTRY_TRACES_SAMPLE_RATE` from the environment.
  - `--require` is gone from the SDK: `instrument.ts` is the FIRST import of
    `main.ts` (CommonJS runs it first). Only `main.ts` imports it — the e2e
    suites, the seed and the scripts never report; no `SENTRY_DSN` = off.
  - GlitchTip's all-in-one mode is `SERVER_ROLE: all_in_one` in its current
    images (the plan said `GLITCHTIP_EMBED_WORKER`); logs, uptime, the Django
    admin, the API docs, MCP and DuckDB turned off.
- **Two locks:** what the SDK collects (above), and what it sends —
  `beforeSend: scrubEvent` (`report-scrub.ts`) REBUILDS every report from an
  allow-list (identity fields; the exception's type, scrubbed value,
  mechanism, frames without `vars`, file names path-only; request method +
  path; `user: { id }`; tags `requestId` / `where` / `route`; runtime / OS /
  browser name + version; the trace ids; breadcrumbs reduced by kind —
  console and `ui.*` dropped, navigation and fetch / xhr to paths, method
  and status). The SAME function scrubs the browser's reports in the tunnel.
- **What reports:** both exception filters' 500 branch (`reportError(error,
  { where, route, requestId, userId })`; a 4xx or a translated database
  refusal is an answer, not a bug), the message-notices sweep's failure, and
  the SDK's process handlers.
- **`POST /monitoring`** (`MonitoringController`): public on purpose (an
  error on the sign-in page, or after the session ended); 404 when
  `SENTRY_BROWSER_DSN` is unset; `text/plain` or
  `application/x-sentry-envelope` only (415); 256 KB enforced WHILE reading
  (413); 30 a minute per IP; only envelopes for our frontend project's DSN
  (403 — never an open relay); error events only (sessions, client reports,
  replays dropped; nothing left → 200 and nothing sent); each event scrubbed
  and given the SESSION's user id, not the page's; the header rebuilt as
  `{ event_id, sent_at, dsn }`; forwarded to the DSN's host (`glitchtip:8000`
  on Docker's network) with a 5-second timeout (502 on failure, a warn line).
  `@NotAudited` (it changes no data).
- **Found on the way — the API crashed when Postgres closed an idle
  connection** (a restart, maintenance): `pg`'s pool emits `'error'` for an
  idle client, and an `EventEmitter` `'error'` with no listener throws —
  the process exited. Not asked for; delivered as my addition, open to the
  person's veto (kept). `database/pool-errors.ts` (`survivePoolErrors(pool,
  name)`: a warn line) on the app's pool and the session store's. Live: 500s
  with their reference during the outage, normal answers once Postgres was
  back, no restart.
- **Settings:** `SENTRY_DSN`, `SENTRY_BROWSER_DSN`, `SENTRY_ENVIRONMENT`
  (else `NODE_ENV`), `SENTRY_RELEASE` (`error-reporting-config.ts`; empty =
  off); a malformed DSN stops the boot naming the setting (`validateEnv`,
  `dsn.ts`). `GLITCHTIP_DB_PASSWORD`, `GLITCHTIP_SECRET_KEY` (required in
  production), `GLITCHTIP_EMAIL_URL` (`consolemail://` by default).
- **Compose:** `glitchtip-db` (`postgres:18`, `max_locks_per_transaction=512`,
  volume at `/var/lib/postgresql` — the 18 images' layout) and `glitchtip`
  (`glitchtip/glitchtip:6`): in development under `profiles: ["errors"]`
  (`docker compose --profile errors up -d`), port 8000, emails to Mailpit; in
  production always on, the UI on `127.0.0.1:8000` (SSH tunnel), user
  registration off, the `x-logging` anchor. The image's exact version is to
  pin (`deferred-improvements.md`).
- **Tests:** unit **2,320** (the dataset suite included) — the SDK tested FOR
  REAL with an in-memory transport (`Sentry.createTransport`), so the spec
  reads exactly what would leave the server: a Drizzle error with planted
  values comes out without them, no `"vars"` anywhere, the tags, the user,
  the cause chain; `dsn`, `envelope`, `report-scrub`, `monitoring.controller`,
  `pool-errors`, `validate-env` specs; the filters' and the sweep's specs
  assert their reports. e2e `monitoring` NEW (9) against a real HTTP stand-in
  for GlitchTip. 67 mutations, all killed (three after new tests: the boot
  check of a malformed DSN, `strict` vs `warn`, breadcrumb scrubbing).

### Pass 3 — built 2026-10-30, green 2026-10-31. THE ITEM IS COMPLETE.

`@sentry/react` **11.7.0** (exact, the backend SDK's version; the person
installed it). No migration (`claude/phase-7-deep-dive.md` §5).

- **The person's choices (2026-10-30, all recommended):**
  1. **Frontend bugs only** — a page crashing while rendering, an uncaught
     error, an unhandled rejection. Not the server's answers: the backend
     reports its own 5xx with the same reference, and a proxy's 502 means the
     backend (and the tunnel) is down — the uptime monitor's job.
  2. **A short reference: 8 characters** ("Reference: 7f3a1c2e."), easy to
     read out; the backend's report carries the same 8 as its `reference`
     tag (GlitchTip searches a tag by its exact value); log lines hold the
     full id, found by its prefix.
  3. **On every "on our side" sentence** — one change in `failureText`
     (every failed load and action), the two messaging screens (the socket's
     500 carries an id since pass 1) and the crash page.
  4. **The SDK loaded after the page** — `import('./sentry')`, a file of its
     own (31.5 kB gzipped); the first download grew 1.5 kB (our code and a
     regrouping). Our own `error` / `unhandledrejection` listeners from the
     first line of `main.tsx`; a report made before the SDK arrives waits on
     its promise and is sent once it has.
- **The two locks, browser side:** `dataCollection` all off (v11 has no
  `sendDefaultPii`), 3 chosen integrations (event filters, function names,
  linked errors), no breadcrumbs, no global handlers, no page address, no
  session envelopes; `beforeSend: scrubBrowserEvent` rebuilds the report from
  an allow-list (no user, emails → `[email]`, paths only, tags `where` /
  `route` / `reference`). The tunnel applies the backend's rules again and
  sets the SESSION's user (the SDK's fetch uses `credentials: 'include'`).
- **What isn't reported** (`reportRules.ts`): `ApiError`, a socket refusal, a
  page file that couldn't be downloaded (each browser's words), a request
  with no answer or cancelled. The same error OBJECT is reported once (a
  `WeakSet` — React's StrictMode runs effects twice in development).
- **Found in the live check — Dedupe removed on BOTH sides** (a correction to
  pass 2): the app retries a 5xx twice, so a failed load is three requests
  with three ids and the screen shows the LAST; the backend's Dedupe dropped
  reports 2 and 3 as repeats of the first, so the reference on screen found
  nothing in GlitchTip. Each request is its own event now (GlitchTip still
  groups them into one issue); a test makes three identical failures and
  requires three reports. In the browser the same trap applied to the same
  crash twice.
- **The reference's shape is checked by the tunnel:** `reference` is kept
  only as 8 lowercase hex characters; anything else in that tag is dropped.
- **Settings:** `VITE_SENTRY_DSN` (unset = off), `VITE_SENTRY_ENVIRONMENT`
  (else Vite's mode), `VITE_SENTRY_RELEASE` — BUILD-time values. The DSN must
  be the SAME string as the backend's `SENTRY_BROWSER_DSN`, host included
  (`sameProject`): in production `http://<key>@glitchtip:8000/<id>` in both —
  the browser never contacts that host, only `/monitoring`.
- **The crash page's own words (the person, 2026-10-31):** pass 3 told a
  crash apart from a page file that couldn't be downloaded, so each now has
  its own sentence. A crash: "Something went wrong on this page" — "This is a
  problem on our side, not with your connection. Reloading the page may get
  past it." — and its reference (when reporting is on). A download failure
  keeps "This page couldn't be loaded" / "Check your connection, then
  reload…". One `ReloadButton` for both.
- **Tests:** frontend 3,209 (3,208, then +1 crash-page test: the reload click,
  never tested before — `location` replaced with `vi.stubGlobal`); the real
  SDK with `fetch` stubbed (the address, `credentials`, the envelope's DSN,
  nothing planted arriving); backend unit 2,329, monitoring e2e 9/9.
  Mutations: 56 + 9 + 5, all killed (four after fixed or new tests: the
  "same crash twice" test made its errors on two lines — different stacks,
  so Dedupe never applied; a plain object passing as a page-file failure;
  the reload click).
- **Live (production build, a stand-in collector):** an uncaught error and an
  unhandled rejection arrived with the session's user id, the email
  replaced, the path only; a crash page's reference equalled its report's
  tag; a real 500 (a column renamed for a moment) showed a reference equal to
  the third report's and to its log line. The person's run with GlitchTip:
  green.

### The deployment files (the person, 2026-10-30) — for pass 2

`docker-compose.prod.yml`: `db` (no published port), `storage` (RustFS on
`127.0.0.1:9000/9001` — reachable from the droplet only, its console over an
SSH tunnel), `app` (built from the Dockerfile's runtime stage, `env_file:
.env`, no published port — Caddy reaches it as `app`), `migrate` /
`create-app-role` / `seed` (the builder stage, `profiles: ["tools"]`), `caddy`
(80/443, `Caddyfile`, persistent `caddy_data`); a shared `x-logging` anchor —
`json-file`, 10 MB × 3 per container. Dockerfile: `node:24-slim`, builder
(`npm ci`, `npm run build`) then runtime (`NODE_ENV=production`, `npm ci
--omit=dev`, `USER node`, a `HEALTHCHECK` on `/health` every 30 s, `CMD node
dist/main.js`).

What it means for pass 2:
- **GlitchTip and its Postgres** go in BOTH compose files: in production on
  the internal network with no public port (the RustFS pattern: `127.0.0.1`
  for the UI, reached over SSH), in development published on localhost; the
  `x-logging` anchor on both. The app reaches it as `http://glitchtip:8000`.
- **The Sentry SDK must load before anything else:** an `instrument.ts`
  imported FIRST in `main.ts` (CommonJS — no `--import` flag needed in the
  Dockerfile's CMD).
- **The HEALTHCHECK writes a "request completed" line every 30 s** — 2,880 a
  day shipped to Better Stack for nothing: worth `autoLogging.ignore` for
  `/health` (a deferred entry for now).

## §33 — Phase 7: snackbars (chosen 2026-10-31)

Chosen with the person 2026-10-31 (every recommended option), after reading
the code: there was no toast; feedback after an action came in four styles.

### What existed, and the gaps

1. **Notices through navigation state** (`navigate(to, { state: { notice }
   })`, read by `common/readNotice.ts`): 8 sites raising, 4 pages drawing a
   green `role="status"` box — "You left Pat Lee's care team.", "Session
   finished. Well done!" / stopped / skipped, "Your password is changed…",
   two-factor on / off, "Entry added." / "Amendment saved.". **Found:** the
   browser keeps `history.state` across a RELOAD and Back, so the notice came
   back on a refresh (`PatientPage.tsx`'s comment said the opposite).
2. **In-page live regions:** the workout editor's "Moved / Copied … to B",
   "X is now in your patients", the invitation and records-link "sent /
   couldn't be sent" blocks (with a follow-up button).
3. **Silent successes that leave the page:** archiving a conversation,
   deleting a template or an exercise, deactivating a clinic, duplicating a
   template — a navigation, no word.
4. **Failures with nowhere to show:** the settings menu closes on a pick; a
   failed weight unit or email setting put its `role="alert"` INSIDE the
   closed menu, seen only when it was opened again.

Field and form refusals (`failureText`, at the field) and load errors
(`LoadError` + Try again) were already consistent and well placed.

### The person's choices

| Question | Chosen | Why |
| --- | --- | --- |
| What draws them | **Radix Toast** | already inside `radix-ui` (no new package); timing, pausing, the announcement, F8, swipe handled |
| What goes in them | **Confirmations + failures with no place on screen** | a refusal belongs next to what was refused; a load error where the content would be |
| When they go | **A success hides (5–10 s by length, paused while hovered, focused or in the background); a failure stays until closed** | nothing that went wrong disappears unread |
| Undo | **None for now** | only two actions have a reverse, both already visible; irreversible ones keep their confirmation |

Stated defaults (not asked): bottom-centre above the phone's tab bar,
bottom-right from `md`; at most 3; focus never moved there; emptied on
sign-out and on a role switch (a patient's name never left on screen for
another role); raised by the code that ran the action — no navigation state;
inline blocks with a follow-up button stay inline.

### Two passes

- **Pass 1 — the machinery and the 8 navigation notices.**
- **Pass 2 — the silent successes, the editor's notices, the settings
  menu's failures** (and "X is now in your patients"). Each site read before
  converting: a notice whose text explains a consequence ("The copy is
  independent…") is checked for length against the timing rule.

### Pass 1 — built 2026-10-31, green the same day

New `src/snackbars/`:
- **`snackbarRules.ts` (pure):** `snackbarDuration(kind, text)` — a failure
  `Infinity` (Radix starts no timer); a success `clamp(2 s + 50 ms ×
  characters, 5 s, 10 s)` (~200 words a minute, plus time to notice);
  `addSnackbar(list, next, max = 3)` — closed rows dropped, the same kind +
  text REPLACED (moved to the end, timer restarted), over the limit the
  oldest SUCCESS among the EARLIER rows leaves first, else the oldest
  failure — the new row is never the one pushed out; `closeSnackbarIn`
  marks a row closed (kept for Radix's closing animation, dropped at the next
  add).
- **`snackbarStore.ts`:** a Zustand store (its first use — the Phase 0 choice
  for client state) at module level: the page that raises "Session finished"
  unmounts as it navigates, and the message must outlive it. `showSuccess`,
  `showFailure`, `closeSnackbar`, `clearSnackbars`; ids from a counter.
- **`Snackbars.tsx`:** Radix `Toast.Provider` (label "Notification", swipe
  right) + one controlled `Toast.Root` per row (`open` from the store,
  `onOpenChange(false)` → `closeSnackbar`; `type` foreground = assertive for a
  failure, background = polite for a success) + `Toast.Viewport` (z-[60],
  above the tab bar on phones with its safe-area calc, `md:` bottom-right
  24rem, `pointer-events-none` around the rows). The kind said by the words
  and drawn by the icon AND the border; "Close notification" on every row;
  `motion-reduce` respected. Checked in Radix's source (1.3.1): pauses on
  pointer over the region, focus inside it, and window `blur`; the
  announcement is a separate visually hidden live region for 1 s ("Notification
  Entry added.") — why tests look inside the region.
- **`AuthenticatedLayout`:** `<Snackbars key={identity} />` beside the shell,
  outside the page's `<Outlet />`; `identity = user.id:role` (the messaging
  connection's key, now one variable). The component's effect clean-up
  empties the store — on sign-out (the layout unmounts) and on a role switch
  (the key changes).
- **The 8 sites** call `showSuccess` then `navigate(…, { replace: true })`
  (no state); the 4 boxes and `readNotice.ts` (+ test) deleted.
  `sessionReturn.ts` keeps its own defensive reader. The signed-out pages'
  notices (the sign-in page after a reset, an accepted invitation, a
  sign-out reason) stay inline: they tell the next step on that form.
- **Tests:** `snackbarAssertions.ts` — `expectSnackbar(kind, text)` /
  `raisedSnackbars()` read the STORE (a page's job ends at raising it), and
  `snackbarArea()` / `drawnSnackbar(text)` for the tests that render
  `<Snackbars />`; `test-setup.ts` empties the store after each test. The
  receiving pages' notice tests became "draws nothing from navigation state".
  Frontend **3,223** tests (+14: rules 15, component 9, layout 2; the old
  notice tests removed). Mutations: 32 — 31 killed, 1 equivalent (the icon's
  `aria-hidden`: lucide sets it on an icon with no label).
- **Bundle:** main file +14.6 kB (+4.6 kB gzip) — Radix Toast (~13 kB) and
  Zustand (~1 kB). Kept in the main file on purpose: a failure snackbar
  matters most when the network is bad, the moment a separately loaded file
  might not arrive.
- **Live (production build, real backend, Chromium):** confirmed first that
  `history.state` survives a reload (the old notices' bug). Alex, 1280 light:
  a progress note for Pat → "Entry added." bottom-right; hovered 7 s and still
  there, gone ~5 s after the pointer left; after a reload, nowhere. Pat, 375
  dark: a password change → the snackbar 16 px from both edges, its bottom
  edge 18 px above the tab bar, no sideways scroll; after logging out, gone.
  Seed reset after.

### Pass 2 — built 2026-10-31, green the same day — THE ITEM IS COMPLETE

Each site read first; what was decided per site:

| Site | Now | Why |
| --- | --- | --- |
| Archive a conversation | "Archived your conversation with Pat Lee. A new message from either of you brings it back." (`archivedText`, `messageText.ts`) | the list it lands on no longer shows it; says the one thing that brings it back |
| Unarchive | nothing | the conversation stays open; the button turns back into Archive |
| Delete a template | "Deleted Shoulder Rehab. Programs already assigned from it are not affected." | repeats the confirmation's reassurance |
| Delete an exercise | "Deleted Wall Slide from the library." | the library just lacks it |
| Deactivate a clinic | "Deactivated Acme Clinic. It's no longer in the active clinics list." | same |
| Duplicate a template | "Duplicated the template. You're now on the copy, "Copy of …"." | the copy's page looks like the original's — nobody edits the original by mistake |
| Workout editor: moved / copied / removed | the same sentences (`copiedNotice`, `removedNotice`), as snackbars | the card jumps away or disappears; the editor's `notice` state and its polite live region removed. Its `problem` (a failure, next to the list) stays |
| "X is now in your patients" (Add patient), "added instead" (Invite) | **stay inline** | both carry a follow-up link ("Go to my patients"); the invite's is the result page itself |
| Settings: weight unit, email setting | `showFailure(settingFailureText(setting, error))` from each hook's `onError`; the in-menu alerts removed | the closed menu hid them; now with the reason (`failureText` — the 5xx keeps its Reference) |

- **`auth/settingFailureText.ts` NEW** (+ test): "Couldn't save your weight
  unit." + `failureText(error, 'Check your connection and try again.')` — the
  load errors' shape. A burst of failed picks shows ONE snackbar (the same
  sentence replaces the first).
- **`snackbarAssertions.ts`:** `findSnackbar(kind, text | RegExp)` — waited
  for (raised in an `onSuccess`, after the answer).
- **Tests changed in meaning:** the editor's "clears the last action's message"
  became "clears a FAILURE when the next action starts" (a confirmation is a
  snackbar with its own timer now); failed actions assert no snackbar.
- Frontend **3,226** tests (250 files, +3); 17 mutations, all killed (one
  dropped before running: it called a function the file doesn't import —
  it would have died of that). No package; main file 141.56 kB gzip (+0.06).
- **Live (production build, real backend, Chromium):** Alex at 1280 px —
  archive (snackbar on the list), duplicate (on the copy), a move on the copy,
  deleting the copy (three rows stacked, the newest last); Pat at 375 px dark —
  a forced 500 on the weight unit: the failure with its Reference above the
  tab bar, still there after 12 s, kg still ticked, no alert in the menu,
  gone 205 ms after Close (the fade). Seed reset after. Seen: at 1280 px a
  snackbar can cover the ⋮ buttons of the lowest visible card — left as is
  (scrolling uncovers them; a success leaves in 5–10 s).

## §34 — Phase 7: the browser suite (Playwright, chosen 2026-10-31, green the same day)

Chosen with the person 2026-10-31, after they asked why it was needed and
whether now was the time (the answer is in the session: the seam between the
jsdom tests and the API suites, six bugs found only in Chromium by throwaway
live checks, deployment ahead; stable screens now that snackbars are done).

### What existed

No browser test. Vitest (3,226 tests) runs in jsdom against a faked backend;
the backend's Jest e2e suites call the API with no browser. Each session's
live checks were scripts in the scratchpad, rebuilt and lost every time. The
roadmap had two lines: "Full e2e test suite (API-seeded test data, not
UI-driven)" and Phase 7's "a small Playwright suite built from each phase's
Demo target".

### The person's choices

| Question | Chosen | Why |
| --- | --- | --- |
| Database | **Its own `stride_e2e`**, prepared and seeded FRESH by every run; a second backend on port 3100 (rate limits off), the production build on 4174 | development data never touched; every run starts from the same state |
| Flows | **All four groups:** accounts (P1–P2), the practitioner (P3), the patient on a phone (P4), messages + medical file (P5–P6) | one test per demo target |
| Browsers | **Chromium only** | fast and reliable; Firefox / WebKit are one line each later |

Stated defaults: `@playwright/test` **1.63.0** exact (released 2026-09-04 —
the version whose Chromium the sandbox has); one worker, tests in order (one
shared database); no retries (a flaky test must show); a trace and a
screenshot kept only for failures; the browser pinned to `en-GB` and
Europe/Paris (the same words on every machine); files named `*.e2e.ts`
(Vitest collects `*.spec.ts` / `*.test.ts`); no CI yet.

### How it works

- **Backend** (by the person: two npm scripts, given as text):
  `db:prepare:e2e` = `cross-env POSTGRES_DB=stride_e2e` → `scripts/create-database.ts`
  (NEW — `CREATE DATABASE` when missing, from the `postgres` maintenance
  database; the name checked as an identifier) → `drizzle-kit migrate` →
  `create-app-role.ts` → `seed-dev.ts --reset`; `start:e2e` = `cross-env
  POSTGRES_DB=stride_e2e PORT=3100 RATE_LIMITS=off FRONTEND_URL(S)=http://localhost:4174
  SENTRY_DSN= SENTRY_BROWSER_DSN= node dist/main` (dotenv never overrides a
  variable already set, so one build serves both databases). No library
  seed in `stride_e2e`: the seed skips the library's exercises, on every
  machine alike.
- **Frontend:** `playwright.config.ts` starts BOTH servers (`webServer`,
  `reuseExistingServer: false`): the backend from `STRIDE_BACKEND_DIR`
  (default `../backend`) — prepare, build, start —, and `vite build --outDir
  dist-e2e && vite preview --port 4174` with `VITE_API_URL=http://localhost:3100`
  and an empty `VITE_SENTRY_DSN`. `tsconfig.e2e.json` (NEW, referenced from
  `tsconfig.json`) type-checks the suite with Node's types; ESLint and oxlint
  ignore `dist-e2e`, `playwright-report`, `test-results`.
- **Sign-in once:** a `setup` project (`e2e/auth.setup.ts`) signs admin, Alex
  and Pat in through the API and saves each cookie (`e2e/.auth/*.json`, in
  .gitignore); tests start signed in (`test.use({ storageState })`). The
  sign-in page has its own test (Morgan, two roles).
- **Prepared through the API, checked on screen:** `e2e/support/api.ts`
  (`apiAs(account)`); the patient test gives today's weekday a session (Alex's
  `POST …/schedules` from today) because Pat's Mon / Wed / Fri would make the
  test pass or fail by the calendar. `e2e/support/mailpit.ts` reads the
  invitation email from Mailpit's API.
- **The tests (9 with the 3 sign-ins):** `accounts.e2e.ts` (two roles →
  practitioner → switch to admin → log out; an admin creates a practitioner,
  the link from the email, a password, a sign-in), `practitioner.e2e.ts`
  (template from the library picker → assigned to Jo, Mon · Thu → the program
  page → the patient page), `patient.e2e.ts` (375 px: start with a pain
  check-in, every exercise Done, finish → the snackbar, "Done for today", one
  more session done, the pain trend, the program's progress section),
  `messages.e2e.ts` (two contexts, a message each way live; a medical file
  entry with its snackbar).

### Found by the suite: snackbars pass 1 broke the role switch

The first run failed the role switch: after choosing Admin the address said
`/admin` and the admin's data loaded, but the SCREEN stayed on the
practitioner's (navigation, the account menu frozen open, Escape doing
nothing). The code before the snackbars worked. Built variants: no snackbars
— works; snackbars without `key={identity}` — works; with the key but no
clearing — frozen. **The remount of Radix's toast provider (the key) in the
same update as the switch, made from the still-open account menu (another
Radix layer), froze it.** The exact internal mechanism isn't pinned down; the
cause is measured. Fix: `<Snackbars identity={identity} />` and
`useEffect(() => clearSnackbars, [identity])` — the list is still emptied on
a new identity and on sign-out, nothing is remounted. Unit tests: a new
identity empties the list with the SAME region element; the same identity
keeps it. No jsdom test could see the freeze; you had confirmed both snackbar
passes green.

### Verified

- Playwright: 9 / 9, three more full runs green (1.2–1.3 minutes each, the
  servers included). Proven able to fail — five changes put back one at a
  time, each failing its test: the `key` (the role switch), no snackbar after
  finishing (patient), the medical file's words, live `newMessage` events
  ignored (messages); and the unit test with the effect's dependency removed.
- Frontend 3,228 Vitest tests (+2), tsc, ESLint + oxlint clean (the known
  warning). Backend: `create-database.spec.ts` (9); prepared the database for
  real (36 s), twice.
- **What must be running for the suite:** Postgres, RustFS, Mailpit (`docker
  compose up -d`). Ports 3100 and 4174 free.
- **Green on the person's machine (Windows) 2026-10-31:** 9 / 9 in 1.7 minutes.
  Their first try printed `spawn C:\Windows\system32\cmd.exe ENOENT`: their
  backend folder is `Stride-backend`, and Node reports a MISSING working
  folder as a missing SHELL. Hence `e2e/support/backendDir.ts`: the folder is
  looked up — `STRIDE_BACKEND_DIR`, else `backendDir` in `e2e/local.json`
  (their own file, in .gitignore), else `../backend` — resolved from the
  frontend folder, and CHECKED before anything starts: no `package.json`
  there, or no `db:prepare:e2e` / `start:e2e` script, gives a sentence saying
  what to do.

---

## §35 — Phase 7: the session timer (chosen and green 2026-10-31)

Chosen as Phase 7's "one larger feature" after the browser suite. Read first:
decisions §5.9 (2026-10-16) had said "no duration sent, no per-exercise
timer: `startedAt` / `completedAt` already measure the session … a hold timer
for timed exercises: a later nicety" — this item is that nicety.

### What existed

- A prescription has `sets`, `reps`, `durationInSeconds` and a weight — **no
  rest time**. The seed's two timed exercises: Child's Pose (30 s) and Plank
  (3 × 20 s), in Jo's Lower Back Mobility.
- The backend already ACCEPTS two durations the app never sends:
  `durationActualInSeconds` on a checklist row (the PATCH), and
  `totalDurationInSeconds` on Finish (`assertDurationPossible`: never longer
  than the time since the start). The records export prints them when present.
- The player (`SessionPlayer` / `ExerciseStep`): one exercise at a time, every
  write optimistic; `ExerciseStep` is keyed by the exercise's id, so its state
  starts fresh on Next.

### The person's choices

| Question | Chosen | Not chosen, and why |
| --- | --- | --- |
| Which timers | **A hold countdown** (a prescribed duration: one hold per set) **and a stopwatch** (no duration) | a session clock (`startedAt` already says it); a rest timer between sets — needs a NEW prescription field (migration, both editors, the session's copy) |
| Recorded? | **No** — a helper on screen only; §5.9 stands | sending `durationActualInSeconds` ("held 25 of 30 s"): a timer the patient may skip is an unreliable clinical number |
| End signals | **A beep** (Web Audio, no file; a switch, remembered on the device) **and the screen kept on** (Screen Wake Lock) | vibration (`navigator.vibrate` — Android only, iPhone Safari ignores it); visual + screen reader alone |
| After the last set | **Done stays the patient's tap** ("Press Done below if you managed it.") | a "Mark as done" shortcut; ticking Done automatically (the timer can't know the hold was managed) |

### The rules (`src/sessions/timer/timerRules.ts`, pure)

- **A plan:** `holdPlan(exercise)` → `{ holdMs, sets }`; sets missing, 0 or
  negative = one hold; a duration missing, 0 or NEGATIVE = no plan (the
  stopwatch) — the DTOs refuse a duration under 1 s, but the database has no
  CHECK on it.
- **Four states:** `ready(set)` → `running { since, heldBefore }` ⇄ `paused
  { held }`; time up → `ready(set + 1)` (no rest timer: the next set waits for
  the patient's Start) or, after the last, `all_done`; Reset (only while
  running or paused) restarts THIS set, keeping the sets already held; "Start
  over" goes back to set 1.
- **Time is calculated, never counted down:** the state keeps WHEN the hold
  started; the time left is `holdMs − (heldBefore + now − since)`, from
  `performance.now()` (monotonic — the wall clock can jump). Browsers slow
  timers in a background tab; a calculated time is right the moment it's read
  again, and a tick on `visibilitychange` reads it at once.
- **Events from two states** (`holdEvent(before, after)`): started, paused,
  resumed, reset, set_done, all_done — the beep and the screen-reader sentence
  come from them, so a hold that ended in a hidden tab is said the same way on
  return.
- **The screen is kept on** while a hold counts AND between two sets (a phone
  locks after ~30 s, the time a patient catches their breath); not when paused,
  not before the first set or after the last. The stopwatch: while it runs.
- **Clock text:** a countdown rounds UP ("0:20" for the whole first second,
  "0:00" only when over); a stopwatch rounds DOWN; `h:mm:ss` from an hour.
  Screen readers get words ("1 minute 30 seconds"), not "1:30".

### The screens

- **Where:** in `ExerciseStep`, after the steps ("read, then do") and before
  Done ("tap when done"); only in the player, i.e. an open session of today.
- **One main button whose words change** (Start / Pause / Resume / "Start set
  2" / "Start over"), so keyboard focus stays on it; Reset beside it while a
  hold is under way, focus handed to the main button when Reset disappears.
- **Accessibility:** the clock is `role="timer"` (not a live region — a voice
  reading every second would drown everything) holding digits for the eyes and
  words for a screen reader; each event announced ONCE in a polite
  `role="status"` that's always on the page; the progress bar is drawn only
  (`aria-hidden`), its transition off under reduced motion.
- **The beep:** an 880 Hz sine through a gain envelope (10 ms ramps — a jump
  clicks), two beeps when a set ends, three after the last; ONE shared
  `AudioContext`, created / resumed inside the Start click (browsers — iPhone
  Safari above all — refuse sound no tap asked for). The iPhone's silent
  switch mutes Web Audio: the screen and the announcement still say it.
- **The sound switch:** "Beep when a hold ends", a native checkbox, on by
  default, remembered in `localStorage` (`stride-timer-sound`) — about the
  place, not the person, like the theme; storage that throws = the default.
- **The wake lock:** asked again when the page becomes visible (the browser
  releases it when hidden); a lock arriving after it stopped being wanted is
  released at once; a refusal or a missing API is ignored (the screen may lock,
  as before).
- **Forgotten on Next:** the timer lives and dies with its exercise; nothing is
  sent (a test proves no PATCH).

### Verified

- Frontend 3,330 tests (+104; 258 files), tsc, ESLint (the known warning).
- 87 distinct mutations: 84 killed; 2 equivalent or unreachable, said in the
  code (`=== set + 1` vs `!==` — Reset is the only other way from running to
  ready; the all-done branch of the announcement's `set`); 1 dead branch
  removed (the bar's "full after the last set" — `remainingMs` already gives
  0). One gap closed with a test (the hint before set 3).
- Bundle: the main file unchanged (445.69 kB / 141.59 gzip); the session page's
  lazy chunk 9.74 → 19.34 kB (3.39 → 6.40 gzip).
- Live in Chromium, production build, Jo's Plank and Cat Stretch (375 px dark,
  1280 px light): 0:17 after 3.2 s, a pause held it; 2 + 2 + 3 tones; the wake
  lock (granted through CDP in Chromium's new headless mode) held while
  holding, released on Pause, KEPT between sets, released after the last set
  and on the stopwatch's pause; a hidden page through set 2 showed "Start set
  3" on return; Done never ticked; no sideways scroll.
- **Green on the person's machine 2026-10-31**, confirmed live.
- **A browser test, green the same day** (`e2e/timer.e2e.ts`, decisions §34's
  suite): Jo at 375 px — Alex prepares, through the API, a one-exercise
  template with a 3 × 20 s hold assigned for today (Jo's seeded Lower Back
  Mobility doesn't exist in `stride_e2e`: the suite's seed has no exercise
  library, and that template is library-only). Playwright's clock
  (`page.clock.install()` / `pauseAt` / `runFor`) fakes `Date`, the timers and
  `performance.now()` in the page: "0:14" after 6.5 s, held through a 60 s
  pause, "Start set 2", the status sentence, 0:20 between sets, "All 3 sets
  held"; Chromium's real `AudioContext` tones counted by an init script
  (2, then 7); Done unpressed. Proven able to fail: the countdown rounded
  down, the unlock removed from the click, the next set starting by itself —
  each killed. Suite 11 / 11 (1.1 min).

### Open

- **Duration with reps** ("3 sets · 10 reps · 5 s"): per rep or per set? The
  timer runs one hold per set. If practitioners prescribe holds per rep, a
  small follow-up (deferred entry).
- **A rest timer** needs a prescription field first (deferred entry).
- **On the person's phone:** the beep, the screen staying on through a 30 s
  hold, the checkbox in dark mode on Windows.

---

## §36 — Phase 7: practitioner-measured range of motion (chosen 2026-10-31, complete 2026-11-01)

The roadmap's line ("range of motion per joint — the clinical counterpart to
the patient's self-assessed score; its own screens") left the whole design
open. Proposed after reading the medical file's code (the closest existing
record); the person chose:

- **Where:** its own record, LINKABLE to the medical file entry of the same
  visit (the largest option, over "its own record" and "inside a SOAP
  entry"). Both records are append-only, so neither can be edited to add a
  link later: **the link lives on the assessment** (the recommended
  follow-up), set when it is recorded; linking one afterwards is an
  amendment. A note's page will offer "Record measurements for this visit"
  (pass 2).
- **What is measured:** a FIXED catalogue — joints × directions — each with
  its textbook typical value (recommended, over "+ Other" and free text).
- **The patient:** sees their own measurements, read-only (recommended).
- **Corrections:** amendments with a reason, the original kept (recommended;
  the medical file's rule).

### What a measurement is

A joint + a direction (knee flexion), a side (left / right — none for neck
and trunk flexion / extension; side bending and rotation have one), ACTIVE
(the patient moves it) or PASSIVE (the practitioner does — never on one line
with active: the gap is a finding), whole DEGREES, signed (−5° = a knee 5°
short of straight), an optional note (≤ 200). Grouped into an ASSESSMENT: one
visit — a clinical day (`measured_on`, chosen, may be past) and the moment it
was recorded (`created_at`, the database's clock).

### The catalogue (`src/range-of-motion/movement-catalogue.ts`)

33 movements over 9 joints (neck, shoulder, elbow, forearm, wrist, trunk, hip,
knee, ankle and foot), in examination order. Typical values: AAOS (Greene &
Heckman, 1994, as reproduced in Norkin & White) — limbs cross-checked against
a secondary source; the neck and trunk values (45/45/45/60; 80/25/35/45)
**to be checked by the person** (sources differ — one gives lumbar flexion
60°). A guide, not a target: the screens say "typical", and the other side is
the better comparison. Plausible bounds against TYPING slips (not clinical
limits): −90° up to the typical value plus half again, at least +20°, rounded
up to 5, at most 200°. The database's enum and CHECKs are GENERATED from this
file.

### Pass 1 — the backend, DONE 2026-10-31, green the same day

- **Tables** (migration **0076**, generated): `rom_assessments` (patient,
  author, `created_at`, `measured_on`, `medical_file_entry_id`, `amends_id`,
  `amendment_reason`) and `rom_measurements` (assessment, `movement` enum,
  `side` enum, `mode` enum, `degrees` smallint, `note`). Constraints: the
  amendment chain as medical files' (composite FK to (id, patient_id), one
  amendment each, not itself, the reason exactly with it); the note link a
  composite FK to `medical_files (id, patient_id)` — same patient only;
  `measured_on <= (created_at AT TIME ZONE 'UTC')::date + 1`; one value per
  (assessment, movement, side, mode) `NULLS NOT DISTINCT`; side ⇔ sided
  movement; degrees per movement (`CASE … ELSE false`); note `\S`, ≤ 200.
- **Rules** (migration **0077**, custom): row security — the patient reads
  their own, the care team reads and records, admins nothing, no UPDATE or
  DELETE; a measurement readable when its assessment is (EXISTS under the
  caller's policies) and insertable ONLY into an assessment the caller
  recorded in the same transaction (`created_at = now()`); the insert trigger
  stamps `created_at` (owner exempt); a DEFERRED constraint trigger refuses
  committing an assessment with no measurement (owner included);
  `merge_patients()` replaced — the medical file and the assessments moved in
  ONE statement (a WITH with two UPDATEs: foreign keys are checked at the end
  of the statement), `romAssessmentIds` in its answer.
- **API** (`src/range-of-motion/`, practitioners and patients; admins 403):
  `POST /range-of-motion` (practitioner) `{ patientId, measuredOn,
  medicalFileEntryId?, amendsId?, amendmentReason?, measurements: [1–60] }` →
  201; `GET /range-of-motion[?patientId=]` (the patient's own; a
  practitioner's patient, care-team pre-check → 403); `GET
  /range-of-motion/:id` (404 when hidden); `GET /range-of-motion/movements`
  (the catalogue, not audited). Newest measured first; measurements in
  examination order. Refusals: the DTO names the measurement ("Knee flexion
  needs a side: left or right", "… must be between -90° and 200°", "Neck
  flexion has no side"); the database's, translated: 403 care team, 400 future
  day, 400 note / amended assessment not this patient's, 409 already amended,
  400 a value twice.
- **Audit:** `ROM_ASSESSMENT_RECORDED` / `_AMENDED` (`measuredOn`,
  `createdAt`, `measurementCount`, `medicalFileEntryId?`, `amendsId?` — no
  value), `ROM_VIEWED` (`assessmentIds`), `ROM_ASSESSMENT_VIEWED`; area "Range
  of motion", clinical (withheld from admins).
- **The record, everywhere it is gathered:** the records export (a "Range of
  motion" part after the medical file: each value with its typical value, the
  visit note named, earlier versions under their correction;
  `romAssessmentIds` in `RECORDS_EXPORTED`); a legal disclosure includes it
  with the MEDICAL FILE part, by the day measured; the merge (above); a
  deactivated patient's team may still record (§22: the record stays
  writable).
- **Shared on the way:** the amendment-reason rule
  (`common/validators/amendment-reason.ts`, medical files' tests unchanged);
  the export's version grouping generic (`groupVersions`).
- **Seed:** Pat's right knee over three visits (110°, 120° — typed 102° and
  amended —, 126° measured four days ago and typed in the next day, no note),
  the left knee as comparison; Jo's trunk (unsided movements).
- **Verified:** backend 2,389 unit (+51), e2e 1,311 (range-of-motion 56; the
  6 sandbox-only failures — 5 pagination, the "14 days" alert across the
  clocks' change, green with the database in UTC). 55 mutations (45 in files,
  10 in the policies, triggers and merge function): all killed — one only
  after a test: the assessment's own care-team check was hidden by the
  measurements' policy refusing one step later (now tried in SQL alone). One
  dead sort clause removed (a NULL side never meets a non-NULL one). The
  person's run: green.

### Pass 2 — the screens, SETTLED 2026-10-31 (proposed as screens; the person chose every recommended option)

- **The practitioner's page** (from a "Range of motion" card on the patient
  page, beside the medical file's — data-free, like it, so opening it is what
  the audit records): **a card per movement measured, per mode** ("Knee
  flexion · active"): the latest value per side with its day, the change since
  the first measurement ("↑ 16° since Oct 10"), the typical value, and a small
  hand-drawn chart — left and right as two lines over a DATED axis
  (`measuredOn`), a dashed typical-value line; "Show the values as a table"
  (the progress page's twin-table idea). Below: **the assessments** (newest
  measured first; author, number of values, the visit note named, amended
  ones folded under their correction as in the medical file) with **Amend** on
  a latest version. "Record an assessment" at the top. Only the LATEST
  version of each chain feeds the cards and charts.
- **The form** (its own page, like the entry form; `?amends=<id>` prefilled):
  measured on (today by default, never in the future), the visit note
  (optional — a select of the patient's notes, the ones written that day
  first), then **movement rows with Left / Right columns**: a movement picker
  grouped by joint, a mode select, a Left and a Right box (ONE box for neck /
  trunk flexion and extension), the typical value beside the row, a note per
  value behind a small button; "+ Add a movement"; each row sends one value per
  filled box. The DTO's per-measurement messages mapped back to their box.
- **The patient:** a **"Range of motion" section of My records**, under the
  notes — the same movement cards, read-only (no Record, no Amend), the
  intro sentence of the PDF.
- **The typical value is shown to the patient too**, worded as a guide (the
  PDF's sentence: "a textbook guide, not a target … your other side is often
  the better comparison") — the same as their PDF copy.
- Also in the pass: "Record measurements for this visit" on a medical file
  entry (the form with that note preselected); the audit wording for the four
  actions; a browser test (Pat's knee prepared through the API in
  `stride_e2e`).

### Pass 2 — the screens, DONE 2026-10-31, green 2026-11-01 — THE ITEM IS COMPLETE

Frontend only (no backend change, no migration, no package). `src/range-of-motion/`
NEW; the person's run green, and live-tested by the person (light and dark).

- **The practitioner's page** `/practitioner/patients/:id/range-of-motion`
  (`RangeOfMotionPage`), from a data-free "Range of motion" card on the patient
  page right after the medical file's (`RangeOfMotionLinkCard`): "Record an
  assessment"; **Movements** — a card per movement and mode
  (`MovementCards`): each side's latest value and day, "↑ 16° since Oct 10"
  (said in words for screen readers; left out when every value is of one
  day), the typical value, the chart, "Show the values as a table";
  **Assessments** (`RomAssessmentList`) — newest measured first (by the
  LATEST version's day: an amendment may move it), "By Alex Chen · 4 values ·
  recorded October 28, 2026" (the recorded day only when it differs), the
  visit note named, an amended version folded under "Show the original",
  **Amend** on latest versions. 403 → "You're not on this patient's care
  team". Only latest versions feed the cards.
- **The chart** (`RomChart`, hand-drawn SVG like `ScoreChart`): a dated axis
  by `measuredOn`; left and right as two 2 px lines; a dashed typical line;
  "L 139°" / "R 126°" at the lines' ends unless they would collide (< 14 px);
  small and STATIC — no crosshair (every value is in the card's text and its
  table); `aria-hidden`, the table is its twin.
  - **Chosen while building — the colours:** left AQUA (`#199e70` light /
    `#1baf7a` dark), right VIOLET (`#6250d6` / `#9085e9`) — `--rom-left` /
    `--rom-right` in `index.css`, from the reference palette, validated as a
    pair in both modes (CVD separation, normal-vision floor, 3:1 against the
    page: the lighter aqua failed it on white, hence the darker step). Left
    points ROUND, right SQUARE — colour never alone. An unsided movement: one
    line in the text colour.
  - **Chosen while building — the scale fits the data**, not from 0: the
    values and the typical value, 5° of room each side, rounded out to tens
    (found live: from 0, Pat's 110° → 126° was a flat line). 0 is drawn when
    a value is negative, unless within 14 px of an end.
- **The form** `/practitioner/patients/:id/range-of-motion/new`
  (`RomAssessmentPage`; `?amends=<id>` an amendment, `?note=<entryId>` the
  visit's note chosen): measured on (today by default, `max` today, checked
  again); the visit note (optional — the patient's notes' LATEST versions,
  "Written that day" first, "Other notes" after; a note linked before it was
  corrected kept as "(since amended)"); then **movement rows** — a fieldset
  "Movement N", the movement (**a native `<select>` grouped by joint**, each
  option the WHOLE name — chosen while building: a closed select shows no
  group), the mode, Left and Right boxes (ONE "Degrees" box for neck / trunk
  flexion and extension), the typical value beside the row, "Add a note" per
  value, Remove (not on the only row); "+ Add a movement" (focus to its
  picker). The boxes are plain text fields (a phone's number pad often has no
  minus key); "-5" and "−5" both read.
  - Checked before sending (`romDraft.ts`): a real day, not in the future; a
    movement for a row with anything in it; the same movement + mode in two
    rows refused; a value for a note; whole degrees within the catalogue's
    bounds; at least one value, at most 60; an amendment changed and with a
    reason. Messages at their field, focus to the first. An empty row is
    ignored.
  - The backend's per-value 400s ("measurements.3.…") shown at the box they
    came from (`assessmentBody` returns each value's source box;
    `serverProblems`); other messages above Save. `validationMessages()` in
    `api/apiErrors.ts` (the failure-words convention: only that file reads an
    error's messages).
  - Saved → "Assessment recorded." / "Amendment saved." (snackbar), back to
    the page, the form REPLACED in the history. The amend view's states are
    the medical file's: loading, not available (404, another patient's, no
    id — nothing asked), "amended since" → the newer version.
- **"Record measurements for this visit"** on each note's latest version in
  the medical file (`MedicalFileEntryList`'s `recordHref`) → the form with
  `?note=`.
- **The patient — My records**: a "Range of motion" section under the notes
  (`MyRangeOfMotion`): the PDF's introduction, the same cards with "Typical:
  135° (a guide, not a target)", then "Each assessment" (every version,
  "Corrects the measurements of …"), read-only; its own loading and error
  states (the notes don't wait for it).
- **Audit wording:** "Recorded range of motion", "Amended a range-of-motion
  assessment", "Viewed range of motion", "Viewed a range-of-motion
  assessment" (details withheld from admins — clinical).
- **Chosen while building — naming a linked note reads the medical file.**
  The range-of-motion page reads `GET /medical-files?patientId=` (logged as
  "Viewed a medical file") ONLY when an assessment is linked to a note; the
  form reads it for its select; My records already reads it (same cache key —
  no second request). Its failure costs only the names ("Visit note: a note
  of the medical file"). Said to the person; kept.
- **Found while building:** focusing a box the BACKEND refused failed — the
  mutation's `onError` runs while the fields are still disabled; the focus now
  happens in an effect after the page is drawn again (a test).
- **Found by the person, fixed 2026-11-01:** in dark mode on Windows the
  dropdowns' GROUP names (`<optgroup>`: the joints, "Written that day", and
  the audit log's action groups) were light grey on white — Tailwind's base
  styles make an optgroup inherit the select's colour on a transparent
  background, and the 2026-10-12 fix coloured only `<option>`s.
  `NativeSelect` now gives `optgroup` the popover pair too.
- **Verified:** frontend 3,427 tests (+97, 264 files), the date tests also
  under Montreal and Paris time; 66 mutations — 61 killed at once, 4 after
  stronger tests (the order by day measured vs recorded, an unknown movement
  listed FIRST, a reason of spaces, `?amends=0`), 1 survivor a dead condition
  (removed); the browser test `e2e/range-of-motion.e2e.ts` (3 tests: Alex
  reads, records and amends Pat's SHOULDER ABDUCTION prepared through the API —
  the seeded knee left alone —, the medical file's link, Pat's My records at
  375 px) green, and red with the refresh after saving broken. Main file
  +0.8 kB; the form's chunk 15.6 kB (5.4 gzip). Live in Chromium (1280 light,
  375 dark) and by the person.

### The patient home's trend — DONE 2026-11-01, green the same day

A follow-up the person chose right after the item. Proposed with three
questions; the person chose every recommended option:

- **The patient's OWN reads are no longer logged.** Pass 1 had copied the
  medical file's rule (every read, the patient's included); a glance on the
  home would have written "Viewed range of motion" on every visit. Now the
  rule of programs, sessions and messages: only SOMEONE ELSE's read is
  recorded. Backend `isOthersRead(currentUser, patientId)`
  (`range-of-motion.service.ts`), used by both read routes; a practitioner's
  read is still written inside the read's transaction. The medical file
  keeps its own rule (said in the code).
- **What the home shows:** a "Range of motion" section AFTER My programs —
  "Your last measurements, <day>", one line per value of the LATEST visit
  ("Right knee flexion · 126° · ↑ 16° since Oct 10", "· passive" only for a
  passive value), a sparkline in the side's colour (by order, the card's
  scale), at most 3 lines then "and N more", "See all your measurements" →
  My records. Quiet like the pain trend: nothing while loading, on an error,
  or for a patient never measured.
- **Code:** `latestVisitLines` (`romRules.ts` — built on
  `groupIntoAssessments` and `movementCards`, so an amended value never
  shows), `trendLineLabel` / `moreLinesText` (`romText.ts`),
  `RangeOfMotionTrend.tsx` NEW, on `PatientHomePage`; the same query key as
  My records.
- **Verified:** backend 2,391 unit (+2), e2e 1,312 (+1 — "records none of the
  patient's own reads"); 5 mutations, all killed. Frontend 3,442 (+15); 13
  mutations, 11 killed at once, 2 after new tests (a visit holding only
  unknown movements; a passive value matched to the active series). The
  browser test's new step: Pat's home → the right shoulder's line and
  sparkline → My records (suite green on the person's machine). Main file
  unchanged; the home's chunk 10.5 kB. Live in Chromium (375 light / dark)
  and by the person.
- **Noted:** the person's e2e run ended with "Jest did not exit one second
  after the test run" (all green). Not from this change (it adds nothing
  that stays open); a sandbox run with `--detectOpenHandles` found nothing.
  If it recurs every run: `npm run test:e2e:fresh -- --detectOpenHandles`.

### Still open after the item

- The person is to check the neck / trunk typical values (unchanged).
- Possible follow-ups, not asked for: a crosshair on the chart if
  assessments ever become frequent. A printable visit summary — discussed
  2026-11-01, the person interested but for later: `deferred-improvements.md`,
  "A printable visit summary".

## §37 — Phase 7: the pre-CI tidy-up (chosen and green 2026-11-01)

Chosen by the person when CI came up next: "before we do the CI we should take
care of a few loose ends first" — four open entries of
`deferred-improvements.md`; the assistant added two (the alerts fixture, and
pinning RustFS beside Mailpit). The reason they belong BEFORE CI: a CI job
gates on lint and on every suite, and pulls the compose images — a known lint
error, a test that fails on some clocks, or an image tag that moves overnight
would make it red for reasons unrelated to the change being tested.

### The person's choices

| Question | Chosen | Why |
| --- | --- | --- |
| The whitespace rule | **`~ '\S'` on all 11 "not blank" CHECKs** (recommended) | one rule, the DTOs' own test; the exact JavaScript list was the alternative — exact agreement, but unreadable SQL |
| The pins | **tag + digest**, the versions the person's machine ran | the tag for the reader, the digest for Docker; upgrading becomes a deliberate step |

### What was built

- **Backend lint 1 → 0.** `http-exception.filter.spec.ts`: `let logged:
  jest.SpyInstance` (no type arguments: `mock.calls` is `any`) →
  `jest.SpiedFunction<Logger['error']>`. Fixed at the type, not with a cast.
- **One "not blank" rule (migration 0078, generated —
  `not_blank_any_whitespace`, 11 DROP + 11 ADD).** Three styles existed:
  `length(btrim(x)) > 0` (titles, workout names), `btrim(x) <> ''`
  (complaint reviews, legal disclosures) and `x ~ '\S'` (messages, amendment
  reasons). `btrim` removes only the SPACE character: a tab alone passed —
  checked live as the owner before the change. Now all `~ '\S'`, the same
  test as `Matches(/\S/)`. Existing data: the API was already stricter
  (`Matches(/\S/)` in JavaScript, `normalizeWorkoutName`'s `trim()`), so no
  stored row could break the new CHECKs — the migration ran on the seeded
  database to confirm it.
  - **Measured, Postgres (C.UTF-8) vs JavaScript:** they agree on space, tab,
    line feed, carriage return, form feed, vertical tab (and the em space);
    U+00A0 (no-break space) and U+FEFF (BOM) are VISIBLE to Postgres here and
    white space to JavaScript. What Postgres counts depends on the database's
    `lc_ctype` — said once in `programs.schema.ts`'s title comment, pointed to
    from the other files. (A probe trap: `E'\v'` is the letter v in Postgres —
    its escapes are `\b \f \n \r \t`; `chr(11)` is the vertical tab.)
  - **Tests:** `test/support/as-owner.ts` NEW — one statement as the owner in
    a transaction always rolled back, answering `{ rowCount }` or `{ code,
    constraint }` (the owner bypasses row security, never a CHECK: no policy
    can be the one refusing); `BLANK_VALUES` (`''`, spaces, `\t`, `\n`, a mix).
    The title and workout-name tests now try all five (they tried `''` and
    spaces — values the OLD rule refused too); new tests for the two
    complaint-review and five legal-disclosure CHECKs (none existed), each
    with an accepted neighbour (" \tCase 42\n"). **All 11 failed with the old
    CHECKs put back in `stride_test`, all pass with the new.**
- **The alerts fixture in hours** (`test/alerts.e2e-spec.ts`): `'13 days 23
  hours'` → `'335 hours'`, `'14 days 1 minute'` → `'336 hours 1 minute'`.
  Postgres subtracts an interval's days as CALENDAR days in the session's
  zone; with a 25-hour day in the last 14, the fixture landed exactly 336
  hours back. Proven both ways the same day (sandbox Postgres on
  Europe/Paris, clocks back on 2026-10-25): old fails, new passes.
- **The messages list follows the clock** (`ConversationList.tsx`):
  `useState(() => new Date())` → `useCurrentDateTime()` (state ticking every
  minute; the patient home's card already used it). A deliberate exception to
  "today read once", said in the comment: the list stays open for hours
  beside a conversation. The test fakes ONLY `Date`, `setInterval` and
  `clearInterval` (Testing Library's waits and TanStack Query use
  `setTimeout`, kept real), opens the list at 23:59:30 and ticks past
  midnight; it compares with `listTimeText` on each side (the wiring, not the
  wording) and asserts the two differ. Fails on the old code; green under
  America/Montreal, Europe/Paris and Pacific/Kiritimati.
- **Images pinned** (`docker-compose.yml`, `docker-compose.prod.yml`):
  `rustfs/rustfs:1.0.0-beta.11@sha256:84ce557a0245a06a9aae5516f55ee0f007fca78d41df356f419306fdc0cb168c`,
  `axllent/mailpit:v1.31.4@sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`.
  Finding the versions: Mailpit's image has no version label (its API reports
  `"Version"`); RustFS's labels are malformed — the build passed them as ONE
  comma-joined string, so `org.opencontainers.image.title` holds them all and
  no `…image.version` key exists (`index` on a missing key prints nothing,
  which is why the first command looked broken). Its `release` label gave
  `1.0.0-beta.11`; the person pulled that tag and got the same digest. Both
  files checked with `docker compose config --images`.

### Verified

Backend 2,391 unit (unchanged), e2e 1,319 (+7: 2 complaint-review, 5
legal-disclosure CHECK tests), lint 0. Frontend 3,443 (+1), lint as before.
Green on the person's machine. In the sandbox the 5 `Exercises › pagination`
tests failed as always (`read ECONNRESET` — see `deferred-improvements.md`,
"the pagination tests create 23 exercises at once", a question for CI).

### Still open after the item

- The pagination tests' burst of 23 requests (offered, not chosen).
- `docker-compose.prod.yml` still floats `postgres:16`, `postgres:18`,
  `caddy:2`, `glitchtip/glitchtip:6` — for the deployment.

## §38 — Phase 7: CI with GitHub Actions (built 2026-11-01, PARKED until the repos are public)

Chosen by the person after the pre-CI tidy-up (§37). Both repos are PRIVATE,
to be made PUBLIC for the reviewers; the person chose to wait for that day
before letting CI run (2026-11-01: "keep it aside and apply it once I'm ready
to make the repos public").

### The person's choices

| Question | Chosen | Why |
| --- | --- | --- |
| Layers | **All three**, one job each: fast checks, API e2e, browser suite | a red run says which layer broke |
| Triggers | **Every pull request + push to `main`** (+ a "Run workflow" button) | nothing reaches main untested |
| Frontend lockfile | committed (not in the snapshots) | `npm ci` needs it |
| Pagination probes | **sequential** (`for … await`, not `Promise.all`) | the burst of 23 requests was reset in some environments |
| When CI starts | **when the repos go public** — the workflows applied locally but NOT committed: `.github/` in each clone's `.git/info/exclude` | no Actions minutes, no token while private; nothing to undo later |

Considered and set aside for "when": a job guard `if: ${{
!github.event.repository.private }}` (skipped while private, live once public),
and turning Actions off in the repo settings. `.gitignore` rejected for this:
it is committed and shared — reviewers would see `.github/` ignored, and two
commits would be spent adding and removing the line; `.git/info/exclude` has
the same effect and stays in the clone.

### What was built

- **Backend `.github/workflows/ci.yml`:** `checks` (`npm ci`, `tsc --noEmit`,
  `npm run lint`, `jest --ci`, `npm run build`); `api-e2e` (service
  containers `postgres:16` with `POSTGRES_DB=stride_test` and a `pg_isready`
  healthcheck, RustFS and Mailpit at the PINNED digests (§37), then
  `prepare-env.sh`, `wait-for-services.sh`, `db:migrate:test`,
  `db:create-app-role:test`, `test:e2e:fresh -- --ci`); `browser` (this
  commit as `backend/`, the frontend's `main` as `frontend/` — the suite's
  default `../backend` is then right — both `npm ci`, `npx playwright install
  --with-deps chromium`, `npm run test:e2e`; the report and traces uploaded
  for 7 days on failure).
- **Frontend `.github/workflows/ci.yml`:** `checks` (`npm ci`, `tsc -b`,
  `npm run lint`, `vitest run`, `vite build`) and the twin `browser` job (the
  roles of the two repos swapped). Keep the two browser jobs in step.
- **Shared, in the backend repo:** `scripts/ci/prepare-env.sh` (`.env` from
  `.env.example`, the three secrets `validateEnv()` refuses as placeholders
  generated fresh with `openssl rand`, masked with `::add-mask::`; refuses to
  overwrite an existing `.env`) and `scripts/ci/wait-for-services.sh` (RustFS
  and Mailpit declare no healthcheck: any HTTP answer = up, 60 s). The
  frontend's job calls them from its backend checkout — one copy.
- **Choices in the files, said in their comments:** jobs in parallel; every
  action pinned to a COMMIT, the tag in a comment (checkout v7.0.1, setup-node
  v7.1.0, upload-artifact v7.0.2 — each the newest release at least two weeks
  old); `permissions: contents: read`; `persist-credentials: false`;
  `pull_request`, never `pull_request_target`; `concurrency` cancelling a
  superseded run; Node 24 (the Dockerfile's); npm's download cache keyed by
  the lockfile(s). The other repo is named `${{ github.repository_owner
  }}/Stride-backend` / `Stride-frontend` (case-insensitive) — to confirm.
  The checkout of the other repo uses `secrets.STRIDE_REPOS_TOKEN ||
  github.token`: with both repos public, no secret is needed (the job's own
  token reads any public repo), so none is to be created.
- **`playwright.config.ts`:** the `github` reporter added when `CI` is set
  (failures annotated on the pull request; a run summary).
- **`test/exercises.e2e-spec.ts`:** the pagination probes created one after
  another.

### Verified (in the sandbox — nothing has run on GitHub yet)

- `actionlint` 1.7.12 (with shellcheck over every `run:`) on both workflows;
  shellcheck on both scripts; `prepare-env.sh` tested from another folder
  (lengths, hex, nothing else changed, the refusal on a second run).
- **The jobs rehearsed step by step from FRESH clones**, a fresh Postgres 16
  cluster on UTC, the real Mailpit v1.31.4 (GitHub release) and moto in
  RustFS's place: `api-e2e` **1,319 / 1,319** in ~6 minutes — the first fully
  green e2e run in the sandbox (the pagination block, red there since
  Phase 3, passes); `browser` **15 / 15** with `CI=true` (the reporter's run
  summary printed).
- The rehearsal's first try failed at `npm ci`: the sandbox's git excludes
  `package-lock.json`, so the clone had none — the person's repos commit it.

### The day the repos go public

1. In each repo, remove the `.github/` line from `.git/info/exclude`, `git
   add .github`, commit (or `git add -f .github`).
2. Check the other repo's name in each `ci.yml` (`FRONTEND_REPOSITORY` /
   `BACKEND_REPOSITORY`) and that both default branches are `main`
   (`ref: main`, `branches: [main]`).
3. Check for newer releases of the three actions (pin the commit again, at
   least two weeks old).
4. Open a small pull request in each repo and watch the five jobs go green.
   The first real run is the test: RustFS (the real image) and the runner's
   Playwright install were never exercised in the sandbox.
5. Optional: branch protection requiring the checks before merging.

---

## §39 — Phase 7: the design discussion — logo, palette, type (2026-11-01)

**Why:** until now the app wore shadcn's stock "neutral" theme — near-black
buttons, greys, no brand colour — and a text "Stride" stood in for the logo
(§1: "a wordmark placeholder until one exists"). The person had drawn a logo
in Affinity (`src/assets/stride-logo.svg`: an S of a coral stroke with two
teal echoes, ending in a coral dot), unused by the app.

### Decided (the person's choices, 2026-11-01)

- **Palette A — teal leads, coral is the signature.** Chosen from three
  directions mocked on the same card, light and dark (A teal-led, B
  coral-led, C today's greys + colour only in the logo).
  - **Primary = the logo's dark teal** (`#2F7A78`: 5.0:1 with white text, AA
    for normal text). Dark mode: a lighter teal with DARK text (`#5DB3AD` was
    mocked — to be validated in pass 1, not taken as final).
  - **Coral (`#E07856`) is an ACCENT only** — the logo, the active section's
    underline, small highlights — never a button or text colour. Why not
    coral as primary: 3.0:1 with white (fails AA), and darkened until it
    passes it reads as brick red beside the destructive red ("End program"),
    so "do this" and "this destroys something" would look alike; it also sits
    close to the charts' `--score-pain-before` orange.
  - **Warm greys** instead of shadcn's pure neutrals, so the page sits with
    the coral.
  - The destructive red, the chart tokens (`--score-*`, `--rom-*`, each
    validated as pairs) are unchanged.
- **The logo:** the person's own lockups, `src/assets/stride-light.svg`
  (black "tride") and `stride-dark.svg` (white), the S as the first letter,
  "tride" in Comfortaa — **with the text converted to curves** (the first
  export kept live `<text>` naming Comfortaa: an SVG loaded as an `<img>`
  can't use the page's fonts, so it rendered as "trid e" in Times). Checked
  as the app will load them, 90 px and top-bar size (28 px), light and dark.
  Shown with BOTH files in the markup and Tailwind's `dark:hidden` /
  `hidden dark:block` — the pre-paint script already sets `.dark`, so no
  wrong logo flashes; one file with `currentColor` would need an SVG-as-
  component build plugin for one logo. `stride-logo.svg` (the S alone) stays
  for large single-mark uses.
- **The favicon:** the person's `public/stride-favicon.svg` — the S on a
  rounded tile, still readable at 16 px on light and dark tab strips. Its
  tile has NO fill in the file (SVG's default draws it black); making it
  explicit (black, or the dark page colour `#151a19`) is left to the person.
- **Comfortaa: the logo ONLY.** Compared as headings: lovely large, but even
  at its heaviest weight a heading barely stands out from the text below
  (hierarchy lost), no italics, and a second font download on every page.
  Since the logo's letters are curves, the app downloads no Comfortaa at all.
- **Body text: Geist by default, with an "Easier-to-read font" setting that
  switches to Atkinson Hyperlegible Next.** Compared on the patient home card:
  Atkinson is the only candidate where I / l / 1 and O / 0 are clearly
  distinct (slashed zero) — it matters for doses, angles and dates — but the
  person finds Geist (and Figtree) more polished. So both: the setting, in
  the Settings menu after theme and weight unit, OFF by default; turned on,
  a class on `<html>` swaps `--font-sans` (headings follow, `--font-heading`
  reads it). **Per device** for now, like the theme — `localStorage` and the
  pre-paint script in `index.html` (so no Geist flash), its copy of the rule
  kept honest by a test like `themeScript.test.ts`. A browser downloads a
  font file only when some text uses it, so declaring both costs nothing for
  either group. The per-account version is deferred
  (`deferred-improvements.md`).
- **Emails and the records PDF get the brand too — each its own pass,
  later.** Both need the curves version of the logo (email apps and pdfkit
  load no web fonts either).

### Still open

- ~~**Clinic logos for patients**~~ **SETTLED 2026-11-02 (§43): only the
  Stride logo** on the patient's screens, never the clinic's. Was: clinics upload a logo (Phase 2), shown only
  on the admin's clinic page. Whether a patient sees their clinic's logo (in
  the top bar beside Stride, on their home…) or only the Stride brand: the
  person is still thinking about it.
- The favicon tile's colour (above).

### Pass 1 — the brand in the app: BUILT 2026-11-01 (to be confirmed green by the person)

Frontend only, no package.
- **`index.css`:** the palette as OKLCH tokens, light and dark. Changed from
  the mock-ups while validating: primary L 0.533 → **0.515** (`#297573`; the
  logo's own teal fell to 4.4:1 as text on the light grey surfaces — the
  active section, "Yours"); a new **`--primary-hover`** (darker in light,
  lighter in dark) — shadcn's `hover:bg-primary/80` dropped white text on teal
  to 3.5:1, so `button.tsx`'s default variant uses the token; the mark's coral
  **`--brand-accent`** at L 0.665 (`#da7350`, 3.1:1 on the page — the logo's
  0.683 is 2.9:1). shadcn's `--accent` (the HOVER surface of menu items) is a
  pale teal; the chart and sidebar tokens are untouched.
- **`src/theme/colorContrast.ts`** (pure, no package): OKLCH → sRGB, gamut,
  alpha compositing, WCAG luminance and contrast. **`paletteContrast.test.ts`**
  reads the REAL `index.css` (`?raw` — needs `vite.config.ts`'s
  `test.css.include`, else Vitest hands back "") and checks 19 pairs per theme
  (text 4.5:1, marks 3:1), the "Yours" tint, the gamut, the dark theme setting
  every token itself, and that coral still fails white text (the reason it's
  only an accent). `--destructive` (Tailwind's red-600) is outside sRGB: its
  contrast is checked on the clipped colour, the one painted.
- **`Logo.tsx`:** the two lockups as `<img>`, `dark:hidden` / `hidden
  dark:block`, `alt=""` (the link's "Stride home" names it), 28 px high.
- **`SectionNav.tsx`:** the current section's label in teal and a coral mark
  (`data-active-mark`, `aria-hidden`) — under the label in the top bar, above
  the icon on the phone's tab bar.
- **Verified:** frontend 3,513 tests (+70); tsc, lint (no
  new warning); 33 mutations, all killed but one equivalent (the test's
  comment stripping — no comment holds a declaration today). Browser suite
  15 / 15 (with the real Mailpit v1.31.4). Live in Chromium (1280 light, 375
  dark; practitioner, patient, admin): the painted pixels match the computed
  values (the mark `#da7350` / `#e88969`, the button `#297573`, hovered
  `#186361`).
- **Confirmed GREEN by the person 2026-11-01.**
- **Seen, not changed (then):** the signed-out pages (sign-in, invitation,
  reset) showed no logo — an `<h1>` only (done next, below); shadcn's focus halo is the ring at 50%
  opacity (2:1), the focused field's SOLID teal border (4.8:1) being the
  visible indicator; the Affinity SVGs are 9 kB each (under 3 kB gzipped) —
  SVGO could shrink them.

### Pass 1b — the logo on the signed-out pages: BUILT 2026-11-01

The person's request after pass 1: the logo bigger, centred above the sign-in
page's heading — done in this item (it finishes "the brand in the app").
- **`SignedOutLayout`** (new, `src/app/`): a PATHLESS layout route around all
  eight signed-out pages — `/login`, `/forgot-password`, `/register-clinic`
  (inside RequireGuest) and the unguarded email-link pages
  (`/accept-invitation`, `/reset-password`, `/confirm-email`,
  `/cancel-email-change`, `/records-download`); the guards inside still
  decide. One place instead of the logo pasted into sixteen page states.
- The logo there: 48 px (`h-12`, the top bar's is 28), centred, `pt-16`; not a
  link (no "home" before signing in); `alt="Stride"` — content here, not
  decoration — on both images, the hidden one being `display: none` and so
  outside the accessibility tree. The pages' `mt-24` → `mt-8` (the only users
  of `mt-24`).
- **`LogoImages`** (in `Logo.tsx`): the two lockups with their theme classes,
  shared by the top bar's link (`alt=""`, `h-7`) and the layout.
- **`routes.test.ts`:** a `chainTo(path)` helper (the routes from the root
  down); each signed-out path is inside SignedOutLayout and no signed-in page
  is; the records link's "outside every guard" test no longer depends on being
  the root's direct child.
- **Verified:** frontend 3,526 tests (+13); 6 mutations, all killed; browser
  suite 15 / 15; live in Chromium (sign-in, forgot, reset, invitation — 1280
  light, 375 dark).

- **Pass 1b confirmed GREEN by the person 2026-11-02.**

### Pass 2 — the "Easier-to-read font" setting: BUILT 2026-11-02

Frontend only. One package: `@fontsource-variable/atkinson-hyperlegible-next`
`^5.3.0` (OFL-1.1, like Geist's; published 2026-07).
- **`src/theme/font.ts`** (pure, like `theme.ts`): key `stride-font`, ON =
  exactly `'readable'`, OFF = the key REMOVED (never touched and turned off
  are one state); `.readable-font` on `<html>` (where Radix's portalled menus
  and dialogs inherit it, like `.dark`); storage that throws reads as off.
- **Held by `ThemeProvider`** (`readableFont` / `setReadableFont` on the
  theme context), not a second provider: the same kind of setting — how the
  app looks on this device —, and every test that already wraps the app in
  ThemeProvider keeps working. Applied in a layout effect (no frame of the
  old letters).
- **`index.css`:** `@theme inline` now says `--font-sans: var(--app-font)`
  (and `--font-heading`). WHY: `inline` writes each value INTO the utilities
  — a font NAME there is frozen into every `font-sans`; a VARIABLE frozen in
  can still be redefined. `:root { --app-font: 'Geist Variable' }`,
  `.readable-font { --app-font: 'Atkinson Hyperlegible Next Variable' }`.
  Both packages imported; a browser downloads a font file only when text uses
  it — measured: off downloads only Geist's latin file, on only Atkinson's.
- **`index.html`'s pre-paint script** sets the class too (no Geist-then-
  Atkinson redraw on load); `themeScript.test.ts` proves it agrees with
  `font.ts`, as for the theme.
- **Settings menu:** a "Text" group after Theme, one checkbox item
  "Easier-to-read font", for every role (an admin-only account too), applied
  at once (the page redraws behind the open menu — its own preview), no
  request.
- **Verified:** frontend 3,551 tests (+25); browser suite 15 / 15; 16 mutations, all killed; live in Chromium (computed fonts,
  `document.fonts.check`, the downloads above); 12 pages at 375 px in both
  fonts — no horizontal overflow, Atkinson's pages equal or slightly shorter.
  CSS +0.95 kB (+0.11 gzipped).

- **Pass 2 confirmed GREEN by the person 2026-11-02** — and their live test
  found the per-device version's flaw (next).

### Pass 3 — the font on the ACCOUNT: BUILT 2026-11-02

**Found by the person:** stored in the browser, the setting belonged to the
browser, not the person — Morgan turns it on and signs out, Alex signs in on
the same computer and gets it. On a shared clinic computer that also tells
the next person that the last one needed a low-vision font. Neither
device-only fix works: clearing at sign-out makes Morgan tick it every time;
one copy per user id keeps a lasting list of who needs it. **The person's
choices:** the per-account version now (moved out of
`deferred-improvements.md`); the sign-in page in the DEFAULT font, nothing
of the last user left on the device. The theme stays per device.

- **Backend:** `users.readable_font` boolean NOT NULL DEFAULT false
  (migration **0079**, generated); `UpdateUserDto.readableFont`
  (`@ValidateIf(isPresent)` + `@IsBoolean()` — null refused, not "cleared");
  self-only in `UsersService.update()` (403 "Only the user themselves can
  change their font setting", before any write) — the weight unit's and the
  email setting's pattern; audited in `USER_UPDATED` like them; it reaches
  /auth/me and the sign-in answer through `toPublic()` like every column.
- **Frontend:** the value is the account's — `CurrentUser.readableFont`.
  `useAccountFont()` (called by App, above the router, every page): a user →
  their setting applied and COPIED to `stride-font`; signed out (`null`, or
  the bootstrap's /auth/me refused with 401 — an expired session leaves an
  ERROR in the cache, not `null`) → the default and the copy REMOVED; not
  known yet → untouched (the copy then belongs to the session the cookie
  still holds). `useSetReadableFont()` (optimistic, `scope`, a snackbar and
  /auth/me asked again on failure — `useSetMessageEmailNotices`' shape). The
  font left `ThemeProvider` again (pass 2's version reverted). The pre-paint
  script is unchanged: it reads the device's copy.
- **Verified:** backend unit 2,394 (+3), e2e 1,325 (+6); frontend 3,558 (+7), browser suite 15 / 15;
  mutations: backend 4, frontend 13 — all killed (one first-round survivor
  was an equivalent condition: removed, the code simplified). Live in
  Chromium: Alex ticks it → Atkinson, kept on reload; logs out → the sign-in
  page in Geist, copy gone (and after a reload); Pat signs in on the same
  browser → Geist; Alex on another device → Atkinson at once; a session
  dropped (cookie cleared) → reload lands on the sign-in page in Geist.
- **Confirmed GREEN by the person 2026-11-02** (after migrating — the e2e
  run before it failed everywhere on the missing column) **and live.**
- **Known, small:** after a session EXPIRES (no sign-out), the first frame of
  the next page load is still drawn from the copy, until /auth/me answers 401
  a moment later.
- ~~**Open, for the person:**~~ **SETTLED 2026-11-02 (§41, part 2): hidden
  from everyone but the person.** Was: like the other two settings, the value
  is part of the user object every admin user page and the care team's
  patient page receive (not shown on screen), and its changes are in the
  audit log admins read. Hiding it from everyone but the person would mean
  taking it out of `toPublic()` and adding it only to the current-user
  answers. (The audit log's half is still open — §41.)

### Next (to confirm with the person)

1. ~~**The brand in the app (frontend)**~~ — DONE (passes 1 and 1b). Was: the palette's tokens in `index.css`,
   light and dark, each pair validated (text on primary ≥ 4.5:1, focus ring
   and control borders ≥ 3:1, coral never carrying text); coral as the
   active section's mark; `Logo.tsx` with the two lockups (its accessible
   name kept, "Stride home"); the favicon in `public/`. Live in Chromium at
   375 / 1280 px, light and dark, every role's home and a few dense pages;
   the browser suite re-run.
2. ~~**The "Easier-to-read font" setting (frontend)**~~ — DONE (pass 2). Was: the Atkinson package
   (`@fontsource-variable/atkinson-hyperlegible-next`), the class and its CSS
   rule, the pre-paint script + its agreement test, the setting in the
   Settings menu, a layout check with Atkinson on (its letters are a little
   wider).
3. Later, separate items: ~~branded emails~~ (DONE 2026-11-02, green, §41); ~~the
   branded records PDF~~ (BUILT 2026-11-02, §42).

---

## §40 — The way back after signing in belongs to its owner (found and fixed 2026-11-02)

**Found by the person, live:** Alex signs out on a patient's page; Sam signs
in on the same browser and lands on ALEX's last page, not their own home.

**Why:** the sign-in page keeps a way back, `from` (Phase 1: a link opened
while signed out, or a session that expired mid-work, resumes where it was).
Signing out set the cached user to `null`, and RequireAuth — still on screen
for a moment — redirected to the sign-in page with the current page as
`from`, as it does for a signed-out visitor. Two readers then honoured it for
WHOEVER signed in: LoginPage's navigation and RequireGuest's redirect, which
race (§1-era comment: they must agree). On a shared clinic computer: another
practitioner sent to Alex's patient (the backend refuses them, but the
patient's id is in the address).

**Confirmed GREEN by the person 2026-11-02, and live.**

**Decided (built without asking — a clear bug with one sensible fix):** the
way back carries its OWNER, `fromUserId`, and is honoured only for that
account. Alex back in → his page; anyone else → their home; a page with no
owner (a link opened while nobody was signed in) → whoever signs in, as
before.
- `src/auth/returnPath.ts` (new): `rememberSignedInUser` (module memory —
  the last account seen signed in, in this tab; written by RequireAuth in an
  effect, since by the time it redirects the cache says `null`),
  `returnState(from, owner?)`, `destinationAfterSignIn(state, userId)` — ONE
  rule, used by LoginPage (password and two-factor paths) and RequireGuest.
- The mid-session 401 handler (routes.tsx) reads the cached user's id before
  clearing it and passes it as the owner.
- The owner travels in the history entry's state, so it survives a reload of
  the sign-in page.
- **Verified:** unit + integration tests (`returnPath.test.ts`,
  `preservedDestination.test.tsx` — signing out then in as someone else /
  the same person, `LoginPage.test.tsx` — the page alone, both paths,
  `routes.test.ts` — the 401 handler); 12 mutations, all killed (two after
  new tests: LoginPage's own rule was hidden by RequireGuest winning the
  race in the integration test, and the two-factor path had no test);
  frontend 3,570 tests (+12), browser suite 15 / 15. Live
  in Chromium: Alex leaves `/practitioner/patients/7` → Sam lands on
  `/practitioner`; Alex back (after a reload too) → `/practitioner/patients/7`.
- **Left as is:** a session that expires and is followed by a RELOAD before
  anyone signs in has no owner in memory (a fresh page) — that way back is
  honoured for whoever signs in, like a link opened while signed out.

---

## §41 — Branded emails, and the font setting kept to its owner (2026-11-02)

**Chosen by the person 2026-11-02** after the design discussion: branded
emails (the first of §39's two leftover items), plus one of §39's open
questions — `readableFont` hidden from everyone but the person.

### Part 1 — branded emails: the person's choices (all recommended)

- **The logo travels INSIDE the email** — an inline attachment referenced as
  `cid:` (the MIME Content-ID), not a hosted image URL and not styled text.
  Why: email apps show no SVG (Gmail, Outlook) and Gmail strips `data:`
  images, so the logo must be a PNG; a hosted PNG is hidden by many apps until
  "load images" and its fetch tells a server WHEN the email was opened — a
  tracking pixel by accident, which a HIPAA-minded app shouldn't send. Inline,
  it shows at once, works in Mailpit and offline, and nothing is fetched. Cost:
  ~13 kB of images per email (≈ 23 kB on the wire, base64), and the transport
  interface grows an `inlineImages` field. Both providers support it
  (nodemailer `cid`, Resend `contentId` — checked in resend 6.18.1's types).
- **A full layout** — one `renderEmail()` for all fifteen emails: the logo,
  a 560 px white card, the email's main link as a teal BUTTON, a footer line
  ("This is an automatic email about your Stride account."). The plain-text
  parts are unchanged (they are what a plain-text app shows, and what the e2e
  tests follow links from).
- **Light + a dark variant** — light by default (inline styles); apps that
  honour `prefers-color-scheme` (Apple Mail, Outlook.com…) get the dark
  colours and the white-text lockup. Two logo images in every email.

### Decided while building (said here so they can be revisited)

- **A button only where the link is the email's PURPOSE:** reset, invitation,
  confirm the new address, the merged account's sign-in, new messages, the
  records download. Where the link is an escape hatch ("if this wasn't you,
  reset your password", the change's cancel link) it stays a teal underlined
  link in its sentence: a big "Reset your password" on a routine notice would
  push people to reset for nothing. The new-messages button reads "Read the
  message" / "Read the messages" (a button has no sentence around it to say
  "it"); the text part keeps "Sign in to read it: …".
- **Escaping by default — ``markup`…` ``** (`src/email/safe-html.ts`): a tagged
  template that escapes every interpolated value unless it is already a
  `SafeHtml`; the layout's paragraphs are typed `SafeHtml`, so a raw string
  can't reach it. A `SafeHtml` can only be made by the tag (a module-private
  Symbol key — a public factory would be a way around the escaping). Named
  `markup`, not `html`: Prettier formats `html`-tagged templates as HTML and
  rewrapped the emails' text on its first run.
- **The palette as hex** (`src/email/email-palette.ts`): index.css's OKLCH
  tokens converted (many email apps drop an `oklch()` colour); checked against
  the app's painted pixels (`#297573`, `#e88969`); a spec checks every text
  pair ≥ 4.5:1 in both themes. A copy across repositories, accepted — said in
  the file, with how to redo it.
- **The PNGs:** rendered once from `stride-light.svg` / `stride-dark.svg` at
  2× (195 × 80, ~6.5 kB each), shown at 98 × 40; in `src/email/images/`,
  copied to `dist/` by `nest-cli.json`'s `assets` (like the PDF's fonts). No
  runtime package.
- **The dark lockup hidden three ways** (`display: none`, `max-height: 0` +
  `overflow: hidden`, `<!--[if !mso]>`), revealed by the media query. Checked:
  with the `<style>` block removed (what an app that drops it shows) and the
  page in dark mode, only the light lockup is visible.

### Part 2 — `readableFont`, the person's own

- `UsersService.toPublic()` — the one funnel for user answers — now strips
  `readableFont` too; **`toSelf()`** (= `toPublic()` + the owner-only setting)
  and **`findSelf()`** are used ONLY where the answer is about the person
  asking: the session's user (`SessionSerializer`, so `/auth/me` and
  switch-role), the messaging socket's user, `mfa/verify`, login,
  register-clinic, and `PATCH /users/:id` on one's own account (an admin's
  edit of someone else answers the public shape). The seed's "acting as"
  helper builds the same shape. Every list (`GET /users`, `GET /admin/users`,
  a practitioner's patients) goes through `toPublic()`, so none carries it.
  Frontend: `User` (the shape for any account) loses the field; the signed-in
  `CurrentUser` keeps it.
- ~~**Still open, for the person — the audit log's half.**~~ **SETTLED
  2026-11-02 (§43): a font change doesn't belong in the audit log** — to build
  first in the next chat. Was: A font change is
  still recorded as `USER_UPDATED { changes: { readableFont: … } }`, which
  admins read. Keeping it is the audit trail's completeness (every change to
  an account); dropping it (or leaving the field out of the diff) is
  minimisation. Not changed without asking. Same question, by analogy, for
  `preferredWeightUnit` and `messageEmailNotices`, which every admin and care
  team still receive on the user object.

### Verified (sandbox, 2026-11-02)

- Backend: unit 2,453 (+59), API e2e 1,326 / 1,326, lint 0, Prettier clean.
  Frontend: 3,570 tests, `tsc -b`, lint (only the known warnings); browser
  suite 15 / 15 (the invitation email followed from the real Mailpit v1.31.4).
- Mutations: 40, all killed (38 by unit specs; `mfa/verify` by the e2e test;
  the gateway by `tsc`).
- Live: the fifteen emails sent through the BUILT `EmailService` and the real
  SMTP transport into Mailpit, plus a reset triggered through the running API:
  `multipart/alternative` with the HTML's part holding both images by
  Content-ID, 0 regular attachments; screenshots at 375 px (2×) and 1280 px,
  light and dark. `readableFont` on the running API: Pat's login, PATCH and
  `/auth/me` carry it; Alex's and the admin's reads of Pat (one user, the
  patients list, the paged admin list) don't.
- **Confirmed GREEN by the person 2026-11-02** — every suite, and live in
  Mailpit.

---

## §42 — The branded records PDF (2026-11-02)

**Chosen by the person 2026-11-02**, after branded emails (§41): the second of
§39's two leftover items. Backend only, no package, no migration.

### The person's choices

- **The logo on the FIRST page only**, above the title, like a letterhead (the
  other pages already name the patient and the page in their footer).
- **Teal headings + a coral accent:** the title and every heading in the app's
  teal (`#297573`, 5.3:1 on white — a dark grey when printed in black and
  white); a short coral bar (`#da7350`) under each PART's heading (Medical
  file, Range of motion, Exercise programs and sessions, Disclosures), as the
  app marks its current section. Coral never carries text (3.1:1: enough for a
  mark, WCAG's 3:1 for graphics, not for words). Body text stays near-black,
  the footer grey, a review / disclosure stamp bold black.
- **A print-resolution PNG:** the light lockup rendered at 365 × 150 px and
  drawn 36 points (half an inch) high = 300 dpi
  (`src/records-export/images/stride-logo.png`, 13 kB, copied to `dist/` by
  `nest-cli.json`'s `assets`). The email PNG (195 × 80) would print at 160 dpi.

### Decided while building

- **The bar sits in the heading's existing gap** (2 + 3 + 2 = 7 points in place
  of `moveDown(0.3)` ≈ 6.1): drawn on top of it, the first version pushed the
  last line of Pat's range-of-motion page onto a ninth page of its own. A test
  measures a part's first line against where the old code put it (within a
  point).
- **The bar UNDER the heading** (the app's mark), not beside it.

### Verified (sandbox, 2026-11-02)

- Backend unit 2,458 (+5: the logo's place and its 300 dpi, the colours of
  title / headings / text, the bar on parts only, the spacing), API e2e
  1,326 / 1,326, lint 0. `test/support/pdf-text.ts` reads back each text
  piece's fill colour, the filled rectangles and the images (position, size,
  pixels).
- Mutations: 12, all killed (each colour, the bar removed / on every heading /
  added on top of the gap / a point taller, the logo removed / taller / not
  making room / swapped for the email PNG).
- Live: Pat's export from the running API — still 8 pages; rasterised at 200
  dpi in colour and in greyscale.
- **Confirmed GREEN by the person 2026-11-02**, and live.

---

## §43 — Settled leftovers, and what comes next (2026-11-02)

**Settled by the person 2026-11-02** (after §42 was confirmed green):
- **The favicon tile:** no change — in the browser's tab it looks as designed,
  no black tile behind its transparent parts (§39's open question closed).
- **A font change doesn't belong in the audit log** (§41's open question). To
  build: `UsersService.update()` computes `changes` (before → after); a change
  of `readableFont` must still be WRITTEN but not AUDITED — leave
  `readableFont` out of the `changes` passed to the `USER_UPDATED` entry, and
  write no entry at all when it was the only change (the convention's "a
  request that changes nothing writes nothing" applies to the TRAIL, not the
  UPDATE: today the UPDATE runs only when `changes` is non-empty — keep the
  write's condition on the full diff). The e2e test "lets a user turn it on,
  records it once…" expects an entry today — it becomes "…and leaves no
  audit entry". The frontend's audit wording for `readableFont` (if any) can go.
  Entries already stored stay (history is never rewritten). Same question for
  `preferredWeightUnit` / `messageEmailNotices`: not asked — keep as is.
- **Clinic logos for patients:** only the Stride logo on the patient's screens
  (and the home), never the clinic's (§39's open question closed).
- **Moved to `deferred-improvements.md`:** keyboard shortcuts in the session
  player; the browser suite's Firefox / WebKit projects and an axe scan.

### Chosen next — performance and infrastructure (from deferred-improvements)

1. **A separate vendor chunk for React and React Router** — returning visitors
   keep the framework cached across deploys (the main file's name changes on
   every deploy today).
2. **`socket.io-client` loaded on demand** (~13 kB gzipped out of the main
   bundle) — `await import('socket.io-client')` inside the socket factory.
One frontend pass, measured before / after (first download, main file, gzip;
`vite build`'s report), the browser suite re-run (live messaging).

### Proposed by the person — a "For reviewers" card and a demo reset (to design)

The person's idea: on the sign-in page of the DEPLOYED version, a short card
explaining the test accounts, that there is no sign-up (invitation-only — sign
in as the admin and invite yourself, or use a seed account), with a link to
`docs/dev-test-accounts.md` in the GitHub repo; and maybe a button resetting the
seed data. **The assistant's view (2026-11-02), to discuss before building:**

- **A demo MODE, not a frontend flag:** one backend setting (`DEMO_MODE=true`),
  allowed in production (the demo IS a production deployment), exposed on a
  public route (e.g. `GET /auth/setup-status` gaining `demo: { … }`, or `GET
  /demo`) — so the card, the protections below and the reset all hang on one
  switch, and a real clinic's deployment shows none of it.
- **The card:** 3–4 accounts (admin, Alex the practitioner, Pat the patient,
  Casey with two-factor), the shared password, a "Use" button per account that
  FILLS the form (not submits — reviewers see the real sign-in, MFA step
  included), "Stride is invitation-only…", "Demo data: other reviewers can see
  what you type — don't enter real personal information", the reset schedule,
  the GitHub link (once the repos are public).
- **Protect the published accounts:** with the passwords on the page, the first
  reviewer who changes `admin@`'s password, email or two-factor (or deactivates
  Alex) locks every other reviewer out until a reset. In demo mode: refuse those
  changes for the listed accounts (403 with a sentence), in the backend.
- **"Invite yourself" needs a real sending domain:** the deployment emails
  through Resend; its sandbox sender (`onboarding@resend.dev`) delivers only to
  the Resend account's own address, so an invitation to a reviewer's email
  wouldn't arrive. Either verify a domain on Resend (DNS records) before
  publishing, or the card says invitations can't be received in the demo.
- **The reset — recommended: automatic, not a public button.** Several
  reviewers may be signed in at once: one click would wipe the others' work
  mid-review and sign everyone out; an unauthenticated reset is also an abuse
  and load vector. Recommended: a nightly reset (and on deploy), said on the
  card ("Demo data resets every night at 03:00, Paris time"); optionally an
  admin-only "Reset demo data" in demo mode, confirmed and rate-limited, as an
  escape hatch. **Technical points:** `seed:dev -- --reset` is a ts-node script
  outside the image (the Dockerfile ships `dist/` only; `tsconfig.build.json`
  excludes `scripts/`) — compile it into the image, or run it as a one-off job
  container; it deletes rows, not files (`storage:sweep` after it); it must end
  every session and socket (it deletes the users, so the session serializer
  refuses them — check sockets); `@nestjs/schedule` (a package) or a cron on the
  droplet calling the job; with the message-notices sweep already running every
  minute, check the two don't collide (a Postgres advisory lock).
- **Open questions for the person:** which accounts the card lists; the Resend
  domain; the reset (nightly only, nightly + admin button, or the person's
  button); whether the published accounts are locked as above.

## §44 — A font change is written, not audited (built 2026-11-02)

The build of §43's first item. Backend only; no migration, no frontend change
(the audit log's wording, `src/audit-log/`, never had a `readableFont` key).

- **Where:** `UsersService.update()`. The diff (`changedFields(before, …)`)
  still decides the WRITE: the UPDATE runs whenever anything differs, the font
  included. Its audit entry now gets `auditedChanges(changes)` — the same diff
  minus `UNAUDITED_ACCOUNT_FIELDS` (a module-level `Set`, today
  `readableFont` only) — and is written only when that leaves something.
- **Why two conditions, not one:** "a request that changes nothing writes
  nothing" is about the row; "the trail records what an admin has a reason
  to read" is about the entry. A font-only PATCH changes the row (so it must
  be written) and nothing the trail is for (so no entry). An entry with an
  empty `changes` would claim an edit happened while saying nothing about it.
- **Why a named set, not `delete changes.readableFont`:** the rule is one
  line to read and one place to extend if the person ever decides the same
  for `preferredWeightUnit` / `messageEmailNotices` (§43: not asked — they
  stay audited).
- **Stored entries stay** — history is never rewritten.
- **Tests:** unit — a font-only change (the UPDATE carries it, no
  `logInTransaction`), font + name (one UPDATE with both, one entry naming
  only the name, in the same transaction); e2e — "lets a user turn it on,
  leaves no audit entry, …" counts EVERY entry about patient2 before and after
  (not "no entry mentions the font", which an empty entry would pass).
  7 mutations, all killed by the unit spec (the filter removed, inverted, the
  set emptied, the entry's condition on the full diff, the entry always
  written, the write's condition on the audited diff, the full diff in
  `details`); the e2e test kills the two that would leave an entry.
  Backend 2,460 unit (+2), e2e 1,326 (unchanged — one test rewritten).

## §45 — The bundle pass: a framework file, an import map, socket.io on demand (built 2026-11-02)

The build of §43's second item. Frontend only. The person's choices (asked
2026-11-02): socket.io-client loaded by a LAZY ADAPTER (the factory stays
synchronous); the framework file = React, React DOM, React Router (not
TanStack Query, not one vendor file); then — a finding of the deploy check,
below — Vite's experimental import map ADOPTED, with `vite` PINNED to the
exact installed version (the person's addition: "a reviewer might end up with
a newer version that could break it").

**What was measured first** (Vite 8.3.5 / Rolldown 1.2.16, sourcemaps read
back per chunk): React DOM (627 kB of source) sat in the MAIN file with our
shared code; React Router in a shared file Rolldown had named after our own
`apiErrors.ts`; socket.io-client and engine.io in the main file, downloaded by
the sign-in page and by admins, who never open a socket.

**1. The framework file** — `build.rolldownOptions.output.codeSplitting.groups`
(Rolldown's manual chunking; `advancedChunks` / `manualChunks` are deprecated
in this version): one group, `framework`, matching
`node_modules/(react|react-dom|scheduler|react-router)/` (`[\\/]` for
Windows); their own dependencies come along (`includeDependenciesRecursively`,
the default). 314.67 kB, 98 kB gzipped; its name changes only on an upgrade of
those packages.

**2. The hash cascade, and the import map.** The deploy check (two builds,
the second with one page changed) showed the framework file kept its name —
and 129 of 224 files did NOT: a built file imports another by its hashed name
(`from "./index-B9hgZxpK.js"`), so the name is part of the importer's content
and hash; the main file lists every page, so it changes on every deploy, and
everything importing it changes, and so on. An "app" group for the shared
code was tried and made it worse (40 of 216 kept, the code went back into the
main file) — reverted. `build.chunkImportMap: true` (Vite 8, EXPERIMENTAL):
files import STABLE keys and `index.html` carries `<script type="importmap">`
mapping each key to the real hashed file. One page changed → 223 of 224 names
kept; `index.html` 2.9 → 19.5 kB (6.9 kB gzipped) — the one file a browser
fetches again on every visit anyway. Checked: every modulepreload is still in
`index.html` (all 11 files start downloading together — Chromium, 150 ms
latency, last JS byte ~620 ms with and without the map; an earlier "6 missing
preloads" was a truncated `head` in the assistant's own check); browser
support (Chrome 89, Safari 16.4, Firefox 108); `staleChunkReload` unchanged
(an old tab's map names files a deploy removed → `vite:preloadError`).
**Pinned:** `"vite": "8.3.5"` (was `^8.2.2`) — the lock file already gives
`npm ci` exact versions; the pin makes `npm install` / `npm update` unable to
move Vite either, so an upgrade is a visible choice. (Rolldown comes with
Vite as `~1.2.14`; the lock file fixes it.) **If a Content-Security-Policy is
ever added**, it must allow this one inline script (by its hash).

**3. socket.io-client on demand** — `src/messages/messagingSocket.ts` only.
`createMessagingSocket()` returns the `MessagingSocket` interface at once and
starts `import('socket.io-client')`; every method waits on that one promise:
listeners registered meanwhile are attached in order when it resolves (before
any network event can arrive), `close()` before it arrives means no connection
ever opens (a sign-out or role switch while the file downloads), a file that
can't be downloaded leaves the screens on "Connecting…" and a send refused
("Not connected") — nothing thrown. `import type { Socket }` is erased by the
compiler. The provider, `FakeSocket`, `renderMessages` and `test-setup.ts` are
unchanged. 41 kB, 12.8 kB gzipped, out of the first download.

**Numbers** (`vite build`, Vite 8.3.5, gzip level 9): main file 448.77 →
200.18 kB (141.20 → 64.86 kB gzipped); first download 805.02 → 762.89 kB
(247.90 → 233.59 kB gzipped). **A returning visitor after a one-page deploy**
(Alex reloading Messages, a server sending `immutable` for `/assets/` and
`no-cache` for `index.html`): 475 kB transferred with the original code →
226 kB with the framework file alone → **21 kB** with the import map (0 JS
files downloaded, 26 from the cache). Who downloads the socket file: Alex yes
(after `/auth/me`), the sign-in page and the admin no.

**For the deployment (to check on the droplet):** the benefit needs the
server to send `Cache-Control: public, max-age=31536000, immutable` for
`/assets/*` and `no-cache` for `index.html` (a stale `index.html` would map
keys to files a deploy removed). `vite preview` sends `no-cache` for
everything — not representative.

**Guards:** `npm run check:cache-names` (`scripts/check-cache-names.mjs`, NEW)
builds twice into temporary folders (one page changed through a tiny plugin —
no file touched), and fails if anything but that page was renamed, if the
framework file is missing or renamed, if `index.html` has no import map, or if
socket.io-client is in the first download (or nowhere); it prints the first
download's size. Proven able to fail: import map off (the cascade + no map),
the framework group renamed, a static socket import put back. In Vitest,
`messagingSocket.test.ts` (6 → 11 tests): the load order, listeners before
and after, close before load, a failed download, and a convention test — no
application file imports `socket.io-client` by value. 10 mutations of the
adapter, all killed.

**Tests:** Vitest 3,575 (+5, 275 files); `tsc -b` clean; lint unchanged (28
oxlint warnings, 1 eslint warning — all pre-existing, none in these files);
browser suite 15 / 15 (live messaging on the production build, import map
and lazy socket included).

## §46 — Demo mode for reviewers: the person's choices (2026-11-02)

§43's third item, designed with the person after §45 was green. Every choice
is the recommended one:

- **The card lists 4 accounts:** `admin@` (the admin side), `alex@` (a
  practitioner with patients), `pat@` (a patient with a program, sessions,
  messages), `casey@` (two-factor sign-in — the card shows its published demo
  key). Each has a "Use" button that FILLS the sign-in form (the reviewer
  still signs in, MFA step included). Everything else: the link to
  `docs/dev-test-accounts.md` (once the repos are public).
- **Invitations reach real inboxes:** the person verifies a domain on Resend
  (SPF / DKIM records), so "sign in as the admin and invite yourself" works.
  Consequence: the reset must NOT send the seed's own invitations to
  `@stride.test` addresses for real in production (they would bounce and hurt
  the domain's sending reputation).
- **The reset: nightly + on every deploy, no button anywhere.** A cron on the
  droplet runs it (e.g. 03:00 Paris); the card states the schedule. Nothing a
  reviewer can trigger.
- **The listed accounts are locked in demo mode:** for those 4 only, the
  backend refuses (403, a sentence saying why) password change, email change,
  two-factor on / off / reset, deactivation, role removal, and being merged
  away. Everything else works normally.

**One switch:** `DEMO_MODE` (allowed in production — the demo IS a production
deployment), exposed on a public route for the card; a real clinic's
deployment shows none of it.

**Facts found while preparing:** the seed refuses `NODE_ENV=production`
(`scripts/seed/safety.ts`) — the reset needs a deliberate exception tied to
`DEMO_MODE`; the seed is ts-node, outside the image (`dist/` only), and the
production compose file's `seed` service (builder stage, `profiles:
["tools"]`) runs `seed-exercises.ts` only.

**The plan, in passes (each green before the next):**
1. **Backend — the switch, the route, the locks:** `DEMO_MODE` validated with
   the other settings; the public answer for the card; the refusals for the
   listed accounts, in the services, with unit and e2e tests.
2. **Backend — the reset job:** the seed allowed in production only in demo
   mode; real invitation emails skipped for seed addresses; sessions and
   sockets ended; storage swept; no collision with the message-notices sweep;
   the droplet's cron and the deploy step written down.
3. **Frontend — the card** on the sign-in page.

### §46, pass 1 — the switch, the card's answer, the locks (built 2026-11-02)

Backend only; no migration, no package.
- **`DEMO_MODE`** (`src/config/demo-mode.ts`): `off` by default (the safe value
  here is "nothing published" — the opposite of `RATE_LIMITS`), `on` allowed
  in production, anything else refused; two optional texts for the card,
  `DEMO_RESET_SCHEDULE` (≤ 120 characters) and `DEMO_GUIDE_URL` (https://
  only — the card makes it a link, so never a `javascript:` address). Checked
  at start by `validateEnv()`; read per request, so an e2e file can switch it.
- **The published data moved to `src/demo/demo-accounts.ts`**: the password,
  the two-factor key and recovery codes (from `scripts/seed/dataset.ts`, which
  re-exports them — one copy for the seed and the card) and
  `DEMO_CARD_ACCOUNTS` (the four, with their role and two-factor flag).
  `dataset.spec.ts` checks each is seeded with exactly that one role (else
  the sign-in would ask which), a password, active, two-factor as said.
- **The card's answer** rides on `GET /auth/setup-status` (the sign-in page
  already reads it): `demo: { accounts, password, twoFactorKey,
  resetSchedule, guideUrl } | null`. The words around the values stay the
  frontend's.
- **The locks: a guard, not service checks** (`src/demo/demo-lock.guard.ts`).
  `@DemoLocked(change, 'self' | 'param')` bundles the metadata and the guard
  (`applyDecorators`). On 9 routes: `POST /auth/password`, `POST
  /auth/email-change`, `POST /auth/mfa/setup | enable | disable |
  recovery-codes` (the signed-in account), `POST /users/:id/mfa/reset`,
  `DELETE /users/:id`, `POST /users/:id/merge` (the account in the address —
  for a merge, the one merged AWAY; merging another INTO Pat is allowed). By
  EMAIL (ids are row numbers a reset recreates). 403 with a sentence per
  change ("This is one of the demo's shared accounts, so its password can't be
  changed: other reviewers sign in with it. To try this, invite yourself as a
  new user."). Runs BEFORE the route's step-up: no password checked, so no
  `STEP_UP_FAILED`, no counter, no code spent. Off: returns before any query.
  No role-REMOVAL route exists, so nothing to lock there.
- **Left open on purpose:** Casey's published recovery codes are single-use
  (reviewers using them use them up until the reset); a two-factor code
  can't be used twice, so two reviewers signing in as Casey in the same
  30 seconds — the second waits for the next code. A reviewer can still edit
  the shared accounts' names, care teams, programs — the reset repairs that.
- **Tests:** unit 2,497 (+37: settings, the card's answer, the guard with a
  real Reflector over decorated methods, the boot check, the seed's four);
  API e2e 1,345 (+19, `test/demo-mode.e2e-spec.ts`: the card on and off, each
  of the 9 routes refused for a shared account with nothing recorded, the
  same requests allowed for other accounts, the admin deactivating others,
  merging INTO Pat, everything unlocked with the switch off); lint 0.
  Mutations: 12 unit + 9 routes (the lock removed from each) — 20 killed, 1
  equivalent (`=== 'on'` vs `!== 'off'`: only those two values pass the
  check).

### §46, pass 2 — the nightly reset (built 2026-11-02)

Backend and the droplet; no migration, no package, no frontend change.
- **The app is STOPPED around the reset** (`scripts/ops/demo-reset.sh`):
  `stop app` → the `demo-reset` compose job → `start app`, the start in a
  `trap … EXIT` so it happens whatever the job did. One move answers three
  questions from §43: the sockets (authenticated once, at their handshake —
  they'd outlive the deleted accounts; a stopped app has none), the
  message-notices sweep (every minute — it can't meet the reset halfway, no
  advisory lock needed), and sessions (rows, deleted with everything else).
  A failed reset rolls back its one transaction: the app returns on
  yesterday's data. Cost: about a minute of errors at 03:00. The script
  refuses (before stopping anything) unless `.env` has a `DEMO_MODE=on` line
  (a trailing comment and quotes allowed). Tested with a stand-in `docker`
  recording its calls: success, a failed reset (the app still started, exit
  code kept), not the demo (nothing called), run through `sh` from `/` with
  no executable bit.
- **The job** (`docker-compose.prod.yml` › `demo-reset`, builder stage,
  `profiles: ["tools"]`): `seed-dev.ts --reset && storage-sweep.ts --delete`.
- **The seed in production — only in demo mode** (`scripts/seed/safety.ts`):
  `refuseSeed` takes `demoMode`; production is refused unless it is on; the
  other two rules (users without `--reset`, a `_test` database) still hold.
- **The seed sends nothing in production** (`SeedEmailTransport`'s
  `deliverForReal`, false when `NODE_ENV=production`): 'deliver' keeps the
  email like 'capture'. Checked live: the production-mode reset left Mailpit
  empty; the development seed delivered `new.patient@`'s invitation.
- **No email to an address that can't exist** (`src/email/reserved-domains.ts`,
  in `ResendTransport` only): RFC 2606's `.test`, `.example`, `.invalid`,
  `.localhost`, `example.com` / `.net` / `.org` and their subdomains are
  refused before Resend — they'd only bounce, and bounces lower the verified
  domain's reputation. Rejected like any failed send (an invitation shows
  "couldn't be sent" — true), without the address in the message (§32). Mailpit
  and the log transport keep receiving them (development).
- **The schedule: a systemd timer**, `OnCalendar=*-*-* 03:00:00 Europe/Paris`,
  `Persistent=true` — not a crontab line: the droplet runs on UTC and Ubuntu's
  cron has no per-line time zone, so 03:00 Paris would drift by an hour twice a
  year (`systemd-analyze calendar` checked: 02:00 UTC in winter).
  `ExecStart=/bin/sh …` (no executable bit needed).
- **`.gitattributes`** (new): `*.sh`, `*.service`, `*.timer` → `eol=lf` — a
  CRLF shell script fails on Linux, and the person commits from Windows.
- **`docs/demo-deployment.md`** (new): the settings, the Resend domain, first
  install, the timer's install, the step after each deploy, the known limits.
- **Tests:** unit 2,524 (+27: the seed's production rule both ways, the kept
  email, the reserved domains — 22 addresses, look-alikes included —, the
  transport refusing before Resend). Mutations: 11, all killed.

### §46, pass 2 — changed before running (2026-11-02, the person's two questions)

- **The reset runs at 04:00 Eastern, not 03:00 Paris** — the reviewers are in
  North America; 03:00 Paris is 9 p.m. Toronto / 6 p.m. Vancouver, mid-review.
  4 a.m. Eastern is the quietest hour across the continent (1–2 a.m.
  Vancouver, 5:30 a.m. St. John's; 10:00 Paris). Timer: `OnCalendar=*-*-*
  04:00:00 America/Toronto`.
- **The card shows it in the reviewer's own time** (the person's choice):
  `DEMO_RESET_SCHEDULE` (free text) replaced by `DEMO_RESET_TIME` (24-hour
  `HH:MM`) + `DEMO_RESET_TIME_ZONE` (IANA, checked with the project's
  `isTimeZone` — never a bare offset), both or neither; the answer's
  `resetSchedule` becomes `reset: { time, timeZone } | null`. The frontend
  (pass 3) converts it. The timer and `.env` must agree (the docs say so; the
  card only reports, the timer decides). 5 more mutations, all killed; unit
  2,540.
- **Accounts reviewers create are deleted by the reset too — kept that way**
  (the person asked; the assistant's recommendation, accepted): the reset
  keeps only the exercise library. Their addresses are real people's (the
  demo keeps them less than a day — minimisation), and their data is woven
  into the seeded accounts' (care teams, messages, clinics), so keeping some
  accounts while recreating the others would leave broken links. The card
  will say so: "…including accounts you create".

### §46, pass 3 — the card (built 2026-11-02)

Frontend only (`src/demo/` NEW, `LoginPage`, `SetupStatus.demo`).
- **Where:** below the sign-in form, after "No account yet?", as a section
  headed "For reviewers"; only when `GET /auth/setup-status` answers a `demo`
  (null on a real deployment — nothing about a demo shows).
- **What it says:** the shared password; the four accounts (role, address,
  what each shows — a line per address, with a fallback by role for an
  account added later); Casey's key in groups of four, each group
  unbreakable (`break-all` cut a group at 375 px); the rules (invitation-only;
  what the shared accounts can't change — invite yourself to try it); "Don't
  enter real personal information: other reviewers can see what you type";
  "Demo data is reset every day at 1:00 AM your time — including accounts you
  create" (the person's choice: the viewer's own time); the guide, in a new
  tab, said in words.
- **"Use" FILLS the form** (`setValue` on both fields, earlier errors cleared,
  focus to "Log in", a polite status for screen readers) — the reviewer still
  signs in and sees the real steps (Casey's two-factor step checked live).
- **The viewer's time** (`demoReset.ts`, pure): the next instant that reads
  04:00 in America/Toronto — Intl can only say what an instant READS in a zone,
  so the instant is guessed, read back, corrected by the difference, twice (a
  clock change between guess and answer) — then formatted in the browser's
  zone. The NEXT reset's, because zones change clocks on different dates
  (Paris 9:00 instead of 10:00 for two weeks in March). Tests pin instants in
  UTC (the same in any machine zone — run under Vancouver, Kolkata,
  Auckland): today / tomorrow / the exact moment, the zone's calendar not
  UTC's, summer, both nights around Toronto's change, year end, east of UTC,
  milliseconds; the formatted time in five zones, the two-week gap, French.
- **Checked live** (backend in demo mode, the production build): 375 px light
  (Vancouver: 2:00 AM) and dark (Toronto: 4:00 AM), 1280 px (Paris: 10:00 AM),
  no sideways scroll down to 320 px; "Use" Casey → focus on Log in → Enter →
  the two-factor step; Pat's password change refused with the lock's
  sentence on the form.
- **Tests:** Vitest 3,595 (+20); browser suite 15 / 15; lint and tsc clean.
  Mutations: 15 — 4 survivors the first time: three test gaps closed (an
  `<a>` without href has no link role, so "no link" can't see it; "once, on
  Casey's row" not just "present"), and one dead line removed (truncating
  milliseconds in `zoneOffsetMs` — they cancel where it's used).


---

## §47 — The room under each page, and the avatars' tints (2026-11-03)

**Why:** two things the person noticed in the design (2026-11-02). The last
element of many pages sat right against the window's bottom edge; and a user
without a photo was drawn as initials on a flat grey circle, "a bit austere".

### Decided (the person's choices, 2026-11-02)

- **No footer.** The assistant's view, agreed: a signed-in app (Gmail, Linear,
  clinic software) has none — a footer belongs to a marketing site; on phones
  the tab bar already owns the bottom; "© 2026" is a formality (copyright needs
  no notice; the repos are Apache-licensed). **The credit line** ("a capstone
  project by…", proposed for the sign-in page in demo mode only): the person
  declined — it adds nothing there.
- **The spacing fixed at its source** rather than by a footer.
- **Avatars: three tints** (the person, over the two first proposed — "a bit
  more variety with still some harmony"): teal and coral from the logo, sand
  from the warm greys' own hue. PALE tints with DARK text of the same hue (deep
  tints with light text in dark mode) — never the solid colours: initials are
  text, and white on coral fails AA (§39's reason coral is only an accent).
- **The colour comes from the user's id**, not `Math.random()` (it would change
  on every render) and not the name (editable — a typo fixed would change the
  colour).

### Built (2026-11-03) — frontend only, confirmed GREEN by the person the same day

**The room under each page.**
- **The cause:** `<main>` had `md:pb-0` (nothing on desktop) and, on phones,
  exactly the tab bar's height; each page added its own `pb-8` / `pb-12` — 30
  of the 85 page containers did, the other 55 ended flush.
- **Now:** `AuthenticatedLayout`'s `<main>` gives every page
  `pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12` (the tab bar's 4rem +
  2rem of room + the home-indicator strip; 3rem on desktop); the 30 per-page
  paddings removed (29 signed-in pages and `RecordsDownloadPage`);
  `SignedOutLayout` wraps its `<Outlet />` in `pb-12` (the sign-in page's
  reviewer card and the longer forms).
- **Messages opts out:** it sizes itself to the window (its panes scroll
  inside), so room added under it would scroll the whole page. A ROUTE `handle`
  (`FILLS_SCREEN`, `src/app/layout/fillsScreen.ts`) on the two Messages layout
  routes; `useFillsScreen()` reads every matched route's handle with React
  Router's `useMatches()` (`some`: the handle is on the section's layout, the
  open conversation its child), checking the shape (`handle` is `unknown`).
  Chosen over the layout comparing paths (a second copy of them) and over a
  negative margin inside Messages (two places that must agree on a number).
  Both class sets written in full (Tailwind finds classes by reading the
  source as text).
- **Found on the way:** Messages scrolled by 1 px on both widths — the top bar
  is 65 px (`h-16` + its border-b), the height calc subtracted 64. Now
  `-1px` in both calcs. Pre-existing.

**The avatars.**
- **Tokens** (`index.css`, `:root` and `.dark`, mapped in `@theme inline`):
  `--avatar-teal` / `-foreground`, `--avatar-coral`, `--avatar-sand`. Light:
  L 0.93 tints, text L 0.40–0.44 (7.3 / 6.5 / 6.9 : 1); dark: L 0.34–0.35
  tints, text L 0.90 (8.7 / 8.5 / 8.4 : 1). All six pairs added to
  `paletteContrast.test.ts` (text 4.5:1, in gamut, the dark theme setting each
  itself).
- **`src/common/avatarTint.ts`:** `AVATAR_TINT_CLASSES` (the class pairs
  written in full) and `avatarTintIndex(userId)` — Fibonacci hashing:
  `Math.imul(id, 0x9e3779b1) >>> 0`, as a fraction of 2^32, times 3, rounded
  down. Ids 1–300 fall exactly 100 / 100 / 100; ids 1, 2, 3 get three tints;
  every stride tried (2, 3, 4, 6) still reaches all three. **A trap found while
  building:** the high 16 bits `% 3` gave long runs of one colour — each
  consecutive id adds ≈ 40,503 to those bits, a multiple of 3. Plain `id % 3`
  was refused too: users created in a regular pattern would share a colour.
- **`UserAvatar`** takes a REQUIRED `userId` (like `avatarUrl`: no screen can
  forget it); the tint replaces `bg-muted` and stays under a photo (what shows
  while it loads). 15 call sites + `PatientIdentity` and `HomeGreeting` (a
  `userId` prop) and their 5 callers — `tsc` listed them. Every id passed is the
  USER's id (checked per type: directory rows, care-team members, candidates,
  recipients, conversations' other participant, alerts' patient).

**Checked.** Vitest 3,621 (+51, 277 files); tsc and lint clean (exit 0; the
same pre-existing warnings); browser suite 15 / 15. Mutations: 15, all killed
(the `some` → `every`, the shape check loosened, the branches swapped, the
desktop room removed, the patient's Messages unmarked, the high-bits `% 3`,
plain `% 3`, no `>>> 0`, the tint dropped or constant, a class typo, a dark
token missing, a text colour too pale, the `@theme` mapping missing, the
signed-out room removed). Live in Chromium (Alex and Pat): 48 px under each
page at 1280, 96 px at 375 (the tab bar + 32); Messages 0 px of page scroll at
both widths, an open conversation's composer above the tab bar; the roster and
home in light and dark.

---

## §48 — Address data from Unicode CLDR, one level per country (2026-11-04)

**Why:** a licence, found preparing the repos to go public (the
documentation roadmap's first "before going public" item). `country-state-city`
is **GPL-3.0**. It was only a devDependency, but the generator copied its data
into the two committed JSON files and the build shipped them — and GPL's
copyleft asks that a work distributed with GPL material be distributed under
the GPL. Apache 2.0 can go into GPL, not the reverse, so the repository's
`LICENSE` would have misled about that part. (Not legal advice: names and
codes may be unprotected facts in the US, the EU has a database right, and the
data seems to come from a database labelled ODbL elsewhere. The clean answer
was chosen over the arguable one.)

### Decided (the person, 2026-11-03): keep a state list, from CLDR

Candidates checked (2026-11-03): `iso3166-2-db` (MIT label over share-alike
sources: OpenStreetMap, GeoNames, Wikipedia — refused); `country-region-data`
(MIT, hand-curated, no stated source, mixed languages — doubtful);
`i18n-iso-countries` (countries only); Wikidata (CC0, but 2–3 days of cleaning
and no pinned version for the snapshot test to anchor on); **Unicode CLDR v49**
— Unicode's own data, kept in step with ISO 3166-2, what browsers and ICU use,
under the **Unicode License v3**: free to use, copy, modify and distribute
provided its notice travels with the data. **Chosen.** Rejected too: dropping
the state list (a free-text field everywhere).

Measured against the old data first (`compare_states.py`): much of the
difference was the OLD data's noise — mixed levels and abolished entries (FR
123 = departments + today's regions + pre-2016 regions; GB 247, old and new
councils side by side).

### Decided (the person, 2026-11-04, "as proposed"): the level per country

The assistant proposed, the person confirmed. **Default: CLDR's top level**
(US states, Canadian provinces, German Länder…). Exceptions, each by the
level an address in that country actually names:

- **One level down** — a top-level entry with nothing under it kept as it is:
  DO (10 planning regions of 2004 → the provinces + Distrito Nacional), ES
  (autonomous communities → provinces, + Ceuta, Melilla), ID (7 geographic
  island groups → the 38 provinces), IE (the 4 historic provinces → the 26
  counties, "Co. Cork"), IQ ("Kurdistan" wraps three governorates → the 18
  governorates, the same set as before), IT (regions → provinces, "00184 Roma
  RM"; + Aosta Valley), PH (regions → provinces, + Metro Manila).
- **No list** (the form's free-text field): FR (no region line in French
  addresses; CLDR's top level also mixes the regions with places that are
  countries of their own in the list — St. Barthélemy, New Caledonia), GB (UK
  addresses name neither the 4 nations nor the 217 councils).
- **Kept at the top level on purpose** although CLDR has a second: BD, BE, BF,
  CV, CZ, EE, FJ, GN, GQ, GW, IS, KN, LK, LT, MA, MH, MW, UG (each one's main
  division; the field is optional, "if applicable"); RS (one level down would
  list Kosovo's districts under Serbia, while Kosovo is its own country in the
  list); AZ (one level down would replace Nakhchivan by its 8 districts). BE as
  "no list" was offered and not taken.
- **CLDR's gaps:** 4 of China's 34 entries have no English name. Hong Kong,
  Macao and Taiwan are left out (each is its own country in the list); **Inner
  Mongolia** — CLDR lists `cnnm`, its alias table points to `cnmn`, neither is
  named, a gap in CLDR itself — is named by hand. Any OTHER unnamed entry
  stops the generator rather than dropping a place silently.
- **CLDR's disambiguation markers** (`Île-de-France²`, `Lagunes²`) stripped;
  the generator stops if that makes two names in one country equal (the
  dropdown's value is the name).
- **Countries:** read from CLDR by a rule — two letters, an ISO 3166-1 number
  below 900 (900+ is private use: EU, ZZ), not deprecated (YU, SU), plus Kosovo
  (XK, user-assigned) — giving exactly the previous 250 codes. CLDR's standard
  English names, **not its short forms** (they include "UK" and "US"). 44 names
  change (Czechia, Türkiye, Eswatini, "Congo - Brazzaville", "St. Lucia"…).
- Kept as CLDR writes them: "Washington DC", "Madrid Province".
- Sorted by English name (`Intl.Collator('en')`: "Åland Islands" beside
  "Albania"), countries and subdivisions alike.

Not checked against Google's address metadata (unreachable from the
assistant's sandbox): the reasons come from the countries' postal formats as
the assistant knows them.

### Built (2026-11-04) — frontend only

- **`scripts/generate-address-data.mjs`** rewritten: reads `cldr-core`
  (`subdivisionContainment.json`, `codeMappings.json`, `aliases.json`),
  `cldr-subdivisions-full` (`subdivisions/en/en.json`) and
  `cldr-localenames-full` (`main/en/territories.json`) through
  `createRequire(import.meta.url).resolve` (works from any folder); the rules
  above as named sets at its head, each with its reason; same output as before
  (`[code, name]` pairs, one per line, CRLF), so **the app's code is
  unchanged**.
- **Packages:** `country-state-city` removed; the three CLDR packages added as
  devDependencies **pinned exactly to 49.0.0** (one CLDR version, so the
  snapshot test has one anchor; `cldr-subdivisions-full` has a peer dependency
  on `cldr-core`). The person updates and commits the lock.
- **Licence:** CLDR's `LICENSE` copied unchanged to **`LICENSE-CLDR.txt`** at
  the root (byte-identical in the three packages); a paragraph in `NOTICE`
  names the data, the files it went into, the version and that file; the
  README's License section says so.
- **`addressData.test.ts`** rewritten (6 → 15 tests): still "exactly what the
  installed source says", rebuilt in the test from CLDR's JSON with the rules
  written out again — not imported from the script, so a generator bug can't
  also be its own expectation; changing a rule means changing it in both
  places, on purpose. Plus one test per rule (one level down, no list, top
  level kept, markers, no repeated names, China, real countries only, standard
  names, the collation).
- Comments in `addressData.ts`, `AddressFields.tsx`, `test-setup.ts` (its
  two-country fixture keeps the old spelling "Aland Islands"; no test compares
  it with the real data). Frontend README, ARCHITECTURE, PROJECT, TESTING.

**What changed for a user:** 198 countries with a list, 3,820 entries (was
197 / 4,963). Lists lost: HK, BM, XK (CLDR has none), FR and GB (decided);
gained: BQ, GL, PS, SH, UM, WF. US 66 → 57 (the 9 single outlying islands now
under the country UM). A saved state no longer in its list (e.g. "Alsace")
shows an empty dropdown when editing; the stored value stays unless changed.
**No migration:** the database stores the country's CODE (ISO 3166-1, the same
in every source) and the state's NAME; the seed stores no state; the backend's
tests use "Illinois", unchanged.

**Checked.** The built address file **129.23 → 79.86 kB** (gzip ~46 → 34 kB);
not in the first download, which stays 12 files, 769.73 kB (235.55 kB gzipped)
— `check:cache-names` passed, 1 of 225 files renamed. Old vs new, code by code:
1,620 same, 1,858 renamed (mostly cleaner names: "Aichi", not "Aichi
Prefecture"), 1,082 gone, 303 new. Vitest 3,630 (+9: 6 replaced by 15; 277
files); tsc and lint clean (the same pre-existing warnings); build; browser
suite 15 / 15 against the real backend; link check clean. Mutations: 10 planted
in the generator — 9 caught by the test (the markers kept, Italy at the top
level, a list for GB, a plain `<` sort, the short names, the childless regions
dropped, Taiwan kept, Kosovo dropped, lower-case codes), the 10th (deprecated
codes kept) stops the generator itself (no English name for YU).

### Open

- **Report the Inner Mongolia gap** to CLDR. When a later version names it,
  the generator prints "remove it from MISSING_NAMES" and the test's "still a
  gap" check fails — both on purpose.
- **A CLDR upgrade** is `npm install -D -E` of the three packages at the new
  version, then `npm run generate:address-data`; the test fails until both
  are done.
