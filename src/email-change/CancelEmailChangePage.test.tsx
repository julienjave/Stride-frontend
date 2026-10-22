import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { address, apiError, noContent, renderEmailChange, requests } from './renderEmailChange'

const LINK = '/cancel-email-change?token=def456'

// /cancel-email-change — the link sent to the OLD address (decisions §12).
describe('CancelEmailChangePage', () => {
  it('sends nothing on opening, and takes the token out of the address', async () => {
    renderEmailChange(LINK, () => undefined, null)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stop this change of email address?' }),
    ).toBeInTheDocument()
    expect(address()).toBe('/cancel-email-change')
    expect(requests()).toEqual([])
  })

  it('cancels on the button, then urges a password reset', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, () => noContent(), null)

    await user.click(screen.getByRole('button', { name: 'Cancel the change' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'The change is cancelled' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your account keeps its current email address.',
    )
    expect(requests()).toEqual([
      { method: 'POST', path: '/auth/email-change/cancel', body: '{"token":"def456"}' },
    ])
    expect(screen.getByRole('link', { name: 'Reset my password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('explains a dead link', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, () => apiError(400, 'This link is invalid or has expired'), null)

    await user.click(screen.getByRole('button', { name: 'Cancel the change' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: "This link can't be used" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "It's too late to cancel" })).not.toBeInTheDocument()
  })

  it('says when it is too late: the change was confirmed', async () => {
    const user = userEvent.setup()
    renderEmailChange(
      LINK,
      () =>
        apiError(
          409,
          'This change has already been confirmed. If you did not ask for it, contact your clinic.',
        ),
      null,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel the change' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: "It's too late to cancel" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/contact your clinic/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reset my password' })).not.toBeInTheDocument()
  })

  it('keeps the button after any other failure, saying why', async () => {
    const user = userEvent.setup()
    renderEmailChange(LINK, () => apiError(429, 'Too many requests'), null)

    await user.click(screen.getByRole('button', { name: 'Cancel the change' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests')
    expect(screen.getByRole('button', { name: 'Cancel the change' })).toBeEnabled()
  })

  it('without a token, asks for the link and sends nothing', () => {
    renderEmailChange('/cancel-email-change', () => undefined, null)

    expect(screen.getByRole('heading', { level: 1, name: 'Open your link' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel the change' })).not.toBeInTheDocument()
    expect(requests()).toEqual([])
  })
})