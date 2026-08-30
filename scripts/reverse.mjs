/**
 * ¿ES REVERSIBLE EL VIAJE?
 *
 *   node scripts/reverse.mjs [url] [ancho] [alto]
 *
 * Baja de 0 a 1 parando en veintiun puntos —las uniones entre actos, mas un
 * control dentro de cada tramo— y guarda cada cuadro. Despues sube de 1 a 0
 * parando en los MISMOS puntos y compara.
 *
 * Si la escena es una funcion pura del scroll, la diferencia tiene que ser
 * cero. Esto es lo que delata y ninguna otra prueba ve: capas que solo saben
 * aparecer, estados que se acumulan y —el caso que lo estreno— materiales
 * cuyo `transparent` se escribe sin `needsUpdate`, que salen opacos en la
 * primera pasada y translucidos en todas las demas.
 *
 * Se ejecuta contra el BUILD. Informa tambien de la luminancia de ida, para
 * ver de paso si hay algun salto entre actos.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { unwarp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:4173'
const W = Number(process.argv[3] ?? 1920)
const H = Number(process.argv[4] ?? 1080)

/* Las uniones entre actos, mas puntos de control dentro de cada tramo. */
const STOPS = [
  0.0, 0.05, 0.09, 0.12, 0.16, 0.22, 0.28, 0.34, 0.4, 0.44, 0.47, 0.52, 0.6, 0.68, 0.74, 0.78,
  0.8, 0.84, 0.88, 0.94, 1.0,
]

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
})
const page = await (
  await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
).newPage()

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(9000)

const seek = async (p) => {
  await page.evaluate((prog) => {
    const track = document.querySelector('main').previousElementSibling
    const top = track.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: top + prog * (track.offsetHeight - window.innerHeight),
      behavior: 'instant',
    })
  }, unwarp(p))
  await page.waitForTimeout(1400)
}

const read = async () => {
  const buf = await page.screenshot()
  const { data } = await sharp(buf).greyscale().resize(480).raw().toBuffer({ resolveWithObject: true })
  let sum = 0
  for (let i = 0; i < data.length; i += 1) sum += data[i]
  return { data, mean: sum / data.length }
}

const compare = (a, b) => {
  let total = 0
  let worst = 0
  for (let i = 0; i < a.data.length; i += 1) {
    const d = Math.abs(a.data[i] - b.data[i])
    total += d
    if (d > worst) worst = d
  }
  return { mean: total / a.data.length, worst }
}

/* ── BAJANDO ────────────────────────────────────────────────────────────── */
const down = new Map()
let previous = null
console.log(`\nBAJANDO   ${W}x${H}`)
console.log('       p      luz    salto')
for (const p of STOPS) {
  await seek(p)
  const shot = await read()
  down.set(p, shot)
  const jump = previous === null ? '' : Math.abs(shot.mean - previous).toFixed(1).padStart(7)
  previous = shot.mean
  console.log(`   ${p.toFixed(2).padStart(5)}   ${shot.mean.toFixed(1).padStart(6)}${jump}`)
}

/* ── SUBIENDO ───────────────────────────────────────────────────────────── */
console.log('\nSUBIENDO — diferencia contra el mismo punto de la bajada')
console.log('       p     dif. media   peor pixel')
let worstMean = 0
let worstAt = 0
for (const p of [...STOPS].reverse()) {
  await seek(p)
  const shot = await read()
  const { mean, worst } = compare(down.get(p), shot)
  if (mean > worstMean) {
    worstMean = mean
    worstAt = p
  }
  const flag = mean > 1.5 ? '   <<< NO REVERSIBLE' : ''
  console.log(
    `   ${p.toFixed(2).padStart(5)}   ${mean.toFixed(3).padStart(10)}   ${String(worst).padStart(10)}${flag}`,
  )
}

console.log(`\n  peor diferencia al volver: ${worstMean.toFixed(3)} en p=${worstAt.toFixed(2)}`)
console.log('  errores:', errors.slice(0, 4).join(' | ') || 'ninguno')
await browser.close()
