import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { failureText } from '@/api/apiErrors'
import type { CurrentUser } from '@/auth/types'
import { currentUserQueryKey, useCurrentUser } from '@/auth/useCurrentUser'
import { useRefreshedCurrentUser } from '@/auth/useRefreshedCurrentUser'
import { userQueryKey } from '@/users/api'
import type { User } from '@/users/types'
import {
  disableMfa,
  enableMfa,
  type MfaSetup,
  recoveryCodesLeftQueryKey,
  regenerateRecoveryCodes,
  startMfaSetup,
} from './api'
import { RecoveryCodesPanel } from './RecoveryCodesPanel'
import { StepUpForm } from './StepUpForm'
import {
  codeRefusal,
  confirmSetupSchema,
  AUTHENTICATOR_LABEL_TEXT,
  groupSecret,
  recoveryCodesLeftText,
  TWO_FACTOR_OFF_NOTICE,
  TWO_FACTOR_ON_NOTICE,
  type ConfirmSetupFormValues,
} from './twoFactorRules'
import { useRecoveryCodesLeft } from './useRecoveryCodesLeft'

// /profile/two-factor — two-factor sign-in with an authenticator app (MFA
// enrolment, decisions §14). Reached from the profile's "Two-factor sign-in"
// row. Two faces:
//   - OFF: set it up — the password, then the QR code and a first code, then
//     the recovery codes (shown once), then back to the profile;
//   - ON: how many recovery codes are left; new codes; turning it off.
// Set-up's steps live in this page (the person's choice): leaving halfway
// and coming back starts over — the backend simply replaces a set-up that
// was never confirmed.
export function TwoFactorPage() {
  const { data: me } = useCurrentUser()
  // Which face: read AGAIN as the page opens — two-factor may have been
  // turned off on another device since (useRefreshedCurrentUser).
  useRefreshedCurrentUser()
  // Recovery codes just made (turning on, or new codes) — held HERE, above
  // both faces: turning on flips `mfaEnabled` in the cache, which swaps the
  // face, and the codes must stay on screen until the person says they're
  // saved.
  const [shown, setShown] = useState<{ codes: string[]; after: 'enabled' | 'renewed' } | null>(
    null,
  )
  const navigate = useNavigate()

  // RequireAuth waited for the current user; the check satisfies the type.
  if (!me) return null

  return (
    <div className="mx-auto mt-8 max-w-lg space-y-4 px-4 pb-8">
      <Link to="/profile" className="text-sm underline underline-offset-4">
        Back to my profile
      </Link>
      <h1 className="text-xl font-semibold">Two-factor sign-in</h1>
      {shown ? (
        <RecoveryCodesPanel
          codes={shown.codes}
          email={me.email}
          doneLabel={shown.after === 'enabled' ? 'Done — back to my profile' : 'Done'}
          onDone={() => {
            if (shown.after === 'enabled') {
              // replace: Back from the profile doesn't reopen a set-up done.
              void navigate('/profile', { replace: true, state: { notice: TWO_FACTOR_ON_NOTICE } })
            } else {
              setShown(null)
            }
          }}
        />
      ) : me.mfaEnabled ? (
        <ManageTwoFactor
          me={me}
          onRenewed={(codes) => setShown({ codes, after: 'renewed' })}
          onTurnedOff={() =>
            void navigate('/profile', { replace: true, state: { notice: TWO_FACTOR_OFF_NOTICE } })
          }
        />
      ) : (
        <SetUpTwoFactor me={me} onEnabled={(codes) => setShown({ codes, after: 'enabled' })} />
      )}
    </div>
  )
}

// The account is now on (or off) — told to BOTH cached copies of it: the
// session's current user (read once, at start-up — never refetched) and the
// account as GET /users/:id answered it, which is what the profile page
// shows (ProfilePage loads the profile through that query). Missing the
// second was a real bug, found in the browser: the profile said "Off" right
// after turning on. No request: the answer already says what changed.
function setOwnMfaEnabled(queryClient: QueryClient, userId: number, mfaEnabled: boolean) {
  queryClient.setQueryData<CurrentUser>(currentUserQueryKey, (old) =>
    old ? { ...old, mfaEnabled } : old,
  )
  queryClient.setQueryData<User>(userQueryKey(userId), (old) =>
    old ? { ...old, mfaEnabled } : old,
  )
}

// --- OFF: SET IT UP ----------------------------------------------------------

