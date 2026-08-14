import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * La red que crece con el scroll.
 *
 * Acompana a todo el contenido de la pagina: al empezar apenas hay cuatro
 * puntos y al llegar al final es una red densa. La web entera es una sola
 * idea que se va construyendo mientras se lee.
 *
 * No se crean ni destruyen objetos al crecer. Se genera la red completa una
 * vez y se dibuja solo una parte con `setDrawRange`. Crecer anadiendo mallas
 * significaria reconstruir geometrias en pleno scroll, que es exactamente lo
 * que hace que un fondo animado se atragante.
 */
const MAX_NODES = 110
const NEIGHBOURS = 2

// Reparto en el espacio, en unidades de mundo.
const SPREAD_X = 13
const SPREAD_Y = 9
const SPREAD_Z = 7

const ACCENT = '#FF6B85'
const LINE = '#B08355'

function mulberry32(seed) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function GrowingNetwork({ density = 0 }) {
  const groupRef = useRef(null)
  const pointsRef = useRef(null)
  const linesRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()
  const viewport = useThree((state) => state.viewport)

  const { positions, segments, edgeOwner } = useMemo(() => {
    const random = mulberry32(770413)
    const nodes = []

    for (let i = 0; i < MAX_NODES; i++) {
      nodes.push([
        (random() - 0.5) * SPREAD_X,
        (random() - 0.5) * SPREAD_Y,
        (random() - 0.5) * SPREAD_Z,
      ])
    }

    const positions = new Float32Array(nodes.length * 3)
    nodes.forEach((node, index) => positions.set(node, index * 3))

    /**
     * Cada arista se apunta al mayor de los dos indices que une. Asi basta
     * con ordenar por ese numero para que las conexiones aparezcan justo
     * cuando aparecen sus dos extremos, y nunca antes.
     */
    const edges = []
    const seen = new Set()

    nodes.forEach((from, i) => {
      const nearest = nodes
        .map((to, j) => ({
          j,
          distance: Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]),
        }))
        .filter((entry) => entry.j !== i)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEIGHBOURS)

      nearest.forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (seen.has(key)) return
        seen.add(key)
        edges.push({ a: i, b: j, owner: Math.max(i, j) })
      })
    })

    edges.sort((a, b) => a.owner - b.owner)

    const segments = new Float32Array(edges.length * 6)
    const edgeOwner = new Int32Array(edges.length)

    edges.forEach((edge, index) => {
      segments.set(nodes[edge.a], index * 6)
      segments.set(nodes[edge.b], index * 6 + 3)
      edgeOwner[index] = edge.owner
    })

    return { positions, segments, edgeOwner }
  }, [])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    const visibleNodes = Math.round(MathUtils.clamp(density, 0, 1) * MAX_NODES)

    if (pointsRef.current) {
      pointsRef.current.geometry.setDrawRange(0, visibleNodes)
    }

    if (linesRef.current) {
      // Busqueda lineal sobre un array ya ordenado: son 200 posiciones y
      // corta en cuanto encuentra el limite.
      let visibleEdges = 0
      while (visibleEdges < edgeOwner.length && edgeOwner[visibleEdges] < visibleNodes) {
        visibleEdges++
      }
      linesRef.current.geometry.setDrawRange(0, visibleEdges * 2)
    }

    if (!reducedMotion) {
      const t = state.clock.elapsedTime
      group.rotation.y = Math.sin(t * 0.05) * 0.16
      group.rotation.x = Math.cos(t * 0.04) * 0.07
    }
  })

  // Se aleja de camara conforme el viewport crece, para que en pantallas
  // anchas no quede una malla de puntos gigante detras del texto.
  const scale = Math.max(0.75, Math.min(1.4, viewport.width / 9))

  return (
    <group ref={groupRef} position={[0, 0, -4]} scale={scale}>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[segments, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={LINE} transparent opacity={0.2} depthWrite={false} />
      </lineSegments>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          color={ACCENT}
          transparent
          opacity={0.62}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
