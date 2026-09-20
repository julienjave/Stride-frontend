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
  },
})