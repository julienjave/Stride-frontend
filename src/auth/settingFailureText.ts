import { failureText } from '@/api/apiErrors'

// The snackbar when a setting from the Settings menu couldn't be saved
// (decisions §33, pass 2). Same shape as a load error's sentence
// (common/loadErrorText.ts): what failed, then the reason in the app's one
// wording rule (failureText) — a refusal's own words, the "on our side"
// sentence with its Reference for a server failure, or the connection
// sentence when nothing answered.
//
// Until 2026-10-31 the menu said "Couldn't save your weight unit. Try
// again." INSIDE itself — but a pick closes the menu, so the sentence waited
// there unseen until it was opened again, and it never gave the reason (nor
// a server failure's Reference).
export const SETTING_NO_ANSWER_TEXT = 'Check your connection and try again.'

export function settingFailureText(setting: string, error: unknown): string {
  return `Couldn't save ${setting}. ${failureText(error, SETTING_NO_ANSWER_TEXT)}`
}