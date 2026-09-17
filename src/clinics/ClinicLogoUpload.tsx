import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { uploadClinicLogo, removeClinicLogo, clinicQueryKey } from './api'
import { clinicLogoFileSchema } from './schemas'
import type { Clinic } from './types'

interface ClinicLogoUploadProps {
  clinicId: number
  logoUrl: string | null
}

export function ClinicLogoUpload({ clinicId, logoUrl }: ClinicLogoUploadProps) {
  const queryClient = useQueryClient()
  // A ref to the actual, native <input type="file"> — used only to
  // trigger its OS file picker programmatically (fileInputRef.current
  // ?.click()) when the visible, custom-styled Button is clicked. The
  // input is hidden via Tailwind's `hidden` class (display: none), which
  // also removes it from the tab order entirely — so this ISN'T a case of
  // "the native input stays independently keyboard-reachable, just
  // invisible." Keyboard accessibility instead comes from the visible
  // Button itself: it's a real, focusable <button>, and pressing
  // Enter/Space on it fires the same onClick that calls
  // fileInputRef.current.click(), which opens the OS file picker exactly
  // as if the (hidden) input had been clicked directly.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // A local, INSTANT preview of the file just picked, separate from
  // `logoUrl` (the server's last-confirmed logo, passed in as a prop).
  // URL.createObjectURL(file) asks the browser to mint a temporary,
  // browser-only URL pointing directly at bytes already sitting in memory
  // — no network round trip needed to "see" the picked file immediately,
  // while the real upload is still in flight in the background.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Shared by both mutations below — uploading a new logo and removing
  // the current one both return the full updated Clinic and need the
  // exact same cache treatment, so this is written once rather than
  // duplicated in two onSuccess handlers.
  function applyUpdatedClinic(updated: Clinic) {
    queryClient.setQueryData(clinicQueryKey(clinicId), updated)
    // Prefix match on 'clinics-list' (not exact) — sweeps BOTH cached
    // list variants (active-only and include-inactive). Safe from
    // colliding with clinicQueryKey(clinicId) written just above:
    // clinicsListQueryKey lives under a different top-level key
    // ('clinics-list', not 'clinics') specifically so this can't happen.
    void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadClinicLogo(clinicId, file),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative new state" pattern
      // as every other clinic mutation in this feature (EditableClinicField,
      // DeactivateClinicButton) — updated.logoUrl is a real, ready-to-use
      // signed URL, so writing it straight into the cache means the page
      // reflects it immediately, no extra re-fetch needed.
      applyUpdatedClinic(updated)
      // The upload succeeded, so the real logoUrl now in the cache above
      // is the correct thing to show going forward — the temporary local
      // preview has done its job and should be released.
      revokePreview()
    },
  })

  const removeMutation = useMutation({
    mutationFn: () => removeClinicLogo(clinicId),
    onSuccess: applyUpdatedClinic,
  })

  // Object URLs are NOT automatically garbage-collected when you're done
  // with them — they stay valid (and hold their underlying file's memory)
  // until the page unloads, unless explicitly revoked. Centralizing that
  // call here, rather than repeating it at both call sites below, means
  // there's exactly one place that can forget to do it.
  function revokePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    // Reset the native input's value immediately, regardless of what
    // happens next. Without this, picking the exact same file twice in a
    // row (e.g. retrying right after a validation error, having changed
    // nothing) wouldn't even fire this handler the second time — a
    // browser only fires a file input's 'change' event when its value
    // actually changes, and re-selecting an identical file doesn't count
    // as a change unless the value was cleared first.
    event.target.value = ''

    if (!file) return

    const result = clinicLogoFileSchema.safeParse(file)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid file')
      return
    }

    setValidationError(null)
    revokePreview()
    setPreviewUrl(URL.createObjectURL(file))
    uploadMutation.mutate(file)
  }

  // While a preview exists (upload just started, hasn't resolved yet),
  // show that instead of the last-known-good logoUrl — it's a closer
  // reflection of what the person just did than the stale server value.
  const displayedUrl = previewUrl ?? logoUrl

  return (
    <div className="space-y-2 py-2">
      <p className="text-sm text-muted-foreground">Logo</p>

      <div className="flex items-center gap-4">
        {displayedUrl ? (
          <img
            src={displayedUrl}
            alt="Clinic logo"
            className="h-16 w-16 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border text-xs text-muted-foreground">
            No logo
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadMutation.isPending || removeMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
          </Button>
          {/* Only offered when there's a CONFIRMED existing logo — logoUrl
              itself, not displayedUrl (which also covers the local
              preview of a file that hasn't finished uploading yet).
              Removing a preview that isn't saved anywhere yet doesn't
              make sense as a server-side delete action. */}
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploadMutation.isPending || removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove logo'}
            </Button>
          )}
          {/* React 19 lets a function component accept `ref` directly as a
              prop (no forwardRef wrapper needed) — Input (components/ui/
              input.tsx) spreads its remaining props, ref included, onto
              the real underlying <input>, so this ref ends up pointing at
              the actual DOM node, not at the Input component itself.
              className="hidden" (display: none) takes this input out of
              the tab order — it's reachable only via the Button's onClick
              above, not by tabbing to it directly. */}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {validationError && <p className="text-sm text-destructive">{validationError}</p>}
      {uploadMutation.isError && (
        <p className="text-sm text-destructive">
          {uploadMutation.error instanceof ApiError
            ? uploadMutation.error.messages.join(', ')
            : 'Something went wrong'}
        </p>
      )}
      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          {removeMutation.error instanceof ApiError
            ? removeMutation.error.messages.join(', ')
            : 'Could not remove the logo.'}
        </p>
      )}
    </div>
  )
}