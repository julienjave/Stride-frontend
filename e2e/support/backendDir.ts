import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// The backend folder, which playwright.config.ts starts the backend from
// (decisions §34). Where it is depends on how YOUR folders are laid out, so it
// is looked up, in this order:
//   1. the STRIDE_BACKEND_DIR environment variable, if set;
//   2. `backendDir` in e2e/local.json — a file of your own, in .gitignore:
//        { "backendDir": "C:/Users/you/code/stride-api" }
//   3. ../backend — the two repositories side by side, named frontend and
//      backend.
// A relative path is read from the FRONTEND folder (where the config is).
//
// Why it is CHECKED here, before Playwright starts anything: given a folder
// that doesn't exist, Node can't start the command in it and reports the
// SHELL as missing — "spawn C:\Windows\system32\cmd.exe ENOENT" (the person's
// first run, 2026-10-31) — which points everywhere but at the real problem.
// This says what is wrong, and how to fix it.
const REQUIRED_SCRIPTS = ['db:prepare:e2e', 'start:e2e']

export function backendDir(frontendDir: string): string {
  const configured = process.env.STRIDE_BACKEND_DIR ?? localSetting(frontendDir) ?? '../backend'
  const dir = path.resolve(frontendDir, configured)
  const packageFile = path.join(dir, 'package.json')
  if (!existsSync(packageFile)) {
    throw new Error(
      `The browser suite can't find the backend folder: ${dir} has no package.json.\n` +
        'Say where it is in e2e/local.json — { "backendDir": "<path to the backend folder>" } — ' +
        'or in the STRIDE_BACKEND_DIR environment variable.',
    )
  }
  const scripts = (JSON.parse(readFileSync(packageFile, 'utf8')) as { scripts?: Record<string, string> })
    .scripts ?? {}
  const missing = REQUIRED_SCRIPTS.filter((name) => !(name in scripts))
  if (missing.length > 0) {
    throw new Error(
      `The backend folder ${dir} has no ${missing.join(' / ')} script in its package.json — ` +
        'add the scripts given with the browser suite (decisions §34).',
    )
  }
  return dir
}

function localSetting(frontendDir: string): string | undefined {
  const file = path.join(frontendDir, 'e2e', 'local.json')
  if (!existsSync(file)) return undefined
  const setting = (JSON.parse(readFileSync(file, 'utf8')) as { backendDir?: unknown }).backendDir
  if (typeof setting !== 'string') {
    throw new Error(`${file} must hold { "backendDir": "<path to the backend folder>" }.`)
  }
  return setting
}
