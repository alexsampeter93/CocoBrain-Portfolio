/**
 * Medición de rendimiento REAL, con la tarjeta gráfica de verdad.
 *
 *   node scripts/perf.mjs [url] [query]
 *
 * Es el complemento de `shoot.mjs`, y existe porque aquel NO SIRVE para esto:
 * corre en un navegador sin ventana que dibuja por software, así que sus fps
 * son los de una CPU emulando una GPU. Este abre una ventana de verdad.
 *
 * Lo que mide, por escenario:
 *
 *     p50    el frame típico
 *     p95    el frame malo de cada veinte — lo que se percibe como tirón
 *     peor   el peor frame del tramo
 *
 * La media NO se reporta a propósito: es el número que esconde los tirones.
 *
 * Y lo que cuenta del propio renderizador —llamadas de dibujo, triángulos,
 * geometrías, texturas, programas— no depende de la máquina: eso vale siempre.
 */
import { chromium } from 'playwright'
import { unwarp } from './journeyMap.mjs'

const URL = process.argv[2] ?? 'http://localhost:5173'
const QUERY = process.argv[3] ?? ''

/**
 * `dsf` es la ESCALA DE WINDOWS, y hay que medirla.
 *
 * Un portátil de 1920 en Windows 11 viene de fábrica al 150%, así que su
 * `devicePixelRatio` es 1,5 y no 1. Medir solo a 1 mide una máquina que casi
 * nadie tiene: el búfer real es más de dos veces más grande.
 */
const VIEWPORTS = [
  { name: '1920x1080 @1', width: 1920, height: 1080, dsf: 1 },
  { name: '1920x1080 @1.5', width: 1920, height: 1080, dsf: 1.5 },
  { name: '1440x900 @1', width: 1440, height: 900, dsf: 1 },
  { name: '1366x768 @1', width: 1366, height: 768, dsf: 1 },
  { name: '390x844 @2.5', width: 390, height: 844, dsf: 2.5, isMobile: true },
]

/**
 * Muestrea los frames durante `ms`, opcionalmente moviendo el scroll entre
 * `from` y `to` del recorrido.
 *
 * El scroll se escribe DENTRO del mismo rAF que mide, que es como lo vive el
 * usuario. Disparado desde fuera, el navegador lo agrupa distinto y devuelve
 * un número más bonito que el real.
 */
const SAMPLE = async ({ ms, from, to }) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  const span = track.offsetHeight - window.innerHeight

  const gl = window.__cocobrain && window.__cocobrain.gl

  /**
   * El contador se acumula en vez de reiniciarse solo.
   *
   * Con el reinicio automático, three vacía "info" al empezar CADA render, y el
   * postproceso hace varios por frame: leyéndolo desde fuera salían 1 llamada y
   * 0 triángulos, que es el último pase, no el frame.
   */
  if (gl) {
    gl.info.autoReset = false
    gl.info.reset()
  }

  /**
   * El trabajo REAL del hilo principal por frame.
   *
   * Los milisegundos entre rAF los marca el vsync y por eso salen siempre
   * 16,7: el navegador espera. Esto mide lo que de verdad se tarda —guion,
   * estilo, maquetación y pintado— aunque quepa dentro del frame. Es el número
   * que dice cuánto margen queda.
   */
  const loaf = []
  let observer = null
  try {
    observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => loaf.push(entry.duration))
    })
    observer.observe({ type: 'long-animation-frame', buffered: false })
  } catch (error) {
    observer = null
  }

  return new Promise((resolve) => {
    const frames = []
    let previous = performance.now()
    const start = previous
    const peakCalls = 0
    const peakTris = 0

    const tick = (now) => {
      frames.push(now - previous)
      previous = now

      const elapsed = now - start
      const t = Math.min(1, elapsed / ms)
      if (from !== undefined) {
        window.scrollTo({ top: top + (from + (to - from) * t) * span, behavior: 'instant' })
      }

      if (elapsed < ms) requestAnimationFrame(tick)
      else {
        // Los dos primeros frames incluyen el arranque del muestreo.
        if (observer) observer.disconnect()
        const clean = frames.slice(2).sort((a, b) => a - b)
        const at = (list, q) =>
          list.length ? list[Math.min(list.length - 1, Math.floor(list.length * q))] : 0
        const slow = loaf.sort((a, b) => a - b)
        const count = clean.length + 2
        resolve({
          frames: clean.length,
          p50: at(clean, 0.5),
          p95: at(clean, 0.95),
          worst: clean[clean.length - 1],
          // Frames largos: cuántos, el típico y el peor.
          slowCount: slow.length,
          slowP50: at(slow, 0.5),
          slowWorst: slow.length ? slow[slow.length - 1] : 0,
          calls: gl ? Math.round(gl.info.render.calls / count) : peakCalls,
          triangles: gl ? Math.round(gl.info.render.triangles / count) : peakTris,
          geometries: gl ? gl.info.memory.geometries : 0,
          textures: gl ? gl.info.memory.textures : 0,
          programs: gl && gl.info.programs ? gl.info.programs.length : 0,
          dpr: gl ? gl.getPixelRatio() : 0,
          buffer: gl ? gl.domElement.width + 'x' + gl.domElement.height : '',
        })
      }
    }
    requestAnimationFrame(tick)
  })
}

