import { describe, expect, it } from 'vitest'
import {
  charactersLeftText,
  dayLabel,
  DELETED_TEXT,
  listTimeText,
  messageProblemText,
  NO_MESSAGES_TEXT,
  previewText,
  unreadCountText,
} from './messageText'
import { ALEX_ID, message, summary } from './testData'

// Locale pinned to en-GB so the expected strings don't depend on the machine.
const LOCALE = 'en-GB'
// Wednesday 4 June 2031, 15:00 local.
const NOW = new Date(2031, 5, 4, 15, 0)
const at = (...parts: [number, number, number, number?, number?]) => new Date(...parts).toISOString()

describe('previewText', () => {
  it("says nothing was written yet when there's no message", () => {
    expect(previewText(summary(), ALEX_ID)).toBe(NO_MESSAGES_TEXT)
  })

  it('shows their text as it is, and mine after "You:"', () => {
    expect(previewText(summary({ lastMessage: message(1, { messageBody: 'See you Monday' }) }), ALEX_ID)).toBe(
      'See you Monday',
    )
    expect(
      previewText(summary({ lastMessage: message(1, { senderId: ALEX_ID, messageBody: 'Great work' }) }), ALEX_ID),
    ).toBe('You: Great work')
  })

  it('keeps only the first line, without the spaces around it', () => {
    const lastMessage = message(1, { messageBody: '\n  Line one\nLine two' })
    expect(previewText(summary({ lastMessage }), ALEX_ID)).toBe('Line one')
  })

  it('says a deleted message was deleted', () => {
    const lastMessage = message(1, { messageBody: null, deletedAt: at(2031, 5, 4) })
    expect(previewText(summary({ lastMessage }), ALEX_ID)).toBe(DELETED_TEXT)
  })
})

describe('listTimeText', () => {
  it('shows the time for today', () => {
    expect(listTimeText(at(2031, 5, 4, 9, 5), NOW, LOCALE)).toBe('9:05')
  })

  it('shows the weekday within the last week', () => {
    expect(listTimeText(at(2031, 5, 3, 9), NOW, LOCALE)).toBe('Tue')
    // Six days back is still "this week"; seven is not.
    expect(listTimeText(at(2031, 4, 29, 9), NOW, LOCALE)).toBe('Thu')
    expect(listTimeText(at(2031, 4, 28, 9), NOW, LOCALE)).toBe('28 May')
  })

  it('adds the year only when it is not this one', () => {
    expect(listTimeText(at(2030, 11, 20, 9), NOW, LOCALE)).toBe('20 Dec 2030')
  })
})

describe('dayLabel', () => {
  it('says Today and Yesterday', () => {
    expect(dayLabel('2031-06-04', NOW, LOCALE)).toBe('Today')
    expect(dayLabel('2031-06-03', NOW, LOCALE)).toBe('Yesterday')
  })

  it('writes other days in full, with the year only when needed', () => {
    expect(dayLabel('2031-06-02', NOW, LOCALE)).toBe('Monday 2 June')
    expect(dayLabel('2030-06-02', NOW, LOCALE)).toBe('Sunday, 2 June 2030')
  })
})

describe('counts and limits', () => {
  it('says how many are unread', () => {
    expect(unreadCountText(0)).toBe('No unread messages')
    expect(unreadCountText(1)).toBe('1 unread')
    expect(unreadCountText(12)).toBe('12 unread')
  })

  it('names each problem in the backend’s words', () => {
    expect(messageProblemText('blank')).toBe("A message can't be blank")
    expect(messageProblemText('too_long')).toBe('A message can be at most 5000 characters')
  })

  it('counts the characters left only in the last 10%', () => {
    expect(charactersLeftText(0)).toBeNull()
    expect(charactersLeftText(4499)).toBeNull()
    expect(charactersLeftText(4500)).toBe('500 characters left')
    expect(charactersLeftText(4999)).toBe('1 character left')
    expect(charactersLeftText(5000)).toBe('0 characters left')
    expect(charactersLeftText(5003)).toBe('3 characters over the limit')
  })
})