function SetUpTwoFactor({
  me,
  onEnabled,
}: {
  me: CurrentUser
  onEnabled: (codes: string[]) => void
}) {
  const queryClient = useQueryClient()
  const [setup, setSetup] = useState<MfaSetup | null>(null)

  const form = useForm<ConfirmSetupFormValues>({
    resolver: zodResolver(confirmSetupSchema),
    defaultValues: { code: '' },
  })

  const enable = useMutation({
    mutationFn: (values: ConfirmSetupFormValues) => enableMfa(values.code),
    onSuccess: ({ recoveryCodes }) => {
      // The account is now ON (setOwnMfaEnabled). Ten unused codes: told
      // too, so the profile row needs no request.
      setOwnMfaEnabled(queryClient, me.id, true)
      queryClient.setQueryData(recoveryCodesLeftQueryKey, recoveryCodes.length)
      onEnabled(recoveryCodes)
    },
    onError: (error) => {
      const refusal = codeRefusal(error)
      if (refusal) {
        form.resetField('code')
        form.setError('code', { message: refusal }, { shouldFocus: true })
      }
    },
  })
  const { errors } = form.formState

  if (!setup) {
    return (
      <>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            With two-factor sign-in, signing in asks for your password AND a code from an
            authenticator app on your phone (such as Google Authenticator, Microsoft Authenticator
            or 1Password). Someone who learns your password still can't get in.
          </p>
          <p>
            Turning it on signs you out on your other devices. You'll also get ten recovery codes,
            for the day you lose your phone.
          </p>
        </div>
        <StepUpForm
          idPrefix="setup"
          withCode={false}
          email={me.email}
          submitLabel="Continue"
          pendingLabel="Checking…"
          send={(values) => startMfaSetup(values.currentPassword)}
          onSuccess={setSetup}
        />
      </>
    )
  }

  return (
    <section aria-labelledby="scan-title" className="space-y-3">
      <h2 id="scan-title" className="font-medium">
        Scan this code with your authenticator app
      </h2>
      <img
        src={setup.qrCodeDataUrl}
        alt="QR code to add your Stride account to an authenticator app"
        className="size-48 rounded-md border bg-white p-2"
      />
      <p className="text-sm text-muted-foreground">
        Can't scan it? In your app, add an account by hand with this key:
      </p>
      {/* The key in groups of 4, as text a person can select and copy;
          aria-label reads it without the spaces. */}
      <p className="font-mono text-sm wrap-break-word" aria-label={`Key: ${setup.secret}`}>
        {groupSecret(setup.secret)}
      </p>
      <form
        onSubmit={(e) => void form.handleSubmit((values) => enable.mutate(values))(e)}
        className="space-y-3"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="setup-code">Code from your app</Label>
          <Input
            id="setup-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-invalid={!!errors.code}
            aria-describedby={errors.code ? 'setup-code-error' : undefined}
            {...form.register('code')}
          />
          {errors.code && (
            <p id="setup-code-error" className="text-sm text-destructive">
              {errors.code.message}
            </p>
          )}
        </div>
        {enable.isError && !codeRefusal(enable.error) && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(enable.error)}
          </p>
        )}
        <Button type="submit" disabled={enable.isPending}>
          {enable.isPending ? 'Turning on…' : 'Turn on'}
        </Button>
      </form>
    </section>
  )
}

// --- ON: MANAGE IT -----------------------------------------------------------

function ManageTwoFactor({
  me,
  onRenewed,
  onTurnedOff,
}: {
  me: CurrentUser
  onRenewed: (codes: string[]) => void
  onTurnedOff: () => void
}) {
  const queryClient = useQueryClient()
  const left = useRecoveryCodesLeft(true)

  return (
    <>
      <p className="text-sm">
        Two-factor sign-in is <strong>on</strong>: signing in asks for a code from your
        authenticator app.
      </p>
      <p className="text-sm text-muted-foreground">{AUTHENTICATOR_LABEL_TEXT}</p>

      <section aria-labelledby="codes-title" className="space-y-3 rounded-lg border px-4 py-3">
        <h2 id="codes-title" className="font-medium">
          Recovery codes
        </h2>
        {left.data !== undefined && <p className="text-sm">{recoveryCodesLeftText(left.data)}</p>}
        <p className="text-sm text-muted-foreground">
          Ten new codes replace all your old ones — used or not, the old ones stop working.
        </p>
        <StepUpForm
          idPrefix="renew"
          withCode
          email={me.email}
          submitLabel="Get new codes"
          pendingLabel="Making new codes…"
          send={(values) => regenerateRecoveryCodes(values.currentPassword, values.code ?? '')}
          onSuccess={({ recoveryCodes }) => {
            queryClient.setQueryData(recoveryCodesLeftQueryKey, recoveryCodes.length)
            onRenewed(recoveryCodes)
          }}
        />
      </section>

      <section aria-labelledby="off-title" className="space-y-3 rounded-lg border px-4 py-3">
        <h2 id="off-title" className="font-medium">
          Turn off two-factor sign-in
        </h2>
        <p className="text-sm text-muted-foreground">
          Signing in will ask for your password only, and your recovery codes stop working. You
          can set it up again at any time.
        </p>
        <StepUpForm
          idPrefix="off"
          withCode
          email={me.email}
          submitLabel="Turn off"
          pendingLabel="Turning off…"
          send={(values) => disableMfa(values.currentPassword, values.code ?? '')}
          onSuccess={() => {
            setOwnMfaEnabled(queryClient, me.id, false)
            queryClient.removeQueries({ queryKey: recoveryCodesLeftQueryKey })
            onTurnedOff()
          }}
        />
      </section>
    </>
  )
}