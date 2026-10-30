import { describe, it, expect } from 'vitest'
import { ApiError } from './client'
import { failureText, NO_ANSWER_TEXT, SERVER_PROBLEM_TEXT } from './apiErrors'

// The app's one rule for the words of a failure (2026-10-27). Every screen
// shows what this answers, so each case is pinned to its exact text.

function apiError(statusCode: number, message: string[]): ApiError {
  return new ApiError({
    statusCode,
    message,
    error: 'Error',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/x',
  })
}

describe('failureText', () => {
  it("shows a refusal's own words", () => {
    expect(failureText(apiError(409, ['This program is closed, so it can no longer change']))).toBe(
      'This program is closed, so it can no longer change',
    )
  })

  // Several messages (a form refused on two fields): each is a sentence of
  // its own, so they're joined with a space — not ', ' (the old majority).
  it('joins several messages with a space', () => {
    expect(failureText(apiError(400, ['Title is required.', 'Too many sets.']))).toBe(
      'Title is required. Too many sets.',
    )
  })

  // The backend's sentence for the rate limit (config/rate-limits.ts) is a
  // refusal like any other: shown as it is.
  it("shows a 429's sentence as the server wrote it", () => {
    expect(
      failureText(apiError(429, ['Too many attempts in a short time. Try again in 60 seconds.'])),
    ).toBe('Too many attempts in a short time. Try again in 60 seconds.')
  })

  // A failure on the server's side: its words ("Internal server error")
  // never reach the screen. 500 is the first such status, 499 the last
  // refusal — the boundary from both sides.
  it("replaces a 5xx's words with the shared sentence", () => {
    expect(failureText(apiError(500, ['Internal server error']))).toBe(
      'Something went wrong on our side. Try again in a moment.',
    )
    expect(failureText(apiError(503, ['Service Unavailable']))).toBe(SERVER_PROBLEM_TEXT)
    expect(failureText(apiError(499, ['Client Closed Request']))).toBe('Client Closed Request')
  })

  // A refusal with NO words: an answer the backend didn't write (a proxy's
  // HTML 413), which the client reads as an ApiError without messages. An
  // empty line would say nothing; it's the server's side, so its sentence.
  it('gives a refusal without words the shared sentence', () => {
    expect(failureText(apiError(413, []))).toBe(SERVER_PROBLEM_TEXT)
  })

  it('says to check the connection when no answer came', () => {
    expect(failureText(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Check your connection and try again.',
    )
    expect(failureText(undefined)).toBe(NO_ANSWER_TEXT)
  })

  // The caller's sentence replaces ONLY the no-answer case: a refusal keeps
  // its words, and a 5xx keeps the shared sentence.
  it("uses the caller's sentence for no answer, and only then", () => {
    const sentence = "Couldn't upload the photo."
    expect(failureText(new TypeError('Failed to fetch'), sentence)).toBe(sentence)
    expect(failureText(apiError(413, ['File too large']), sentence)).toBe('File too large')
    expect(failureText(apiError(500, ['Internal server error']), sentence)).toBe(
      SERVER_PROBLEM_TEXT,
    )
  })
})