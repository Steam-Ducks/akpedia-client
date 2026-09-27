/**
 * Document viewer that runs inside a sandboxed iframe (`sandbox="allow-scripts"` only).
 *
 * The sandbox is what keeps the pages in: without `allow-downloads`, `allow-modals`,
 * `allow-popups` or `allow-same-origin` the frame cannot start a download, open the print
 * dialog, open the page in another tab, or reach back into the app. The frame never fetches
 * anything either -- the parent hands it each page as an image and it paints that onto a canvas,
 * so there is no `<img>` to save.
 */

/** Messages the parent sends into the frame. */
export type ToFrame =
  | { type: 'init'; pageCount: number }
  | { type: 'page'; page: number; image: Blob }
  | { type: 'page-error'; page: number; message: string }
  | { type: 'zoom'; zoom: number }

/** Messages the frame sends back to the parent. */
export type FromFrame =
  | { type: 'ready' }
  | { type: 'need'; page: number }
  | { type: 'visible'; page: number }
  | { type: 'capture' }
  | { type: 'blur' }
  | { type: 'focus' }

const script = /* js */ `
const pagesEl = document.getElementById('pages')
const requested = new Set()

function send(message) {
  parent.postMessage(message, '*')
}

const loadObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const page = Number(entry.target.dataset.page)
    if (entry.isIntersecting && !requested.has(page)) {
      requested.add(page)
      send({ type: 'need', page })
    }
  }
}, { rootMargin: '1000px 0px' })

const visibleObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) send({ type: 'visible', page: Number(entry.target.dataset.page) })
  }
}, { threshold: 0.5 })

function build(pageCount) {
  loadObserver.disconnect()
  visibleObserver.disconnect()
  requested.clear()
  pagesEl.replaceChildren()
  scrollTo(0, 0)
  for (let page = 1; page <= pageCount; page++) {
    const sheet = document.createElement('div')
    sheet.className = 'sheet loading'
    sheet.dataset.page = String(page)
    sheet.append(document.createElement('canvas'))
    pagesEl.append(sheet)
    loadObserver.observe(sheet)
    visibleObserver.observe(sheet)
  }
}

async function paint(page, image) {
  const sheet = pagesEl.querySelector('[data-page="' + page + '"]')
  if (!sheet) return
  const bitmap = await createImageBitmap(image)
  const canvas = sheet.querySelector('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  // Not closed right after drawing: a GPU canvas may paint later, and would find it gone.
  ctx.drawImage(bitmap, 0, 0)
  sheet.classList.remove('loading')
  sheet.style.aspectRatio = canvas.width + ' / ' + canvas.height
}

function fail(page, message) {
  const sheet = pagesEl.querySelector('[data-page="' + page + '"]')
  if (!sheet) return
  sheet.classList.remove('loading')
  sheet.classList.add('failed')
  sheet.dataset.error = message
}

window.addEventListener('message', (event) => {
  if (event.source !== parent) return
  const message = event.data
  if (message.type === 'init') {
    build(message.pageCount)
  } else if (message.type === 'page') {
    paint(message.page, message.image)
  } else if (message.type === 'page-error') {
    fail(message.page, message.message)
  } else if (message.type === 'zoom') {
    document.documentElement.style.setProperty('--zoom', String(message.zoom))
  }
})

const blocked = ['s', 'p', 'c', 'a', 'x', 'u']
function onKey(event) {
  if (event.key === 'PrintScreen') {
    event.preventDefault()
    send({ type: 'capture' })
    return
  }
  if ((event.ctrlKey || event.metaKey) && blocked.includes(event.key.toLowerCase())) {
    event.preventDefault()
  }
  // macOS: Cmd+Shift+3/4/5 are system captures; the page only sees them sometimes.
  if (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key)) {
    send({ type: 'capture' })
  }
}
window.addEventListener('keydown', onKey, true)
window.addEventListener('keyup', (event) => {
  if (event.key === 'PrintScreen') send({ type: 'capture' })
}, true)

for (const type of ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut']) {
  window.addEventListener(type, (event) => event.preventDefault(), true)
}
window.addEventListener('blur', () => send({ type: 'blur' }))
window.addEventListener('focus', () => send({ type: 'focus' }))

send({ type: 'ready' })
`

const style = /* css */ `
:root { --zoom: 1; color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #e3e5e5; }
body {
  font-family: system-ui, sans-serif;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
#pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 16px;
}
.sheet {
  position: relative;
  width: min(100%, calc(860px * var(--zoom)));
  aspect-ratio: 1 / 1.414;
  background: #fff;
  box-shadow: 0 2px 8px 3px rgba(33, 33, 35, 0.1);
}
.sheet canvas { display: block; width: 100%; height: 100%; pointer-events: none; }
.sheet.loading::after, .sheet.failed::after {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #68747a;
  font-size: 14px;
}
.sheet.loading::after { content: 'Carregando página ' attr(data-page) '…'; }
.sheet.failed::after { content: attr(data-error); padding: 24px; text-align: center; }
@media print { body { display: none !important; } }
`

/** The whole viewer as the iframe's `srcdoc`. Nothing about the document is interpolated here. */
export const viewerFrameHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<style>${style}</style>
</head>
<body>
<main id="pages"></main>
<script>${script}</script>
</body>
</html>`
