/**
 * Capturas del recorrido, para poder juzgar la web sin describirla.
 *
 *   node scripts/shoot.mjs [url]
 *
 * Abre la página en dos tamaños —escritorio y móvil— y saca una captura en
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

/** Dónde parar. Coinciden con los tramos de `journey/stages.js`. */
const STOPS = [
  { name: 'portada', progress: 0 },
  { name: 'acercamiento', progress: 0.34 },
  { name: 'entrada', progress: 0.56 },
  { name: 'mente', progress: 0.78 },
  { name: 'exploracion', progress: 1 },
]

const VIEWPORTS = [
  { name: 'escritorio', width: 1440, height: 900, isMobile: false },
  { name: 'movil', width: 390, height: 844, isMobile: true },
]

/** Altura de la pista del recorrido, en pantallas. Debe seguir a `JOURNEY_SCREENS`. */
const JOURNEY_SCREENS = 4

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
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(error.message))

  await page.goto(URL, { waitUntil: 'load' })

  // El preloader tiene un mínimo en pantalla y un tope duro. Se espera a que
  // desaparezca del DOM en vez de dormir un número fijo de segundos.
  await page
    .waitForSelector('[aria-label="Cargando"]', { state: 'detached', timeout: 20000 })
    .catch(() => problems.push('el preloader no se ha quitado en 20s'))

  // Un respiro para que el modelo termine de encuadrarse.
  await page.waitForTimeout(1200)

  for (const stop of STOPS) {
    const distance = (JOURNEY_SCREENS - 1) * viewport.height
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), stop.progress * distance)
    // La cámara persigue al scroll con amortiguación: hay que dejarla llegar.
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${viewport.name}-${stop.name}.png` })
  }

  await context.close()
  return problems
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const found = []

for (const viewport of VIEWPORTS) {
  const problems = await shoot(browser, viewport)
  problems.forEach((text) => found.push(`[${viewport.name}] ${text}`))
  console.log(`✔ ${viewport.name}: ${STOPS.length} capturas`)
}

await browser.close()

if (found.length) {
  console.log('\nErrores en consola:')
  found.forEach((text) => console.log(`  · ${text}`))
} else {
  console.log('\nSin errores en consola.')
}
