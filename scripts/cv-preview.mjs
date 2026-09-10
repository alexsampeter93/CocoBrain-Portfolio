/**
 * GENERA LA PORTADA DEL CV COMO IMAGEN, A PARTIR DEL PDF REAL.
 *
 *   node scripts/cv-preview.mjs
 *
 * No es un PDF incrustado -esa regla sigue en pie- es una CAPTURA, el mismo
 * trato que ya reciben las capturas de Proyectos: una imagen real de lo que
 * hay, no una etiqueta que dice "aquí hay un documento".
 *
 * El Chromium que trae Playwright por defecto es una build minima sin visor
 * de PDF: navegar a un archivo .pdf dispara una descarga en vez de pintarlo.
 * Por eso este script usa el Edge YA INSTALADO en la maquina (`channel:
 * 'msedge'`), que tiene el visor completo -cero descargas nuevas.
 *
 * Se ejecuta una vez y el resultado se comprueba a mano antes de usarlo:
 * regenerar no es automatico porque el recorte final se mide contra la
 * captura de esa pasada, y una build de Edge distinta podria mover el
 * cromo del visor unos pixeles.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import path from 'node:path'

const PDF = path.resolve('public/cv/alejandro-sampedro-calo.pdf')
const RAW = path.resolve('scripts/.cv-preview-raw.png')
const OUT_FULL = path.resolve('public/img/cv-preview.webp')
const OUT_SM = path.resolve('public/img/cv-preview-sm.webp')

// #toolbar=0&navpanes=0 apaga el cromo del visor de Edge. La pagina se pinta
// a un tamano que no depende del viewport, asi que se recorta despues por
// pixeles en vez de fiarse de un zoom concreto.
const url = 'file:///' + PDF.split(path.sep).join('/') + '#toolbar=0&navpanes=0&zoom=page-width'

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 2200, height: 3200 }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(2000)
await page.screenshot({ path: RAW })
await browser.close()

// El visor pinta la pagina centrada sobre un fondo gris oscuro. Se busca el
// rectangulo real barriendo desde el centro hacia los cuatro bordes.
const img = sharp(RAW)
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
const at = (x, y) => {
  const i = (y * width + x) * channels
  return [data[i], data[i + 1], data[i + 2]]
}
const esFondoOscuro = ([r, g, b]) => r < 90 && g < 90 && b < 90

const midY = Math.floor(height * 0.15) // por encima del retrato, nunca fondo blanco de sobra
let left = 0
let right = width - 1
while (left < width && esFondoOscuro(at(left, midY))) left++
while (right > 0 && esFondoOscuro(at(right, midY))) right--
const midX = Math.floor((left + right) / 2)
let top = 0
let bottom = height - 1
while (top < height && esFondoOscuro(at(midX, top))) top++
while (bottom > 0 && esFondoOscuro(at(midX, bottom))) bottom--

const box = { left, top, width: right - left, height: bottom - top }
console.log('página detectada: ' + JSON.stringify(box) + '  (A4 esperado: 0,707)')
console.log('proporción medida: ' + (box.width / box.height).toFixed(3))

const cropped = sharp(RAW).extract(box)
await cropped.clone().resize(780, null).webp({ quality: 86 }).toFile(OUT_FULL)
await cropped.clone().resize(480, null).webp({ quality: 86 }).toFile(OUT_SM)

console.log('escrito: ' + OUT_FULL)
console.log('escrito: ' + OUT_SM)
