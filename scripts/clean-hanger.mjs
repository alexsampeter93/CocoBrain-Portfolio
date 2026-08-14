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

/**
 * Se limpia en dos bandas porque el brazo y la letra comparten alturas.
 *
 * Banda alta (por encima del brazo): se borra todo lo que no sea el guante,
 * que es casi blanco. Aqui hay que ser agresivo — quitar solo el negro puro
 * de la C deja su borde suavizado en pie, y ese halo gris sin el resto de la
 * letra se lee como un palo suelto.
 *
 * Banda baja: ya aparece el brazo, marron y de luminosidad media, asi que
 * solo se borra el negro de la letra.
 */
const UPPER_BAND_Y = 95
const LOWER_BAND_Y = 150
const GLOVE_LUMINANCE = 205
const LETTER_LUMINANCE = 70
const COCONUT_FROM_X = 205

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

let cleared = 0

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

    const isCoconut = x > COCONUT_FROM_X && y < LOWER_BAND_Y
    const isLetter =
      y < UPPER_BAND_Y
        ? luminance < GLOVE_LUMINANCE
        : y < LOWER_BAND_Y && luminance < LETTER_LUMINANCE

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
