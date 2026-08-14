/** Utilidad de diagnostico: imprime el color de unos puntos de una imagen. */
import sharp from 'sharp'

const [input, ...points] = process.argv.slice(2)

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

console.log(`${input} — ${info.width}x${info.height}, ${info.channels} canales`)

for (const point of points) {
  const [x, y] = point.split(',').map(Number)
  const i = (y * info.width + x) * info.channels
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
  const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  console.log(`  (${x},${y})  rgb(${r},${g},${b})  alfa=${a}  lum=${luminance}`)
}
