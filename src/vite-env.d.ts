/// <reference types="vite/client" />

// Vite's own vite/client types give ImportMetaEnv a generic index signature
// (so ANY import.meta.env.WHATEVER type-checks as `any`, silently). This
// augments that interface with the specific variables THIS app actually
// uses, so a typo (e.g. VITE_API_URLL) or a missing .env value becomes a
// real compile error instead of a silent `any` that only fails at runtime.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}