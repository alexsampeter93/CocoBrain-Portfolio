import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { journey } from '../journey/clock'
import { layerOpacity } from '../journey/stages'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * La red que vive DENTRO del cerebro.
 *
 * Solo tiene sentido con el cristal encendido: son nodos suspendidos en el
 * volumen, vistos a traves del material. Con el cerebro opaco no se ven, y por
 * eso el valor de transmision se decidio antes de escribir esto.
 */

const MODEL_URL = '/preview/node-core.glb'
const DRACO_PATH = '/draco/'

/** Paleta dictada por Alex. */
const NODE = '#E98FA0'
const NODE_ACTIVE = '#FFB6C1'
const LINE = '#B85C76'
const LINE_ACTIVE = '#F08FA5'

const COUNT = 19
/** Cuantos de ellos van encendidos. Uno de cada cinco. */
const ACTIVE_EVERY = 5
/**
 * Tamano del nodo como fraccion del cerebro.
 *
 * La especificacion pedia entre 1,5% y 3%, y a esa medida NO SE VEN. El
 * motivo se puede medir: en la vista general el cerebro ocupa unos 170 pixeles
 * de ancho, asi que un nodo al 2% son cuatro pixeles —menos que el grosor de
 * las lineas que los unen—.
 *
 * Un porcentaje del modelo no dice nada por si solo; lo que decide si algo se
 * ve es cuantos pixeles ocupa en pantalla, y eso depende de donde para la
 * camara. Al 6% son unos diez pixeles, que es el minimo para que se lea como
 * un punto de luz y no como ruido.
 */
const NODE_SCALE = 0.06
/** Vecinos a los que se conecta cada nodo. */
const NEIGHBOURS = 3

/**
 * Semilla fija: la constelacion interior tiene que ser la misma en cada carga.
 * Con `Math.random()` cambiaria en cada recarga y seria imposible juzgarla.
 */
function mulberry32(seed) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Puntos repartidos dentro del volumen, sin que ninguno asome.
 *
 * No se comprueba contra la malla real: se usa un elipsoide inscrito, mas
 * estrecho que el cerebro en los tres ejes. Un cerebro es aproximadamente
 * ovalado, asi que un elipsoide al 55% cabe entero por dentro con margen, y la
 * comprobacion cuesta cero. Lanzar rayos contra 58.000 triangulos para
 * verificar veinte puntos seria mucho trabajo para resolver algo que la
 * geometria ya garantiza.
 *
 * La raiz cubica del azar es lo que evita que se amontonen en el centro: sin
 * ella, repartir uniformemente el RADIO concentra los puntos donde hay menos
 * volumen.
 */
function seedPositions(size) {
  const random = mulberry32(20260816)
  const points = []

  // Proporciones del cerebro: mas largo que alto, mas alto que ancho.
  const radii = new Vector3(size * 0.3, size * 0.2, size * 0.25)

  while (points.length < COUNT) {
    const direction = new Vector3(
      random() * 2 - 1,
      random() * 2 - 1,
      random() * 2 - 1,
    )
    if (direction.lengthSq() > 1 || direction.lengthSq() < 0.0001) continue

    direction.normalize().multiplyScalar(Math.cbrt(random()))
    points.push(new Vector3(direction.x * radii.x, direction.y * radii.y, direction.z * radii.z))
  }

  return points
}

/** Cada nodo con sus vecinos mas cercanos, sin repetir pares. */
function seedLinks(points) {
  const seen = new Set()
  const links = []

  points.forEach((from, i) => {
    points
      .map((to, j) => ({ j, distance: from.distanceToSquared(to) }))
      .filter((entry) => entry.j !== i)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEIGHBOURS)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (seen.has(key)) return
        seen.add(key)
        links.push([i, j])
      })
  })

  return links
}

const DUMMY = new Object3D()

