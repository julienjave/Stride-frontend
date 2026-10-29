import type { AdminMetrics, AttentionList } from './api'

// The admin home's words that depend on the numbers. Pure, so each wording
// is a plain test; the sections only place them.

// "1 deactivated clinic" / "3 deactivated accounts" — English plurals are
// regular for every noun used here, but each call still names both forms:
// a rule that "adds an s" would be wrong the day a noun isn't regular.
export function countOf(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

// What the tiles leave out, so the totals aren't read as "everyone":
//   "Not counted above: 3 deactivated accounts and 1 deactivated clinic."
// null when nothing is deactivated (no sentence about nothing).
export function notCountedLine(metrics: AdminMetrics): string | null {
  const parts = [
    metrics.accounts.deactivated > 0
      ? countOf(metrics.accounts.deactivated, 'deactivated account', 'deactivated accounts')
      : null,
    metrics.clinics.deactivated > 0
      ? countOf(metrics.clinics.deactivated, 'deactivated clinic', 'deactivated clinics')
      : null,
  ].filter((part): part is string => part !== null)
  if (parts.length === 0) return null
  return `Not counted above: ${parts.join(' and ')}.`
}

// Under a list cut at the backend's limit: "and 2 more". null when every
// account is listed.
export function moreLine(list: AttentionList): string | null {
  const more = list.total - list.first.length
  return more > 0 ? `and ${more} more` : null
}

// True when nothing needs attention — the section then says so in one
// sentence instead of empty groups. Every group counts: one listed with a
// total is enough to show the groups.
export function nothingNeedsAttention(metrics: AdminMetrics): boolean {
  return Object.values(metrics.needsAttention).every((list) => list.total === 0)
}
// The freshness bar's time: "14:05" (or "2:05 PM" — the viewer's own
// locale), the moment the OLDER of the two answers arrived — everything on
// the page is at least that fresh.
export function updatedAtText(moment: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(moment)
}