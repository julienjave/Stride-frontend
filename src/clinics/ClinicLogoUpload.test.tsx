import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClinicLogoUpload } from './ClinicLogoUpload'
import { clinicQueryKey, clinicsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderUpload(
  logoUrl: string | null = null,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ClinicLogoUpload clinicId={1} logoUrl={logoUrl} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

// A real File object, the same way a browser would hand one to an
// <input type="file">'s change event after the person picks something —
// not a plain object shaped like one. The File constructor takes an
// array of parts (here, one string) plus a name and options, matching
// what the actual DOM API looks like.
function makeFile(name: string, type: string, sizeBytes: number) {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

describe('ClinicLogoUpload — no logo yet', () => {
  it('shows a placeholder and an "Upload logo" button', () => {
    renderUpload(null)

    expect(screen.getByText('No logo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload logo' })).toBeInTheDocument()
  })
})

describe('ClinicLogoUpload — an existing logo', () => {
  it('shows the current logo image, a "Change logo" button, and a "Remove logo" button', () => {
    renderUpload('https://storage.example.com/signed/logo.png')

    const image = screen.getByRole('img', { name: 'Clinic logo' })
    expect(image).toHaveAttribute('src', 'https://storage.example.com/signed/logo.png')
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove logo' })).toBeInTheDocument()
  })
})

describe('ClinicLogoUpload — no logo yet, remove button', () => {
  it('does not show a "Remove logo" button when there is nothing to remove', () => {
    renderUpload(null)

    expect(screen.queryByRole('button', { name: 'Remove logo' })).not.toBeInTheDocument()
  })
})

describe('ClinicLogoUpload — removing the logo', () => {
  it('DELETEs the logo and updates both caches with the response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, logoUrl: null }), { status: 200 }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(clinicQueryKey(1), {
      id: 1,
      logoUrl: 'https://storage.example.com/signed/logo.png',
    })
    queryClient.setQueryData(clinicsListQueryKey(), [
      { id: 1, logoUrl: 'https://storage.example.com/signed/logo.png' },
    ])

    const user = userEvent.setup()
    renderUpload('https://storage.example.com/signed/logo.png', queryClient)

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/1/logo'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    await waitFor(() =>
      expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({ id: 1, logoUrl: null }),
    )
    expect(queryClient.getQueryState(clinicsListQueryKey())?.isInvalidated).toBe(true)
  })

  it('shows the backend error message on a failed removal', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 400, message: ['Refused by the server'] }), {
        status: 400,
      }),
    )

    const user = userEvent.setup()
    renderUpload('https://storage.example.com/signed/logo.png')

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))

    expect(await screen.findByText('Refused by the server')).toBeInTheDocument()
  })

  // No answer at all: the component says which action failed.
  it('says the logo could not be removed when no answer comes', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderUpload('https://storage.example.com/signed/logo.png')

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))

    expect(await screen.findByText(/^Could not remove the logo\.$/)).toBeInTheDocument()
  })

  it('disables both the upload and remove buttons while a removal is in flight', async () => {
    // A promise that never resolves — lets the test inspect the
    // "in flight" state without racing a real resolution.
    fetchMock.mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    renderUpload('https://storage.example.com/signed/logo.png')

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))

    expect(await screen.findByRole('button', { name: 'Removing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeDisabled()
  })
})

