import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Files import each other by STABLE names (decisions §45). Without it,
    // a built file imports another by its hashed name —
    // `import … from "./index-B9hgZxpK.js"` — so that name is part of the
    // importer's content, and so of the importer's own hash: change one
    // page, the main file's name changes (it lists every page), and then
    // every file importing the main file changes too, and every file
    // importing THOSE… Measured: one page changed renamed 129 of 224 files
    // — a returning visitor downloaded again every page they opened.
    //
    // With it, files import a fixed key (`/assets/index-<stable>.js`) and
    // index.html carries an IMPORT MAP — `<script type="importmap">` —
    // telling the browser which real, hashed file each key means. A deploy
    // then changes the files that really changed, plus index.html (which
    // browsers already fetch again on every visit: it is the one file not
    // named by its content). Measured: one page changed → 223 of 224 names
    // kept; index.html 2.9 → 19.5 kB (6.9 kB gzipped).
    //
    // EXPERIMENTAL in Vite 8 — why `vite` is pinned to an exact version in
    // package.json: upgrading it is a deliberate step, followed by the
    // browser suite and a two-build comparison (decisions §45). Every
    // browser Stride supports has import maps (Chrome 89, Safari 16.4,
    // Firefox 108). If a Content-Security-Policy is ever added, it must
    // allow this one inline script (its hash).
    chunkImportMap: true,
    rolldownOptions: {
      output: {
        // The FRAMEWORK in a file of its own (decisions §45). Every built
        // file is named after a hash of its content (`index-Du-dx3eG.js`),
        // so a browser may cache it for ever: a new content is a new name.
        // But a name changes when ANYTHING in the file changes. React DOM
        // lived in the main file, with our shared code (the layout, the API
        // client, the guards…), and React Router in a shared file with our
        // own apiErrors.ts: any change to that code made a returning visitor
        // download ~100 kB gzipped of unchanged framework again. In this
        // group they share one file whose content — and so whose name —
        // changes only when one of these packages is upgraded.
        //
        // `codeSplitting.groups` is Rolldown's manual chunking (the older
        // `advancedChunks` / `manualChunks` are deprecated in this version).
        // `[\\/]`: a path separator on Windows too. `scheduler` is React
        // DOM's own dependency, named so the intent is plain; the group also
        // takes each package's dependencies by default
        // (`includeDependenciesRecursively`), e.g. React Router's
        // `cookie-es`.
        codeSplitting: {
          groups: [
            {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    // Vitest defaults to plain Node, which has no `document`/`window` at
    // all — fine for pure-logic tests like client.test.ts, but hooks that
    // use React (like useCurrentUser, via useQuery) need a fake browser
    // DOM to render against. jsdom provides exactly that, entirely in
    // memory — no real browser involved.
    environment: 'jsdom',
    // Runs once before every test FILE (not once total) — this is what
    // registers jest-dom's matchers and the automatic DOM cleanup, without
    // every single test file needing its own copy of that boilerplate.
    setupFiles: ['./src/test-setup.ts'],
    // Vitest's own default is 5000ms. Several form tests (RegisterClinicPage,
    // CreateUserPage, CreateClinicPage, RegisterPage) legitimately drive
    // a dozen-plus sequential userEvent.type() calls across many fields in
    // ONE test — each simulates realistic per-keystroke timing, so total
    // wall-clock time scales with how many fields a form has, not with
    // anything being wrong. That's comfortably under 5s on a fast machine,
    // but RegisterClinicPage's "includes all optional fields" test
    // genuinely timed out at the default on a slower one — a real
    // environment-speed difference, not a flaky test or a bug either time.
    // 10s doubles the margin for every test, not just that one file, since
    // several others share the exact same shape and would hit the same
    // wall eventually on a slow enough machine.
    testTimeout: 10_000,
    // Vitest replaces every CSS import with an EMPTY module by default —
    // tests don't need styles, and skipping them is fast. That includes
    // `?raw` imports of a .css file, so a test reading the stylesheet's
    // text got "". index.css is opted back in: paletteContrast.test.ts
    // reads its colours with `import … from '../index.css?raw'` (design
    // decisions §39). No test imports index.css as a stylesheet, so nothing
    // else changes.
    css: { include: [/src\/index\.css/] },
  },
})