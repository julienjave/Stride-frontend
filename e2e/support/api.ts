import { expect, request, type APIRequestContext } from '@playwright/test'
import { API_URL } from './addresses.ts'
import { stateFile, type AccountName } from './accounts.ts'

// The API, called AS an account — for what a test PREPARES or reads, never
// for what it checks: the check is what the person sees in the browser.
// ("API-seeded test data, not UI-driven": a test that needs a session due
// today asks the API for it in one request, instead of clicking through the
// schedule form — which has its own test.)
//
// Each context carries the account's session cookie, saved by auth.setup.ts.
// (No Origin header is needed: CORS is enforced by BROWSERS, which refuse to
// hand a page an answer its origin isn't allowed to read. A request from Node
// is answered either way — the cookie is what the backend checks.)
export async function apiAs(account: AccountName): Promise<ApiClient> {
  const context = await request.newContext({
    baseURL: API_URL,
    storageState: stateFile(account),
  })
  return new ApiClient(context)
}

export class ApiClient {
  // A plain field set in the constructor, not `constructor(private readonly
  // context…)`: that shorthand ("parameter properties") is TypeScript-only
  // syntax that GENERATES JavaScript, which `erasableSyntaxOnly` forbids —
  // the project allows only type annotations that can simply be erased.
  private readonly context: APIRequestContext

  constructor(context: APIRequestContext) {
    this.context = context
  }

  // A GET whose answer must be a success; its JSON body, typed by the caller.
  async get<T>(path: string): Promise<T> {
    const response = await this.context.get(path)
    // `expect(…, message)`: if it fails, the report says which request and
    // what the server answered — not only "expected true".
    expect(response.ok(), `GET ${path} → ${response.status()} ${await response.text()}`).toBe(true)
    return (await response.json()) as T
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.context.post(path, { data: body })
    expect(response.ok(), `POST ${path} → ${response.status()} ${await response.text()}`).toBe(true)
    return (await response.json()) as T
  }

  async dispose(): Promise<void> {
    await this.context.dispose()
  }
}
