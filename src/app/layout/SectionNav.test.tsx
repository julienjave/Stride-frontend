import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SectionNav } from './SectionNav'
import type { UserRole } from '@/auth/schemas'

function renderNav(role: UserRole, currentPath: string, badges?: Record<string, number>) {
  return render(
    // initialEntries sets the "current URL" that NavLink compares against
    // to decide which link is active.
    <MemoryRouter initialEntries={[currentPath]}>
      <SectionNav role={role} variant="top" badges={badges} />
    </MemoryRouter>,
  )
}

// [accessible name, href] for every link, in order — a full picture of
// the nav that a single toEqual can compare, so a missing, extra or
// reordered entry fails the test.
function linksInNav() {
  return screen
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('href')])
}

function currentLinkNames() {
  return screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent)
}

describe('SectionNav', () => {
  it("renders the practitioner's five sections in order", () => {
    renderNav('practitioner', '/practitioner')
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument()
    expect(linksInNav()).toEqual([
      ['Home', '/practitioner'],
      ['Patients', '/practitioner/patients'],
      ['Library', '/practitioner/library'],
      ['Programs', '/practitioner/programs'],
      ['Messages', '/practitioner/messages'],
    ])
  })

  it("renders the patient's four sections", () => {
    renderNav('patient', '/patient')
    expect(linksInNav()).toEqual([
      ['Home', '/patient'],
      ['Sessions', '/patient/sessions'],
      ['Team', '/patient/team'],
      ['Messages', '/patient/messages'],
    ])
  })

  it("renders the admin's three sections", () => {
    renderNav('admin', '/admin')
    expect(linksInNav()).toEqual([
      ['Home', '/admin'],
      ['Clinics', '/admin/clinics'],
      ['Users', '/admin/users'],
    ])
  })

  it('marks only Home as current on the home page', () => {
    renderNav('practitioner', '/practitioner')
    expect(currentLinkNames()).toEqual(['Home'])
  })

  it('keeps a section current on pages deep inside it, without Home', () => {
    // The `end` rule in action: Home would also "match" this URL by
    // prefix if it weren't set to exact matching.
    renderNav('practitioner', '/practitioner/programs/templates/5/exercises/9')
    expect(currentLinkNames()).toEqual(['Programs'])
  })

  it('marks nothing current on a page outside every section', () => {
    renderNav('practitioner', '/profile')
    expect(currentLinkNames()).toEqual([])
  })

  // The Messages badge (Phase 5): a number for the eye, words for a screen
  // reader — the link's name says what the number counts.
  it('shows a count on a section, and says it in the link’s name', () => {
    renderNav('practitioner', '/practitioner', { '/practitioner/messages': 3 })
    const messages = screen.getByRole('link', { name: 'Messages, 3 unread' })
    expect(messages).toHaveAttribute('href', '/practitioner/messages')
    expect(messages).toHaveTextContent('3')
    // The other sections are untouched.
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument()
  })

  it('shows no badge for zero', () => {
    renderNav('practitioner', '/practitioner', { '/practitioner/messages': 0 })
    const messages = screen.getByRole('link', { name: 'Messages' })
    expect(messages).toHaveTextContent(/^Messages$/)
  })

  it('caps the badge at 99+, keeping the real number in the name', () => {
    renderNav('patient', '/patient', { '/patient/messages': 150 })
    expect(screen.getByRole('link', { name: 'Messages, 150 unread' })).toHaveTextContent('99+')
  })
})