/**
 * Recorta el fondo de una imagen y la guarda como PNG con transparencia.
 *
 *   node scripts/cutout.mjs <entrada> <salida.png> [tolerancia]
 *
 * Usa relleno por difusión desde los bordes en vez de un umbral de
 * luminosidad. Es la diferencia entre conservar los guantes blancos y las
 * zapatillas crema del personaje o comérselos junto con el fondo: solo se
 * vuelve transparente el blanco que está conectado con el borde del lienzo.
 */
import sharp from 'sharp'

const [input, output, toleranceArg] = process.argv.slice(2)
if (!input || !output) {
  console.error('Uso: node scripts/cutout.mjs <entrada> <salida.png> [tolerancia]')
  process.exit(1)
}

const tolerance = Number(toleranceArg ?? 26)

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const at = (x, y) => (y * width + x) * channels

// El color de fondo se toma de la esquina superior izquierda.
const bg = [data[0], data[1], data[2]]
const isBackground = (i) =>
  Math.abs(data[i] - bg[0]) <= tolerance &&
  Math.abs(data[i + 1] - bg[1]) <= tolerance &&
  Math.abs(data[i + 2] - bg[2]) <= tolerance

const visited = new Uint8Array(width * height)
const queue = []

for (let x = 0; x < width; x++) {
  queue.push([x, 0], [x, height - 1])
}
for (let y = 0; y < height; y++) {
  queue.push([0, y], [width - 1, y])
}

let cleared = 0
while (queue.length) {
  const [x, y] = queue.pop()
  if (x < 0 || y < 0 || x >= width || y >= height) continue

  const flat = y * width + x
  if (visited[flat]) continue
  visited[flat] = 1

  const i = at(x, y)
  if (!isBackground(i)) continue

  data[i + 3] = 0
  cleared++
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}

// Recorta el lienzo a lo que queda visible, para que la imagen no arrastre
// márgenes vacíos que luego hay que compensar con CSS.
await sharp(data, { raw: { width, height, channels } })
  .png({ compressionLevel: 9 })
  .trim({ threshold: 1 })
  .toFile(output)

const meta = await sharp(output).metadata()
console.log(
  `✔ ${output} — ${meta.width}x${meta.height}, ${cleared.toLocaleString('es')} px de fondo eliminados`,
)
