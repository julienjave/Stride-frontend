import { describe, expect, it } from 'vitest'
import { describeDetails, keyLabel } from './auditDetails'

describe('keyLabel', () => {
  it.each([
    ['title', 'Title'],
    ['startedAt', 'Started at'],
    ['careTeamLinkId', 'Care team link ID'],
    ['programIds', 'Program IDs'],
    ['identity', 'Identity'],
    ['side', 'Side'],
  ])('%s → %s', (key, label) => {
    expect(keyLabel(key)).toBe(label)
  })
})

// The page passes no locale or zone (the viewer's own); tests pin both.
const GB_PARIS = { locale: 'en-GB', timeZone: 'Europe/Paris' }

describe('describeDetails', () => {
  it('has nothing to say about no details', () => {
    expect(describeDetails(null)).toStrictEqual([])
    expect(describeDetails(undefined)).toStrictEqual([])
    expect(describeDetails({})).toStrictEqual([])
  })

  it('shows changes as rows of before and after', () => {
    expect(
      describeDetails(
        {
          changes: {
            title: { from: 'Knee', to: 'Knee, phase 2' },
            endDate: { from: null, to: '2031-04-01' },
            lateMakeUpDays: { from: 7, to: 14 },
          },
        },
        GB_PARIS,
      ),
    ).toStrictEqual([
      {
        type: 'changes',
        rows: [
          { field: 'Title', from: 'Knee', to: 'Knee, phase 2' },
          { field: 'End date', from: '—', to: '1 Apr 2031' },
          { field: 'Late make up days', from: '7', to: '14' },
        ],
      },
    ])
  })

  it('shows every other key as a labelled value, in order', () => {
    expect(
      describeDetails({
        programIds: [7, 8],
        sessionIds: [],
        careTeamLinkId: 31,
        reason: 'Cover while Alex is away',
        allowSwaps: false,
        endsAt: null,
        count: 3,
      }),
    ).toStrictEqual([
      { type: 'value', label: 'Program IDs', value: '#7, #8' },
      { type: 'value', label: 'Session IDs', value: 'none' },
      { type: 'value', label: 'Care team link ID', value: '#31' },
      { type: 'value', label: 'Reason', value: 'Cover while Alex is away' },
      { type: 'value', label: 'Allow swaps', value: 'false' },
      { type: 'value', label: 'Ends at', value: '—' },
      { type: 'value', label: 'Count', value: '3' },
    ])
  })

  it('shows what is not plain as compact JSON', () => {
    expect(
      describeDetails({
        record: { title: 'Knee', days: [1, 3] },
        workouts: [{ name: 'A' }],
      }),
    ).toStrictEqual([
      { type: 'value', label: 'Record', value: '{"title":"Knee","days":[1,3]}' },
      { type: 'value', label: 'Workouts', value: '[{"name":"A"}]' },
    ])
  })

  // A `changes` key that isn't { field: { from, to } } is shown as it is,
  // never as a half-filled table.
  it('shows a changes key of another shape as a value', () => {
    expect(describeDetails({ changes: { title: 'Knee' } })).toStrictEqual([
      { type: 'value', label: 'Changes', value: '{"title":"Knee"}' },
    ])
    expect(describeDetails({ changes: { title: { from: 'Knee' } } })).toStrictEqual([
      { type: 'value', label: 'Changes', value: '{"title":{"from":"Knee"}}' },
    ])
    expect(describeDetails({ changes: { title: { to: 'Knee' } } })).toStrictEqual([
      { type: 'value', label: 'Changes', value: '{"title":{"to":"Knee"}}' },
    ])
    expect(describeDetails({ changes: ['title'] })).toStrictEqual([
      { type: 'value', label: 'Changes', value: 'title' },
    ])
  })

  // Only the `changes` key is a before → after table: a `record` whose
  // fields happen to be { from, to } (a date range, say) is a value.
  it('makes a table of the changes key only', () => {
    expect(describeDetails({ record: { period: { from: '2031-03-10', to: '2031-03-12' } } })).toStrictEqual([
      { type: 'value', label: 'Record', value: '{"period":{"from":"2031-03-10","to":"2031-03-12"}}' },
    ])
  })

  it('shows ids in changes as ids', () => {
    expect(describeDetails({ changes: { clinicId: { from: 1, to: 2 } } })).toStrictEqual([
      { type: 'changes', rows: [{ field: 'Clinic ID', from: '#1', to: '#2' }] },
    ])
  })

  // Dates read like the entry's own time (the person's request, 2026-10-22).
  it('shows a moment in the viewer’s zone and a day as that day', () => {
    expect(
      describeDetails(
        {
          archivedAt: '2031-03-10T17:23:34.580Z',
          startedAt: '2031-03-10T23:30:00+01:00',
          today: '2031-03-10',
          reviewedAt: '2031-03-10T17:23Z',
        },
        GB_PARIS,
      ),
    ).toStrictEqual([
      { type: 'value', label: 'Archived at', value: '10 Mar 2031, 18:23' },
      { type: 'value', label: 'Started at', value: '10 Mar 2031, 23:30' },
      { type: 'value', label: 'Today', value: '10 Mar 2031' },
      { type: 'value', label: 'Reviewed at', value: '10 Mar 2031, 18:23' },
    ])
  })

  it('formats dates in change rows and lists, not inside JSON', () => {
    expect(
      describeDetails(
        {
          changes: { startDate: { from: '2031-03-10', to: '2031-03-17' } },
          days: ['2031-03-10', '2031-03-12'],
          record: { startDate: '2031-03-10' },
        },
        GB_PARIS,
      ),
    ).toStrictEqual([
      { type: 'changes', rows: [{ field: 'Start date', from: '10 Mar 2031', to: '17 Mar 2031' }] },
      { type: 'value', label: 'Days', value: '10 Mar 2031, 12 Mar 2031' },
      { type: 'value', label: 'Record', value: '{"startDate":"2031-03-10"}' },
    ])
  })

  it('leaves text that only looks like a date as it is', () => {
    expect(
      describeDetails(
        {
          a: '2031-02-30',
          b: '2031-03-10T17:23:34',
          c: 'on 2031-03-10',
          d: '2031-03-10 17:23Z',
          e: '2031-13-10T10:00:00Z',
          f: '2031-03-10T17:23:34Z later',
        },
        GB_PARIS,
      ).map((item) => (item.type === 'value' ? item.value : null)),
    ).toEqual([
      '2031-02-30',
      '2031-03-10T17:23:34',
      'on 2031-03-10',
      '2031-03-10 17:23Z',
      '2031-13-10T10:00:00Z',
      '2031-03-10T17:23:34Z later',
    ])
  })

  it('shows details that are not an object as one value', () => {
    expect(describeDetails('moved')).toStrictEqual([
      { type: 'value', label: 'Details', value: 'moved' },
    ])
    expect(describeDetails([4, 5])).toStrictEqual([
      { type: 'value', label: 'Details', value: '4, 5' },
    ])
  })
})