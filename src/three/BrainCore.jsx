import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Object3D,
} from 'three'
import { journey } from '../journey/clock'
import { layerOpacity, nodeFocusAt } from '../journey/stages'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { KIND_COLORS, knowledge } from '../data/knowledge'
import { knowledgeLinks, relatedTo } from '../data/network'
import { buildNetworkLayout } from './networkLayout'

/**
 * La red de conocimiento que vive DENTRO del cerebro.
 *
 * Este componente **no sabe qué tecnologías hay**. Recibe un grafo y lo dibuja.
 * Nodos, etiquetas, familias y relaciones se cambian en `data/knowledge.js` y
 * `data/network.js` sin tocar una línea de aquí, que era justo el objetivo:
 * poder editar la red sin rehacer la lógica 3D.
 *
 * ## Cómo se ve a través del cristal
 *
 * Se dibuja DESPUÉS del cerebro, en aditivo y sin comprobar profundidad. No es
 * un truco para esquivar una limitación de la transmisión: un punto de luz
 * visto a través de vidrio se percibe como brillo sumado sobre el cristal, no
 * como un objeto tapado. Es la forma correcta de representarlo.
 */

const MODEL_URL = '/preview/node-core.glb'
const DRACO_PATH = '/draco/'

const LINE = '#B85C76'
const LINE_ACTIVE = '#F08FA5'

/**
 * Tamaño del nodo como fracción del cerebro, por peso.
 *
 * Un porcentaje del modelo no dice nada por sí solo: lo que decide si algo se
 * ve es cuántos píxeles ocupa, y eso depende de dónde para la cámara. Estos
 * valores son el mínimo para que se lean como puntos de luz y no como ruido.
 */
const SIZE_BY_WEIGHT = { 1: 0.042, 2: 0.055, 3: 0.072 }

const DUMMY = new Object3D()

export default function BrainCore({ size, sections = [], activeSection = null }) {
  /**
   * Qué área está enfocada AHORA, siguiendo al scroll.
   *
   * No basta con el nodo pulsado: durante el recorrido la cámara va llegando a
   * cada área sin que nadie haga clic, y la red de dentro tiene que responder
   * igual. Se lee del mismo reloj que el resto, y solo se avisa a React cuando
   * cambia de área —cinco veces en todo el recorrido, no sesenta por segundo—.
   */
  const [touring, setTouring] = useState(null)
  const touringRef = useRef(null)

  useFrame(() => {
    const focus = nodeFocusAt(journey.progress, sections.length)
    const id = focus && focus.focus > 0.25 ? sections[focus.index]?.id ?? null : null

    if (id !== touringRef.current) {
      touringRef.current = id
      setTouring(id)
    }
  })

  const focused = activeSection ?? touring

  return <Network size={size} focused={focused} />
}

