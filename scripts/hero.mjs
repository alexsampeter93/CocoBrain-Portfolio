/**
 * Dos medidas de la portada que no se pueden hacer a ojo.
 *
 *   node scripts/hero.mjs [url]
 *
 * 1. DÓNDE ESTÁ OLAZ EN PANTALLA, en píxeles. Se proyecta su caja envolvente
 *    con la cámara real y se compara con el rectángulo del titular. Si se
 *    solapan, el texto está detrás del modelo, y eso no se arregla con
 *    `z-index`: se arregla moviendo uno de los dos.
 *
 * 2. SI LA IMAGEN SE ESTÁ QUIETA. Se capturan quince segundos de portada sin
 *    tocar nada y se compara cada captura con la anterior. Un destello es un
 *    salto de luminancia media; una deriva es un cambio pequeño y sostenido.
 *    Son cosas distintas y hay que poder distinguirlas.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'

const URL = process.argv[2] ?? 'http://localhost:5173'

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844, isMobile: true },
]

/** La caja de Olaz proyectada a píxeles, y la del titular. */
const BOXES = () => {
  const mascot = window.__cocobrain.project('mascot')
  if (!mascot) return { error: 'no se encuentra la malla de la mascota' }

  // El titular: cada línea por separado, que es lo que puede chocar.
  const lines = Array.from(document.querySelectorAll('[data-hero-line]')).map((node) => {
    const rect = node.getBoundingClientRect()
    return {
      name: node.dataset.heroLine,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
    }
  })

  return { mascot, lines, screen: mascot.screen }
}

/**
 * ── DÓNDE CAE LA SUPERFICIE DEL PODIO, EN PÍXELES ────────────────────────
 *
 * La lámina de la portada es 16:9 y se sirve con `object-cover`. En cualquier
 * ventana MÁS ESTRECHA que 16:9 se ve entera de alto y recortada de ancho, así
 * que la fracción vertical se conserva tal cual; en una más ancha manda el
 * ancho y hay que descontar lo que se recorta por arriba y por abajo.
 *
 * `GROUND` es el mismo número que `tokens.stage.ground`, medido recorriendo el
 * píxel del archivo. Está repetido aquí a propósito: el script tiene que poder
 * decir que el código se ha desviado de la medida, y para eso no puede leer su
 * valor del propio código.
 */
const STAGE_ASPECT = 2400 / 1350
const GROUND = 0.868

function podiumLine(width, height) {
  if (width / height <= STAGE_ASPECT) return Math.round(GROUND * height)
  const shown = width / STAGE_ASPECT
  return Math.round((height - shown) / 2 + GROUND * shown)
}

function overlap(a, b) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return x > 0 && y > 0 ? { x: Math.round(x), y: Math.round(y) } : null
}

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
})

console.log('\n── LA CAJA DE OLAZ CONTRA EL TITULAR ─────────────────────────\n')

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: !!viewport.isMobile,
    hasTouch: !!viewport.isMobile,
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__cocobrain, null, { timeout: 90000 })
  await page.waitForFunction(() => window.__cocobrain.gl.info.memory.geometries > 8, null, {
    timeout: 90000,
  })
  await page.waitForTimeout(5000)

  const result = await page.evaluate(BOXES)
  if (result.error) {
    console.log(viewport.name + '   ' + result.error)
  } else {
    const m = result.mascot
    const podium = podiumLine(viewport.width, viewport.height)
    const gap = m.sole - podium
    console.log(
      viewport.name.padEnd(11) +
        ' Olaz  x ' + m.left + '→' + m.right +
        '   y ' + m.top + '→' + m.bottom +
        '   (' + Math.round((100 * (m.bottom - m.top)) / result.screen.height) + '% del alto)',
    )
    // Los pies contra el podio. Un hueco positivo es que las suelas se meten
    // por debajo de la superficie; negativo, que flota. Menos de ~6 px no se
    // ve; más, sí, y es exactamente lo que hacía que pareciera pegado.
    console.log(
      '            ' + 'pedestal'.padEnd(9) +
        ' y ' + podium +
        '   suela ' + m.sole + ' (punta ' + m.bottom + ')' +
        '   ' + (Math.abs(gap) <= 8
          ? 'APOYADO'
          : gap < 0
            ? '⚠ FLOTA ' + -gap + ' px'
            : '⚠ HUNDIDO ' + gap + ' px'),
    )
    for (const line of result.lines) {
      const hit = overlap(m, line)
      console.log(
        '            ' + line.name.padEnd(9) +
          ' x ' + line.left + '→' + line.right +
          '   y ' + line.top + '→' + line.bottom +
          (hit ? '   ⚠ SOLAPA ' + hit.x + '×' + hit.y + ' px' : '   libre'),
      )
    }
  }
  await context.close()
}

console.log('\n── QUINCE SEGUNDOS DE PORTADA SIN TOCAR NADA ─────────────────\n')

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => !!window.__cocobrain, null, { timeout: 90000 })
await page.waitForFunction(() => window.__cocobrain.gl.info.memory.geometries > 8, null, {
  timeout: 90000,
})
await page.waitForTimeout(3000)

/**
 * DOS ZONAS, y separarlas es lo que distingue un destello de un movimiento.
 *
 * `luz` es fondo puro, sin personaje: si su luminancia media oscila, hay algo
 * cambiando de brillo. `sujeto` incluye a Olaz y su mano: ahí un cambio grande
 * puede ser simplemente que respira, que es movimiento y no destello.
 */
const ZONES = {
  luz: { x: 60, y: 120, width: 300, height: 300 },
  sujeto: { x: 480, y: 180, width: 560, height: 520 },
}

const series = { luz: [], sujeto: [] }
for (let i = 0; i < 30; i += 1) {
  for (const [name, clip] of Object.entries(ZONES)) {
    const shot = await page.screenshot({ clip })
    const { data } = await sharp(shot).removeAlpha().greyscale().raw().toBuffer({
      resolveWithObject: true,
    })
    let sum = 0
    for (let k = 0; k < data.length; k += 1) sum += data[k]
    series[name].push(sum / data.length)
  }
  await page.waitForTimeout(450)
}

for (const [name, raw] of Object.entries(series)) {
  // La PRIMERA muestra se descarta: se toma mientras los desvanecidos de la
  // carga todavía están llegando a su sitio, así que mide el arranque y no la
  // portada quieta. Contarla inflaba el recorrido cinco puntos.
  const values = raw.slice(1)
  const min = Math.min(...values)
  const max = Math.max(...values)
  console.log(
    '  ' + name.padEnd(8) +
      ' luminancia media ' + min.toFixed(2) + ' → ' + max.toFixed(2) +
      '   recorrido ' + (max - min).toFixed(2),
  )
  console.log('           ' + values.map((v) => v.toFixed(1)).join(' '))
}

await context.close()
await browser.close()
