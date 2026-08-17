import { Vector3 } from 'three'
import { knowledge } from '../data/knowledge'
import { knowledgeLinks, neighboursOf } from '../data/network'

/**
 * Convierte el GRAFO en posiciones dentro del cerebro.
 *
 * Es el puente entre los datos y la escena, y existe para que añadir una
 * tecnología en `knowledge.js` no obligue a colocarla a mano en el espacio.
 * Antes las posiciones se sorteaban sueltas y no significaban nada; ahora la
 * forma de la nube **sale de las relaciones**.
 *
 * ## Cómo se colocan
 *
 * Un reparto al azar dentro del volumen deja los nodos relacionados lejos unos
 * de otros, y entonces las conexiones cruzan el cerebro de lado a lado: se ve
 * una maraña, no una estructura.
 *
 * Así que se hacen unas cuantas pasadas de relajación: los nodos unidos se
 * atraen, todos los pares se repelen un poco para que no se solapen, y al
 * final se comprime todo dentro del elipsoide. Es un algoritmo de fuerzas
 * clásico, resuelto UNA vez al cargar —no por frame— y con semilla fija para
 * que la red sea siempre la misma.
 *
 * Lo importante: los nodos con más conexiones acaban hacia el centro y los
 * sueltos hacia fuera, sin que nadie lo haya decidido a mano. La jerarquía
 * aparece sola porque está en los datos.
 */

const PASSES = 90
const ATTRACTION = 0.045
const REPULSION = 0.02
/** Semiejes del elipsoide inscrito, en fracción del diámetro del cerebro. */
const RADII = [0.36, 0.26, 0.32]

function mulberry32(seed) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DELTA = new Vector3()

export function buildNetworkLayout(size) {
  const random = mulberry32(20260817)

  // Reparto inicial en una esfera. La relajación se encarga del resto.
  const points = knowledge.map(() => {
    const v = new Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1)
    return v.lengthSq() < 0.0001 ? v.set(0.1, 0.1, 0.1) : v.normalize().multiplyScalar(Math.cbrt(random()))
  })

  const index = new Map(knowledge.map((node, i) => [node.id, i]))

  for (let pass = 0; pass < PASSES; pass += 1) {
    // Atracción: lo que está conectado se junta.
    knowledgeLinks.forEach(([a, b]) => {
      const i = index.get(a)
      const j = index.get(b)
      if (i === undefined || j === undefined) return

      DELTA.subVectors(points[j], points[i]).multiplyScalar(ATTRACTION)
      points[i].add(DELTA)
      points[j].sub(DELTA)
    })

    // Repulsión: nadie se pega a nadie. Con menos de veinte nodos, comparar
    // todos contra todos son doscientas cuentas por pasada; no compensa
    // complicarlo con una rejilla.
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        DELTA.subVectors(points[i], points[j])
        const distance = Math.max(DELTA.length(), 0.05)
        DELTA.multiplyScalar(REPULSION / (distance * distance))
        points[i].add(DELTA)
        points[j].sub(DELTA)
      }
    }
  }

  /**
   * Se comprime dentro del elipsoide. Cualquier cosa que la relajación haya
   * empujado fuera vuelve dentro, así que la garantía de que ningún nodo asoma
   * del cerebro no depende de cómo haya salido la simulación.
   */
  let furthest = 0
  points.forEach((p) => {
    furthest = Math.max(furthest, p.length())
  })
  const normalise = furthest > 0 ? 1 / furthest : 1

  const positions = new Map()
  knowledge.forEach((node, i) => {
    const p = points[i].multiplyScalar(normalise)
    positions.set(
      node.id,
      new Vector3(p.x * size * RADII[0], p.y * size * RADII[1], p.z * size * RADII[2]),
    )
  })

  return {
    positions,
    /** Grado de cada nodo: cuántas conexiones tiene. Se usa para el tamaño. */
    degree: new Map(knowledge.map((node) => [node.id, neighboursOf.get(node.id)?.length ?? 0])),
  }
}
