/**
 * ¿ES PLANO EL SUELO DEL EDITORIAL?
 *
 * Recorre las seis áreas y mide la luminancia del fondo de borde a borde. Un
 * suelo correcto es PLANO: el terreno y la luz direccional pueden variarlo unos
 * pocos niveles, pero nada puede oscurecer los bordes del cuadro.
 *
 * Existe porque esa pregunta no se puede contestar mirando una captura. La
 * atmósfera del descenso se quedó encendida sobre el tramo de lectura durante
 * fases enteras —87 niveles de caída entre el centro y los bordes, ver 10A en
 * §7— y a ojo se leía como "el editorial se ve un poco apagado".
 *
 * Dos números por área:
 *
 *     caida     max - min del perfil. Es la señal de alarma
 *     luz       cuánto de esa caída pone la luz direccional del área, que SÍ
 *               es deliberada (§7 la cifra en unos 7 niveles)
 *
 * Lo que importa es la diferencia: `caida - luz` es el suelo de verdad, y por
 * encima de ~5 hay una capa haciendo algo que no debería.
 *
 *     node scripts/floor.mjs http://localhost:4173
 *
 * LO QUE ESTA SONDA NO SABE: muestrea una fila FIJA (y=540), así que en un área
 * cuyo contenido cruce esa altura mide texto y no fondo. Un `!!` con un solo
 * valor fuera de línea en mitad del perfil suele ser eso —el lomo de un
 * capítulo, una lista de tecnologías— y no una capa. Un `!!` con los DOS
 * extremos caídos y el centro alto es lo que hay que perseguir: eso es una
 * viñeta.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'

const URL = process.argv[2] || 'http://localhost:4173'

/**
 * Se empieza en x=60 y no en el borde: el HUD dibuja sus marcas de esquina ahí
 * y son CONTENIDO, no fondo. Midiendo desde 0 la sonda informaba de una caída
 * de 9 en un área cuyo fondo es plano.
 */
const COLS = [60, 160, 320, 480, 700, 960, 1220, 1440, 1600, 1760, 1910]
const AREAS = ['about', 'work', 'experience', 'skills', 'cv', 'contact']

const browser = await chromium.launch({
  args: [
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
  ],
})

for (const w of [1920, 1366]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1080 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)
  const cols = COLS.filter((x) => x < w - 20)

  const profile = async () => {
    const buf = await page.screenshot()
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
    return cols.map((x) => {
      const i = (info.width * 540 + x) * info.channels
      return Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    })
  }
  const spread = (v) => Math.max(...v) - Math.min(...v)

  console.log(`\n=== ${w}x1080 ===`)
  for (const id of AREAS) {
    await page.evaluate((i) => document.querySelector('#' + i)?.scrollIntoView(), id)
    await page.waitForTimeout(1700)
    /*
      Y se baja casi una pantalla MÁS. `scrollIntoView` deja el borde del área
      arriba del todo, y ahí el mundo 3D todavía está detrás: medido, oscurece
      los bordes del cuadro 39 niveles y esta sonda lo achacaba al fondo. Lo
      que hay que medir es el suelo sobre el que de verdad se LEE.
    */
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9))
    await page.waitForTimeout(900)
    const withLight = await profile()

    // La misma fila con la luz del área apagada: lo que quede es el suelo.
    await page.evaluate(() => {
      const l = document.querySelector('.ambient-light')
      if (l) l.style.setProperty('display', 'none', 'important')
    })
    await page.waitForTimeout(700)
    const bare = await profile()
    await page.evaluate(() => {
      const l = document.querySelector('.ambient-light')
      if (l) l.style.removeProperty('display')
    })
    await page.waitForTimeout(400)

    const flag = spread(bare) <= 5 ? 'OK ' : '!! '
    console.log(
      `  ${flag}${id.padEnd(11)} caida ${String(spread(withLight)).padStart(3)}` +
        `   suelo ${String(spread(bare)).padStart(3)}   perfil ${withLight.join(' ')}`,
    )
  }
  await page.close()
}

await browser.close()
