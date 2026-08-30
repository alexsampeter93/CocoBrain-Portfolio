/**
 * De dónde se va el tiempo, por hilo y por tipo de trabajo.
 *
 *   node scripts/trace.mjs "?veil=0" "?cssblur=0" ...
 *
 * `perf.mjs` dice CUÁNTO tarda un frame. Esto dice EN QUÉ. Enciende el trazado
 * del navegador durante el descenso —que es el tramo del que se queja la
 * experiencia— y suma la duración de los sucesos por categoría:
 *
 *     guion        JavaScript: el reloj, los bucles, React
 *     estilo       recálculo de estilo y maquetación
 *     pintado      convertir el DOM en órdenes de dibujo
 *     rasterizar   convertir esas órdenes en píxeles — aquí cae el blur de CSS
 *     gpu          el trabajo de la tarjeta
 *
 * Se mide con la GPU de verdad (ver la nota de banderas en `perf.mjs`) y a la
 * escala de Windows que trae un portátil de fábrica, que es 1,5 y no 1.
 *
 * Cada argumento es una variante que comparar. Sin argumentos, mide la actual.
 */
import { chromium } from 'playwright'
import { unwarp } from './journeyMap.mjs'

const URL = 'http://localhost:5173'
const VARIANTS = process.argv.slice(2).length ? process.argv.slice(2) : ['']

/** Qué tramo se mide: TRAMO="0.04,0.3" (por defecto, el descenso). */
const [FROM, TO] = (process.env.TRAMO ?? '0.04,0.3').split(',').map(Number)

const VIEWPORT = { width: 1920, height: 1080 }
const SCALE = 1.5

/** Un descenso completo, movido desde el mismo rAF que lo vive el usuario. */
const DESCEND = ({ ms, from, to }) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  const span = track.offsetHeight - window.innerHeight
  return new Promise((resolve) => {
    const start = performance.now()
    let frames = 0
    const tick = (now) => {
      frames += 1
      const t = Math.min(1, (now - start) / ms)
      window.scrollTo({ top: top + (from + (to - from) * t) * span, behavior: 'instant' })
      if (t < 1) requestAnimationFrame(tick)
      else resolve(frames)
    }
    requestAnimationFrame(tick)
  })
}

/** A qué categoría pertenece cada suceso del trazado. */
const BUCKETS = {
  guion: ['FunctionCall', 'EvaluateScript', 'V8.Execute', 'TimerFire'],
  estilo: ['UpdateLayoutTree', 'Layout', 'ScheduleStyleRecalculation', 'UpdateLayerTree'],
  pintado: ['Paint', 'PaintImage', 'CompositeLayers', 'Commit'],
  rasterizar: ['RasterTask', 'Rasterize', 'ImageDecodeTask', 'Decode Image'],
  gpu: ['GPUTask'],
}

function classify(name) {
  for (const [bucket, names] of Object.entries(BUCKETS)) {
    if (names.includes(name)) return bucket
  }
  return null
}

async function trace(browser, query) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
  })
  const page = await context.newPage()
  await page.goto(URL + query, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__cocobrain, null, { timeout: 90000 })
  await page.waitForFunction(() => window.__cocobrain.gl.info.memory.geometries > 8, null, {
    timeout: 90000,
  })
  await page.waitForTimeout(2500)

  // Un primer descenso sin medir: compila los sombreadores y sube las texturas,
  // que es un coste de UNA vez y no tiene nada que ver con el scroll.
  await page.evaluate(DESCEND, { ms: 2000, from: unwarp(0.04), to: unwarp(0.3) })
  await page.evaluate(DESCEND, { ms: 800, from: unwarp(0.3), to: unwarp(FROM) })
  await page.waitForTimeout(1200)

  const cdp = await context.newCDPSession(page)
  const chunks = []
  cdp.on('Tracing.dataCollected', ({ value }) => chunks.push(...value))
  const done = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve))

  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: {
      includedCategories: [
        'disabled-by-default-devtools.timeline',
        'disabled-by-default-devtools.timeline.frame',
        'gpu',
      ],
    },
  })

  const MS = 4000
  const frames = await page.evaluate(DESCEND, { ms: MS, from: unwarp(FROM), to: unwarp(TO) })

  await cdp.send('Tracing.end')
  await done
  await context.close()

  const totals = {}
  let sampled = 0
  for (const event of chunks) {
    if (event.ph !== 'X' || !event.dur) continue
    const bucket = classify(event.name)
    if (!bucket) continue
    totals[bucket] = (totals[bucket] ?? 0) + event.dur / 1000
    sampled += 1
  }

  return { totals, frames, seconds: MS / 1000, events: sampled }
}

const browser = await chromium.launch({
  args: [
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
  ],
})

console.log('\nDESCENSO 0,04 -> 0,30 · 1920x1080 @1.5 · ms de trabajo POR FRAME\n')
console.log(
  '  variante'.padEnd(24) +
    ['guion', 'estilo', 'pintado', 'rasterizar', 'gpu', 'TOTAL'].map((h) => h.padStart(11)).join(''),
)

for (const query of VARIANTS) {
  const { totals, frames } = await trace(browser, query)
  const order = ['guion', 'estilo', 'pintado', 'rasterizar', 'gpu']
  const per = order.map((k) => (totals[k] ?? 0) / frames)
  const total = per.reduce((a, b) => a + b, 0)
  console.log(
    ('  ' + (query || 'actual')).padEnd(24) +
      per.map((v) => v.toFixed(2).padStart(11)).join('') +
      total.toFixed(2).padStart(11) +
      '   (' + frames + ' frames)',
  )
}

await browser.close()
