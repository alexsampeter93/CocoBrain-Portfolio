/**
 * Limpia el recorte de Olaz colgado de la C.
 *
 *   node scripts/clean-hanger.mjs <entrada.png> <salida.png>
 *
 * El recorte del poster arrastra la letra C y la esfera-coco vecinas. No se
 * pueden quitar con el relleno por difusion porque tocan al personaje, asi
 * que se borran por posicion y por luminosidad: la C es mucho mas oscura que
 * cualquier parte de Olaz, y sus zonas oscuras propias —cejas, suelas— caen
 * mas abajo del limite.
 */
import sharp from 'sharp'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('Uso: node scripts/clean-hanger.mjs <entrada.png> <salida.png>')
  process.exit(1)
}

// Frontera por debajo de la cual ya no hay letras vecinas, solo personaje.
const CLEAN_ABOVE_Y = 150
const COCONUT_FROM_X = 205
const LETTER_LUMINANCE = 70

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

let cleared = 0

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

    const isCoconut = x > COCONUT_FROM_X && y < CLEAN_ABOVE_Y
    const isLetter = luminance < LETTER_LUMINANCE && y < CLEAN_ABOVE_Y

    if (isCoconut || isLetter) {
      data[i + 3] = 0
      cleared++
    }
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 1 })
  .toFile(output)

const meta = await sharp(output).metadata()
console.log(`✔ ${output} — ${meta.width}x${meta.height}, ${cleared.toLocaleString('es')} px limpiados`)