/** Coloca el recorrido en un punto. */
const SETTLE = (progress) => {
  const track = document.querySelector('main').previousElementSibling
  const top = track.getBoundingClientRect().top + window.scrollY
  const span = track.offsetHeight - window.innerHeight
  window.scrollTo({ top: top + progress * span, behavior: 'instant' })
}

/** Las capas del DOM que el compositor tiene que rasterizar aparte. */
const LAYERS = () => {
  const nodes = Array.from(document.querySelectorAll('img,div'))
  return {
    canvases: document.querySelectorAll('canvas').length,
    images: document.querySelectorAll('img').length,
    layers: nodes
      .map((node) => ({ node, style: getComputedStyle(node) }))
      .filter(
        ({ style }) =>
          style.filter !== 'none' ||
          style.maskImage !== 'none' ||
          style.backdropFilter !== 'none',
      )
      .map(({ node, style }) => {
        const rect = node.getBoundingClientRect()
        return {
          tag: node.tagName.toLowerCase(),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          filter: style.filter,
          mask: style.maskImage !== 'none',
          visible: style.visibility !== 'hidden' && Number(style.opacity) > 0.01,
        }
      }),
  }
}

const fps = (ms) => (ms > 0 ? (1000 / ms).toFixed(0) : '--')

const show = (label, r) =>
  '  ' +
  label.padEnd(20) +
  ' p50 ' + r.p50.toFixed(1).padStart(5) + 'ms (' + fps(r.p50).padStart(3) + ')' +
  '  p95 ' + r.p95.toFixed(1).padStart(5) + 'ms (' + fps(r.p95).padStart(3) + ')' +
  '  peor ' + r.worst.toFixed(0).padStart(4) + 'ms' +
  '  hilo ' + r.slowP50.toFixed(0).padStart(3) + '/' + r.slowWorst.toFixed(0).padStart(4) + 'ms x' + String(r.slowCount).padStart(3) +
  '  calls ' + String(r.calls).padStart(4) +
  '  tris ' + (r.triangles / 1000).toFixed(0) + 'k'

