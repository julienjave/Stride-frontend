import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { UserAvatar } from './UserAvatar'

// The avatar is aria-hidden (decorative), so it's invisible to
// getByRole('img') — which is the correct behaviour for users of screen
// readers, and why these tests look the <img> up directly in the DOM.
function photoIn(container: HTMLElement) {
  return container.querySelector('img')
}

describe('UserAvatar', () => {
  it('shows initials when there is no photo', () => {
    const { container } = render(
      <UserAvatar firstName="Jamie" lastName="rivera" avatarUrl={null} />,
    )
    expect(screen.getByText('JR')).toBeInTheDocument()
    expect(photoIn(container)).toBeNull()
  })

  it('shows the photo, and not the initials, when there is one', () => {
    const { container } = render(
      <UserAvatar
        firstName="Jamie"
        lastName="Rivera"
        avatarUrl="https://storage.example.com/signed/a.png"
      />,
    )
    expect(photoIn(container)).toHaveAttribute(
      'src',
      'https://storage.example.com/signed/a.png',
    )
    // alt="" marks it decorative — an absent alt would make some screen
    // readers read the URL out.
    expect(photoIn(container)).toHaveAttribute('alt', '')
    expect(screen.queryByText('JR')).not.toBeInTheDocument()
  })

  it('never renders an <img> with an empty src', () => {
    const { container } = render(
      <UserAvatar firstName="Jamie" lastName="Rivera" avatarUrl="" />,
    )
    expect(photoIn(container)).toBeNull()
    expect(screen.getByText('JR')).toBeInTheDocument()
  })

  // The expired-URL case: /auth/me is cached for the whole tab's life, so
  // after 24 hours its presigned URL answers 403 and the image fails.
  // jsdom never actually loads images, so the failure is simulated with
  // fireEvent.error — the same 'error' event a real browser fires.
  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(
      <UserAvatar
        firstName="Jamie"
        lastName="Rivera"
        avatarUrl="https://storage.example.com/signed/expired.png"
      />,
    )
    fireEvent.error(photoIn(container)!)

    expect(photoIn(container)).toBeNull()
    expect(screen.getByText('JR')).toBeInTheDocument()
  })

  it('tries again when a NEW url arrives after a failure (e.g. after an upload)', () => {
    const { container, rerender } = render(
      <UserAvatar
        firstName="Jamie"
        lastName="Rivera"
        avatarUrl="https://storage.example.com/signed/expired.png"
      />,
    )
    fireEvent.error(photoIn(container)!)
    expect(photoIn(container)).toBeNull()

    rerender(
      <UserAvatar
        firstName="Jamie"
        lastName="Rivera"
        avatarUrl="https://storage.example.com/signed/fresh.png"
      />,
    )
    expect(photoIn(container)).toHaveAttribute(
      'src',
      'https://storage.example.com/signed/fresh.png',
    )
  })
})