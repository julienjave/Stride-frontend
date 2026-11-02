// npm run check:cache-names — does a deploy keep the browser's cache?
// (decisions §45). Run it after upgrading Vite, or after changing
// vite.config.ts's build options.
//
// What it does: builds the app TWICE into two temporary folders. The second
// build changes ONE page (AdminHomePage gets a harmless line, through a tiny
// plugin — the file on disk is never touched), exactly what a small deploy
// does. Then it compares the two sets of file names. Every built file is
// named after a hash of its content, so a name that changed is a file every
// returning visitor downloads again.
//
// What it checks (exit code 1, with the reason, if any fails):
//   1. Only the changed page's file got a new name. Without the import map
//      (`build.chunkImportMap`), files import each other by their hashed
//      names, so one changed page renamed 129 of 224 files — the "hash
//      cascade".
//   2. The framework file (React, React DOM, React Router) exists and kept
//      its name.
//   3. index.html carries the import map (`<script type="importmap">`).
//   4. socket.io-client is NOT in the first download (it is fetched on
//      demand, src/messages/messagingSocket.ts) — and does exist as a file.
// It also prints the first download's size (raw and gzipped), the numbers
// the roadmap records.
//
// Why a script and not a Vitest test: it runs two full production builds
// (~15 s) — too slow for the unit suite, and it tests the BUILD, not code.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'

const CHANGED_PAGE = /[\\/]src[\\/]app[\\/]AdminHomePage\.tsx$/
const CHANGED_PAGE_FILE = /^AdminHomePage-/

// A plugin is an object of hooks Vite calls while building; `transform`
// receives each module's code (already turned into JavaScript — `enforce:
// 'post'`) and may return new code. A write to a global is a side effect, so
// the minifier can't remove it: the page's content really changes.
const changeOnePage = {
  name: 'stride-deploy-check',
  enforce: 'post',
  transform(code, id) {
    return CHANGED_PAGE.test(id) ? `${code}\nglobalThis.__strideDeployCheck = 1\n` : null
  },
}

async function buildInto(plugins) {
  const outDir = mkdtempSync(path.join(tmpdir(), 'stride-cache-names-'))
  // The inline settings are MERGED with vite.config.ts (found as usual).
  await build({ logLevel: 'warn', plugins, build: { outDir, emptyOutDir: true } })
  return outDir
}

const assetNames = (dir) => new Set(readdirSync(path.join(dir, 'assets')))

// The first download = the files index.html names: the entry script, its
// modulepreloads, the stylesheet (the import map's own JSON only names keys
// and files, it isn't a request).
function firstDownload(dir) {
  const html = readFileSync(path.join(dir, 'index.html'), 'utf8')
  const tags = html.match(/<(?:script|link)\b[^>]*>/g) ?? []
  return tags
    .map((tag) => /(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/.exec(tag)?.[1])
    .filter((file) => file !== undefined)
}

const before = await buildInto([])
const after = await buildInto([changeOnePage])
const problems = []

try {
  const a = assetNames(before)
  const b = assetNames(after)
  const renamed = [...a].filter((name) => !b.has(name)).filter((name) => name.endsWith('.js'))
  const unexpected = renamed.filter((name) => !CHANGED_PAGE_FILE.test(name))
  console.log(`One page changed: ${renamed.length} of ${a.size} files renamed (${renamed.join(', ') || 'none'}).`)
  if (renamed.length === 0) problems.push('The changed page kept its name — the check itself did not change anything.')
  if (unexpected.length > 0) problems.push(`Renamed although unchanged: ${unexpected.join(', ')} (the hash cascade).`)

  const framework = [...a].filter((name) => /^framework-.*\.js$/.test(name))
  if (framework.length !== 1) problems.push(`Expected one framework file, found ${framework.length}.`)
  else if (!b.has(framework[0])) problems.push(`The framework file was renamed (${framework[0]}).`)

  const html = readFileSync(path.join(before, 'index.html'), 'utf8')
  if (!html.includes('<script type="importmap">')) problems.push('index.html has no import map.')

  // "/socket.io" is the library's default address on the server — a string
  // only socket.io-client's own code contains.
  const containsSocketIo = (file) => readFileSync(path.join(before, file), 'utf8').includes('/socket.io')
  const first = firstDownload(before)
  const socketInFirst = first.filter((file) => file.endsWith('.js') && containsSocketIo(file))
  const socketFile = [...a].filter((name) => name.endsWith('.js') && containsSocketIo(`assets/${name}`))
  if (socketInFirst.length > 0) problems.push(`socket.io-client is in the first download: ${socketInFirst.join(', ')}.`)
  if (socketFile.length === 0) problems.push('No file holds socket.io-client at all.')

  let raw = 0
  let gzipped = 0
  for (const file of first) {
    const bytes = readFileSync(path.join(before, file))
    raw += bytes.length
    gzipped += gzipSync(bytes, { level: 9 }).length
  }
  const kB = (bytes) => `${(bytes / 1000).toFixed(2)} kB`
  console.log(`First download: ${first.length} files, ${kB(raw)} (${kB(gzipped)} gzipped).`)
} finally {
  rmSync(before, { recursive: true, force: true })
  rmSync(after, { recursive: true, force: true })
}

if (problems.length > 0) {
  console.error(`\nThe cache check FAILED:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('The cache check passed.')
