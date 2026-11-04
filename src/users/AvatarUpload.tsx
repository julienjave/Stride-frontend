/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import { UserAvatar } from '@/common/UserAvatar'
import { IMAGE_FILE_ACCEPT } from '@/common/imageFile'
import { removeAvatar, uploadAvatar } from './api'
import { applyUpdatedUser } from './userCache'
import { AvatarCropDialog } from './AvatarCropDialog'
import { cropToAvatarFile } from './cropImage'
import { avatarSourceFileSchema } from './avatarCrop'
import type { User } from './types'

// What one upload needs: the picked photo (as a local "blob:" URL) and the
// square of it chosen in the crop dialog.
interface CropRequest {
  sourceUrl: string
  area: Area
}

interface AvatarUploadProps {
  // The user whose photo this manages — on /profile the logged-in user,
  // on the admin's user page whoever is being edited.
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>
}

// The "Photo" section: the current avatar plus Upload/Change and Remove
// buttons. Modeled on ClinicLogoUpload, with three deliberate differences
// explained below (the shared cache helper, dropping the preview when an
// upload fails, and the crop step).
//
// The upload flow: pick a file → check its type and size → crop it in
// AvatarCropDialog → draw the chosen square into a small JPEG
// (cropToAvatarFile) → upload THAT. The original photo never leaves the
// browser.
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

  // The picked photo while it's being cropped, as a local URL for the crop
  // dialog to display — and the dialog's on/off switch: set = open.
  // URL.createObjectURL() gives a browser-only "blob:" URL pointing at the
  // file's bytes already in memory — no network needed to show it.
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)

  // An instant local preview of the CROPPED image while it uploads — what
  // will actually be saved, not the original photo.
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
  //
  // Cropping happens INSIDE mutationFn, as the first step of the upload.
  // So "cropping, then uploading" is one pending state (isPending covers
  // both: the buttons are disabled and say "Uploading…" from the moment
  // Save is clicked), and a crop failure is reported exactly like an upload
  // failure (isError), with no extra state to keep in sync.
  const uploadMutation = useMutation({
    mutationFn: async ({ sourceUrl, area }: CropRequest) => {
      const file = await cropToAvatarFile(sourceUrl, area)
      revokePreview()
      setPreviewUrl(URL.createObjectURL(file))
      return uploadAvatar(user.id, file)
    },
    onSuccess: (updated) => applyUpdatedUser(queryClient, updated),
    // onSettled runs after success OR failure, and receives the variables
    // the mutation was called with — which is how it knows which source
    // URL to release. Both object URLs go:
    // - the original photo's: once cropped, it's not needed any more;
    // - the preview: on success the real avatarUrl is now in the cache, so
    //   the page shows the saved photo instead; on failure the photo was
    //   NOT saved, so continuing to show it would be a lie — the avatar
    //   goes back to what's really stored, next to the error message.
    //   (ClinicLogoUpload keeps the preview after a failed upload; noted in
    //   deferred-improvements.md.)
    onSettled: (_data, _error, { sourceUrl }) => {
      URL.revokeObjectURL(sourceUrl)
      revokePreview()
    },
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
  // <input> plumbing above: check it, then open the crop dialog on it.
  // Nothing is uploaded until the dialog's Save.
  function handleFileChosen(file: File) {
    // A new attempt replaces any leftover message from a previous one —
    // from a removal OR an earlier upload.
    removeMutation.reset()
    uploadMutation.reset()

    // Checked on the ORIGINAL: the type decides whether the browser can open
    // it at all, and its size is capped at 20MB — larger than the backend's
    // 5MB, because what's uploaded is the small cropped JPEG, not this file
    // (see MAX_AVATAR_SOURCE_FILE_SIZE_BYTES for the reasoning).
    const result = avatarSourceFileSchema.safeParse(file)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid file')
      return
    }

    setValidationError(null)
    setCropSourceUrl(URL.createObjectURL(file))
  }

  function handleCropCancel() {
    // Nothing will use the photo now: release its memory.
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl(null)
  }

  function handleCropConfirm(area: Area) {
    if (!cropSourceUrl) return
    // Close the dialog (clearing the URL is what closes it) and hand the
    // URL over to the upload, which releases it in onSettled once the crop
    // no longer needs it.
    setCropSourceUrl(null)
    uploadMutation.mutate({ sourceUrl: cropSourceUrl, area })
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
          userId={user.id}
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

      <AvatarCropDialog
        imageUrl={cropSourceUrl}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

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
          {failureText(uploadMutation.error, "Couldn't upload the photo.")}
        </p>
      )}
      {removeMutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(removeMutation.error, "Couldn't remove the photo.")}
        </p>
      )}
    </section>
  )
}