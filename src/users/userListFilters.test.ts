import { describe, it, expect } from 'vitest'
import {
  hasUserFilters,
  NO_USER_FILTERS,
  readUserListFilters,
  withFilter,
  writeUserListFilters,
  type UserListFilters,
} from './userListFilters'

const read = (query: string) => readUserListFilters(new URLSearchParams(query))
const write = (filters: UserListFilters) => writeUserListFilters(filters).toString()

describe('readUserListFilters', () => {
  it('reads an empty address as no filters, page 1', () => {
    expect(read('')).toStrictEqual(NO_USER_FILTERS)
  })

  it('reads every filter the address names', () => {
    expect(
      read(
        'search=lee&role=patient&clinic=12&status=all&attention=patients-without-care-team&page=3',
      ),
    ).toStrictEqual({
      search: 'lee',
      role: 'patient',
      clinic: '12',
      status: 'all',
      attention: 'patients-without-care-team',
      page: 3,
    })
    expect(read('clinic=none').clinic).toBe('none')
  })

  it('trims the search', () => {
    expect(read('search=%20%20ana%20').search).toBe('ana')
  })

  // An address someone typed, or an old link, never breaks the page: each
  // unreadable value is its default.
  it.each([
    ['role=nurse', { role: null }],
    ['clinic=0', { clinic: null }],
    ['clinic=-1', { clinic: null }],
    ['clinic=abc', { clinic: null }],
    ['clinic=1234567890', { clinic: null }], // 10 digits: past Postgres's integer
    ['status=gone', { status: 'active' }],
    ['attention=everyone', { attention: null }],
    ['page=0', { page: 1 }],
    ['page=abc', { page: 1 }],
    ['page=2.5', { page: 1 }],
  ])('reads %s as its default', (query, expected) => {
    expect(read(query)).toStrictEqual({ ...NO_USER_FILTERS, ...expected })
  })

  it('accepts the largest clinic id the backend does', () => {
    expect(read('clinic=999999999').clinic).toBe('999999999')
  })
})

describe('writeUserListFilters', () => {
  it('writes nothing for no filters', () => {
    expect(write(NO_USER_FILTERS)).toBe('')
  })

  it('writes every filter in one fixed order, defaults left out', () => {
    expect(
      write({
        search: ' lee ',
        role: 'patient',
        clinic: 'none',
        status: 'deactivated',
        attention: 'invitations-to-send-again',
        page: 2,
      }),
    ).toBe(
      'search=lee&role=patient&clinic=none&status=deactivated&attention=invitations-to-send-again&page=2',
    )
    expect(write({ ...NO_USER_FILTERS, status: 'active', page: 1 })).toBe('')
  })

  it('round-trips through the address', () => {
    const filters: UserListFilters = {
      search: 'ana lop',
      role: 'admin',
      clinic: '7',
      status: 'all',
      attention: null,
      page: 4,
    }
    expect(read(write(filters))).toStrictEqual(filters)
  })
})

describe('hasUserFilters', () => {
  it('is false for no filters, whatever the page', () => {
    expect(hasUserFilters(NO_USER_FILTERS)).toBe(false)
    expect(hasUserFilters({ ...NO_USER_FILTERS, page: 3 })).toBe(false)
    expect(hasUserFilters({ ...NO_USER_FILTERS, search: '   ' })).toBe(false)
  })

  it.each([
    [{ search: 'a' }],
    [{ role: 'patient' as const }],
    [{ clinic: 'none' }],
    [{ status: 'all' as const }],
    [{ attention: 'patients-without-care-team' as const }],
  ])('is true for %o', (change) => {
    expect(hasUserFilters({ ...NO_USER_FILTERS, ...change })).toBe(true)
  })
})

describe('withFilter', () => {
  it('changes the filter and starts again on page 1', () => {
    expect(withFilter({ ...NO_USER_FILTERS, role: 'admin', page: 4 }, { clinic: '2' })).toStrictEqual(
      { ...NO_USER_FILTERS, role: 'admin', clinic: '2', page: 1 },
    )
  })
})