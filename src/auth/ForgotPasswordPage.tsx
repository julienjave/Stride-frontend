import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from './api'
import { failureText, readEmail } from './passwordResetRules'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './schemas'

// "Forgot your password?" — `/forgot-password` (Phase 6, 2026-10-21), for a
// signed-OUT visitor (RequireGuest). The address to send a reset link to,
// filled in when the sign-in page passes the one already typed there.
//
// The answer is the same whether or not the address has an account — the
// backend answers 204 either way, so nobody can use this page to find out
// who has one — and so is the page: "IF an account exists…".
export function ForgotPasswordPage() {
  const location = useLocation()
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    // Read once, when the form is created — the state arrives with the
    // navigation to this page.
    defaultValues: { email: readEmail(location.state) },
  })
  // The address as typed right now, for "Back to log in" (useWatch
  // re-renders on each keystroke; getValues() would be read once).
  const typedEmail = useWatch({ control: form.control, name: 'email' })
  const request = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => requestPasswordReset(values.email),
  })

  if (request.isSuccess) {
    const email = request.variables.email
    return (
      <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
        <h1 className="text-xl font-semibold">Check your email</h1>
        {/* role="status": announced when it replaces the form. */}
        <p role="status" className="text-sm">
          If an account exists for <strong>{email}</strong>, we've sent it a link to choose a
          new password. The link works for 1 hour.
        </p>
        <p className="text-sm text-muted-foreground">
          Nothing after a few minutes? Check your spam folder, or{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => request.reset()}
          >
            try again
          </button>
          .
        </p>
        <BackToLogin email={email} />
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-sm px-4 space-y-4">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-sm text-muted-foreground">
        Enter the email address you log in with. We'll send you a link to choose a new password.
      </p>
      <form
        onSubmit={(e) => void form.handleSubmit((values) => request.mutate(values))(e)}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        {request.isError && (
          <p role="alert" className="text-sm text-destructive">
            {failureText(request.error)}
          </p>
        )}
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Sending…' : 'Send the link'}
        </Button>
      </form>
      <BackToLogin email={typedEmail} />
    </div>
  )
}

// Back to the sign-in page, with the address carried along (state, not the
// URL) so it needn't be typed again.
function BackToLogin({ email }: { email: string }) {
  return (
    <p className="text-sm">
      <Link to="/login" state={{ email }} className="underline underline-offset-4">
        Back to log in
      </Link>
    </p>
  )
}