async function measure(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dsf ?? 1,
    isMobile: !!viewport.isMobile,
    hasTouch: !!viewport.isMobile,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (event) => errors.push(String(event)))
  await page.goto(URL + QUERY, { waitUntil: 'load' })

  /**
   * LA SONDA SOLO EXISTE EN DESARROLLO, y este script tiene que poder medir el
   * BUILD —que es la regla del manual—. Así que se espera a ella si está y, si
   * no, a que el preloader se retire y el canvas esté dibujando.
   *
   * Sin sonda se pierden las llamadas de dibujo y los triángulos, que salen del
   * renderizador; los tiempos de frame, que es lo que de verdad hay que medir
   * contra el build, se miden igual.
   */
  const probed = await page
    .waitForFunction(() => !!window.__cocobrain, null, { timeout: 12000 })
    .then(() => true)
    .catch(() => false)

  if (probed) {
    await page.waitForFunction(
      () => window.__cocobrain.gl.info.memory.geometries > 8,
      null,
      { timeout: 90000 },
    )
  } else {
    await page
      .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 60000 })
      .catch(() => {})
  }
  await page.waitForTimeout(2500)

  const scenarios = {}
  const run = async (label, progress, options) => {
    await page.evaluate(SETTLE, unwarp(progress))
    await page.waitForTimeout(900)
    scenarios[label] = await page.evaluate(SAMPLE, { ...options, from: unwarp(options.from), to: unwarp(options.to) })
  }

  await run('portada reposo', 0, { ms: 2500 })
  await run('scroll lento', 0, { ms: 3000, from: 0, to: 0.08 })
  await run('portada->mente', 0.04, { ms: 3500, from: 0.04, to: 0.4 })
  await run('dentro mente', 0.47, { ms: 2500 })
  await run('recorrido areas', 0.58, { ms: 3000, from: 0.58, to: 0.98 })

  // El inventario de capas se toma en mitad del descenso, que es donde el
  // corredor está desplegado. Tomado al final salían todas ocultas.
  await page.evaluate(SETTLE, unwarp(0.15))
  await page.waitForTimeout(1200)
  const dom = await page.evaluate(LAYERS)
  await context.close()
  return { scenarios, dom, errors }
}

/**
 * SIN VENTANA, PERO CON LA TARJETA GRÁFICA DE VERDAD.
 *
 * Esto es lo que `shoot.mjs` no sabía: el navegador sin ventana usa SwiftShader
 * —una GPU emulada por CPU— SOLO porque nadie le dijo lo contrario. Con estas
 * banderas coge la tarjeta real:
 *
 *     sin banderas   ANGLE (Google, Vulkan, SwiftShader driver)
 *     con banderas   ANGLE (NVIDIA GeForce RTX 5070 Laptop, D3D11)
 *
 * Comprobado imprimiendo UNMASKED_RENDERER_WEBGL en los dos modos. Los fps que
 * salen de aquí sí valen.
 */
const browser = await chromium.launch({
  args: [
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
  ],
})

console.log('\nMEDICION REAL' + (QUERY ? '  ' + QUERY : '') + '  ' + URL + '\n')

for (const viewport of VIEWPORTS) {
  const { scenarios, dom, errors } = await measure(browser, viewport)
  const first = Object.values(scenarios)[0]
  console.log(
    viewport.name +
      '   dpr ' + first.dpr.toFixed(2) +
      '   bufer ' + first.buffer +
      '   geom ' + first.geometries +
      '  tex ' + first.textures +
      '  prog ' + first.programs,
  )
  for (const [label, r] of Object.entries(scenarios)) console.log(show(label, r))
  if (errors.length) console.log('  ERRORES: ' + errors.join(' | '))
  if (viewport.name.startsWith('1920x1080 @1.5')) {
    console.log(
      '  capas con filtro/mascara: ' + dom.layers.length +
        '  ·  canvas: ' + dom.canvases +
        '  ·  img: ' + dom.images,
    )
    dom.layers.forEach((l) =>
      console.log(
        '    ' + (l.visible ? 'VISIBLE' : 'oculta ') + ' ' + l.tag + ' ' + l.w + 'x' + l.h +
          '  ' + l.filter + (l.mask ? '  +mask' : ''),
      ),
    )
  }
  console.log('')
}

await browser.close()
