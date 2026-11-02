import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { resetTimeOfDay } from './demoReset'
import type { DemoCardAccount, DemoInfo } from './types'

// The sign-in page's "For reviewers" card (decisions §46), shown only when the
// backend says this deployment is the demo (GET /auth/setup-status's `demo`).
// The backend sends the DATA — the accounts, the password, the key, when the
// reset runs — and this file says it in words.
//
// "Use" FILLS the form, it doesn't sign in: the reviewer still presses "Log
// in" and sees the real sign-in — the role picker, Casey's two-factor step —
// rather than a shortcut that would hide what they came to review.

// What each published account is for. Keyed by address, with a fallback by
// role, so an account the backend adds later still gets a sensible line.
const WHAT_IT_SHOWS: Record<string, string> = {
  'admin@stride.test': 'Clinics, users and invitations, the audit log.',
  'alex@stride.test': 'Patients, the exercise library, programs, medical files, messages.',
  'pat@stride.test': 'Today’s session, progress, records, messages.',
  'casey@stride.test': 'Asks for a two-factor code after the password.',
}
const ROLE_LABEL: Record<DemoCardAccount['role'], string> = {
  admin: 'Admin',
  practitioner: 'Practitioner',
  patient: 'Patient',
}

// The key in groups of four, as authenticator apps print it — easier to copy
// by eye. The apps ignore the spaces.
function keyGroups(key: string): string[] {
  return key.match(/.{1,4}/g) ?? []
}

interface DemoCardProps {
  demo: DemoInfo
  // Put this account's email and the shared password in the form.
  onUse: (email: string, password: string) => void
}

export function DemoCard({ demo, onUse }: DemoCardProps) {
  const headingId = useId()
  // Read once, when the page opens: the card names the NEXT reset, which a
  // reviewer reading it for a few minutes doesn't need updated.
  const [now] = useState(() => new Date())
  // What "Use" just did — said to screen readers (the form is above the
  // card, out of view of a keyboard user who is down here).
  const [filled, setFilled] = useState<string | null>(null)

  function use(email: string) {
    onUse(email, demo.password)
    setFilled(email)
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm"
    >
      <h2 id={headingId} className="text-base font-semibold">
        For reviewers
      </h2>
      <p>
        This is a demo of Stride. Sign in with one of these shared accounts — the password of each
        is <code className="font-mono">{demo.password}</code>.
      </p>

      <ul className="divide-y divide-border rounded-md border bg-background">
        {demo.accounts.map((account) => (
          <li key={account.email} className="flex items-start gap-3 px-3 py-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-medium">
                {ROLE_LABEL[account.role]}
                {account.twoFactor && ', two-factor sign-in'}
              </p>
              <p className="break-all text-muted-foreground">{account.email}</p>
              <p className="text-muted-foreground">
                {WHAT_IT_SHOWS[account.email] ?? `Stride as ${ROLE_LABEL[account.role].toLowerCase()}.`}
              </p>
              {account.twoFactor && (
                <p className="text-muted-foreground">
                  Add this key to an authenticator app (time-based):{' '}
                  {/* Each group unbreakable, the spaces between them the only
                      places a line may end — `break-all` cut "MO / TW" at
                      375 px. The spaces stay in the copied text. */}
                  <code className="font-mono text-foreground">
                    {keyGroups(demo.twoFactorKey).map((group, index) => (
                      <span key={index}>
                        {index > 0 && ' '}
                        <span className="whitespace-nowrap">{group}</span>
                      </span>
                    ))}
                  </code>
                </p>
              )}
            </div>
            {/* The visible word starts the accessible name (WCAG 2.5.3), and
                the address tells the four buttons apart for a screen reader. */}
            <Button
              type="button"
              variant="outline"
              onClick={() => use(account.email)}
              aria-label={`Use ${account.email}`}
            >
              Use
            </Button>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {filled && `${filled} and its password are filled in. Press Log in.`}
      </p>

      <p>
        Stride is invitation-only, so there’s no sign-up. These shared accounts can’t change their
        password, email or two-factor sign-in, nor be deactivated — to try those, sign in as the
        admin and invite yourself.
      </p>
      <p>
        <strong>Don’t enter real personal information:</strong> other reviewers can see what you
        type.
      </p>
      {demo.reset && (
        <p>
          Demo data is reset every day at {resetTimeOfDay(demo.reset, now)} your time — including
          accounts you create.
        </p>
      )}
      {demo.guideUrl && (
        <p>
          {/* A new tab: leaving for GitHub shouldn't lose the sign-in page.
              `noreferrer` also implies noopener. Said in words for screen
              readers (the project's rule — PossibleDuplicatesNotice). */}
          <a
            href={demo.guideUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
            aria-label="The reviewers’ guide: every account and what it shows (opens in a new tab)"
          >
            The reviewers’ guide: every account and what it shows
          </a>
        </p>
      )}
    </section>
  )
}
