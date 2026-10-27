import { describe, it, expect } from 'vitest'
import {
  ALL_CLINICS,
  directorySearchTerm,
  filterByClinic,
  splitByAccount,
  namesFromSearch,
  sortByName,
} from './roster'

const riverside = { id: 1, name: 'Riverside Physio' }
const harbour = { id: 2, name: 'Harbour Sports Clinic' }

// Decisions §22: My patients' two lists.
describe('splitByAccount', () => {
  const person = (firstName: string, lastName: string, isActive: boolean) => ({
    firstName,
    lastName,
    isActive,
  })

  it('splits by account, each half sorted by name', () => {
    const dee = person('Dee', 'Moss', false)
    const abe = person('Abe', 'Adams', false)
    const jo = person('Jo', 'Novak', true)
    const pat = person('Pat', 'Lee', true)
    expect(splitByAccount([jo, dee, pat, abe])).toEqual({
      active: [pat, jo],
      deactivated: [abe, dee],
    })
  })

  it('gives two empty lists for no patient', () => {
    expect(splitByAccount([])).toEqual({ active: [], deactivated: [] })
  })
})

describe('sortByName', () => {
  it('sorts by last name, then first name', () => {
    const sorted = sortByName([
      { firstName: 'Pat', lastName: 'Lee' },
      { firstName: 'Jo', lastName: 'Novak' },
      { firstName: 'Ana', lastName: 'Lee' },
    ])
    expect(sorted.map((p) => `${p.firstName} ${p.lastName}`)).toEqual([
      'Ana Lee',
      'Pat Lee',
      'Jo Novak',
    ])
  })

  it('ignores case and accents, as a person would', () => {
    const sorted = sortByName([
      { firstName: 'Lucas', lastName: 'Martin' },
      { firstName: 'Sanne', lastName: 'de Vries' },
      { firstName: 'Louise', lastName: 'Fabre' },
      { firstName: 'Chloé', lastName: 'Émond' },
    ])
    // Comparing code points instead (a plain `<`) gives Fabre, Martin,
    // de Vries, Émond: every lowercase letter sorts after every capital
    // ('d' after 'M'), and 'É' after the whole unaccented alphabet.
    expect(sorted.map((p) => p.lastName)).toEqual(['de Vries', 'Émond', 'Fabre', 'Martin'])
  })

  it('returns a new array and leaves the one passed in untouched', () => {
    const people = [
      { firstName: 'Jo', lastName: 'Novak' },
      { firstName: 'Pat', lastName: 'Lee' },
    ]
    const sorted = sortByName(people)
    expect(sorted).not.toBe(people)
    // The input is TanStack Query's cached data in the real page.
    expect(people.map((p) => p.lastName)).toEqual(['Novak', 'Lee'])
  })
})

describe('filterByClinic', () => {
  const pat = { id: 6, clinics: [riverside] }
  const robin = { id: 8, clinics: [riverside, harbour] }
  const blakesOnly = { id: 9, clinics: [harbour] }

  it("keeps everyone for 'all'", () => {
    expect(filterByClinic([pat, robin, blakesOnly], ALL_CLINICS)).toEqual([
      pat,
      robin,
      blakesOnly,
    ])
  })

  it('keeps the patients attending the chosen clinic (the value is a string id)', () => {
    expect(filterByClinic([pat, robin, blakesOnly], '2')).toEqual([robin, blakesOnly])
    expect(filterByClinic([pat, robin, blakesOnly], '1')).toEqual([pat, robin])
  })
})

describe('directorySearchTerm', () => {
  it('sends nothing (the default list) below two characters', () => {
    expect(directorySearchTerm('')).toBe('')
    expect(directorySearchTerm('m')).toBe('')
  })

  it('searches from two characters on', () => {
    expect(directorySearchTerm('ma')).toBe('ma')
  })

  it('trims before counting and before sending', () => {
    // Three characters typed, one that counts: still the default list.
    expect(directorySearchTerm('  m')).toBe('')
    expect(directorySearchTerm(' Marie Martin  ')).toBe('Marie Martin')
  })
})

describe('namesFromSearch', () => {
  it('splits the first word from the rest', () => {
    expect(namesFromSearch('Marie Martin')).toEqual({
      firstName: 'Marie',
      lastName: 'Martin',
    })
    expect(namesFromSearch('Ana de la Cruz')).toEqual({
      firstName: 'Ana',
      lastName: 'de la Cruz',
    })
  })

  it('copes with one word, nothing, and extra spaces', () => {
    expect(namesFromSearch('Marie')).toEqual({ firstName: 'Marie', lastName: '' })
    expect(namesFromSearch('')).toEqual({ firstName: '', lastName: '' })
    expect(namesFromSearch('  Marie    Martin ')).toEqual({
      firstName: 'Marie',
      lastName: 'Martin',
    })
  })
})