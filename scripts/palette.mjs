/**
 * El reparto de la paleta en una captura.
 *
 * La regla que de verdad separa coco de rosa no es el tono en grados —el coco
 * iluminado se acerca al rojo y cae del lado equivocado— sino la relacion entre
 * el VERDE y el AZUL: en un marron el verde supera claramente al azul; en un
 * rosa o un carmin, el azul alcanza o supera al verde.
 */
import sharp from 'sharp'
const file = process.argv[2]
const { data } = await sharp(file).resize(480).raw().toBuffer({ resolveWithObject: true })
const bucket = { coco: 0, rosa: 0, neutro: 0, anil: 0, sombra: 0 }
let n = 0
for (let i = 0; i < data.length; i += 3) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const v = max / 255
  const s = max === 0 ? 0 : (max - min) / max
  n += 1
  if (v < 0.05) { bucket.sombra += 1; continue }
  if (s < 0.10) { bucket.neutro += 1; continue }
  if (b > r && b > g) { bucket.anil += 1; continue }
  /* Calido. Coco si el verde le saca al azul mas del 18% del rango. */
  const spread = max - min || 1
  if ((g - b) / spread > 0.18) bucket.coco += 1
  else bucket.rosa += 1
}
const pct = (k) => ((bucket[k] / n) * 100).toFixed(1).padStart(5)
console.log(
  `coco ${pct('coco')}%  rosa ${pct('rosa')}%  neutro ${pct('neutro')}%` +
  `  anil ${pct('anil')}%  sombra ${pct('sombra')}%`,
)
