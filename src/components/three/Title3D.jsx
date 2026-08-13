import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Text3D } from '@react-three/drei'

const FONT_URL = '/fonts/cocobrain.typeface.json'

// Tamaño de referencia. Todo lo demás se calcula a partir de aquí, así que
// escalar el título entero es cambiar solo esta constante.
const SIZE = 1
const DEPTH = 0.22
const TRACKING = SIZE * 0.06

// Las esferas-coco ocupan el hueco de las dos "o": algo menos que la altura
// de mayúscula, como en el logo.
const COCO_DIAMETER = SIZE * 0.78

// El cerebro que hace de punto de la "i".
const ORB_RADIUS = SIZE * 0.11

// El título se escala solo para ocupar esta fracción del ancho visible, con
// un tope para que en pantallas anchas no se vuelva gigante. Sin esto, en
// móvil vertical la palabra se sale por los lados.
const FILL_RATIO = 0.82
const MAX_SCALE = 0.85

// La "i" sin punto. Si la fuente convertida no la trae, caemos a la "i"
// normal y avisamos: es preferible un punto de más que un hueco.
const DOTLESS_I = 'ı'

/**
 * La palabra, letra a letra. Se describe como datos y no como una cadena
 * porque dos caracteres no son letras: son geometría propia.
 */
const TITLE_ITEMS = [
  { key: 'c-0', kind: 'glyph', char: 'C', color: '#2B211C' },
  { key: 'o-1', kind: 'coco' },
  { key: 'c-2', kind: 'glyph', char: 'c', color: '#C99B6E' },
  { key: 'o-3', kind: 'coco' },
  { key: 'b-4', kind: 'glyph', char: 'B', color: '#2B211C' },
  { key: 'r-5', kind: 'glyph', char: 'r', color: '#6B4530' },
  { key: 'a-6', kind: 'glyph', char: 'a', color: '#6B4530' },
  { key: 'i-7', kind: 'dotless-i', color: '#2B211C' },
  { key: 'n-8', kind: 'glyph', char: 'n', color: '#2B211C' },
]

/**
 * Carga el typeface a mano en vez de dejárselo a Suspense, para poder
 * distinguir "todavía no ha llegado" de "no existe" y degradar sin romper
 * la escena entera.
 */
function useTypeface(url) {
  const [data, setData] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (alive) setData(json)
      })
      .catch((err) => {
        if (!alive) return
        setMissing(true)
        console.warn(
          `[Title3D] No se ha podido cargar la fuente ${url} (${err.message}). ` +
            'El título 3D no se renderiza. Genera el .typeface.json y déjalo ' +
            'en public/fonts/ — ver _docs/mascot-pipeline.md.',
        )
      })

    return () => {
      alive = false
    }
  }, [url])

  return { data, missing }
}

/** Esfera con el acabado del coco, para los huecos de las dos "o". */
function CocoSphere() {
  return (
    <mesh position={[COCO_DIAMETER / 2, COCO_DIAMETER / 2, DEPTH / 2]}>
      {/* 32x24 es el mínimo en el que la silueta no se ve poligonal a este tamaño */}
      <sphereGeometry args={[COCO_DIAMETER / 2, 32, 24]} />
      {/* TODO(fase 12): sustituir por la textura de coco extraída del GLB */}
      <meshStandardMaterial color="#A9713F" roughness={0.85} metalness={0} />
    </mesh>
  )
}

export default function Title3D({ position = [0, 0, 0], ...props }) {
  const { data: font, missing } = useTypeface(FONT_URL)
  const viewportWidth = useThree((state) => state.viewport.width)
  const groupRef = useRef(null)
  const itemRefs = useRef([])

  // La fuente puede no traer la "i" sin punto. Se comprueba una vez.
  const hasDotlessI = useMemo(() => {
    if (!font) return false
    const ok = Boolean(font.glyphs?.[DOTLESS_I])
    if (!ok) {
      console.warn(
        '[Title3D] El typeface no incluye la "i" sin punto (U+0131). Se usa ' +
          'la "i" normal, así que el punto convivirá con el cerebro. Vuelve a ' +
          'convertir la fuente incluyendo los caracteres latinos extendidos.',
      )
    }
    return ok
  }, [font])

  /**
   * Maquetación horizontal. No se puede precalcular: el ancho de cada letra
   * sale de su geometría, que solo existe después de montar. Se mide una vez
   * y se posiciona; no hay nada de esto en el render loop.
   */
  useLayoutEffect(() => {
    if (!font) return

    const items = itemRefs.current.filter(Boolean)
    if (items.length !== TITLE_ITEMS.length) return

    const widths = items.map((group, index) => {
      if (TITLE_ITEMS[index].kind === 'coco') return COCO_DIAMETER

      const mesh = group.children[0]
      if (!mesh?.geometry) return SIZE * 0.5

      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      // El origen de TextGeometry no es el borde izquierdo del glifo: se
      // guarda el desfase para alinear de verdad las letras entre sí.
      mesh.position.x = -box.min.x
      return box.max.x - box.min.x
    })

    const totalWidth =
      widths.reduce((sum, width) => sum + width, 0) + TRACKING * (widths.length - 1)

    let cursor = -totalWidth / 2
    items.forEach((group, index) => {
      group.position.x = cursor
      cursor += widths[index] + TRACKING
    })

    // Encaje responsive: el ancho real de la palabra se acaba de medir, así
    // que aquí ya sabemos cuánto hay que escalar para que quepa.
    if (groupRef.current && totalWidth > 0) {
      const fit = Math.min(MAX_SCALE, (viewportWidth * FILL_RATIO) / totalWidth)
      groupRef.current.scale.setScalar(fit)
    }
  }, [font, hasDotlessI, viewportWidth])

  if (missing || !font) return null

  return (
    <group ref={groupRef} position={position} {...props}>
      {/* La línea base de Text3D está en y=0, así que la palabra entera
          cuelga hacia arriba. Este offset la centra sobre su propio eje. */}
      <group position={[0, -SIZE * 0.36, 0]}>
        {TITLE_ITEMS.map((item, index) => (
          <group
            key={item.key}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            // La intro anima cada letra por separado: se identifican por índice.
            userData={{ letterIndex: index, kind: item.kind }}
          >
            {item.kind === 'coco' ? (
              <CocoSphere />
            ) : (
              <Text3D
                font={font}
                size={SIZE}
                height={DEPTH}
                curveSegments={8}
                bevelEnabled
                bevelThickness={0.02}
                bevelSize={0.012}
                bevelSegments={3}
              >
                {item.kind === 'dotless-i' ? (hasDotlessI ? DOTLESS_I : 'i') : item.char}
                <meshStandardMaterial
                  color={item.color}
                  roughness={0.42}
                  metalness={0.02}
                />
              </Text3D>
            )}

            {/* El punto de la "i" es el cerebro. En la fase 6 lo sustituye el
                brain_orb del GLB; hasta entonces marca la posición. */}
            {item.kind === 'dotless-i' && (
              <mesh position={[SIZE * 0.11, SIZE * 0.86, DEPTH / 2]}>
                <sphereGeometry args={[ORB_RADIUS, 20, 16]} />
                <meshStandardMaterial
                  color="#F2939E"
                  emissive="#FF6B85"
                  emissiveIntensity={0.35}
                  roughness={0.6}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  )
}
