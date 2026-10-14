// The longest title a person may type — a template's and a program's alike.
// Mirrors the backend's TITLE_MAX_LENGTH (common/validators/title.ts), which
// both resources share since "Blank titles refused everywhere" (2026-10-14):
// assigning a template copies its title into the new program (the assign
// form prefills it), so the two limits must be one number — two constants
// that happened to be equal could drift, and a template's title would then
// open the assign form as "too long" before anyone typed.
export const TITLE_MAX_LENGTH = 200