function Network({ size, focused }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const reducedMotion = usePrefersReducedMotion()

  const meshRef = useRef(null)
  const rootRef = useRef(null)
  const linesRef = useRef(null)
  const activeLinesRef = useRef(null)
  const fadeRef = useRef(-1)

  const { geometry, unit, nodes, lines } = useMemo(() => {
    let found = null
    scene.traverse((object) => {
      if (!found && object.isMesh) found = object.geometry
    })

    // El modelo se normaliza a una unidad: sin esto, la fracción de arriba
    // multiplicaría el tamaño crudo del glb, que no significa nada.
    let unit = 1
    if (found) {
      found.computeBoundingSphere()
      unit = 1 / (found.boundingSphere?.radius * 2 || 1)
    }

    const { positions } = buildNetworkLayout(size)

    const nodes = knowledge
      .filter((node) => positions.has(node.id))
      .map((node, index) => ({
        ...node,
        position: positions.get(node.id),
        color: new Color(KIND_COLORS[node.kind] ?? KIND_COLORS.framework),
        phase: index * 1.7,
        scale: (SIZE_BY_WEIGHT[node.weight] ?? SIZE_BY_WEIGHT[1]) * unit * size,
      }))

    const lines = knowledgeLinks
      .filter(([a, b]) => positions.has(a) && positions.has(b))
      .map(([a, b]) => ({ a, b, from: positions.get(a), to: positions.get(b) }))

    return { geometry: found, unit, nodes, lines }
  }, [scene, size])

  /**
   * El puente entre las dos capas de la red.
   *
   * Al activar un área del portfolio, se consulta a los datos qué
   * conocimientos la componen y se encienden esos. La escena no sabe qué
   * significa "Proyectos": solo pregunta.
   */
  const highlighted = useMemo(() => new Set(relatedTo(focused)), [focused])

  /** Las dos geometrías de líneas: las apagadas y las de la sección activa. */
  const { dim, hot } = useMemo(() => {
    const build = (list) => {
      const values = []
      list.forEach(({ from, to }) => {
        values.push(from.x, from.y, from.z, to.x, to.y, to.z)
      })
      const result = new BufferGeometry()
      result.setAttribute('position', new Float32BufferAttribute(values, 3))
      return result
    }

    // Solo se enciende una arista si SUS DOS extremos pertenecen al área.
    // Encender una con un solo extremo sugiere una relación que no existe.
    const isHot = ({ a, b }) => highlighted.has(a) && highlighted.has(b)

    return { dim: build(lines.filter((l) => !isHot(l))), hot: build(lines.filter(isHot)) }
  }, [lines, highlighted])

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity('mind', journey.progress)
    if (Math.abs(fade - fadeRef.current) > 0.002) {
      fadeRef.current = fade
      root.visible = fade > 0.02
      if (linesRef.current) linesRef.current.material.opacity = 0.3 * fade
      if (activeLinesRef.current) activeLinesRef.current.material.opacity = 0.75 * fade
    }

    if (!root.visible) return

    const mesh = meshRef.current
    if (!mesh) return

    const t = reducedMotion ? 0 : state.clock.elapsedTime

    nodes.forEach((node, index) => {
      const lit = highlighted.has(node.id)

      // El latido va desfasado por nodo: a la vez se lee como un parpadeo de
      // la escena entera, desfasado se lee como actividad.
      const pulse = 1 + Math.sin(t * (lit ? 2.3 : 1.6) + node.phase) * (lit ? 0.26 : 0.13)
      const emphasis = lit ? 1.6 : 1

      DUMMY.position.copy(node.position)
      DUMMY.scale.setScalar(node.scale * pulse * emphasis * fadeRef.current)
      DUMMY.updateMatrix()
      mesh.setMatrixAt(index, DUMMY.matrix)

      // El color también sale de los datos: la familia decide el tono, y estar
      // relacionado con el área activa lo aclara.
      mesh.setColorAt(index, lit ? WHITEN.copy(node.color).lerp(WHITE, 0.45) : node.color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  if (!geometry || nodes.length === 0) return null

  return (
    <group ref={rootRef} visible={false} renderOrder={10}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, nodes.length]}
        renderOrder={12}
        raycast={() => null}
      >
        <meshStandardMaterial
          emissive="#FFFFFF"
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0}
          transparent
          opacity={0.85}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>

      <lineSegments ref={linesRef} geometry={dim} renderOrder={11} raycast={() => null}>
        <lineBasicMaterial
          color={LINE}
          transparent
          opacity={0.3}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>

      <lineSegments ref={activeLinesRef} geometry={hot} renderOrder={12} raycast={() => null}>
        <lineBasicMaterial
          color={LINE_ACTIVE}
          transparent
          opacity={0.75}
          depthTest={false}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}

// Colores reutilizados: crearlos por frame generaría basura.
const WHITE = new Color('#FFFFFF')
const WHITEN = new Color()

useGLTF.preload(MODEL_URL, DRACO_PATH)
