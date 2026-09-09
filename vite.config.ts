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
  },
})