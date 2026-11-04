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
  charactersLeftText,
  dayLabel,
  deleteMessageLabel,
  DELETED_TEXT,
  listTimeText,
  messageProblemText,
  NO_MESSAGES_TEXT,
  previewText,
  READ_ONLY_TEXT,
  readOnlyText,
  seenText,
  unreadCountText,
} from './messageText'
import { ALEX_ID, message, summary } from './testData'

// Locale pinned to en-GB so the expected strings don't depend on the machine.
const LOCALE = 'en-GB'
// Wednesday 4 June 2031, 15:00 local.
const NOW = new Date(2031, 5, 4, 15, 0)
const at = (...parts: [number, number, number, number?, number?]) => new Date(...parts).toISOString()

// Decisions §22: the reason picks the words; anything else — an ended care
// team, or no reason given — keeps the ended care team's sentence.
describe('readOnlyText', () => {
  it("names the deactivated patient's account, and who can change it", () => {
    expect(readOnlyText(summary({ canSend: false, readOnlyReason: 'patient_deactivated' }))).toBe(
      "Pat's account is deactivated, so this conversation is read-only until an admin reactivates it.",
    )
  })

  it('keeps the ended care team sentence otherwise', () => {
    expect(readOnlyText(summary({ canSend: false, readOnlyReason: 'care_team_ended' }))).toBe(READ_ONLY_TEXT)
    expect(readOnlyText(summary({ canSend: false, readOnlyReason: null }))).toBe(READ_ONLY_TEXT)
  })
})

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

describe('seenText', () => {
  // Sent on Monday 2 June 2031 at 09:02 local.
  const SENT = at(2031, 5, 2, 9, 2)

  it('gives the time alone when it was read the day it was sent', () => {
    expect(seenText(at(2031, 5, 2, 14, 5), SENT, LOCALE)).toBe('Seen 14:05')
    // The last minute of that day is still that day.
    expect(seenText(at(2031, 5, 2, 23, 59), SENT, LOCALE)).toBe('Seen 23:59')
  })

  it('adds the weekday when it was read on a later day of that week', () => {
    expect(seenText(at(2031, 5, 3, 0, 1), SENT, LOCALE)).toBe('Seen Tue 00:01')
    // Six days after: still the weekday (it can't be mistaken for the
    // sending's own weekday, which would be seven days on).
    expect(seenText(at(2031, 5, 8, 8, 30), SENT, LOCALE)).toBe('Seen Sun 08:30')
  })

  it('gives the date from a week on, the year only when it changed', () => {
    expect(seenText(at(2031, 5, 9, 14, 5), SENT, LOCALE)).toBe('Seen 9 Jun, 14:05')
    expect(seenText(at(2032, 0, 3, 14, 5), at(2031, 11, 20, 9, 0), LOCALE)).toBe('Seen 3 Jan 2032, 14:05')
  })

  it('follows the locale', () => {
    expect(seenText(at(2031, 5, 2, 14, 5), SENT, 'en-US')).toBe('Seen 2:05 PM')
    expect(seenText(at(2031, 5, 9, 14, 5), SENT, 'en-US')).toBe('Seen Jun 9, 2:05 PM')
  })
})

describe('deleteMessageLabel', () => {
  it('says which message, by its time', () => {
    expect(deleteMessageLabel(at(2031, 5, 2, 9, 2), LOCALE)).toBe('Delete your message sent at 9:02')
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