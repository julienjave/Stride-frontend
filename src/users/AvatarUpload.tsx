import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { UserAvatar } from '@/common/UserAvatar'
import { IMAGE_FILE_ACCEPT, imageFileSchema } from '@/common/imageFile'
import { removeAvatar, uploadAvatar } from './api'
import { applyUpdatedUser } from './userCache'
import type { User } from './types'

interface AvatarUploadProps {
  // The user whose photo this manages — on /profile the logged-in user,
  // on the admin's user page whoever is being edited.
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>
}

// The "Photo" section: the current avatar plus Upload/Change and Remove
// buttons. Modeled on ClinicLogoUpload, with two deliberate differences
// explained below (the shared cache helper, and dropping the preview when
// an upload fails).
//
// Who may use it: the user themselves or an admin — the same rule the
// backend enforces. Both pages that render it (/profile, and the
// admin-only user page) already satisfy that, so there's no "read-only"
// mode. A page shown to anyone else must not render this component.
export function AvatarUpload({ user }: AvatarUploadProps) {
  const queryClient = useQueryClient()
  // The real <input type="file">, hidden; the visible Button opens its OS
  // file picker by calling .click() on it. Same technique (and the same
  // keyboard-accessibility reasoning) as ClinicLogoUpload.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // An instant local preview of the picked file while it uploads.
  // URL.createObjectURL() gives a browser-only "blob:" URL pointing at the
  // file's bytes already in memory — no network needed to show it.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Object URLs hold on to their file's memory until explicitly revoked
  // (or the page unloads). One function, so there's one place to get it
  // right.
  function revokePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  // The cache updates live in the mutation's OWN options (not in a
  // per-call mutate(file, { onSuccess })): TanStack Query always runs
  // these, even if this component has left the screen by the time the
  // response arrives. And they go through applyUpdatedUser(), the same
  // function a profile PATCH uses — which is what makes the header's
  // avatar change the moment your own upload finishes.
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(user.id, file),
    onSuccess: (updated) => applyUpdatedUser(queryClient, updated),
    // onSettled runs after success OR failure. Dropping the preview in
    // both cases is deliberate:
    // - success: the real avatarUrl is now in the cache, so the page shows
    //   the saved photo instead;
    // - failure: the photo was NOT saved, so continuing to show it would
    //   be a lie — the avatar goes back to what's really stored, next to
    //   the error message. (ClinicLogoUpload keeps the preview after a
    //   failed upload; noted in deferred-improvements.md.)
    onSettled: revokePreview,
  })

  const removeMutation = useMutation({
    mutationFn: () => removeAvatar(user.id),
    onSuccess: (updated) => applyUpdatedUser(queryClient, updated),
  })

  const isBusy = uploadMutation.isPending || removeMutation.isPending

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared right away, so picking the SAME file again (a retry after an
    // error) still fires 'change' — a browser only fires it when the
    // input's value actually changes.
    event.target.value = ''
    if (file) handleFileChosen(file)
  }

  // Everything that happens once a file is chosen, kept separate from the
  // <input> plumbing above. This is the seam for the planned crop step
  // (roadmap: "Avatar crop"): it will open a crop dialog here and call
  // the upload with the cropped image instead, without touching the rest.
  function handleFileChosen(file: File) {
    // A new attempt replaces any leftover message from a previous one.
    removeMutation.reset()

    const result = imageFileSchema.safeParse(file)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid file')
      return
    }

    setValidationError(null)
    revokePreview()
    setPreviewUrl(URL.createObjectURL(file))
    uploadMutation.mutate(file)
  }

  function handleRemove() {
    // Same "a new action clears the previous action's message" rule.
    setValidationError(null)
    uploadMutation.reset()
    removeMutation.mutate()
  }

  // While an upload is in flight, the local preview; otherwise what the
  // server says is stored.
  const displayedUrl = previewUrl ?? user.avatarUrl

  return (
    // A labelled <section> is a "region" landmark, so a screen-reader user
    // can jump to it like the page's other sections. The id is fixed
    // because a page shows at most one AvatarUpload.
    <section aria-labelledby="profile-photo" className="space-y-2">
      <h2 id="profile-photo" className="text-sm font-medium text-muted-foreground">
        Photo
      </h2>

      <div className="flex items-center gap-4">
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={displayedUrl}
          className="size-16 text-lg"
        />

        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending
              ? 'Uploading…'
              : user.avatarUrl
                ? 'Change photo'
                : 'Upload photo'}
          </Button>

          {/* Only when a photo is actually SAVED (user.avatarUrl), not for
              a preview still uploading — there's nothing on the server to
              remove yet. */}
          {user.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={handleRemove}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove photo'}
            </Button>
          )}

          <Input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* role="alert" makes a screen reader announce the message as soon
          as it appears — otherwise a blind user who picked a wrong file
          would hear nothing happen. */}
      {validationError && (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      )}
      {uploadMutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadMutation.error instanceof ApiError
            ? uploadMutation.error.messages.join(', ')
            : "Couldn't upload the photo."}
        </p>
      )}
      {removeMutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {removeMutation.error instanceof ApiError
            ? removeMutation.error.messages.join(', ')
            : "Couldn't remove the photo."}
        </p>
      )}
    </section>
  )
}