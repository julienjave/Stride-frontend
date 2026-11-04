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

import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CurrentUser } from '@/auth/types'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { userQueryKey } from '@/users/api'
import type { User } from '@/users/types'
import { WRONG_PASSWORD_MESSAGE } from '@/auth/currentPassword'
import { recoveryCodesLeftQueryKey } from './api'
import {
  address,
  apiError,
  CODES,
  json,
  ME,
  meReads,
  noContent,
  posts,
  renderTwoFactor,
  requests,
  SETUP,
  type SentRequest,
} from './renderTwoFactor'
import {
  AUTHENTICATOR_LABEL_TEXT,
  TWO_FACTOR_OFF_NOTICE,
  TWO_FACTOR_ON_NOTICE,
} from './twoFactorRules'
import { expectSnackbar } from '@/snackbars/snackbarAssertions'

type Answer = (request: SentRequest) => Response | Promise<Response> | undefined

// One answer per route, by method and path.
function routes(table: Record<string, () => Response | Promise<Response>>): Answer {
  return ({ method, path }) => table[`${method} ${path}`]?.()
}

// --- OFF: SETTING IT UP -------------------------------------------------------

async function startSetup(user: ReturnType<typeof userEvent.setup>, password = 'secret pw') {
  await user.type(screen.getByLabelText('Current password'), password)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

async function confirmCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.type(await screen.findByLabelText('Code from your app'), code)
  await user.click(screen.getByRole('button', { name: 'Turn on' }))
}

