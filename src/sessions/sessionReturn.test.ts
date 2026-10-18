import { describe, it, expect } from 'vitest'
import {
  fromProgramState,
  isPlainClick,
  readFromProgram,
  readViewedSession,
  viewedSessionState,
} from './sessionReturn'

describe('readFromProgram', () => {
  it('reads back what fromProgramState writes', () => {
    expect(readFromProgram(fromProgramState(12))).toBe(12)
  })

  // Whatever an entry holds — the reader checks, never trusts.
  it.each<[string, unknown]>([
    ['nothing', null],
    ['not an object', 'program'],
    ['another note', { notice: 'Session finished.' }],
    ['another origin', { from: 'home', programId: 12 }],
    ['no program', { from: 'program' }],
    ['a program id that is not a number', { from: 'program', programId: '12' }],
  ])('answers null for %s', (_label, state) => {
    expect(readFromProgram(state)).toBeNull()
  })
})

describe('readViewedSession', () => {
  it('reads back what viewedSessionState writes', () => {
    expect(readViewedSession(viewedSessionState({ sessionId: 23, date: '2031-06-06' }))).toStrictEqual({
      sessionId: 23,
      date: '2031-06-06',
    })
  })

  it.each<[string, unknown]>([
    ['nothing', null],
    ['no viewed session', { from: 'program', programId: 12 }],
    ['a viewed session that is not an object', { viewedSession: 23 }],
    ['no date', { viewedSession: { sessionId: 23 } }],
    ['a session id that is not a number', { viewedSession: { sessionId: '23', date: '2031-06-06' } }],
    ['a date that is not a string', { viewedSession: { sessionId: 23, date: 20310606 } }],
  ])('answers null for %s', (_label, state) => {
    expect(readViewedSession(state)).toBeNull()
  })
})

describe('isPlainClick', () => {
  const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }

  it('takes over a plain main-button click', () => {
    expect(isPlainClick(plain)).toBe(true)
  })

  it.each([
    ['the middle button', { ...plain, button: 1 }],
    ['Cmd', { ...plain, metaKey: true }],
    ['Ctrl', { ...plain, ctrlKey: true }],
    ['Shift', { ...plain, shiftKey: true }],
    ['Alt', { ...plain, altKey: true }],
  ])('leaves %s to the browser', (_label, event) => {
    expect(isPlainClick(event)).toBe(false)
  })
})