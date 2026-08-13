import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { MathUtils } from 'three'
import { usePointer } from '../../hooks/usePointer'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * El logotipo, dentro de la escena 3D en vez de pegado al DOM.
 *
 * Colocado como una capa detras del personaje, recibe lo mismo que el resto:
 * perspectiva, paralaje al mover el raton y el mismo aire de la escena. Eso
 * es justo lo que le faltaba cuando era una imagen fija en una esquina — se
 * leia como papel pegado encima porque no compartia espacio con nada.
 */
const TEXTURE_URL = '/img/wordmark.webp'

// Proporcion del ancho visible que ocupa.
const FILL_RATIO = 0.62

// Cuanto se desplaza con el cursor. Menos que el personaje: al estar detras,
// tiene que moverse menos para que la profundidad se lea bien.
const PARALLAX = 0.12

export default function Wordmark3D({ position = [0, 0, -3], opacity = 1 }) {
  const texture = useTexture(TEXTURE_URL)
  const width = useThree((state) => state.viewport.width)
  const pointer = usePointer()
  const reducedMotion = usePrefersReducedMotion()
  const groupRef = useRef(null)

  const aspect = (texture.image?.height ?? 214) / (texture.image?.width ?? 1200)
  const planeWidth = width * FILL_RATIO
  const planeHeight = planeWidth * aspect

  useFrame(() => {
    const group = groupRef.current
    if (!group || reducedMotion) return
    group.position.x = MathUtils.lerp(group.position.x, pointer.current.x * PARALLAX, 0.05)
    group.position.y = MathUtils.lerp(group.position.y, -pointer.current.y * PARALLAX * 0.5, 0.05)
  })

  return (
    <group position={position}>
      <group ref={groupRef}>
        <mesh>
          <planeGeometry args={[planeWidth, planeHeight]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={opacity}
            // Sin tone mapping: el logotipo debe conservar sus colores de
            // marca exactos, no pasar por la curva de exposicion de la escena.
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}

useTexture.preload(TEXTURE_URL)
