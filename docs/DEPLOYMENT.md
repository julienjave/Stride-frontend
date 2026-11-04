# Stride frontend — building and deploying

> **Status, 2026-11-03: written, not yet run end to end.** The frontend has
> never been deployed. What was checked in a sandbox the same day: the
> production build with `VITE_API_URL` set, and that build served by
> Wrangler's local emulation of Cloudflare Pages (`wrangler pages dev`,
> 4.152.0), which answered every request in
> [What the host must do](#3-what-the-host-must-do) as described there. The
> Cloudflare dashboard steps follow Cloudflare's documentation of the same
> day, and the first real run will correct them.

The app is static files: `npm run build` writes them into `dist/`, and
Cloudflare Pages serves them at `https://stridecare.app`. Everything it shows
comes from the API at `https://api.stridecare.app`, whose deployment is the
backend repository's
[`docs/DEPLOYMENT.md`](https://github.com/julienjave/Stride-backend/blob/main/docs/DEPLOYMENT.md).
The two guides meet in three settings:

| What | Here (the build) | In the backend |
|---|---|---|
| The API's address | `VITE_API_URL=https://api.stridecare.app` | the `Caddyfile`'s `api.stridecare.app` site |
| This app's address | the Pages project's custom domain, `stridecare.app` | `FRONTEND_URL` (links in emails) and `FRONTEND_URLS` (CORS) |
| The browser's error project | `VITE_SENTRY_DSN` | `SENTRY_BROWSER_DSN`: the same string, character for character |

- **Part 1** — running it locally
- **Part 2** — the build and its settings
- **Part 3** — what the host must do, and how this repository makes Pages do it
- **Part 4** — the first deployment on Cloudflare Pages
- **Part 5** — verifying it
- **Part 6** — redeploying, rolling back, and what's not done yet

---

## 1. Running it locally

**Prerequisites:** Node.js 24, and the backend running locally (its
[`docs/DEPLOYMENT.md`, Part 1](https://github.com/julienjave/Stride-backend/blob/main/docs/DEPLOYMENT.md#part-1--local-development)):
the API on `http://localhost:3000`, Mailpit's inbox on
`http://localhost:8025`.

```bash
git clone https://github.com/julienjave/Stride-frontend.git frontend
cd frontend
npm ci
npm run dev
```

Clone it beside the backend's folder: the browser suite looks for the
backend at `../backend` (the backend's Part 1 clones it there), then
`../Stride-backend` (a plain `git clone`);
[`TESTING.md`](TESTING.md#the-browser-suite) says how to point it
elsewhere.

The app is at http://localhost:5173, which is the origin the backend's
`.env.example` allows (`FRONTEND_URLS=http://localhost:5173`). It calls
`http://localhost:3000` unless `VITE_API_URL` says otherwise; a different
address goes in `.env.local` (ignored by Git, like every `*.local` file):

```dotenv
VITE_API_URL=http://localhost:3000
```

The accounts to sign in with are the backend seed's (the backend's
[`docs/demo-accounts.md`](https://github.com/julienjave/Stride-backend/blob/main/docs/demo-accounts.md)).

**The production build, locally:**

```bash
npm run build      # into dist/
npm run preview    # serves dist/ at http://localhost:4173
```

`4173` isn't in the backend's default `FRONTEND_URLS`: add it there
(`FRONTEND_URLS=http://localhost:5173,http://localhost:4173`) and restart the
API, or every request from the preview is refused by CORS.

The test suites: [`TESTING.md`](TESTING.md).

---

## 2. The build and its settings

`npm run build` runs `tsc -b` (the type check of the app, the Vite config and
the browser suite), then `vite build`, into `dist/`
([ARCHITECTURE §11](ARCHITECTURE.md#11-build-and-delivery)).

**Settings are read at build time**, from the environment of the build.
Vite only exposes variables prefixed `VITE_`, and writes their values into
the JavaScript files: **nothing secret belongs here**, and changing one means
building again.

| Variable | Production value | If unset |
|---|---|---|
| `VITE_API_URL` | `https://api.stridecare.app` | `http://localhost:3000`: a deployed build would call the visitor's own machine. **Required.** |
| `VITE_SENTRY_DSN` | the backend's `SENTRY_BROWSER_DSN`, exactly (`http://<key>@glitchtip:8000/<id>`) | no error reports, and the reporting code is never downloaded |
| `VITE_SENTRY_ENVIRONMENT` | unset | Vite's mode: `production` for `npm run build` |
| `VITE_SENTRY_RELEASE` | optional: the commit | reports carry no version |

About `VITE_SENTRY_DSN`: the browser never contacts the host it names. The
reporting SDK sends each report to the API's `POST /monitoring` (its
`tunnel`), and the API forwards to GlitchTip, on the Droplet's internal
network, only the reports whose DSN is exactly the one it was given
(decisions §32). So it's the same string in both, `glitchtip:8000` included,
and a DSN isn't a secret: it lets one send reports to that project, nothing
more.

Plus, for Cloudflare's build machine: **`NODE_VERSION=24`**. Its build image
defaults to Node.js 22, and this project uses 24 everywhere (the backend's
image, CI).

---

## 3. What the host must do

Four things, all checked against `wrangler pages dev` (Cloudflare's own
emulation of Pages) on 2026-11-03:

| Request | Answer | Why it must be so | Made so by |
|---|---|---|---|
| `/`, `/practitioner/messages`, any path that isn't a file | `200`, `index.html` | The router reads the address: a reload or a link to any page must get the app | **Pages itself**: without a `404.html` at the top of the build, it serves `index.html` for any path that isn't a file |
| `index.html` | `Cache-Control: public, max-age=0, must-revalidate`, with an `ETag` (a revisit gets `304`) | It's the one file without a hash in its name: a stale copy would keep yesterday's file names | **Pages' default** for every file |
| `/assets/SessionPage-hv2Az1i5.js` (any built file) | `Cache-Control: public, max-age=31536000, immutable` | The name changes with the content, so a copy can never be stale: kept a year, never asked again | [`public/_headers`](../public/_headers) |
| `/assets/<a file that doesn't exist>` | `404`, `Cache-Control: no-store` | A tab opened before a deploy asks for an old file. It must fail, so the app reloads onto the new `index.html` | [`public/assets/404.html`](../public/assets/404.html) |

**Why the fourth rule exists.** Pages answers a missing file with the nearest
`404.html`, walking up the folders, and only when there's no `404.html` at
the top does it serve `index.html` instead. Without `assets/404.html`, a
missing `/assets/…` file got `index.html` with `200`, and the `_headers` rule
then marked that HTML `immutable` under the old file's name for a year (seen
in the emulation). Harmless while the file stays gone; but after a **rollback**
brings it back, that browser would keep using the HTML it cached and fail on
that page for a year. With the nested `404.html`, the request gets a real
`404`, never stored. The browser's import fails, Vite fires
`vite:preloadError`, and [`app/staleChunkReload.ts`](../src/app/staleChunkReload.ts)
reloads once onto the new `index.html` (ARCHITECTURE §11).

**So: never add a `404.html` to the top of `public/`.** Its absence is what
switches on the single-page fallback.

Both files are copied into `dist/` by the build, as everything in `public/`
is. Pages reads `_headers` and never serves it.

---

## 4. The first deployment on Cloudflare Pages

Before: the backend deployed through its Phase 3 at least (its `.env` already
says `FRONTEND_URL=https://stridecare.app` and
`FRONTEND_URLS=https://stridecare.app`), and `stridecare.app` on Cloudflare.

1. **Create the project:** Workers & Pages → Create → Pages → Connect to
   Git. Authorize Cloudflare's GitHub app for the frontend repository, and
   choose it.
2. **Build settings:**

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | (empty: the repository's root) |

3. **Environment variables**, for **Production**:

   | Name | Value |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `VITE_API_URL` | `https://api.stridecare.app` |
   | `VITE_SENTRY_DSN` | the backend's `SENTRY_BROWSER_DSN`, once its Phase 10 has made it (until then, leave it out: reporting stays off) |

   Optional, for reports labelled with their commit: the build command
   `VITE_SENTRY_RELEASE=$CF_PAGES_COMMIT_SHA npm run build`
   (`CF_PAGES_COMMIT_SHA` is set by Pages during each build).
4. **Save and Deploy.** The first build runs; its log ends with Vite's list
   of files.
5. **Preview deployments: off.** In the project's settings, Branch control →
   Preview branches: **None** (the default builds every other branch). A preview is served from
   `<hash>.<project>.pages.dev`, a different *site* from
   `api.stridecare.app`, and can't work against the production API:
   - the session cookie is `SameSite=Lax`, so the browser doesn't send it with
     a `pages.dev` page's requests: every preview is signed out (the backend's
     `src/config/session-cookie.ts`);
   - `FRONTEND_URLS` names `https://stridecare.app` only, so the browser hides
     the API's answers from any other origin (CORS).

   Previews would need an API of their own (a staging backend, its
   `FRONTEND_URLS` listing them), or an address on the same site: a branch's
   custom domain such as `preview.stridecare.app`, added to that backend's
   `FRONTEND_URLS`. The project's own `<project>.pages.dev` address serves
   the production build too, and can't sign in for the same reasons: link
   people to `stridecare.app` only.
6. **The custom domain:** the project → Custom domains → Set up a custom
   domain → `stridecare.app`. The zone is on Cloudflare, so Pages adds the
   DNS record itself; wait for "Active". The certificate is Cloudflare's.

---

## 5. Verifying it

**The host's rules, with `curl`:**

```bash
SITE=https://stridecare.app
curl -sI $SITE/practitioner/messages | grep -iE '^HTTP|^content-type|^cache-control'
ASSET=$(curl -s $SITE/ | grep -oE 'src="/assets/[^"]+\.js"' | head -1 | cut -d'"' -f2)
curl -sI $SITE$ASSET | grep -iE '^HTTP|^cache-control'
curl -sI $SITE/assets/no-such-file.js | grep -iE '^HTTP|^cache-control'
```

→ `200`, `text/html`, `max-age=0, must-revalidate`; then `200`,
`max-age=31536000, immutable`; then `404`, `no-store`. Part 3 says what each
one is for.

`ASSET` is the entry file, read from `index.html`'s `<script src>`. The
same page names it a second time with another hash, in the import map: that
one is a stable *key* the files import each other by (ARCHITECTURE §11), not
a file, so a `curl` of it gets the `404`.

**The build calls the right API:**

```bash
curl -s $SITE$ASSET | grep -o 'https://api.stridecare.app' | head -1
```

→ `https://api.stridecare.app`. Nothing printed means `VITE_API_URL` wasn't
in the build's environment: set it, then retry the deployment.

**In a browser**, at `https://stridecare.app`:

- [ ] **Sign in** (the clinic's admin, or a demo account from the card). In
  the developer tools' Network tab, the sign-in request to
  `api.stridecare.app` → Cookies: `connect.sid`, HttpOnly, Secure, SameSite
  Lax.
- [ ] **Reload a page deep in the app** (a patient's page, the messages): it
  stays on that page, still signed in.
- [ ] **Messaging**: two accounts in two browsers (a practitioner and their
  patient); a message sent by one appears for the other without a reload.
  That's the socket, through Cloudflare and Caddy.
- [ ] **Photos**: the exercise library's pictures load; in the Network tab
  they come from `https://files.stridecare.app/stride/…`.
- [ ] **An email's link**: a password reset (or an invitation) opens
  `https://stridecare.app/reset-password?token=…` on the right page.
- [ ] **Error reporting** (once `VITE_SENTRY_DSN` is set): in the console,
  ```js
  setTimeout(() => { throw new Error('Stride deploy check') })
  ```
  (`setTimeout`, so the error is the page's, not the console's own). A
  minute later GlitchTip's `stride-web` project shows it, with the page's
  path and the user's id, and nothing else about the person (ARCHITECTURE
  §10).

---

## 6. Redeploying, rolling back, and what's not done yet

**Redeploying** is a push: every commit on `main` builds and deploys. A
changed `VITE_` setting needs a new build of the same commit: Deployments →
the latest → Retry deployment.

**Rolling back:** Deployments → an earlier one → Rollback. It serves that
deployment's files again at once. Tabs opened since keep working: their file
names are that deployment's. A tab still holding names from the newer
deployment asks for files that are now missing, gets the `404` of Part 3, and
reloads once onto the restored `index.html`.

**A backend change that the frontend depends on** deploys first: the API
answers the old frontend as before, while a new frontend on the old API
would call routes that aren't there yet.

**Not done yet:**

- **A Content-Security-Policy.** If one is added (in `public/_headers`), it
  must allow the two inline scripts in `index.html` by their hashes (the
  pre-paint script, and the import map Vite writes, whose content, and so
  hash, changes whenever a file is renamed), connections to `https://api.stridecare.app` and its
  socket (`wss://api.stridecare.app`), and images from
  `https://files.stridecare.app`. Not designed yet.
- **CI** is written and parked until the repositories are public
  ([`PROJECT.md`](PROJECT.md#ci-built-and-parked-with-gitignore)). It checks
  every commit; it doesn't deploy. Pages builds on its own.