describe('TwoFactorPage — setting it up', () => {
  it('says what two-factor sign-in is and what turning it on does', () => {
    renderTwoFactor('/profile/two-factor', () => undefined)

    expect(screen.getByRole('heading', { level: 1, name: 'Two-factor sign-in' })).toBeInTheDocument()
    expect(screen.getByText(/Someone who learns your password still can't get in/)).toBeInTheDocument()
    expect(screen.getByText(/signs you out on your other devices/)).toHaveTextContent(
      'ten recovery codes',
    )
    // The step-up starts it: the password only — no code exists yet.
    expect(screen.getByLabelText('Current password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
    expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument()
  })

  it('asks the password, then shows the QR code and the key in groups of 4', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({ 'POST /auth/mfa/setup': () => json(SETUP, 201) }),
    )

    const user = userEvent.setup()
    await startSetup(user, ' secret pw ')

    const qr = await screen.findByRole('img', {
      name: 'QR code to add your Stride account to an authenticator app',
    })
    expect(qr).toHaveAttribute('src', SETUP.qrCodeDataUrl)
    expect(screen.getByLabelText(`Key: ${SETUP.secret}`)).toHaveTextContent(
      'JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP',
    )
    // The password exactly as typed.
    expect(posts()).toEqual([
      { method: 'POST', path: '/auth/mfa/setup', body: '{"currentPassword":" secret pw "}' },
    ])
    // The first code is an app code: the number pad fits.
    expect(screen.getByLabelText('Code from your app')).toHaveAttribute('inputmode', 'numeric')
  })

  it('says a wrong password at the password field — cleared, focused', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({ 'POST /auth/mfa/setup': () => apiError(400, WRONG_PASSWORD_MESSAGE) }),
    )

    const user = userEvent.setup()
    await startSetup(user, 'wrong')

    const password = screen.getByLabelText('Current password')
    expect(await screen.findByText(WRONG_PASSWORD_MESSAGE)).toHaveAttribute(
      'id',
      'setup-currentPassword-error',
    )
    expect(password).toHaveValue('')
    expect(password).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says any other failure under the form', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({
        'POST /auth/mfa/setup': () => apiError(409, 'Two-factor sign-in is already on for this account'),
      }),
    )

    const user = userEvent.setup()
    await startSetup(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Two-factor sign-in is already on for this account',
    )
  })

  it('checks the first code is 6 digits before sending it', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({ 'POST /auth/mfa/setup': () => json(SETUP, 201) }),
    )

    const user = userEvent.setup()
    await startSetup(user)
    // A recovery code can't confirm set-up: none exists yet.
    await confirmCode(user, 'abcde-23456')

    expect(
      await screen.findByText('Enter the 6-digit code from your authenticator app'),
    ).toHaveAttribute('id', 'setup-code-error')
    expect(posts()).toHaveLength(1)
  })

  it('says a refused first code at its field — cleared, focused', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({
        'POST /auth/mfa/setup': () => json(SETUP, 201),
        'POST /auth/mfa/enable': () => apiError(400, 'Invalid authentication code'),
      }),
    )

    const user = userEvent.setup()
    await startSetup(user)
    await confirmCode(user, '123456')

    const code = screen.getByLabelText('Code from your app')
    expect(await screen.findByText('Invalid authentication code')).toHaveAttribute(
      'id',
      'setup-code-error',
    )
    expect(code).toHaveValue('')
    expect(code).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('turns it on, shows the ten codes once, and goes back to the profile only once they are saved', async () => {
    const { queryClient } = renderTwoFactor(
      ['/profile', '/profile/two-factor'],
      routes({
        'POST /auth/mfa/setup': () => json(SETUP, 201),
        'POST /auth/mfa/enable': () => json({ recoveryCodes: CODES }),
      }),
    )

    const user = userEvent.setup()
    await startSetup(user)
    await confirmCode(user, ' 123456 ')

    const list = await screen.findByRole('list', { name: 'Recovery codes' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(CODES)
    expect(posts()[1]).toEqual({
      method: 'POST',
      path: '/auth/mfa/enable',
      body: '{"code":"123456"}',
    })
    // The cache knows: on, with ten codes (no request to ask).
    expect(queryClient.getQueryData<CurrentUser>(currentUserQueryKey)?.mfaEnabled).toBe(true)
    expect(queryClient.getQueryData<User>(userQueryKey(6))?.mfaEnabled).toBe(true)
    expect(queryClient.getQueryData(recoveryCodesLeftQueryKey)).toBe(10)

    // Done only after "I've saved my recovery codes".
    const done = screen.getByRole('button', { name: 'Done — back to my profile' })
    expect(done).toBeDisabled()
    await user.click(screen.getByLabelText("I've saved my recovery codes"))
    await user.click(done)

    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', TWO_FACTOR_ON_NOTICE)
    expect(address()).toBe('/profile')
    expect(screen.getByText('10 recovery codes left')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage two-factor sign-in' })).toBeInTheDocument()
    // replace: Back doesn't reopen the set-up.
    await user.click(screen.getByRole('button', { name: 'test: back' }))
    expect(address()).toBe('/profile')
    expect(requests().filter((r) => r.method === 'GET')).toEqual([])
  })
})

// --- THE CODES PANEL ------------------------------------------------------------

describe('TwoFactorPage — keeping the codes', () => {
  async function showCodes() {
    renderTwoFactor(
      '/profile/two-factor',
      routes({
        'POST /auth/mfa/setup': () => json(SETUP, 201),
        'POST /auth/mfa/enable': () => json({ recoveryCodes: CODES }),
      }),
    )
    const user = userEvent.setup()
    await startSetup(user)
    await confirmCode(user, '123456')
    await screen.findByRole('list', { name: 'Recovery codes' })
    return user
  }

  it('copies all ten, one a line, and says so', async () => {
    const user = await showCodes()

    await user.click(screen.getByRole('button', { name: 'Copy all' }))

    expect(await screen.findByText('Copied.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(CODES.join('\n'))
  })

  it('says when the clipboard refuses, and what to do instead', async () => {
    const user = await showCodes()
    // The clipboard user-event installed, made to refuse this once.
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copy all' }))

    expect(
      await screen.findByText("Couldn't copy — download them or write them down."),
    ).toBeInTheDocument()
  })

  it('downloads them as a text file', async () => {
    const user = await showCodes()
    // jsdom can't save files: the link's click is watched, not followed.
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    // Spies over the test-setup stubs (src/test-setup.ts), to read the calls.
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:codes')
    const revoke = vi.spyOn(URL, 'revokeObjectURL')

    await user.click(screen.getByRole('button', { name: 'Download' }))

    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('stride-recovery-codes.txt')
    expect(link.href).toBe('blob:codes')
    const blob = create.mock.calls[0]?.[0] as Blob
    expect(blob.type).toBe('text/plain')
    const text = await blob.text()
    expect(text).toContain('Account: pat@example.com')
    expect(text).toContain(CODES.join('\r\n'))
    // Released once the download has started.
    expect(revoke).toHaveBeenCalledWith('blob:codes')
    click.mockRestore()
    create.mockRestore()
    revoke.mockRestore()
  })
})

// --- ON: MANAGING IT ------------------------------------------------------------

const LEFT = (remaining: number) => () => json({ remaining })

describe('TwoFactorPage — managing it', () => {
  it('says it is on and how many codes are left', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({ 'GET /auth/mfa/recovery-codes': LEFT(3) }),
      { mfaEnabled: true },
    )

    expect(screen.getByText(/Two-factor sign-in is/)).toHaveTextContent(
      'Two-factor sign-in is on: signing in asks for a code from your authenticator app.',
    )
    // The app keeps the email it was set up with as its label — said here.
    expect(screen.getByText(AUTHENTICATOR_LABEL_TEXT)).toBeInTheDocument()
    expect(await screen.findByText('3 recovery codes left')).toBeInTheDocument()
    // Two step-ups, each with its own fields.
    expect(screen.getAllByLabelText('Current password')).toHaveLength(2)
    expect(screen.getAllByLabelText('Two-factor code')).toHaveLength(2)
  })

  it('makes new codes with the password and a code, and shows them', async () => {
    const { queryClient } = renderTwoFactor(
      '/profile/two-factor',
      routes({
        'GET /auth/mfa/recovery-codes': LEFT(3),
        'POST /auth/mfa/recovery-codes': () => json({ recoveryCodes: CODES }, 201),
      }),
      { mfaEnabled: true },
    )
    await screen.findByText('3 recovery codes left')

    const user = userEvent.setup()
    const section = screen.getByRole('region', { name: 'Recovery codes' })
    await user.type(within(section).getByLabelText('Current password'), 'secret pw')
    await user.type(within(section).getByLabelText('Two-factor code'), ' 654321 ')
    await user.click(within(section).getByRole('button', { name: 'Get new codes' }))

    await screen.findByRole('list', { name: 'Recovery codes' })
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: '/auth/mfa/recovery-codes',
        body: '{"currentPassword":"secret pw","code":"654321"}',
      },
    ])
    expect(queryClient.getQueryData(recoveryCodesLeftQueryKey)).toBe(10)

    // Done: back to the managing face, which now counts ten.
    await user.click(screen.getByLabelText("I've saved my recovery codes"))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('10 recovery codes left')).toBeInTheDocument()
    expect(address()).toBe('/profile/two-factor')
  })

  it('says a refused code at the field of the form that sent it', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({
        'GET /auth/mfa/recovery-codes': LEFT(3),
        'POST /auth/mfa/disable': () =>
          apiError(400, 'This code has already been used — wait for your app to show a new one'),
      }),
      { mfaEnabled: true },
    )

    const user = userEvent.setup()
    const section = screen.getByRole('region', { name: 'Turn off two-factor sign-in' })
    await user.type(within(section).getByLabelText('Current password'), 'secret pw')
    await user.type(within(section).getByLabelText('Two-factor code'), '123456')
    await user.click(within(section).getByRole('button', { name: 'Turn off' }))

    expect(
      await screen.findByText('This code has already been used — wait for your app to show a new one'),
    ).toHaveAttribute('id', 'off-code-error')
    expect(within(section).getByLabelText('Two-factor code')).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('turns it off and goes back to the profile, which says Off', async () => {
    const { queryClient } = renderTwoFactor(
      ['/profile', '/profile/two-factor'],
      routes({
        'GET /auth/mfa/recovery-codes': LEFT(3),
        'POST /auth/mfa/disable': () => noContent(),
      }),
      { mfaEnabled: true },
    )

    const user = userEvent.setup()
    const section = screen.getByRole('region', { name: 'Turn off two-factor sign-in' })
    await user.type(within(section).getByLabelText('Current password'), 'secret pw')
    await user.type(within(section).getByLabelText('Two-factor code'), 'abcde-23456')
    await user.click(within(section).getByRole('button', { name: 'Turn off' }))

    await screen.findByRole('heading', { name: 'My profile' })
    expectSnackbar('success', TWO_FACTOR_OFF_NOTICE)
    expect(address()).toBe('/profile')
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: '/auth/mfa/disable',
        body: '{"currentPassword":"secret pw","code":"abcde-23456"}',
      },
    ])
    expect(queryClient.getQueryData<CurrentUser>(currentUserQueryKey)?.mfaEnabled).toBe(false)
    expect(queryClient.getQueryData<User>(userQueryKey(6))?.mfaEnabled).toBe(false)
    // No count kept for an account that has no codes (the profile's row
    // still observes the key — disabled — so the entry exists, empty).
    expect(queryClient.getQueryData(recoveryCodesLeftQueryKey)).toBeUndefined()
    expect(screen.getByRole('link', { name: 'Set up two-factor sign-in' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/recovery code/)).not.toBeInTheDocument())
  })
})

// The account is read AGAIN as the page opens (useRefreshedCurrentUser): it
// decides which face the page shows.
describe('TwoFactorPage — the account read again on opening', () => {
  it('reads the account once as it opens', async () => {
    renderTwoFactor('/profile/two-factor', routes({}))

    await waitFor(() => expect(meReads()).toBe(1))
  })

  it('shows the set-up face when two-factor was turned off on another device', async () => {
    renderTwoFactor(
      '/profile/two-factor',
      routes({
        'GET /auth/me': () => json({ ...ME, mfaEnabled: false }),
        'GET /auth/mfa/recovery-codes': LEFT(3),
      }),
      { mfaEnabled: true },
    )

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Turn off' })).not.toBeInTheDocument()
    expect(screen.queryByText(AUTHENTICATOR_LABEL_TEXT)).not.toBeInTheDocument()
  })
})