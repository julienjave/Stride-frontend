import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import {
  appCodeField,
  codeRefusal,
  CODE_ALREADY_USED_MESSAGE,
  CODE_REQUIRED_MESSAGE,
  groupSecret,
  INVALID_CODE_MESSAGE,
  INVALID_RECOVERY_CODE_MESSAGE,
  NOT_ON_MESSAGE,
  recoveryCodesFile,
  recoveryCodesLeftText,
  secondFactorField,
} from './twoFactorRules'

function refusal(status: number, message: string) {
  return new ApiError({ statusCode: status, message: [message], error: 'Error', timestamp: '', path: '' })
}

describe('secondFactorField', () => {
  // What the backend takes (mfa/second-factor.ts): 6 digits, or a recovery
  // code with a hyphen, a space or nothing in the middle, either case.
  it.each(['123456', 'abcde-23456', 'ABCDE-23456', 'abcde 23456', 'abcde23456', ' 123456 '])(
    'accepts %j',
    (code) => {
      expect(secondFactorField.safeParse(code).success).toBe(true)
    },
  )

  it.each([
    '',
    '12345',
    '1234567',
    'abcdef',
    // The symbols left out of recovery codes: 0 o 1 l i.
    'abcd0-23456',
    'abcdo-23456',
    'abcd1-23456',
    'abcdl-23456',
    'abcdi-23456',
    'abcde--23456',
    'abcde-2345',
    'x123456',
    '123456x',
  ])('refuses %j, saying what it takes', (code) => {
    const result = secondFactorField.safeParse(code)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Enter the 6-digit code from your authenticator app, or one of your recovery codes',
    )
  })

  it('hands on the code trimmed — what is sent', () => {
    expect(secondFactorField.parse('  abcde-23456 ')).toBe('abcde-23456')
  })
})

describe('appCodeField (confirming set-up)', () => {
  it('takes 6 digits, trimmed', () => {
    expect(appCodeField.parse(' 123456 ')).toBe('123456')
  })

  // Set-up proves the APP holds the new secret: no recovery code exists yet.
  it.each(['abcde-23456', '12345', '1234567', '12345a'])('refuses %j', (code) => {
    const result = appCodeField.safeParse(code)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Enter the 6-digit code from your authenticator app',
    )
  })
})

describe('codeRefusal', () => {
  it.each([INVALID_CODE_MESSAGE, CODE_ALREADY_USED_MESSAGE, INVALID_RECOVERY_CODE_MESSAGE, CODE_REQUIRED_MESSAGE])(
    'recognises %j, as a step-up (400) or the sign-in step (401)',
    (message) => {
      expect(codeRefusal(refusal(400, message))).toBe(message)
      expect(codeRefusal(refusal(401, message))).toBe(message)
    },
  )

  it('is null for anything else', () => {
    expect(codeRefusal(refusal(403, INVALID_CODE_MESSAGE))).toBeNull()
    expect(codeRefusal(refusal(409, NOT_ON_MESSAGE))).toBeNull()
    expect(codeRefusal(refusal(400, 'Your current password is not correct'))).toBeNull()
    expect(codeRefusal(new Error(INVALID_CODE_MESSAGE))).toBeNull()
    expect(codeRefusal(null)).toBeNull()
  })
})

describe('groupSecret', () => {
  it('splits the key in groups of 4, with no space at the end', () => {
    expect(groupSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
    expect(groupSecret('JBSWY3DPEH')).toBe('JBSW Y3DP EH')
    expect(groupSecret('JBSW')).toBe('JBSW')
  })
})

describe('recoveryCodesLeftText', () => {
  it('counts in words', () => {
    expect(recoveryCodesLeftText(10)).toBe('10 recovery codes left')
    expect(recoveryCodesLeftText(2)).toBe('2 recovery codes left')
    expect(recoveryCodesLeftText(1)).toBe('1 recovery code left')
    expect(recoveryCodesLeftText(0)).toBe('No recovery codes left')
  })
})

describe('recoveryCodesFile', () => {
  it('names the account and the day, says how to use them, one code a line', () => {
    expect(
      recoveryCodesFile(['abcde-23456', 'fghjk-34567'], 'pat@example.com', new Date(2031, 2, 9, 23, 30)),
    ).toBe(
      [
        'Stride — two-factor recovery codes',
        'Account: pat@example.com',
        'Made on: 2031-03-09',
        '',
        'Each code works once, instead of a code from your authenticator app.',
        'Keep them somewhere safe. Making new codes stops these from working.',
        '',
        'abcde-23456',
        'fghjk-34567',
        '',
      ].join('\r\n'),
    )
  })
})