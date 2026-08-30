import { Vector3 } from 'three'
import { knowledge } from '../data/knowledge.js'
import { knowledgeLinks, neighboursOf } from '../data/network.js'

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
/**
 * Semiejes del elipsoide inscrito, en fracción del diámetro del cerebro.
 *
 * El `spread` que los multiplica no es un ajuste fino, resuelve un problema
 * concreto: desde que la cámara entra en el cerebro, la red tiene que caber en
 * el encuadre VISTA DESDE DENTRO. Y el casco solo llega a 0,49, así que si la
 * nube ocupa hasta 0,36 no queda sitio donde ponerse: la cámara acaba en mitad
 * de la nube, con dos nodos en la cara y el resto a la espalda.
 */
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

/**
 * @param size   el tamaño del cerebro, en unidades de mundo
 * @param spread cuánto de ese cerebro ocupa la nube. Menor en vertical: hay que
 *               dejarle sitio a la cámara para colocarse y ver la red entera
 *               desde dentro.
 */
export function buildNetworkLayout(size, spread = 1) {
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
   * Primero se centra en su propio centro de masas.
   *
   * La relajación no tiene por qué acabar centrada: las fuerzas se compensan
   * entre pares, pero el conjunto puede quedar desplazado un diez por ciento
   * hacia un lado. Daba igual mientras la red se veía desde lejos; desde que la
   * cámara entra y se coloca a una distancia calculada del ORIGEN, ese
   * desplazamiento se convierte en un encuadre torcido, con la red pegada a una
   * esquina y un tercio de pantalla vacío.
   *
   * La regla de siempre: si un dato depende de la geometría, se mide. El centro
   * de la nube es la media de sus nodos, no el punto donde se supone que está.
   */
  const centre = new Vector3()
  points.forEach((p) => centre.add(p))
  centre.divideScalar(points.length || 1)
  points.forEach((p) => p.sub(centre))

  /**
   * Y se comprime dentro del elipsoide. Cualquier cosa que la relajación haya
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
      new Vector3(
        p.x * size * RADII[0] * spread,
        p.y * size * RADII[1] * spread,
        p.z * size * RADII[2] * spread,
      ),
    )
  })

  return {
    positions,
    /** Grado de cada nodo: cuántas conexiones tiene. Se usa para el tamaño. */
    degree: new Map(knowledge.map((node) => [node.id, neighboursOf.get(node.id)?.length ?? 0])),
  }
}

/**
 * ── LAS REGIONES DE LA RED, PARA QUE LA CÁMARA SEPA A QUÉ ACERCARSE ───────
 *
 * Devuelve las regiones COMPACTAS de la nube, con su centroide en fracciones
 * del cerebro y ordenadas por peso en el grafo.
 *
 * Existe por un problema medido: la deriva de dentro orbitaba a distancia
 * constante mirando siempre al centro de la nube, así que los nodos cambiaban
 * de sitio pero ninguno llegaba a tener presencia. Para poder acercarse a algo
 * hace falta que ese algo exista como cosa, y el único sitio donde eso está
 * escrito es el grafo.
 *
 * ## Una región es un nodo MUY CONECTADO y su vecindad, no una familia
 *
 * El primer intento agrupó por `kind` —la familia visual, la que da el color—
 * y la medición lo tumbó: el centroide de `graphics`, con seis miembros, cae a
 * 0,021 del centro del cerebro, o sea prácticamente en el origen. No es un
 * fallo del cálculo: la relajación de `buildNetworkLayout` coloca por
 * CONEXIONES, así que dos conocimientos de la misma familia que no se usan
 * juntos acaban en lados opuestos de la nube. **Una familia es una etiqueta,
 * no un sitio.**
 *
 * Lo que sí es un sitio es el vecindario de un nodo con mucho grado: sus
 * vecinos están junto a él porque la simulación los ha atraído. Medido, esos
 * grupos abarcan 0,04–0,056 del cerebro contra los 0,115 de la nube entera —o
 * sea media nube, una región de verdad—.
 *
 * **No hay ni un nombre de tecnología aquí.** Se ordena por grado y se toman
 * los hubs de forma golosa, descartando el que caiga demasiado cerca de otro ya
 * aceptado: dos regiones que se solapan son la misma región. Si mañana entra un
 * conocimiento nuevo en `knowledge.js`, la región a la que se acerca la cámara
 * cambia sola. Escribir "acércate a Three.js" sería meter un dato de contenido
 * dentro de la coreografía, que es justo la inversión de capas que este
 * proyecto no admite.
 */

/** Dos centroides más cerca que esto describen la misma región. */
const CLUSTER_APART = 0.045

export function knowledgeClusters(spread = 1) {
  const { positions, degree } = buildNetworkLayout(1, spread)

  const ranked = knowledge
    .filter((node) => positions.has(node.id))
    .map((node) => ({ node, links: degree.get(node.id) ?? 0 }))
    .sort((a, b) => b.links - a.links || (b.node.weight ?? 1) - (a.node.weight ?? 1))

  const clusters = []

  for (const { node, links } of ranked) {
    if (links < 2) continue

    const ids = [node.id, ...(neighboursOf.get(node.id) ?? [])].filter((id) => positions.has(id))
    if (ids.length < 3) continue

    const center = new Vector3()
    ids.forEach((id) => center.add(positions.get(id)))
    center.divideScalar(ids.length)

    /* Dos regiones que se pisan son la misma región. */
    if (clusters.some((other) => other.center.distanceTo(center) < CLUSTER_APART)) continue

    let span = 0
    ids.forEach((id) => {
      span = Math.max(span, center.distanceTo(positions.get(id)))
    })

    clusters.push({ hub: node.id, ids, center, span, links })
  }

  return clusters
}
