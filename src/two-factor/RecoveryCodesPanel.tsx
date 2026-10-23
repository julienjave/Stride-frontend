import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { recoveryCodesFile } from './twoFactorRules'

// The ten recovery codes, shown ONCE (only their hashes are kept — they can
// never be shown again), with the three ways the person chose to keep them
// (decisions §14): copy them all, download them as a text file, and "Done"
// only after ticking "I've saved my recovery codes".
//
// Used after turning two-factor on and after asking for new codes.
export function RecoveryCodesPanel({
  codes,
  email,
  onDone,
  doneLabel = 'Done',
}: {
  codes: string[]
  email: string
  onDone: () => void
  doneLabel?: string
}) {
  const [saved, setSaved] = useState(false)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const savedId = useId()
  const listId = useId()

  // The download, made when the button is pressed — an event handler is
  // where a side effect belongs (render must stay pure, and an effect that
  // only feeds state back would cost a second render). The file is a Blob
  // in memory; a Blob URL names it, and a link with `download` saves it
  // instead of opening it. The URL is released straight after: the browser
  // has already started the download, and a Blob URL holds its data in
  // memory until revoked.
  function downloadFile() {
    const url = URL.createObjectURL(
      new Blob([recoveryCodesFile(codes, email, new Date())], { type: 'text/plain' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'stride-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  // The clipboard can refuse (no permission, an insecure page): say so, so
  // the person knows to use the download or write them down.
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <section aria-labelledby={`${listId}-title`} className="space-y-3 rounded-lg border px-4 py-3">
      <h2 id={`${listId}-title`} className="font-medium">
        Your recovery codes
      </h2>
      <p className="text-sm text-muted-foreground">
        If you lose your phone, each of these codes signs you in once, instead of a code from your
        app. Keep them somewhere safe — this is the only time they're shown.
      </p>
      <ol
        id={listId}
        className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm"
        aria-label="Recovery codes"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void copyAll()}>
          Copy all
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadFile}>
          Download
        </Button>
        {/* role="status": the result of Copy is announced, then stays. */}
        <p role="status" className="text-sm text-muted-foreground">
          {copy === 'copied' && 'Copied.'}
          {copy === 'failed' && "Couldn't copy — download them or write them down."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={savedId}
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="size-4"
        />
        <label htmlFor={savedId} className="text-sm">
          I've saved my recovery codes
        </label>
      </div>
      <Button type="button" onClick={onDone} disabled={!saved}>
        {doneLabel}
      </Button>
    </section>
  )
}