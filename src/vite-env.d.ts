/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

/// <reference types="vite/client" />

// Vite's own vite/client types give ImportMetaEnv a generic index signature
// (so ANY import.meta.env.WHATEVER type-checks as `any`, silently). This
// augments that interface with the specific variables THIS app actually
// uses, so a typo (e.g. VITE_API_URLL) or a missing .env value becomes a
// real compile error instead of a silent `any` that only fails at runtime.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  // Error reporting (observability/errorReportingConfig.ts): unset = off.
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}