export default function BrainCore({ size }) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const reducedMotion = usePrefersReducedMotion()

  const normalRef = useRef(null)
  const activeRef = useRef(null)
  const rootRef = useRef(null)
  const fadeRef = useRef(-1)

  const { geometry, unit, active, normal, lines, activeLines } = useMemo(() => {
    let found = null
    scene.traverse((object) => {
      if (!found && object.isMesh) found = object.geometry
    })

    /**
     * El modelo se normaliza a UNA unidad antes de nada.
     *
     * Sin esto, `NODE_SCALE` no significaba nada: multiplicaba el tamano crudo
     * del glb, que puede ser cualquier cosa segun como lo exportase el
     * generador. "El 6% del cerebro" solo es cierto si el nodo mide 1 de
     * partida.
     */
    let unit = 1
    if (found) {
      found.computeBoundingSphere()
      unit = 1 / (found.boundingSphere?.radius * 2 || 1)
    }

    const points = seedPositions(size)
    const active = points.filter((_, index) => index % ACTIVE_EVERY === 0)
    const normal = points.filter((_, index) => index % ACTIVE_EVERY !== 0)

    const links = seedLinks(points)
    // Un tercio de las conexiones van encendidas. No se eligen al azar en cada
    // carga: es la misma lista siempre, para poder juzgarla.
    const activeLinks = links.filter((_, index) => index % 3 === 0)
    const dimLinks = links.filter((_, index) => index % 3 !== 0)

    const build = (list) => {
      const values = []
      list.forEach(([a, b]) => {
        values.push(points[a].x, points[a].y, points[a].z)
        values.push(points[b].x, points[b].y, points[b].z)
      })
      const result = new BufferGeometry()
      result.setAttribute('position', new Float32BufferAttribute(values, 3))
      return result
    }

    return {
      geometry: found,
      unit,
      points,
      active,
      normal,
      lines: build(dimLinks),
      activeLines: build(activeLinks),
    }
  }, [scene, size])

  const materials = useMemo(
    () => ({
      normal: new MeshStandardMaterial({
        color: new Color(NODE),
        emissive: new Color(NODE),
        emissiveIntensity: 1.0,
        roughness: 0.3,
        metalness: 0,
        /**
         * OPACOS, y es lo que hace que se vean.
         *
         * Con `transparent: true` entraban en la misma cola de dibujado que el
         * cerebro, que tambien es transparente. Los transparentes se ordenan
         * por distancia a la camara, y como el cerebro esta centrado en el
         * mismo punto que ellos el orden salia inestable: el cascaron acababa
         * dibujandose encima y los tapaba.
         *
         * Siendo opacos se dibujan ANTES, entran en el buffer del que el
         * cristal saca lo que hay al otro lado, y por eso aparecen a traves de
         * el. El desvanecido se hace por intensidad emisiva, que no necesita
         * transparencia.
         */
        transparent: false,
        toneMapped: false,
      }),
      active: new MeshStandardMaterial({
        color: new Color(NODE_ACTIVE),
        emissive: new Color(NODE_ACTIVE),
        emissiveIntensity: 2.2,
        roughness: 0.25,
        metalness: 0,
        /**
         * OPACOS, y es lo que hace que se vean.
         *
         * Con `transparent: true` entraban en la misma cola de dibujado que el
         * cerebro, que tambien es transparente. Los transparentes se ordenan
         * por distancia a la camara, y como el cerebro esta centrado en el
         * mismo punto que ellos el orden salia inestable: el cascaron acababa
         * dibujandose encima y los tapaba.
         *
         * Siendo opacos se dibujan ANTES, entran en el buffer del que el
         * cristal saca lo que hay al otro lado, y por eso aparecen a traves de
         * el. El desvanecido se hace por intensidad emisiva, que no necesita
         * transparencia.
         */
        transparent: false,
        toneMapped: false,
      }),
    }),
    [],
  )

  useFrame((state) => {
    const root = rootRef.current
    if (!root) return

    const fade = layerOpacity('mind', journey.progress)
    if (Math.abs(fade - fadeRef.current) > 0.002) {
      fadeRef.current = fade
      root.visible = fade > 0.02
      // Por intensidad, no por opacidad: los materiales son opacos a proposito.
      materials.normal.emissiveIntensity = 1.0 * fade
      materials.active.emissiveIntensity = 2.2 * fade
    }

    if (!root.visible) return

    const t = reducedMotion ? 0 : state.clock.elapsedTime
    const base = size * NODE_SCALE * unit

    /**
     * El latido va desfasado por nodo. A la vez se lee como un parpadeo de la
     * escena entera; desfasado se lee como actividad.
     */
    const write = (mesh, list, speed, amount) => {
      if (!mesh) return
      list.forEach((point, index) => {
        const pulse = 1 + Math.sin(t * speed + index * 1.9) * amount
        DUMMY.position.copy(point)
        DUMMY.scale.setScalar(base * pulse)
        DUMMY.updateMatrix()
        mesh.setMatrixAt(index, DUMMY.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    write(normalRef.current, normal, 1.6, 0.14)
    write(activeRef.current, active, 2.3, 0.26)
  })

  if (!geometry) return null

  return (
    <group ref={rootRef} visible={false}>
      {/* Una sola llamada de dibujado por grupo, no una por nodo. */}
      <instancedMesh
        ref={normalRef}
        args={[geometry, materials.normal, normal.length]}
        raycast={() => null}
      />
      <instancedMesh
        ref={activeRef}
        args={[geometry, materials.active, active.length]}
        raycast={() => null}
      />

      <lineSegments geometry={lines} raycast={() => null}>
        <lineBasicMaterial color={LINE} transparent opacity={0.3} depthWrite={false} />
      </lineSegments>

      <lineSegments geometry={activeLines} raycast={() => null}>
        <lineBasicMaterial
          color={LINE_ACTIVE}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)
