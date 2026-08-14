import { useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { CatmullRomCurve3, Color, Vector3 } from 'three'
import { previewNodePositions, nodeConnections } from '../../data/nodeLayout'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GLOW = '#FF6B85'
const LINE = '#B08355'

const NODE_RADIUS = 0.055
// Radio de la zona sensible. Seis veces el nodo: es lo que hace que se pueda
// acertar con el dedo sin engordar la bolita.
const HIT_RADIUS = 0.34
const HOVER_SCALE = 1.7

const FIELD_COUNT = 38
const FIELD_INNER_RADIUS = 2.1
const FIELD_OUTER_RADIUS = 5.2
const FIELD_NEIGHBOURS = 2

const AMBIENT_PULSE_SPEED = 0.14

// Pulsos obsesivos: recorren la misma conexion de ida y vuelta sin llegar a
// resolverse nunca. Es el guino al TOC — un pensamiento que vuelve.
const OBSESSIVE_COUNT = 2
const OBSESSIVE_SPEED = 0.42

/**
 * Senales que se propagan al pasar el cursor.
 *
 * Al tocar un nodo sale un impulso hacia cada vecino; al llegar, ese vecino
 * dispara los suyos. Dos saltos son suficientes: con tres la red entera se
 * enciende a la vez y el gesto deja de leerse como propagacion.
 */
const SIGNAL_SPEED = 1.5
const SIGNAL_MAX_GENERATION = 2
const SIGNAL_POOL = 24

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

function Node({
  section,
  position,
  phase,
  active,
  onSelect,
  onAwaken,
  interactive = true,
  fade = 1,
}) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const highlighted = hovered || active

  useFrame((state) => {
    if (!meshRef.current) return
    const breath = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.4 + phase) * 0.09
    const target = breath * (highlighted ? HOVER_SCALE : 1)
    // Lerp en vez de asignar: el cambio de escala tiene que sentirse como un
    // musculo, no como un interruptor.
    meshRef.current.scale.lerp({ x: target, y: target, z: target }, 0.18)
  })

  return (
    <group position={position}>
      {/*
        Zona sensible invisible, mucho mayor que el nodo. Un nodo de 5,5 cm
        de radio es imposible de acertar con el dedo: en tactil el objetivo
        util son unos 9 mm en pantalla, y por eso no funcionaban en movil.
      */}
      <mesh
        visible={false}
        raycast={interactive ? undefined : () => null}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          onAwaken(section.nodeName)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
        // `onPointerDown` ademas de `onClick`: en tactil no hay hover previo,
        // asi el nodo se enciende en cuanto se toca.
        onPointerDown={(event) => {
          event.stopPropagation()
          setHovered(true)
          onAwaken(section.nodeName)
        }}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(section.id)
        }}
      >
        <sphereGeometry args={[HIT_RADIUS, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={meshRef} raycast={() => null}>
        <sphereGeometry args={[NODE_RADIUS, 20, 16]} />
        <meshStandardMaterial
          color={section.accent}
          emissive={GLOW}
          emissiveIntensity={(highlighted ? 1.1 : 0.35) * fade}
          roughness={0.3}
          transparent
          opacity={fade}
        />
      </mesh>

      {highlighted && interactive && (
        <Html center distanceFactor={7} position={[0, NODE_RADIUS * 3.4, 0]}>
          <span className="flex items-center gap-2 whitespace-nowrap border-l-2 border-brain-glow bg-cream/90 py-1 pl-2 pr-3 font-mono text-[11px] leading-none text-coco-dark">
            <span className="tabular-nums text-[9px] text-coco-mid">
              {section.nodeName.replace('node_', 'N')}
            </span>
            {section.label}
          </span>
        </Html>
      )}
    </group>
  )
}

/** Flujo de fondo: recorre una conexion en bucle, sin relacion con el cursor. */
function AmbientPulse({ curve, offset, obsessive = false }) {
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
      // no se resuelve.
      const raw = (elapsed * OBSESSIVE_SPEED + offset) % 2
      t = raw > 1 ? 2 - raw : raw
    } else {
      t = (elapsed * AMBIENT_PULSE_SPEED + offset) % 1
    }

    ref.current.position.copy(curve.getPointAt(t))
    ref.current.material.opacity = Math.sin(t * Math.PI) * (obsessive ? 0.95 : 0.7)
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[obsessive ? 0.028 : 0.022, 10, 8]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} />
    </mesh>
  )
}

