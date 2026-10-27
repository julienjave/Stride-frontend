// Hands a file the app already holds (a Blob, from apiDownload) to the
// browser as a DOWNLOAD — the same as clicking a link to a file, without a
// file on any server to link to.
//
// Why not just navigate to the API's URL (`window.location = …/records-export`)?
// It would work for a plain GET, but:
//   - a refusal (a 429, a 403) would replace the app with the API's raw JSON;
//   - the emailed link's download is a POST with a body (the token and the
//     date of birth must never sit in a URL) — a navigation can't do that
//     without a hidden form, and then the page can't read the answer either.
// Fetching first lets the page show a refusal in its own words, and only a
// success becomes a file.
//
// How, in three steps:
//   1. URL.createObjectURL(blob): a temporary address ("blob:http://…/uuid")
//      that points at the bytes in this tab's memory — nothing is uploaded;
//   2. a link to it with the `download` attribute, clicked from code: the
//      attribute tells the browser to SAVE what the link points at, under
//      that name, rather than open it;
//   3. the address released (URL.revokeObjectURL) — until then the browser
//      keeps the bytes alive for it. Not at once: some browsers start
//      reading the blob only after the click returns, and a release before
//      that leaves an empty or failed download. 40 seconds is the long-used
//      FileSaver.js library's choice; a health record shouldn't stay in
//      memory longer than the save needs.
//
// The link is added to the page for the click and removed right after —
// the form every browser follows (some older ones ignored a click on a link
// that wasn't in the page). It is never visible: added and removed in the
// same task, before the browser paints.
export const RELEASE_AFTER_MS = 40_000

export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS)
}