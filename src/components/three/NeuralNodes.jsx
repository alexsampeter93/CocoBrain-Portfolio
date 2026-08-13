import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { CatmullRomCurve3, Color, Vector3 } from 'three'
import { previewNodePositions, nodeConnections } from '../../data/nodeLayout'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GLOW = '#FF6B85'
const LINE = '#B08355'

// Nodos pequeños. La versión anterior usaba esferas de radio 0.13 con un halo
// del doble: a tamaño de pantalla parecían chicles y dominaban la escena por
// encima del personaje.
const NODE_RADIUS = 0.055
const HOVER_SCALE = 1.7

const PULSE_SPEED = 0.14

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

/** Punto de luz recorriendo una conexión. */
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
    // Se apaga en los extremos: nace y muere en los nodos, en vez de
    // aparecer de la nada a mitad del recorrido.
    ref.current.material.opacity = Math.sin(t * Math.PI) * 0.75
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.022, 10, 8]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} />
    </mesh>
  )
}

/** Polvo en suspensión. Barato y es lo que da atmósfera y sensación de aire. */
function Dust({ count = 90 }) {
  const ref = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      array[i * 3] = (Math.random() - 0.5) * 8
      array[i * 3 + 1] = (Math.random() - 0.5) * 6
      array[i * 3 + 2] = (Math.random() - 0.5) * 5
    }
    return array
  }, [count])

  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.02
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color={LINE}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export default function NeuralNodes({ sections, activeSection, onSelect }) {
  // Curvas y geometría fuera del bucle de render.
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

  return (
    <group>
      <Dust />

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