/** Campo de fondo: dos geometrias en total, no un objeto por punto. */
function NeuralField() {
  const groupRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const { points, segments } = useMemo(() => {
    const random = mulberry32(20260813)
    const positions = []

    for (let i = 0; i < FIELD_COUNT; i++) {
      // Capa esferica: se evita el centro, que es donde esta el personaje.
      const radius = FIELD_INNER_RADIUS + random() * (FIELD_OUTER_RADIUS - FIELD_INNER_RADIUS)
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

export default function NeuralNodes({ sections, activeSection, onSelect, fade = 1 }) {
  // Por debajo de este umbral no se dibuja nada ni se puede pulsar: la
  // constelacion existe desde el primer frame, pero no debe interceptar
  // clics mientras el visitante sigue en la portada.
  const interactive = fade > 0.5
  const { nodes, curves, edgesByNode } = useMemo(() => {
    const positions = previewNodePositions

    const nodes = sections
      .filter((section) => positions[section.nodeName])
      .map((section, index) => ({
        section,
        position: new Vector3(...positions[section.nodeName]),
        phase: index * 1.7,
      }))

    const curves = []
    const edgesByNode = new Map()

    nodeConnections
      .filter(([from, to]) => positions[from] && positions[to])
      .forEach(([from, to]) => {
        const a = new Vector3(...positions[from])
        const b = new Vector3(...positions[to])
        // Punto medio desplazado: una recta entre dos nodos parece un cable;
        // una curva suave parece una conexion.
        const mid = a.clone().lerp(b, 0.5)
        mid.z += 0.4
        mid.y += 0.15

        const curve = new CatmullRomCurve3([a, mid, b])
        curves.push(curve)

        const register = (origin, target, reversed) => {
          if (!edgesByNode.has(origin)) edgesByNode.set(origin, [])
          edgesByNode.get(origin).push({ curve, target, reversed })
        }

        register(from, to, false)
        register(to, from, true)
      })

    return { nodes, curves, edgesByNode }
  }, [sections])

  const ambient = useMemo(
    () => curves.map((curve, index) => ({ curve, offset: index / curves.length })),
    [curves],
  )

  const obsessive = useMemo(
    () =>
      Array.from({ length: OBSESSIVE_COUNT }, (_, index) => ({
        // Siempre las mismas aristas: la gracia es que el ojo acabe notando
        // que ahi hay algo que no avanza.
        curve: curves[index % curves.length],
        offset: index * 0.55,
      })),
    [curves],
  )

  /**
   * Senales vivas. Van en una ref y no en estado: se crean y mueren varias
   * veces por segundo, y pasar eso por el ciclo de render de React
   * provocaria cientos de renders por interaccion.
   */
  const signalsRef = useRef([])
  const meshRefs = useRef([])

  const emit = useCallback(
    (nodeName, generation, time) => {
      const edges = edgesByNode.get(nodeName)
      if (!edges) return

      edges.forEach((edge) => {
        if (signalsRef.current.length >= SIGNAL_POOL) return
        signalsRef.current.push({
          curve: edge.curve,
          reversed: edge.reversed,
          target: edge.target,
          generation,
          birth: time,
          propagated: false,
        })
      })
    },
    [edgesByNode],
  )

  const awaken = useCallback(
    (nodeName) => {
      // `performance.now()` en vez del reloj de la escena: el disparo llega
      // desde un evento del DOM, fuera del bucle de render.
      emit(nodeName, 0, performance.now() / 1000)
    },
    [emit],
  )

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const signals = signalsRef.current

    for (let i = signals.length - 1; i >= 0; i--) {
      const signal = signals[i]
      const t = (now - signal.birth) * SIGNAL_SPEED

      if (t >= 1) {
        // Al llegar, el nodo de destino dispara los suyos.
        if (!signal.propagated && signal.generation < SIGNAL_MAX_GENERATION) {
          signal.propagated = true
          emit(signal.target, signal.generation + 1, now)
        }
        signals.splice(i, 1)
      }
    }

    // El resto del banco se aparca fuera de cuadro en vez de desmontarse:
    // crear y destruir mallas por frame es lo que mata el framerate.
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return
      const signal = signals[index]

      if (!signal) {
        mesh.visible = false
        return
      }

      const raw = (now - signal.birth) * SIGNAL_SPEED
      const t = signal.reversed ? 1 - raw : raw
      mesh.visible = true
      mesh.position.copy(signal.curve.getPointAt(Math.min(Math.max(t, 0), 1)))
      mesh.material.opacity = Math.sin(raw * Math.PI) * 0.95
      const scale = 1 + Math.sin(raw * Math.PI) * 0.8
      mesh.scale.setScalar(scale)
    })
  })

  if (fade <= 0.01) return null

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
          opacity={0.28 * fade}
        />
      ))}

      {ambient.map((pulse, index) => (
        <AmbientPulse key={`ambient-${index}`} curve={pulse.curve} offset={pulse.offset} />
      ))}

      {obsessive.map((pulse, index) => (
        <AmbientPulse
          key={`obsessive-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          obsessive
        />
      ))}

      {/* Banco de senales reutilizables. */}
      {Array.from({ length: SIGNAL_POOL }, (_, index) => (
        <mesh
          key={`signal-${index}`}
          ref={(node) => {
            meshRefs.current[index] = node
          }}
          visible={false}
        >
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshBasicMaterial color="#FFD2DA" transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {nodes.map((node) => (
        <Node
          key={node.section.id}
          section={node.section}
          position={node.position}
          phase={node.phase}
          active={activeSection === node.section.id}
          onSelect={onSelect}
          onAwaken={awaken}
          interactive={interactive}
          fade={fade}
        />
      ))}
    </group>
  )
}
