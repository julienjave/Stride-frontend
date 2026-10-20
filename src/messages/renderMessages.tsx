import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { urlOf } from '@/sessions/testData'
import { ConversationPage } from './ConversationPage'
import { MessagesIndexPage } from './MessagesIndexPage'
import { MessagesLayout } from './MessagesLayout'
import { MessagingConnectionProvider } from './MessagingConnectionProvider'
import { FakeSocket } from './testSocket'
import { ALEX_USER } from './testData'

// The messaging screens' test harness: the real pages under their real
// route shape (the layout, its index and `:conversationId`), inside the
// connection provider with a FakeSocket, and a fake API.
//
// `api` answers each request from its method and path ("GET
// /conversations/12/messages?before=5"); undefined means "not expected",
// and the request fails loudly — an unexpected request is a bug worth
// seeing, not something to answer with a default.

export type Api = (request: { method: string; path: string; body: unknown }) => Response | undefined

export const fetchMock = vi.fn<typeof fetch>()

export function fakeApi(api: Api) {
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const method = init?.method ?? 'GET'
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const response = api({ method, path: url.pathname + url.search, body })
    return response
      ? Promise.resolve(response)
      : Promise.reject(new Error(`unexpected request: ${method} ${url.pathname}${url.search}`))
  })
}

// The requests made so far, as "METHOD /path".
export function requests(): string[] {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(urlOf(input))
    return `${init?.method ?? 'GET'} ${url.pathname}${url.search}`
  })
}

function messagesBranch(prefix: string): RouteObject {
  return {
    path: `/${prefix}/messages`,
    element: <MessagesLayout />,
    children: [
      { index: true, element: <MessagesIndexPage /> },
      { path: ':conversationId', element: <ConversationPage /> },
    ],
  }
}

// Renders `path`. The socket CONNECTS right away by default (as it would a
// moment after the page opens); `connected: false` keeps it down.
// `extraRoutes`: other pages the test needs (a profile with a Message
// button). The router is returned so a test can read where it ended up
// (`router.state.location.pathname`).
export function renderMessages(
  path: string,
  {
    user = ALEX_USER,
    extraRoutes = [],
    connected = true,
  }: { user?: { id: number; activeRole: string }; extraRoutes?: RouteObject[]; connected?: boolean } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)
  const socket = new FakeSocket()
  const router = createMemoryRouter(
    [messagesBranch('practitioner'), messagesBranch('patient'), ...extraRoutes],
    { initialEntries: [path] },
  )
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MessagingConnectionProvider userId={user.id} createSocket={() => socket}>
        <RouterProvider router={router} />
      </MessagingConnectionProvider>
    </QueryClientProvider>,
  )
  if (connected) socket.setConnected(true)
  return { ...view, queryClient, socket, router }
}