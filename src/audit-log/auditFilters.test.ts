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
import {
  changeFilter,
  hasFilters,
  NO_FILTERS,
  rangeProblem,
  readFilters,
  toQuery,
  writeFilters,
  type AuditLogFilters,
} from './auditFilters'

const read = (search: string) => readFilters(new URLSearchParams(search))

const ALL_SET: AuditLogFilters = {
  kind: 'view',
  action: 'PROGRAM_VIEWED',
  performedBy: 3,
  targetUserId: 6,
  from: '2031-03-10',
  to: '2031-03-12',
  page: 2,
}

// The LOCAL calendar parts of an instant — what "midnight in the viewer's
// zone" means, checked the same way in Paris, Montreal or UTC.
function localParts(iso: string) {
  const date = new Date(iso)
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ]
}

describe('readFilters', () => {
  it('reads every filter from the address', () => {
    expect(read('kind=view&action=PROGRAM_VIEWED&by=3&about=6&from=2031-03-10&to=2031-03-12&page=2')).toStrictEqual(
      ALL_SET,
    )
  })

  it('gives no filters and page 1 for an empty address', () => {
    expect(read('')).toStrictEqual(NO_FILTERS)
  })

  // Addresses are typed and pasted: anything malformed is ignored, never
  // sent on to the backend.
  it.each([
    ['an unknown kind', 'kind=reads'],
    ['an empty action', 'action='],
    ['an id that is not a whole number', 'by=3.5'],
    ['a zero id', 'about=0'],
    ['a negative id', 'by=-3'],
    ['an id with a leading zero', 'about=06'],
    ['an id with text after it', 'by=3abc'],
    ['a day that does not exist', 'from=2031-02-30'],
    ['a date in another format', 'to=10/03/2031'],
    ['page 0', 'page=0'],
    ['a page that is not a number', 'page=two'],
  ])('drops %s', (_label, search) => {
    expect(read(search)).toStrictEqual(NO_FILTERS)
  })
})

describe('writeFilters', () => {
  it('writes every filter set, under the short names', () => {
    expect(writeFilters(ALL_SET).toString()).toBe(
      'kind=view&action=PROGRAM_VIEWED&by=3&about=6&from=2031-03-10&to=2031-03-12&page=2',
    )
  })

  it('writes nothing for no filters on page 1', () => {
    expect(writeFilters(NO_FILTERS).toString()).toBe('')
  })

  it('reads back what it wrote', () => {
    expect(readFilters(writeFilters(ALL_SET))).toStrictEqual(ALL_SET)
  })
})

describe('changeFilter', () => {
  it('changes the filter and goes back to page 1', () => {
    expect(changeFilter(ALL_SET, { kind: 'change' })).toStrictEqual({
      ...ALL_SET,
      kind: 'change',
      page: 1,
    })
  })
})

describe('hasFilters', () => {
  it('is false with none, whatever the page', () => {
    expect(hasFilters({ ...NO_FILTERS, page: 3 })).toBe(false)
  })

  it.each([
    ['kind', { kind: 'sign_in' as const }],
    ['action', { action: 'LOGOUT' }],
    ['performedBy', { performedBy: 3 }],
    ['targetUserId', { targetUserId: 6 }],
    ['from', { from: '2031-03-10' }],
    ['to', { to: '2031-03-10' }],
  ])('is true with %s alone', (_label, change) => {
    expect(hasFilters({ ...NO_FILTERS, ...change })).toBe(true)
  })
})

describe('rangeProblem', () => {
  it('refuses an end before the start', () => {
    expect(rangeProblem({ ...NO_FILTERS, from: '2031-03-12', to: '2031-03-10' })).toBe(
      'The start date must be on or before the end date.',
    )
  })

  it('accepts one day, either end alone, or none', () => {
    expect(rangeProblem({ ...NO_FILTERS, from: '2031-03-10', to: '2031-03-10' })).toBeNull()
    expect(rangeProblem({ ...NO_FILTERS, from: '2031-03-10' })).toBeNull()
    expect(rangeProblem({ ...NO_FILTERS, to: '2031-03-10' })).toBeNull()
    expect(rangeProblem(NO_FILTERS)).toBeNull()
  })
})

describe('toQuery', () => {
  it('sends the page and its size, and nothing else without filters', () => {
    expect(toQuery(NO_FILTERS)).toStrictEqual({ page: '1', limit: '20' })
  })

  it('sends each filter under the backend’s name', () => {
    const query = toQuery(ALL_SET)
    expect(Object.keys(query)).toEqual([
      'page',
      'limit',
      'kind',
      'action',
      'performedBy',
      'targetUserId',
      'from',
      'before',
    ])
    expect(query).toMatchObject({
      page: '2',
      kind: 'view',
      action: 'PROGRAM_VIEWED',
      performedBy: '3',
      targetUserId: '6',
    })
  })

  // [from, before): the first day's local midnight, and the local midnight
  // AFTER the last day — so the whole last day is in.
  it('turns the days into local midnights, the end one day later', () => {
    const query = toQuery({ ...NO_FILTERS, from: '2031-03-10', to: '2031-03-12' })
    expect(localParts(query.from)).toEqual([2031, 3, 10, 0, 0, 0, 0])
    expect(localParts(query.before)).toEqual([2031, 3, 13, 0, 0, 0, 0])
    // Sent as instants the backend accepts: UTC, with their offset (Z).
    expect(query.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('rolls the end over a month and a year', () => {
    expect(localParts(toQuery({ ...NO_FILTERS, to: '2031-02-28' }).before)).toEqual([
      2031, 3, 1, 0, 0, 0, 0,
    ])
    expect(localParts(toQuery({ ...NO_FILTERS, to: '2031-12-31' }).before)).toEqual([
      2032, 1, 1, 0, 0, 0, 0,
    ])
  })

  // The last Sunday of March 2031 is 23 hours long in Paris: the range is
  // still exactly that day, midnight to midnight, in any zone.
  it('covers a day when the clocks change exactly', () => {
    const query = toQuery({ ...NO_FILTERS, from: '2031-03-30', to: '2031-03-30' })
    expect(localParts(query.from)).toEqual([2031, 3, 30, 0, 0, 0, 0])
    expect(localParts(query.before)).toEqual([2031, 3, 31, 0, 0, 0, 0])
  })
})