describe('ClinicLogoUpload — client-side validation', () => {
  it('rejects a disallowed file type without ever calling the API', async () => {
    // applyAccept: false — by default userEvent filters out any file that
    // doesn't match the input's `accept` attribute, faithfully mimicking
    // how a real OS file picker restricts choices. That's realistic, but
    // it means a mismatched file never even reaches our onChange handler
    // by default — which would make this test pass for the wrong reason
    // (no error shown because no file was "selected" at all, not because
    // our own validation caught it). Disabling it here exercises our
    // actual imageFileSchema check, which matters as a second layer:
    // `accept` is only advisory — some OS file pickers still offer an
    // "All Files" option that bypasses it entirely.
    const user = userEvent.setup({ applyAccept: false })
    renderUpload()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = makeFile('resume.pdf', 'application/pdf', 1000)
    await user.upload(input, badFile)

    expect(
      await screen.findByText('Only JPEG, PNG, and WebP images are allowed'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a file over the 5MB limit without ever calling the API', async () => {
    const user = userEvent.setup()
    renderUpload()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const tooBigFile = makeFile('huge.png', 'image/png', 6 * 1024 * 1024)
    await user.upload(input, tooBigFile)

    expect(await screen.findByText('Image must be 5MB or smaller')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ClinicLogoUpload — a successful upload', () => {
  it('POSTs the file as multipart form data and updates both caches with the response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, logoUrl: 'https://storage.example.com/signed/new-logo.png' }),
        { status: 200 },
      ),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(clinicQueryKey(1), { id: 1, logoUrl: null })
    queryClient.setQueryData(clinicsListQueryKey(), [{ id: 1, logoUrl: null }])

    const user = userEvent.setup()
    renderUpload(null, queryClient)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const goodFile = makeFile('logo.png', 'image/png', 1000)
    await user.upload(input, goodFile)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    // The request's body is a FormData instance, not a JSON string — this
    // is the actual, meaningful assertion for this feature: get it wrong
    // (e.g. accidentally JSON.stringify-ing it) and the backend's Multer
    // interceptor would fail to parse the request, not just receive the
    // wrong data.
    const [, requestInit] = fetchMock.mock.calls[0]
    expect(requestInit?.method).toBe('POST')
    expect(requestInit?.body).toBeInstanceOf(FormData)
    const formData = requestInit?.body as FormData
    expect(formData.get('file')).toBe(goodFile)
    // No Content-Type header was set manually — see client.ts's comment
    // for why forcing one here would actually break the upload (it would
    // be missing the multipart boundary the browser generates itself).
    expect(requestInit?.headers).toEqual({})

    await waitFor(() =>
      expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({
        id: 1,
        logoUrl: 'https://storage.example.com/signed/new-logo.png',
      }),
    )
    expect(queryClient.getQueryState(clinicsListQueryKey())?.isInvalidated).toBe(true)
  })
})

describe('ClinicLogoUpload — a failed upload', () => {
  it('shows the backend error message', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 400, message: ['Only JPEG, PNG, and WebP images are allowed'] }),
        { status: 400 },
      ),
    )

    const user = userEvent.setup()
    renderUpload()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const goodFile = makeFile('logo.png', 'image/png', 1000)
    await user.upload(input, goodFile)

    expect(
      await screen.findByText('Only JPEG, PNG, and WebP images are allowed'),
    ).toBeInTheDocument()
  })
})

describe('ClinicLogoUpload — the preview after a failed upload', () => {
  // Regression coverage: the preview used to be released only on success,
  // so after a failure the picked file stayed on screen next to the error,
  // looking as if it had been saved.
  it('drops the preview and goes back to the stored logo (here: none)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 400, message: ['Upload refused'] }), {
        status: 400,
      }),
    )
    const user = userEvent.setup()
    renderUpload(null)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('logo.png', 'image/png', 1000))

    expect(await screen.findByText('Upload refused')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Clinic logo' })).not.toBeInTheDocument()
    expect(screen.getByText('No logo')).toBeInTheDocument()
  })

  it('keeps showing the previously saved logo, not the failed one', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 400, message: ['Upload refused'] }), {
        status: 400,
      }),
    )
    const user = userEvent.setup()
    renderUpload('https://storage.example.com/signed/logo.png')

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile('logo.png', 'image/png', 1000))

    expect(await screen.findByText('Upload refused')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Clinic logo' })).toHaveAttribute(
      'src',
      'https://storage.example.com/signed/logo.png',
    )
  })
})