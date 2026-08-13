/**
 * Reescala las texturas incrustadas de un .glb de Meshy.
 *
 *   node scripts/optimize-glb.mjs <entrada.glb> <salida.glb> [tamañoTextura]
 *
 * Por qué existe, en dos avisos que cuestan tiempo si no están escritos:
 *
 * 1. `gltf-transform resize` falla con estos archivos ("colourspace:
 *    parameter space not set"). La causa es que @gltf-transform/functions
 *    arrastra su propia copia anidada de sharp vía ndarray-pixels, y en
 *    Windows su binario nativo no carga; las dos instancias de libvips se
 *    pisan. Aquí se usa solo @gltf-transform/core, que no la arrastra.
 *
 * 2. La compresión Draco NO se hace aquí por lo mismo. Va aparte, en su
 *    propio proceso, donde no hay conflicto:
 *      npx gltf-transform draco entrada.glb salida.glb
 */
import { statSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import sharp from 'sharp'

const [input, output, sizeArg] = process.argv.slice(2)
if (!input || !output) {
  console.error('Uso: node scripts/optimize-glb.mjs <entrada.glb> <salida.glb> [tamañoTextura]')
  process.exit(1)
}

const textureSize = Number(sizeArg ?? 1024)
const document = await new NodeIO().read(input)

for (const texture of document.getRoot().listTextures()) {
  const image = texture.getImage()
  if (!image) continue

  const before = image.byteLength
  const resized = await sharp(Buffer.from(image))
    .resize(textureSize, textureSize, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  texture.setImage(new Uint8Array(resized)).setMimeType('image/jpeg')

  const name = texture.getName() || 'textura'
  console.log(
    `  ${name}: ${(before / 1024 / 1024).toFixed(2)} MB → ${(resized.length / 1024).toFixed(0)} KB`,
  )
}

await new NodeIO().write(output, document)
console.log(`✔ ${output} — ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`)
