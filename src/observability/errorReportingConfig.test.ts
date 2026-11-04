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

import { describe, expect, it } from 'vitest'
import { browserReportingConfig } from './errorReportingConfig'

const API = 'http://api.test'

describe('browserReportingConfig', () => {
  // The default everywhere but a build that sets a DSN on purpose.
  it('is off without a DSN, or with an empty one', () => {
    expect(browserReportingConfig({ MODE: 'production' }, API)).toBeNull()
    expect(browserReportingConfig({ MODE: 'production', VITE_SENTRY_DSN: '  ' }, API)).toBeNull()
  })

  it('sends through the API, labelled with the build mode by default', () => {
    expect(
      browserReportingConfig({ MODE: 'development', VITE_SENTRY_DSN: ' http://k@g/2 ' }, API),
    ).toStrictEqual({
      dsn: 'http://k@g/2',
      tunnel: 'http://api.test/monitoring',
      environment: 'development',
      release: undefined,
    })
  })

  it('takes the environment and the release when they are set', () => {
    expect(
      browserReportingConfig(
        {
          MODE: 'production',
          VITE_SENTRY_DSN: 'http://k@g/2',
          VITE_SENTRY_ENVIRONMENT: 'staging',
          VITE_SENTRY_RELEASE: 'abc123',
        },
        API,
      ),
    ).toMatchObject({ environment: 'staging', release: 'abc123' })
  })
})