import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { journey } from '../journey/clock'
import { layerOpacity } from '../journey/stages'
import { nodeConnections, nodePositions } from '../data/nodeLayout'

/**
 * El recorrido con cajas de colores, sin un solo modelo.
 *
 * Esta es la pieza de la fase 0 y la que llevábamos meses saltándonos. Sirve
 * para responder a una sola pregunta: ¿la coreografía funciona?
 *
 * Si con cajas el ritmo del scroll está mal, el encuadre está lejos o la
 * entrada no se entiende, con modelos va a estar exactamente igual de mal —
 * solo que además tardará ocho segundos en cargar y será imposible saber si el
 * problema es la cámara o la malla. Ese fue el error que nos costó semanas:
 * confundir "la transición está mal programada" con "el modelo se ve feo".
 *
 * Cada caja de aquí ocupa el hueco exacto que ocupará su modelo, porque los
 * dos leen la posición del mismo sitio: `tokens`.
 *
 * La portada ya tiene su modelo (fase 1). Lo que queda en cajas es el interior
 * del cerebro, que llega en la fase 2.
 */

function useFade(layer) {
  const ref = useRef(null)

  useFrame(() => {
    const group = ref.current
    if (!group) return

    const opacity = layerOpacity(layer, journey.progress)
    group.visible = opacity > 0.01

    if (!group.visible) return
    group.traverse((object) => {
      if (object.material) object.material.opacity = opacity
    })
  })

  return ref
}

function Connections({ positions }) {
  const geometry = useMemo(() => {
    const points = []

    for (const [a, b] of nodeConnections) {
      const from = positions[a]
      const to = positions[b]
      if (!from || !to) continue

      // Curva, no recta: dos nodos unidos por una recta parecen un cable.
      const mid = from.clone().lerp(to, 0.5).multiplyScalar(1.22)
      const steps = 24

      for (let i = 0; i < steps; i += 1) {
        const t0 = i / steps
        const t1 = (i + 1) / steps
        quadratic(from, mid, to, t0, points)
        quadratic(from, mid, to, t1, points)
      }
    }

    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(points, 3))
    return result
  }, [positions])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#FF9AAA" transparent opacity={0.4} />
    </lineSegments>
  )
}

const TMP_A = new Vector3()
const TMP_B = new Vector3()

function quadratic(from, control, to, t, out) {
  TMP_A.lerpVectors(from, control, t)
  TMP_B.lerpVectors(control, to, t)
  TMP_A.lerp(TMP_B, t)
  out.push(TMP_A.x, TMP_A.y, TMP_A.z)
}

/**
 * El universo neuronal, todavía en cajas: el cerebro flotante y los cinco
 * nodos que lo rodean. Lo sustituye el modelo real en la fase 2.
 */
export default function MindBlockout({ tokens, sections }) {
  const mindRef = useFade('mind')
  const nodesRef = useFade('nodes')
  const { center, radius } = tokens.mind

  const positions = useMemo(() => nodePositions(radius), [radius])

  return (
    <group position={center}>
      <group ref={mindRef}>
        <mesh>
          <icosahedronGeometry args={[radius * 0.62, 2]} />
          <meshStandardMaterial
            color="#F2939E"
            emissive="#FF6B85"
            emissiveIntensity={0.5}
            roughness={0.5}
            flatShading
            transparent
          />
        </mesh>
        <pointLight color="#FF6B85" intensity={12} distance={radius * 4} decay={2} />
      </group>

      <group ref={nodesRef}>
        <Connections positions={positions} />

        {sections.map((section) => {
          const position = positions[section.nodeName]
          if (!position) return null

          return (
            <mesh key={section.id} position={position}>
              <sphereGeometry args={[radius * 0.075, 16, 16]} />
              <meshStandardMaterial
                color={section.accent}
                emissive={section.accent}
                emissiveIntensity={1.4}
                transparent
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
