import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { CatmullRomCurve3, Color, Vector3 } from 'three'
import { previewNodePositions, nodeConnections } from '../../data/nodeLayout'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GLOW = '#FF6B85'
const LINE = '#B08355'

const NODE_RADIUS = 0.055
const HOVER_SCALE = 1.7

// Campo neuronal de fondo. No son navegables: existen para que la escena
// parezca una mente pensando y no cinco puntos flotando en el vacío.
const FIELD_COUNT = 38
const FIELD_INNER_RADIUS = 2.1
const FIELD_OUTER_RADIUS = 5.2
const FIELD_NEIGHBOURS = 2

const PULSE_SPEED = 0.14

// Pulsos obsesivos: recorren la misma conexión de ida y vuelta sin llegar a
// resolverse nunca. Es el guiño al TOC — un pensamiento que vuelve.
const OBSESSIVE_COUNT = 2
const OBSESSIVE_SPEED = 0.42

/** PRNG con semilla: el campo tiene que ser el mismo en cada render. */
function mulberry32(seed) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Node({ section, position, phase, active, onSelect }) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const highlighted = hovered || active

  useFrame((state) => {
    if (!meshRef.current) return
    const breath = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.4 + phase) * 0.09
    const target = breath * (highlighted ? HOVER_SCALE : 1)
    // Lerp en vez de asignar: el cambio de escala al pasar por encima tiene
    // que sentirse como un músculo, no como un interruptor.
    meshRef.current.scale.lerp({ x: target, y: target, z: target }, 0.18)
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(section.id)
        }}
      >
        <sphereGeometry args={[NODE_RADIUS, 20, 16]} />
        <meshStandardMaterial
          color={section.accent}
          emissive={GLOW}
          emissiveIntensity={highlighted ? 1.1 : 0.35}
          roughness={0.3}
        />
      </mesh>

      {highlighted && (
        <Html center distanceFactor={7} position={[0, NODE_RADIUS * 3.4, 0]}>
          <span className="whitespace-nowrap rounded-full bg-coco-dark px-3 py-1 text-[11px] font-medium text-cream">
            {section.label}
          </span>
        </Html>
      )}
    </group>
  )
}

/** Señal recorriendo una conexión de un nodo al siguiente. */
function Pulse({ curve, offset, obsessive = false }) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((state) => {
    if (!ref.current) return
    if (reducedMotion) {
      ref.current.position.copy(curve.getPointAt(0.5))
      return
    }

    const elapsed = state.clock.elapsedTime
    let t

    if (obsessive) {
      // Onda triangular: llega al final, se da la vuelta y repite. No avanza,
      // no se resuelve. Va más rápido que los demás para que se note el
      // ritmo compulsivo frente al flujo normal.
      const raw = (elapsed * OBSESSIVE_SPEED + offset) % 2
      t = raw > 1 ? 2 - raw : raw
    } else {
      t = (elapsed * PULSE_SPEED + offset) % 1
    }

    ref.current.position.copy(curve.getPointAt(t))
    // Se apaga en los extremos: nace y muere dentro de los nodos en vez de
    // aparecer de la nada a mitad del recorrido.
    ref.current.material.opacity = Math.sin(t * Math.PI) * (obsessive ? 0.95 : 0.75)
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[obsessive ? 0.028 : 0.022, 10, 8]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} />
    </mesh>
  )
}

/**
 * Campo neuronal de fondo: puntos en una capa esférica alrededor del
 * personaje, unidos a sus vecinos más cercanos.
 *
 * Va todo en dos geometrías —un `points` y un `lineSegments`— en lugar de un
 * objeto por nodo. Con 38 nodos y ~70 aristas, una malla por elemento serían
 * cien y pico llamadas de dibujo por frame para algo que es decorado.
 */
function NeuralField() {
  const groupRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const { points, segments } = useMemo(() => {
    const random = mulberry32(20260813)
    const positions = []

    for (let i = 0; i < FIELD_COUNT; i++) {
      // Distribución en capa esférica: se evita el centro, que es donde está
      // el personaje. Si no, aparecen puntos dentro de su cabeza.
      const radius =
        FIELD_INNER_RADIUS + random() * (FIELD_OUTER_RADIUS - FIELD_INNER_RADIUS)
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)

      positions.push(
        new Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta) * 0.62,
          radius * Math.cos(phi) * 0.5,
        ),
      )
    }

    const points = new Float32Array(positions.length * 3)
    positions.forEach((vector, index) => {
      points.set([vector.x, vector.y, vector.z], index * 3)
    })

    // Cada nodo se une a sus vecinos más próximos. Un grafo por cercanía se
    // lee como tejido; uno aleatorio se lee como ruido.
    const seen = new Set()
    const segmentList = []

    positions.forEach((from, i) => {
      const nearest = positions
        .map((to, j) => ({ j, distance: from.distanceTo(to) }))
        .filter((entry) => entry.j !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, FIELD_NEIGHBOURS)

      nearest.forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (seen.has(key)) return
        seen.add(key)
        segmentList.push(from, positions[j])
      })
    })

    const segments = new Float32Array(segmentList.length * 3)
    segmentList.forEach((vector, index) => {
      segments.set([vector.x, vector.y, vector.z], index * 3)
    })

    return { points, segments }
  }, [])

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return
    // Rotación muy lenta: da vida sin que se lea como "algo está girando".
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.018
  })

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[segments, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={LINE} transparent opacity={0.16} depthWrite={false} />
      </lineSegments>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color={LINE}
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export default function NeuralNodes({ sections, activeSection, onSelect }) {
  const { nodes, curves } = useMemo(() => {
    const positions = previewNodePositions

    const nodes = sections
      .filter((section) => positions[section.nodeName])
      .map((section, index) => ({
        section,
        position: new Vector3(...positions[section.nodeName]),
        phase: index * 1.7,
      }))

    const curves = nodeConnections
      .filter(([from, to]) => positions[from] && positions[to])
      .map(([from, to]) => {
        const a = new Vector3(...positions[from])
        const b = new Vector3(...positions[to])
        // Punto medio desplazado: una recta entre dos nodos parece un cable;
        // una curva suave parece una conexión.
        const mid = a.clone().lerp(b, 0.5)
        mid.z += 0.4
        mid.y += 0.15
        return new CatmullRomCurve3([a, mid, b])
      })

    return { nodes, curves }
  }, [sections])

  const pulses = useMemo(
    () => curves.map((curve, index) => ({ curve, offset: index / curves.length })),
    [curves],
  )

  const obsessivePulses = useMemo(
    () =>
      Array.from({ length: OBSESSIVE_COUNT }, (_, index) => ({
        // Siempre las mismas aristas: la gracia es que sean reconocibles,
        // que el ojo acabe notando que ahí hay algo que no avanza.
        curve: curves[index % curves.length],
        offset: index * 0.55,
      })),
    [curves],
  )

  return (
    <group>
      <NeuralField />

      {curves.map((curve, index) => (
        <Line
          key={`line-${index}`}
          points={curve.getPoints(28)}
          color={new Color(LINE)}
          lineWidth={0.9}
          transparent
          opacity={0.28}
        />
      ))}

      {pulses.map((pulse, index) => (
        <Pulse key={`pulse-${index}`} curve={pulse.curve} offset={pulse.offset} />
      ))}

      {obsessivePulses.map((pulse, index) => (
        <Pulse
          key={`obsessive-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          obsessive
        />
      ))}

      {nodes.map((node) => (
        <Node
          key={node.section.id}
          section={node.section}
          position={node.position}
          phase={node.phase}
          active={activeSection === node.section.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
