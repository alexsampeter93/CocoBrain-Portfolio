/**
 * Capturas del recorrido, para poder juzgar la web sin describirla.
 *
 *   node scripts/shoot.mjs [url]
 *
 * **Y hay que pasarle también la URL del build**, no solo la de desarrollo:
 *
 *     npx vite preview --port 4173
 *     node scripts/shoot.mjs http://localhost:4173
 *
 * `StrictMode` solo existe en desarrollo y tapa errores de orden de montaje. La
 * portada se estuvo publicando sin titular por uno de esos, y no lo vio nadie
 * porque todas las capturas apuntaban al servidor de desarrollo.
 *
 * Abre la página en tres tamaños —escritorio y móvil— y saca una captura en
 * cada punto del recorrido. Las deja en `.shots/`, que está fuera de git.
 *
 * OJO CON EL RENDIMIENTO: esto corre en un navegador sin ventana, que dibuja
 * por software en vez de usar la tarjeta gráfica. Los fps que salgan aquí no
 * valen para nada; sirve para ver COMPOSICIÓN, no velocidad.
 */
import { chromium } from 'playwright'
import { mkdir, rm } from 'node:fs/promises'

const URL = process.argv[2] ?? 'http://localhost:5173'
const OUT = '.shots'

/**
 * Las paradas se DEDUCEN de la tabla, no se escriben a mano.
 *
 * Estuvieron escritas a mano y se desfasaron en cuanto cambió el recorrido:
 * las capturas decían "entrada" y estaban sacadas donde ahora hay otra cosa.
 * Una herramienta de diagnóstico que miente es peor que no tenerla.
 *
 * La tabla se pide a la PÁGINA en vez de importarla aquí: `stages.js` usa
 * imports sin extensión, que Vite resuelve y Node no. Como este script ya
 * necesita el servidor de desarrollo, pedírselo a él no añade ninguna
 * dependencia nueva —y de paso lee exactamente el mismo código que se está
 * mirando en pantalla—.
 *
 * Del recorrido por nodos se sacan el primero y el tercero: los cinco serían
 * cinco variaciones de la misma composición.
 */
const READ_STOPS = () =>
  import('/src/journey/stages.js').then((module) => [
    ...module.STAGES.filter((stage) => stage.id !== 'tour').map((stage) => ({
      name: stage.id,
      progress: (stage.from + stage.to) / 2,
    })),
    { name: 'nodo1', progress: module.progressForNode(0) },
    { name: 'nodo3', progress: module.progressForNode(2) },
    { name: 'final', progress: 1 },
  ])

/** Si se apunta a un build servido, no hay `/src`: se cae a algo razonable. */
const FALLBACK_STOPS = [
  { name: 'portada', progress: 0 },
  { name: 'acercamiento', progress: 0.1 },
  { name: 'umbral', progress: 0.23 },
  { name: 'membrana', progress: 0.345 },
  { name: 'cavidad', progress: 0.44 },
  { name: 'red', progress: 0.52 },
  { name: 'area1', progress: 0.605 },
  { name: 'area3', progress: 0.773 },
  { name: 'final', progress: 1 },
]

const VIEWPORTS = [
  { name: 'grande', width: 1920, height: 1080, isMobile: false },
  { name: 'escritorio', width: 1440, height: 900, isMobile: false },
  { name: 'movil', width: 390, height: 844, isMobile: true },
]

/** Variante que capturar: `node scripts/shoot.mjs url "?shadow=0"`. */
const QUERY = process.argv[3] ?? ''

/**
 * El editorial también se captura. Es la mitad de la web y estaba fuera de la
 * herramienta: se juzgaba el recorrido 3D con capturas y las áreas de lectura
 * de memoria.
 */
const READING = () =>
  Array.from(document.querySelectorAll('main section[id]')).map((node) => node.id)

