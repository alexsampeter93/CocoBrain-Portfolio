/**
 * Capturas en progresos CONCRETOS, para revisar un tramo del recorrido.
 *
 *   node scripts/frames.mjs [url] [p1,p2,...]
 *
 * `shoot.mjs` saca una captura por tramo de la tabla, que es lo que hace falta
 * para juzgar la web entera. Esto es lo contrario: una rejilla fina del mismo
 * trozo, para ver si una transición se rompe por el medio.
 *
 * Con la tarjeta gráfica de verdad —las mismas banderas que `perf.mjs`—, y
 * esperando a que la geometría esté cargada en vez de a un número fijo de
 * segundos.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { unwarp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:5173'
const STOPS = (process.argv[3] ?? '0.16,0.24,0.32,0.40,0.48,0.56,0.64,0.72')
  .split(',')
  .map(Number)
const TAG = process.argv[4] ?? 'dev'
const OUT = '.shots/frames'

const SCROLL = (trackFraction) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  window.scrollTo({
    top: top + trackFraction * (track.offsetHeight - window.innerHeight),
    behavior: 'instant',
  })
}

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  args: [
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
  ],
})

for (const view of [
  { name: '1920', width: 1920, height: 1080 },
  { name: '390', width: 390, height: 844, isMobile: true },
]) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 1,
    isMobile: !!view.isMobile,
    hasTouch: !!view.isMobile,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (event) => errors.push(String(event)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__cocobrain || document.querySelector('canvas'), null, {
    timeout: 90000,
  })
  await page.waitForTimeout(4000)

  console.log('\n' + view.name + '   ' + URL)

  for (const stop of STOPS) {
    await page.evaluate(SCROLL, unwarp(stop))
    await page.waitForTimeout(900)
    const file = `${OUT}/${TAG}-${view.name}-${stop.toFixed(2).replace('.', '')}.png`
    const shot = await page.screenshot({ path: file })

    // Luminancia media y cuánto color queda: un cuadro plano se delata aquí
    // antes que a ojo.
    const { data, info } = await sharp(shot)
      .removeAlpha()
      .resize(240, null, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    let sum = 0
    let sat = 0
    const values = []
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      sum += lum
      values.push(lum)
      sat += max === 0 ? 0 : (max - min) / max
    }
    const n = values.length
    const mean = sum / n
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n

    console.log(
      '   p=' + stop.toFixed(2) +
        '   luz ' + mean.toFixed(1).padStart(6) +
        '   contraste ' + Math.sqrt(variance).toFixed(1).padStart(5) +
        '   saturación ' + ((100 * sat) / n).toFixed(1).padStart(5) + '%',
    )
  }

  if (errors.length) console.log('   ERRORES: ' + errors.slice(0, 4).join(' | '))
  await context.close()
}

await browser.close()
