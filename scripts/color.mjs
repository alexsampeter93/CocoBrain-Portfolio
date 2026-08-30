/**
 * Auditoría de color por PÍXELES, no por código.
 *
 *   node scripts/color.mjs [url]
 *
 * Recorre el viaje y clasifica cada píxel por tono. Existe porque el criterio
 * de la paleta es visual: un `#25415F` escrito en un archivo puede llegar a
 * pantalla como morado después de pasar por una opacidad, una mezcla aditiva y
 * un mapeo de tonos. Lo único que vale es lo que sale del cuadro.
 *
 *     marfil   lo claro y cálido: la sala, la luz, el editorial
 *     coco     el marrón, de claro a casi negro
 *     rosa     el color de marca
 *     añil     el azul mediterráneo
 *     LILA     morado, violeta, magenta — tiene que ser cero
 *
 * Los píxeles casi negros o casi grises no cuentan como color: no lo son. Pero
 * se reportan aparte, porque "es casi negro y por eso no importa" es
 * exactamente la excusa que esta herramienta viene a quitar.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { unwarp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:5173'

const STOPS = [0.025, 0.09, 0.13, 0.16, 0.2, 0.24, 0.29, 0.36, 0.51, 0.68, 0.86, 1]

/** De RGB a tono, saturación y valor. */
function hsv(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: max === 0 ? 0 : d / max, v: max / 255 }
}

/**
 * A qué familia pertenece un píxel.
 *
 * ## Dónde está la frontera del lila, y por qué NO en 345°
 *
 * La primera versión cortaba el lila en 265°–345° y daba un 30% en 0,29. Al
 * mirar los píxeles concretos, ninguno era morado: casi todos estaban en
 * 340–345° con valores como `rgb(136,28,61)` o `rgb(106,23,49)`, que son
 * carmín y rosa oscuro. La propia paleta del proyecto vive ahí: la línea de la
 * red es `#B85C76`, que mide 343°.
 *
 * O sea que el instrumento estaba llamando morado al rosa de marca. Una
 * herramienta de diagnóstico que miente es peor que no tenerla.
 *
 * El violeta, el morado y el magenta van de 262° a 332°. De 333° en adelante ya
 * es familia del rojo.
 *
 * ## Y el suelo de saturación
 *
 * 0,18 y no 0,08. Un píxel de `rgb(41,38,42)` tiene tono 285° sobre el papel y
 * en pantalla es gris oscuro: tres puntos de diferencia entre canales no son un
 * color. Contarlo como morado es la otra forma de mentir.
 */
function family({ h, s, v }) {
  if (v < 0.12) return 'negro'
  if (s < 0.18) return 'gris'
  if (h >= 262 && h < 333) return 'LILA'
  if (h >= 333 || h < 12) return s > 0.18 ? 'rosa' : 'marfil'
  if (h >= 12 && h < 45) return v > 0.66 && s < 0.4 ? 'marfil' : 'coco'
  if (h >= 45 && h < 70) return 'marfil'
  if (h >= 185 && h < 265) return 'añil'
  return 'otro'
}

const SCROLL = (trackFraction) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  window.scrollTo({
    top: top + trackFraction * (track.offsetHeight - window.innerHeight),
    behavior: 'instant',
  })
}

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
})
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => !!window.__cocobrain, null, { timeout: 90000 })
await page
  .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 30000 })
  .catch(() => {})
await page.waitForTimeout(2000)

console.log('\n     p    marfil   coco   rosa   añil    LILA   (negro/gris)')

let worst = 0
for (const stop of STOPS) {
  await page.evaluate(SCROLL, unwarp(stop))
  await page.waitForTimeout(1300)
  const shot = await page.screenshot()
  const { data, info } = await sharp(shot)
    .removeAlpha()
    .resize(480, 270, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const count = {}
  const total = info.width * info.height
  for (let i = 0; i < data.length; i += 3) {
    const key = family(hsv(data[i], data[i + 1], data[i + 2]))
    count[key] = (count[key] ?? 0) + 1
  }
  const pct = (key) => ((100 * (count[key] ?? 0)) / total).toFixed(1).padStart(6)
  const lila = (100 * (count.LILA ?? 0)) / total
  worst = Math.max(worst, lila)

  console.log(
    '  ' + stop.toFixed(3) +
      pct('marfil') + pct('coco') + pct('rosa') + pct('añil') +
      pct('LILA') + (lila > 0.5 ? ' ⚠' : '  ') +
      '   ' + pct('negro') + '/' + pct('gris'),
  )
}

console.log('\n  LILA máximo en todo el recorrido: ' + worst.toFixed(2) + '%')

await context.close()
await browser.close()
