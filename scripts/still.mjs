/**
 * ¿La escena es una FUNCIÓN del scroll?
 *
 *   node scripts/still.mjs [url]
 *
 * Tres preguntas, y las tres se contestan comparando píxeles:
 *
 * 1. QUIETO — parado en un punto durante diez segundos, ¿cambia algo?
 *    Un destello es un salto de luminancia media; un movimiento es un cambio
 *    local con la media plana. Se miden las dos cosas por separado.
 *
 * 2. REPETIBLE — ir a un punto, marcharse lejos, volver: ¿sale el mismo cuadro?
 *    Esto es lo que ninguna otra prueba veía. Con animaciones atadas al reloj
 *    del sistema la respuesta es que no, aunque parado se vea estable.
 *
 * 3. RECORRIENDO — bajando despacio y bajando rápido, ¿aparece algún salto de
 *    luz que no corresponda al avance?
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { unwarp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:5173'

/** Los puntos que se examinan. Cubren portada, descenso, cruce e interior. */
/**
 * Los seis momentos del guion: portada, aproximación, umbral, membrana, la
 * cavidad y el recorrido por las áreas. Son los que Alex pidió comprobar uno a
 * uno. Se mueven cuando se mueve la tabla: 0,45 y 0,8 eran la red interior y
 * los nodos exteriores, y ya no hay nodos exteriores.
 */
const STOPS = [0.02, 0.12, 0.22, 0.33, 0.47, 0.72]

const SCROLL = (trackFraction) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  window.scrollTo({
    top: top + trackFraction * (track.offsetHeight - window.innerHeight),
    behavior: 'instant',
  })
}

/** Luminancia media y diferencia píxel a píxel contra una toma anterior. */
async function frame(page) {
  const shot = await page.screenshot()
  const { data } = await sharp(shot)
    .removeAlpha()
    .greyscale()
    .resize(480, 270, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let sum = 0
  for (let i = 0; i < data.length; i += 1) sum += data[i]
  return { data, mean: sum / data.length }
}

function compare(a, b) {
  let diff = 0
  let moved = 0
  for (let i = 0; i < a.data.length; i += 1) {
    const d = Math.abs(a.data[i] - b.data[i])
    diff += d
    if (d > 6) moved += 1
  }
  return {
    luz: Math.abs(a.mean - b.mean),
    medio: diff / a.data.length,
    movidos: (100 * moved) / a.data.length,
  }
}

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'load' })
await page
  .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 60000 })
  .catch(() => {})
await page.waitForTimeout(2500)

console.log('\n1 · DIEZ SEGUNDOS PARADO EN CADA PUNTO')
console.log('       p     salto de luz   dif. media   % píxeles movidos')

let worstLight = 0
for (const stop of STOPS) {
  await page.evaluate(SCROLL, unwarp(stop))
  await page.waitForTimeout(1500)
  const first = await frame(page)
  await page.waitForTimeout(10000)
  const later = await frame(page)
  const r = compare(first, later)
  worstLight = Math.max(worstLight, r.luz)
  console.log(
    '   ' + stop.toFixed(3) +
      r.luz.toFixed(3).padStart(15) +
      r.medio.toFixed(3).padStart(13) +
      r.movidos.toFixed(2).padStart(20),
  )
}

console.log('\n2 · IR, MARCHARSE Y VOLVER AL MISMO PUNTO')
console.log('       p     salto de luz   dif. media   % píxeles movidos')

let worstReturn = 0
for (const stop of STOPS) {
  await page.evaluate(SCROLL, unwarp(stop))
  await page.waitForTimeout(1600)
  const first = await frame(page)

  // Marcharse lejos y volver, dando tiempo a que un reloj de sistema avance.
  await page.evaluate(SCROLL, unwarp(stop > 0.5 ? 0.02 : 0.95))
  await page.waitForTimeout(2500)
  await page.evaluate(SCROLL, unwarp(stop))
  await page.waitForTimeout(1600)
  const again = await frame(page)

  const r = compare(first, again)
  worstReturn = Math.max(worstReturn, r.medio)
  console.log(
    '   ' + stop.toFixed(3) +
      r.luz.toFixed(3).padStart(15) +
      r.medio.toFixed(3).padStart(13) +
      r.movidos.toFixed(2).padStart(20),
  )
}

console.log('\n3 · BAJANDO: ¿algún salto de luz que no corresponda al avance?')

/**
 * Se recorre el descenso en pasos regulares y se mira la SEGUNDA diferencia de
 * la luminancia: si el brillo sube y baja de forma continua, es la escena
 * oscureciéndose; si da un pico aislado, es un destello.
 */
for (const [nombre, pasos, espera] of [
  ['lento', 40, 300],
  ['rápido', 14, 140],
]) {
  const means = []
  for (let i = 0; i <= pasos; i += 1) {
    await page.evaluate(SCROLL, unwarp(0.02 + (0.32 * i) / pasos))
    await page.waitForTimeout(espera)
    means.push((await frame(page)).mean)
  }
  let peak = 0
  let where = 0
  for (let i = 1; i < means.length - 1; i += 1) {
    const curve = Math.abs(means[i + 1] - 2 * means[i] + means[i - 1])
    if (curve > peak) {
      peak = curve
      where = 0.02 + (0.32 * i) / pasos
    }
  }
  console.log(
    '   scroll ' + nombre.padEnd(7) +
      ' pico de curvatura ' + peak.toFixed(2).padStart(6) +
      ' en p=' + where.toFixed(3) +
      '   (recorrido total de luz ' +
      (Math.max(...means) - Math.min(...means)).toFixed(1) + ')',
  )
}

console.log(
  '\n   parado: peor salto de luz ' + worstLight.toFixed(3) +
    '   ·   volviendo: peor diferencia media ' + worstReturn.toFixed(3),
)

await context.close()
await browser.close()
