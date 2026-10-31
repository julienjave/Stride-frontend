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