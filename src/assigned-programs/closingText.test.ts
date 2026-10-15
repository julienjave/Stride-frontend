import { describe, it, expect } from 'vitest'
import { closingText } from './closingText'

const L = 'en-GB'
const TODAY = '2031-06-12'

describe('closingText', () => {
  it('says cancelling a program with no session deletes it', () => {
    expect(closingText('cancel', { outcome: 'archived', endDate: null }, 0, TODAY, L)).toStrictEqual({
      title: 'Delete this program?',
      description:
        "No session has been started yet, so cancelling deletes the program: it disappears from every list. There's nothing of it on the patient's record yet.",
      confirm: 'Delete program',
      pending: 'Deleting…',
    })
  })

  it('says when a cancelled program will end, and that it stays on the record', () => {
    expect(
      closingText('cancel', { outcome: 'cancelled', endDate: '2031-06-11' }, 0, TODAY, L),
    ).toStrictEqual({
      title: 'Cancel this program?',
      description:
        "It will end on Wed 11 Jun, and become read-only. Its sessions and progress stay on the patient's record; to go on with it later, assign it again.",
      confirm: 'Cancel program',
      pending: 'Cancelling…',
    })
  })

  it('says why a program ends today', () => {
    const text = closingText('complete', { outcome: 'completed', endDate: TODAY }, 0, TODAY, L)
    expect(text.title).toBe('Complete this program?')
    expect(text.confirm).toBe('Complete program')
    expect(text.pending).toBe('Completing…')
    expect(text.description).toBe(
      "It will end on Thu 12 Jun — today, as a session was completed today, and become read-only. Its sessions and progress stay on the patient's record; to go on with it later, assign it again.",
    )
  })

  it('says a session in progress will be stopped — whichever way the program closes', () => {
    const sentence =
      "It will end on Wed 11 Jun, and become read-only. The patient's session in progress will be stopped, and kept as not finished. Its sessions and progress stay on the patient's record; to go on with it later, assign it again."
    expect(
      closingText('cancel', { outcome: 'cancelled', endDate: '2031-06-11' }, 1, TODAY, L).description,
    ).toBe(sentence)
    expect(
      closingText('complete', { outcome: 'completed', endDate: '2031-06-11' }, 1, TODAY, L)
        .description,
    ).toBe(sentence)
  })

  it('words several sessions in progress', () => {
    expect(
      closingText('cancel', { outcome: 'cancelled', endDate: '2031-06-11' }, 2, TODAY, L).description,
    ).toContain("The patient's 2 sessions in progress will be stopped, and kept as not finished.")
  })
})