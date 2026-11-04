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

import { describe, it, expect } from 'vitest'
import { completeBody, skipBody, stopBody } from './endingRules'

const NONE = { painAfter: null, mobilityAfter: null }

// The bodies compared as JSON STRINGS — what really travels — so a key
// present with `undefined` or `null` can't pass for one left out.
const sent = (body: object) => JSON.stringify(body)

describe('completeBody', () => {
  it('sends nothing not answered', () => {
    expect(sent(completeBody(NONE, ''))).toBe('{}')
    expect(sent(completeBody(NONE, '   \n'))).toBe('{}')
  })

  it('sends the answers, 0 included, the feedback trimmed', () => {
    expect(sent(completeBody({ painAfter: 0, mobilityAfter: 8 }, '  Felt good. '))).toBe(
      '{"painAfter":0,"mobilityAfter":8,"sessionFeedback":"Felt good."}',
    )
  })

  it('sends one score without the other', () => {
    expect(sent(completeBody({ painAfter: null, mobilityAfter: 0 }, ''))).toBe('{"mobilityAfter":0}')
  })
})

describe('stopBody', () => {
  it('always sends the reason; the rest only when answered', () => {
    expect(sent(stopBody('no_time', '', NONE))).toBe('{"reason":"no_time"}')
    expect(sent(stopBody('pain', '  knee hurt  ', { painAfter: 7, mobilityAfter: 0 }))).toBe(
      '{"reason":"pain","note":"knee hurt","painAfter":7,"mobilityAfter":0}',
    )
  })
})

describe('skipBody', () => {
  it('sends the program, the day and the reason; a note only when written', () => {
    expect(sent(skipBody(12, '2031-06-12', 'illness', ' ', null))).toBe(
      '{"assignedProgramId":12,"localDate":"2031-06-12","reason":"illness"}',
    )
    expect(sent(skipBody(12, '2031-06-12', 'illness', ' flu ', null))).toBe(
      '{"assignedProgramId":12,"localDate":"2031-06-12","reason":"illness","note":"flu"}',
    )
  })

  it('sends a pain level with the reason "pain" — 0 included', () => {
    expect(sent(skipBody(12, '2031-06-12', 'pain', '', 0))).toBe(
      '{"assignedProgramId":12,"localDate":"2031-06-12","reason":"pain","painBefore":0}',
    )
  })

  // Chosen while "pain" was the reason, then the reason changed: not sent
  // (the backend refuses it, and it would mean nothing).
  it('never sends a pain level with another reason', () => {
    expect(sent(skipBody(12, '2031-06-12', 'no_time', '', 7))).toBe(
      '{"assignedProgramId":12,"localDate":"2031-06-12","reason":"no_time"}',
    )
  })
})