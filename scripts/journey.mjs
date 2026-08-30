/**
 * EL VIAJE ENTERO, DE UNA VEZ, CONTANDO LOS FRAMES LARGOS.
 *
 *   node scripts/journey.mjs [url] [segundos]
 *
 * `perf.mjs` mide escenarios cortos y sueltos, que es lo que hace falta para
 * comparar variantes. Esto mide lo que vive el visitante: bajar del principio
 * al final sin parar. El número que importa es cuántos frames pasan de 33 ms
 * —donde ya hay salto visible— y en qué punto del recorrido caen.
 *
 * Con la tarjeta gráfica de verdad y contra el BUILD.
 */
import { chromium } from 'playwright'
import { warp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:4173'
const SECONDS = Number(process.argv[3] ?? 36)

const VIEWPORTS = [
  { name: '1920x1080 @1.5', width: 1920, height: 1080, dsf: 1.5 },
  { name: '1440x900', width: 1440, height: 900, dsf: 1 },
  { name: '1366x768', width: 1366, height: 768, dsf: 1 },
  { name: '390x844', width: 390, height: 844, dsf: 2.5, isMobile: true },
]

const RUN = (ms) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  const span = track.offsetHeight - window.innerHeight

  return new Promise((resolve) => {
    const slow = []
    let previous = performance.now()
    const start = previous

    const tick = (now) => {
      const delta = now - previous
      previous = now
      const elapsed = now - start
      const t = Math.min(1, elapsed / ms)
      if (elapsed > 400 && delta > 33) slow.push({ track: +t.toFixed(4), ms: Math.round(delta) })
      window.scrollTo({ top: top + t * span, behavior: 'instant' })
      if (elapsed < ms) requestAnimationFrame(tick)
      else resolve(slow)
    }
    requestAnimationFrame(tick)
  })
}

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy'],
})

console.log('\nEL VIAJE ENTERO EN ' + SECONDS + ' s   ' + URL + '\n')

for (const view of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.dsf,
    isMobile: !!view.isMobile,
    hasTouch: !!view.isMobile,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(URL, { waitUntil: 'load' })
  await page
    .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 60000 })
    .catch(() => {})
  await page.waitForTimeout(4000)

  const slow = await page.evaluate(RUN, SECONDS * 1000)
  console.log(
    view.name.padEnd(16) +
      (slow.length
        ? slow.length + ' frames > 33 ms   ' + slow.map((s) => 'p=' + warp(s.track).toFixed(3) + ' ' + s.ms + 'ms').join('  ·  ')
        : 'NINGUNO'),
  )
  if (errors.length) console.log('   ERRORES: ' + errors.slice(0, 3).join(' | '))
  await context.close()
}

await browser.close()