/**
 * La distancia del recorrido se MIDE de la página, no se copia.
 *
 * Estuvo escrita a mano y se quedó desfasada en cuanto se alargó el recorrido:
 * las capturas decían "nodo 1" y en realidad estaban sacadas a un sexto de
 * donde tocaba. Una herramienta de diagnóstico que miente es peor que no
 * tenerla.
 */
const SCROLL_TO_PROGRESS = (progress) => {
  // La pista es la sección que va justo antes del contenido accesible.
  const track = document.querySelector('main')?.previousElementSibling
  const height = track?.offsetHeight ?? document.body.scrollHeight
  const top = (track?.offsetTop ?? 0) + progress * (height - window.innerHeight)
  window.scrollTo({ top, behavior: 'instant' })
}

async function shoot(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  })

  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    /*
      Contra el BUILD no existe `/src`, así que el import de la tabla falla y se
      usa `FALLBACK_STOPS`. Es el camino previsto, no un fallo que reportar.
      Cualquier OTRO 404 sí se reporta: un asset que falta tiene que doler.
    */
    if (message.location()?.url?.includes('/src/journey/stages.js')) return
    problems.push(message.text())
  })

  page.on('requestfailed', (request) => {
    if (request.url().includes('/src/journey/stages.js')) return
    problems.push(`petición fallida: ${request.url()}`)
  })
  page.on('pageerror', (error) => problems.push(error.message))

  await page.goto(URL + QUERY, { waitUntil: 'load' })

  // El preloader tiene un mínimo en pantalla y un tope duro. Se espera a que
  // desaparezca del DOM en vez de dormir un número fijo de segundos.
  await page
    .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 20000 })
    .catch(() => problems.push('el preloader no se ha quitado en 20s'))

  // Un respiro para que el modelo termine de encuadrarse.
  await page.waitForTimeout(1200)

  const stops = await page.evaluate(READ_STOPS).catch(() => FALLBACK_STOPS)

  for (const stop of stops) {
    await page.evaluate(SCROLL_TO_PROGRESS, stop.progress)
    // La cámara persigue al scroll con amortiguación: hay que dejarla llegar.
    await page.waitForTimeout(900)
    const label = String(stop.progress.toFixed(2)).replace('.', '')
    await page.screenshot({ path: `${OUT}/${viewport.name}-${label}-${stop.name}.png` })
  }

  // Y el editorial, área por área, empezando por su borde superior.
  const areas = await page.evaluate(READING).catch(() => [])
  for (const id of areas) {
    await page.evaluate((target) => {
      const node = document.getElementById(target)
      window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    }, id)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/${viewport.name}-area-${id}.png` })
  }

  await context.close()
  return { problems, count: stops.length + areas.length }
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

/**
 * SIN VENTANA, PERO CON LA TARJETA GRÁFICA DE VERDAD.
 *
 * Esta era la causa de la trampa del frame obsoleto. El navegador sin ventana
 * NO dibuja por software por obligación: lo hace porque nadie le dice lo
 * contrario. Comprobado imprimiendo UNMASKED_RENDERER_WEBGL:
 *
 *     sin banderas   ANGLE (Google, Vulkan, SwiftShader driver)
 *     con banderas   ANGLE (NVIDIA GeForce RTX 5070 Laptop, D3D11)
 *
 * Con la tarjeta real la portada tarda un par de segundos en estar completa en
 * vez de más de cuarenta, y las capturas dejan de salir a medio dibujar.
 */
const browser = await chromium.launch({
  args: [
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
  ],
})
const found = []

for (const viewport of VIEWPORTS) {
  const { problems, count } = await shoot(browser, viewport)
  problems.forEach((text) => found.push(`[${viewport.name}] ${text}`))
  console.log(`✔ ${viewport.name}: ${count} capturas`)
}

await browser.close()

if (found.length) {
  console.log('\nErrores en consola:')
  found.forEach((text) => console.log(`  · ${text}`))
} else {
  console.log('\nSin errores en consola.')
}
