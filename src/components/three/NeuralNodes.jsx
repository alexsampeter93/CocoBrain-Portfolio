import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { CatmullRomCurve3, Color, Vector3 } from 'three'
import { previewNodePositions, nodeConnections } from '../../data/nodeLayout'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const PINK = '#F2939E'
const GLOW = '#FF6B85'
const LINE = '#C99B6E'

// Un pulso por conexión sería demasiado ruido visual y demasiado dibujo.
// Con menos pulsos que conexiones, la red parece viva sin parecer un
// salvapantallas.
const PULSE_COUNT = 3
const PULSE_SPEED = 0.16

/**
 * Nodo suelto. Respira con un seno desfasado por índice: si todos laten a la
 * vez el conjunto parece parpadear, y desfasados parece que se comunican.
 */
function Node({ position, accent, phase }) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    const t = state.clock.elapsedTime
    const scale = 1 + Math.sin(t * 1.3 + phase) * 0.08
    ref.current.scale.setScalar(scale)
  })

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.13, 24, 20]} />
        <meshStandardMaterial
          color={accent}
          emissive={GLOW}
          emissiveIntensity={0.55}
          roughness={0.35}
        />
      </mesh>
      {/* Halo: una esfera mayor casi transparente. Sobre fondo crema hace
          más por la sensación de brillo que el propio bloom. */}
      <mesh scale={2.3}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color={GLOW} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Punto de luz que recorre una conexión de un extremo al otro. */
function Pulse({ curve, offset }) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((state) => {
    if (!ref.current) return
    if (reducedMotion) {
      ref.current.position.copy(curve.getPointAt(0.5))
      return
    }
    const t = (state.clock.elapsedTime * PULSE_SPEED + offset) % 1
    ref.current.position.copy(curve.getPointAt(t))
    // Se apaga en los extremos: así nace y muere en los nodos en vez de
    // aparecer y desaparecer de golpe a mitad de camino.
    ref.current.material.opacity = Math.sin(t * Math.PI) * 0.9
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.045, 12, 10]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} />
    </mesh>
  )
}

export default function NeuralNodes({ sections }) {
  const reducedMotion = usePrefersReducedMotion()
  const groupRef = useRef(null)

  // Geometría y curvas fuera del bucle de render: crearlas por frame es la
  // forma más rápida de tirar el framerate.
  const { nodes, curves } = useMemo(() => {
    const positions = previewNodePositions

    const nodes = sections
      .filter((section) => positions[section.nodeName])
      .map((section, index) => ({
        id: section.id,
        accent: section.accent,
        position: new Vector3(...positions[section.nodeName]),
        phase: index * 1.7,
      }))

    const curves = nodeConnections
      .filter(([from, to]) => positions[from] && positions[to])
      .map(([from, to]) => {
        const a = new Vector3(...positions[from])
        const b = new Vector3(...positions[to])
        // Punto medio desplazado: una recta entre dos nodos parece un cable,
        // una curva suave parece una conexión.
        const mid = a.clone().lerp(b, 0.5)
        mid.z += 0.35
        mid.y += 0.12
        return new CatmullRomCurve3([a, mid, b])
      })

    return { nodes, curves }
  }, [sections])

  const pulses = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, index) => ({
        curve: curves[index % curves.length],
        offset: index / PULSE_COUNT,
      })),
    [curves],
  )

  // Deriva lenta del conjunto. Muy poca amplitud: lo justo para que la red
  // no parezca una ilustración fija.
  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(t * 0.12) * 0.14
    groupRef.current.rotation.x = Math.cos(t * 0.09) * 0.06
  })

  return (
    <group ref={groupRef}>
      {curves.map((curve, index) => (
        <Line
          key={`line-${index}`}
          points={curve.getPoints(24)}
          color={new Color(LINE)}
          lineWidth={1.1}
          transparent
          opacity={0.35}
        />
      ))}

      {pulses.map((pulse, index) => (
        <Pulse key={`pulse-${index}`} curve={pulse.curve} offset={pulse.offset} />
      ))}

      {nodes.map((node) => (
        <Node
          key={node.id}
          position={node.position}
          accent={node.accent ?? PINK}
          phase={node.phase}
        />
      ))}
    </group>
  )
}
