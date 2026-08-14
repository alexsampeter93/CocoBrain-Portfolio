import { useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { AdditiveBlending, CatmullRomCurve3, Color, Vector3 } from 'three'
import { nodePositions, nodeConnections } from '../../data/nodeLayout'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GLOW = '#FF6B85'
const LINE = '#B08355'

/**
 * Todas las medidas salen del radio de la constelacion, no son fijas.
 *
 * Antes eran numeros absolutos, y en movil —donde todo es mas pequeno— los
 * nodos quedaban desproporcionados. Ademas los cinco nodos eran identicos al
 * polvo del fondo, asi que la escena se leia como puntos sueltos y no como una
 * red: no habia jerarquia que mirar.
 *
 * Estos cinco son los protagonistas y se nota. El campo de fondo es
 * deliberadamente pequeno y apagado: esta ahi para dar profundidad, no para
 * competir.
 */
const NODE_SCALE = 0.038
// Zona sensible, casi tres veces el nodo. Es lo que hace que se pueda acertar
// con el dedo sin engordar la bolita.
const HIT_SCALE = 0.11
const HOVER_SCALE = 1.7

const FIELD_COUNT = 38
const FIELD_INNER = 1.35
const FIELD_OUTER = 2.6
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

function Node({ section, position, phase, active, onSelect, onAwaken, nodeRadius, hitRadius }) {
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
        <sphereGeometry args={[hitRadius, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={meshRef} raycast={() => null}>
        <sphereGeometry args={[nodeRadius, 20, 16]} />
        <meshStandardMaterial
          color={section.accent}
          emissive={GLOW}
          emissiveIntensity={highlighted ? 1.4 : 0.55}
          roughness={0.3}
          transparent
        />
      </mesh>

      {/* Halo que da cuerpo al nodo. Un punto emisivo pelado se lee como un
          píxel encendido; con el halo se lee como algo que emite luz. */}
      <mesh raycast={() => null} scale={highlighted ? 2.6 : 2}>
        <sphereGeometry args={[nodeRadius, 16, 12]} />
        <meshBasicMaterial
          color={GLOW}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {highlighted && (
        <Html center distanceFactor={7} position={[0, nodeRadius * 3.4, 0]}>
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
function AmbientPulse({ curve, offset, size, obsessive = false }) {
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
      <sphereGeometry args={[size * (obsessive ? 0.55 : 0.42), 10, 8]} />
      <meshBasicMaterial color={GLOW} transparent depthWrite={false} />
    </mesh>
  )
}

/** Campo de fondo: dos geometrias en total, no un objeto por punto. */
function NeuralField({ scale }) {
  const groupRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  const { points, segments } = useMemo(() => {
    const random = mulberry32(20260813)
    const positions = []

    for (let i = 0; i < FIELD_COUNT; i++) {
      // Capa esferica: se evita el centro, que es donde esta el cerebro.
      const radius = scale * (FIELD_INNER + random() * (FIELD_OUTER - FIELD_INNER))
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
  }, [scale])

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
        {/* Pequeño y apagado a propósito: el campo da profundidad, no compite
            con los cinco nodos que sí importan. */}
        <pointsMaterial
          size={scale * 0.009}
          color={LINE}
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export default function NeuralNodes({
  sections,
  activeSection,
  onSelect,
  radius = 3.4,
  layer = 'nodes',
}) {
  const rootRef = useRef(null)
  const basesRef = useRef(null)
  const fadeRef = useRef(-1)

  const nodeRadius = radius * NODE_SCALE
  const hitRadius = radius * HIT_SCALE

  /**
   * El desvanecido se aplica aqui dentro, leyendo el progreso del scroll en
   * cada frame. Pasarlo como prop obligaria a re-renderizar todo el arbol en
   * cada pixel de scroll, que es exactamente lo que hacia que el recorrido
   * fuera a tirones.
   *
   * Con `visible = false` el grupo entero deja de dibujarse Y de recibir
   * raycast, asi que los nodos tampoco interceptan clics desde la portada.
   */
  useFrame(() => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity(layer, journey.progress)
    // Fuera del tramo de aparicion el valor no se mueve, y esos son casi todos
    // los frames. Recorrer el grafo entero en cada uno para no cambiar nada
    // era trabajo puro.
    if (Math.abs(fade - fadeRef.current) < 0.002) return
    fadeRef.current = fade

    root.visible = fade > 0.02
    if (!root.visible) return

    // El grafo se recorre una sola vez, guardando la opacidad original de cada
    // material. A partir de ahi solo se multiplican valores.
    if (!basesRef.current) {
      basesRef.current = []
      root.traverse((object) => {
        if (!object.material) return
        object.material.transparent = true
        basesRef.current.push([object.material, object.material.opacity])
      })
    }

    for (const [material, base] of basesRef.current) material.opacity = base * fade
  })
  const { nodes, curves, edgesByNode } = useMemo(() => {
    // El radio viene de `tokens.mind.radius`, asi que la constelacion se
    // adapta al tamano de pantalla conservando la forma.
    const positions = nodePositions(radius)

    const nodes = sections
      .filter((section) => positions[section.nodeName])
      .map((section, index) => ({
        section,
        position: positions[section.nodeName].clone(),
        phase: index * 1.7,
      }))

    const curves = []
    const edgesByNode = new Map()

    nodeConnections
      .filter(([from, to]) => positions[from] && positions[to])
      .forEach(([from, to]) => {
        const a = positions[from].clone()
        const b = positions[to].clone()
        // Punto medio desplazado: una recta entre dos nodos parece un cable;
        // una curva suave parece una conexion.
        const mid = a.clone().lerp(b, 0.5)
        mid.z += radius * 0.12
        mid.y += radius * 0.045

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
  }, [sections, radius])

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

  return (
    <group ref={rootRef} visible={false}>
      <NeuralField scale={radius} />

      {curves.map((curve, index) => (
        <Line
          key={`line-${index}`}
          points={curve.getPoints(28)}
          color={new Color(LINE)}
          lineWidth={1.4}
          transparent
          opacity={0.34}
        />
      ))}

      {ambient.map((pulse, index) => (
        <AmbientPulse
          key={`ambient-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          size={nodeRadius}
        />
      ))}

      {obsessive.map((pulse, index) => (
        <AmbientPulse
          key={`obsessive-${index}`}
          curve={pulse.curve}
          offset={pulse.offset}
          size={nodeRadius}
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
          <sphereGeometry args={[nodeRadius * 0.5, 10, 8]} />
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
          nodeRadius={nodeRadius}
          hitRadius={hitRadius}
        />
      ))}
    </group>
  )
}
