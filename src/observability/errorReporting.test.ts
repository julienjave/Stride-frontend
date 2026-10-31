import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { createErrorReporter, installErrorReporting, type ErrorReporter } from './errorReporting'
import type { Capture } from './sentry'

const CONFIG = {
  dsn: 'http://k@g/2',
  tunnel: 'http://api.test/monitoring',
  environment: 'test',
  release: undefined,
}

// A stand-in for `import('./sentry')`, held until the test lets it arrive —
// like the SDK's file still on its way.
function heldSdk() {
  const capture = vi.fn<Capture>()
  const startSdk = vi.fn(() => capture)
  let arrive: () => void = () => {}
  const load = vi.fn(
    () =>
      new Promise<{ startSdk: typeof startSdk }>((resolve) => {
        arrive = () => resolve({ startSdk })
      }),
  )
  return { capture, startSdk, load, arrive: () => arrive() }
}

// Lets every pending promise callback run.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createErrorReporter', () => {
  it('loads nothing and reports nothing when reporting is off', async () => {
    const sdk = heldSdk()
    const reporter = createErrorReporter(null, sdk.load)
    expect(reporter.isOn).toBe(false)
    reporter.report(new Error('x'), { where: 'uncaught' })
    expect(await reporter.start()).toBeNull()
    expect(sdk.load).not.toHaveBeenCalled()
  })

  // The point of loading late: an error BEFORE the SDK's file arrived is
  // still sent, once it has.
  it('sends an error reported before the SDK arrived, once it has', async () => {
    const sdk = heldSdk()
    const reporter = createErrorReporter(CONFIG, sdk.load, () => '/patients/7')
    const error = new Error('the page broke')
    reporter.report(error, { where: 'route-error', reference: '7f3a1c2e' })
    await settle()
    expect(sdk.capture).not.toHaveBeenCalled()

    sdk.arrive()
    await settle()
    expect(sdk.startSdk).toHaveBeenCalledWith(CONFIG)
    expect(sdk.capture).toHaveBeenCalledWith(error, {
      where: 'route-error',
      route: '/patients/7',
      reference: '7f3a1c2e',
    })
  })

  // The path where it HAPPENED, not where the person is when the SDK arrives.
  it('reads the path when the error is reported', async () => {
    const sdk = heldSdk()
    let path = '/patients/7'
    const reporter = createErrorReporter(CONFIG, sdk.load, () => path)
    reporter.report(new Error('x'), { where: 'uncaught' })
    path = '/messages'
    sdk.arrive()
    await settle()
    expect(sdk.capture).toHaveBeenCalledWith(expect.any(Error), {
      where: 'uncaught',
      route: '/patients/7',
    })
  })

  it('starts the SDK once, however many reports', async () => {
    const sdk = heldSdk()
    const reporter = createErrorReporter(CONFIG, sdk.load)
    reporter.report(new Error('a'), { where: 'uncaught' })
    reporter.report(new Error('b'), { where: 'uncaught' })
    sdk.arrive()
    await settle()
    expect(sdk.load).toHaveBeenCalledTimes(1)
    expect(sdk.startSdk).toHaveBeenCalledTimes(1)
    expect(sdk.capture).toHaveBeenCalledTimes(2)
  })

  it('reports the same error object once', async () => {
    const sdk = heldSdk()
    const reporter = createErrorReporter(CONFIG, sdk.load)
    const error = new Error('x')
    reporter.report(error, { where: 'route-error' })
    reporter.report(error, { where: 'uncaught' })
    sdk.arrive()
    await settle()
    expect(sdk.capture).toHaveBeenCalledTimes(1)
  })

  it("doesn't report what isn't a bug of the page (reportRules.ts)", async () => {
    const sdk = heldSdk()
    const reporter = createErrorReporter(CONFIG, sdk.load)
    reporter.report(
      new ApiError({
        statusCode: 500,
        message: ['Internal server error'],
        error: 'Error',
        timestamp: '2031-01-01T00:00:00.000Z',
        path: '/x',
      }),
      { where: 'unhandled-rejection' },
    )
    sdk.arrive()
    await settle()
    expect(sdk.load).not.toHaveBeenCalled()
  })

  // No loop: a file that can't be downloaded never becomes an error of its own.
  it('gives up quietly when the SDK cannot be loaded', async () => {
    const reporter = createErrorReporter(CONFIG, () =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
    )
    reporter.report(new Error('x'), { where: 'uncaught' })
    expect(await reporter.start()).toBeNull()
  })
})

describe('installErrorReporting', () => {
  function fakeReporter(isOn = true) {
    const report = vi.fn<ErrorReporter['report']>()
    const start = vi.fn<ErrorReporter['start']>(() => Promise.resolve(null))
    return { isOn, report, start }
  }

  it("reports an error nobody caught, and a promise's failure nobody handled", () => {
    const target = new EventTarget()
    const reporter = fakeReporter()
    installErrorReporting(target, reporter, () => true)

    const thrown = new Error('in a click handler')
    target.dispatchEvent(new ErrorEvent('error', { error: thrown }))
    const reason = new Error('nobody waited for me')
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }))

    expect(reporter.report.mock.calls).toStrictEqual([
      [thrown, { where: 'uncaught' }],
      [reason, { where: 'unhandled-rejection' }],
    ])
  })

  // An image that failed to load fires `error` with no thrown value.
  it('ignores an error event without an error', () => {
    const target = new EventTarget()
    const reporter = fakeReporter()
    installErrorReporting(target, reporter, () => true)
    target.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    expect(reporter.report).not.toHaveBeenCalled()
  })

  it('fetches the SDK once the page has loaded — at once if it already has', () => {
    const loaded = fakeReporter()
    installErrorReporting(new EventTarget(), loaded, () => true)
    expect(loaded.start).toHaveBeenCalledTimes(1)

    const target = new EventTarget()
    const loading = fakeReporter()
    installErrorReporting(target, loading, () => false)
    expect(loading.start).not.toHaveBeenCalled()
    target.dispatchEvent(new Event('load'))
    expect(loading.start).toHaveBeenCalledTimes(1)
  })

  it('installs nothing when reporting is off', () => {
    const target = new EventTarget()
    const reporter = fakeReporter(false)
    installErrorReporting(target, reporter, () => true)
    target.dispatchEvent(new ErrorEvent('error', { error: new Error('x') }))
    expect(reporter.report).not.toHaveBeenCalled()
    expect(reporter.start).not.toHaveBeenCalled()
  })
})