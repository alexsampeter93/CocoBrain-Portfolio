/**
 * Convierte un .ttf/.otf al formato .typeface.json que consume Text3D.
 *
 *   npm i -D opentype.js          (una sola vez, pendiente de aprobar)
 *   npm run build:font -- Assets/fonts/Outfit-SemiBold.ttf
 *
 * Salida: public/fonts/cocobrain.typeface.json
 *
 * Se genera solo el subconjunto de caracteres de CHARSET. Convertir la fuente
 * entera daría un JSON de varios cientos de KB para usar nueve letras.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const OUTPUT = 'public/fonts/cocobrain.typeface.json'

// ASCII imprimible + acentos del español + la "i" sin punto (U+0131), que es
// la que lleva el cerebro encima en el título.
const CHARSET = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
  ...' .,:;!?¿¡\'"()[]{}-–—_/\\&@#%+=<>*',
  ...'áéíóúüñÁÉÍÓÚÜÑçÇ',
  'ı',
]

function toOutlineString(commands) {
  const parts = []
  const n = (value) => Math.round(value)

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        parts.push('m', n(cmd.x), n(cmd.y))
        break
      case 'L':
        parts.push('l', n(cmd.x), n(cmd.y))
        break
      // Ojo al orden: el FontLoader de three lee primero el punto final y
      // después los de control. No es el orden de opentype.js.
      case 'Q':
        parts.push('q', n(cmd.x), n(cmd.y), n(cmd.x1), n(cmd.y1))
        break
      case 'C':
        parts.push('b', n(cmd.x), n(cmd.y), n(cmd.x1), n(cmd.y1), n(cmd.x2), n(cmd.y2))
        break
      case 'Z':
        break
      default:
        console.warn(`Comando de path no reconocido: ${cmd.type}`)
    }
  }

  return parts.join(' ')
}

async function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('Falta la ruta del .ttf.\n  npm run build:font -- ruta/al/Outfit-SemiBold.ttf')
    process.exit(1)
  }

  let opentype
  try {
    opentype = await import('opentype.js')
  } catch {
    console.error(
      'Falta la dependencia opentype.js. Instálala con:\n  npm i -D opentype.js',
    )
    process.exit(1)
  }

  const parse = opentype.parse ?? opentype.default.parse
  const buffer = readFileSync(resolve(input))
  const font = parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )

  const glyphs = {}
  const missing = []

  for (const char of CHARSET) {
    const glyph = font.charToGlyph(char)
    if (!glyph || glyph.index === 0) {
      missing.push(char)
      continue
    }

    const bbox = glyph.getBoundingBox()
    glyphs[char] = {
      ha: Math.round(glyph.advanceWidth),
      x_min: Math.round(bbox.x1),
      x_max: Math.round(bbox.x2),
      o: toOutlineString(glyph.path.commands),
    }
  }

  const typeface = {
    glyphs,
    familyName: font.names.fontFamily?.en ?? 'CocoBrain',
    ascender: Math.round(font.ascender),
    descender: Math.round(font.descender),
    underlinePosition: Math.round(font.tables.post?.underlinePosition ?? -100),
    underlineThickness: Math.round(font.tables.post?.underlineThickness ?? 50),
    boundingBox: {
      xMin: Math.round(font.tables.head.xMin),
      xMax: Math.round(font.tables.head.xMax),
      yMin: Math.round(font.tables.head.yMin),
      yMax: Math.round(font.tables.head.yMax),
    },
    resolution: font.unitsPerEm,
    cssFontWeight: 'normal',
    cssFontStyle: 'normal',
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(typeface))

  const sizeKb = (Buffer.byteLength(JSON.stringify(typeface)) / 1024).toFixed(1)
  console.log(`✔ ${OUTPUT} — ${Object.keys(glyphs).length} glifos, ${sizeKb} KB`)

  if (missing.length) {
    console.warn(`⚠ La fuente no incluye: ${missing.join(' ')}`)
  }
  if (!glyphs['ı']) {
    console.warn('⚠ Falta la "i" sin punto (U+0131): el título usará la "i" normal.')
  }
}

main()
