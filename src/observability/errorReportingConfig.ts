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

import { API_BASE_URL } from '@/api/client'

// The browser's error-reporting settings, read in ONE place (decisions §32,
// pass 3). They are BUILD-time values: Vite writes `import.meta.env.VITE_…`
// into the built files, so they are set where the frontend is built (its
// `.env`, or the build's environment), not on the server that serves it.
//
//   VITE_SENTRY_DSN          the frontend's GlitchTip project ("stride-web").
//                            Unset = reporting OFF — the default for
//                            development and every test. It must be the
//                            SAME DSN as the backend's SENTRY_BROWSER_DSN:
//                            the tunnel accepts only that one.
//   VITE_SENTRY_ENVIRONMENT  a label on each report; defaults to Vite's mode
//                            ("production" for a build).
//   VITE_SENTRY_RELEASE      optional: the deployed version (a git commit).
//
// A DSN is not a secret — it only says which project a report is for, and
// every visitor's browser has it. What protects GlitchTip is that it isn't on
// the internet at all: the browser sends to OUR API (`tunnel`), which passes
// the report on over Docker's internal network.
export interface BrowserReportingConfig {
  dsn: string
  tunnel: string
  environment: string
  release: string | undefined
}

type ReportingEnv = Pick<
  ImportMetaEnv,
  'MODE' | 'VITE_SENTRY_DSN' | 'VITE_SENTRY_ENVIRONMENT' | 'VITE_SENTRY_RELEASE'
>

export function browserReportingConfig(
  env: ReportingEnv = import.meta.env,
  apiBaseUrl: string = API_BASE_URL,
): BrowserReportingConfig | null {
  // Empty and unset mean the same: off (a `.env` often keeps a key with no
  // value).
  const dsn = env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return null
  return {
    dsn,
    tunnel: `${apiBaseUrl}/monitoring`,
    environment: env.VITE_SENTRY_ENVIRONMENT?.trim() || env.MODE,
    release: env.VITE_SENTRY_RELEASE?.trim() || undefined,
  }
}