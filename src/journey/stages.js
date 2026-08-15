import { CatmullRomCurve3, Vector3 } from 'three'
import { fitDistance } from './framing'
import { nodePositions } from '../data/nodeLayout'

/**
 * LA TABLA. Toda la coreografía del recorrido vive en este archivo.
 *
 * El problema de la versión anterior no era ningún efecto concreto: era que
 * "qué se ve y dónde está la cámara en cada momento" estaba repartido en
 * condicionales por cinco archivos distintos. Cada arreglo rompía otra cosa
 * porque nadie tenía la foto completa.
 *
 * Aquí el recorrido es un solo número, `progress`, de 0 a 1. De él sale todo:
 * la posición de la cámara, hacia dónde mira y qué está visible. Para cambiar
 * cuándo pasa algo se toca una fila.
 *
 * Nada se monta ni se desmonta durante el recorrido. Solo cambian números.
 */

/**
 * Los tramos, para nombrarlos. No controlan nada: son las etiquetas que
 * aparecen en el indicador de desarrollo y las que usa la navegación para
 * saber a qué altura del scroll saltar.
 */
export const STAGES = [
  { id: 'hero', label: 'Portada', from: 0.0, to: 0.15 },
  { id: 'approach', label: 'Acercamiento', from: 0.15, to: 0.29 },
  { id: 'entry', label: 'Entrada', from: 0.29, to: 0.37 },
  { id: 'mind', label: 'La mente', from: 0.37, to: 0.45 },
  { id: 'tour', label: 'Recorrido', from: 0.45, to: 1.0 },
]

/**
 * En que nodo estamos y cuanto de "dentro" de el.
 *
 * Devuelve `null` fuera del recorrido. `focus` va de 0 a 1 y solo llega a 1
 * en la parte central del tramo: es lo que hace que el contenido aparezca al
 * llegar y se vaya al salir, sin que haya dos paneles a la vez.
 */
export function nodeFocusAt(progress, count) {
  if (progress < TOUR_START || count === 0) return null

  const index = Math.min(count - 1, Math.floor((progress - TOUR_START) / NODE_SPAN))
  const start = TOUR_START + index * NODE_SPAN

  const appearing = ramp(progress, start + NODE_SPAN * 0.12, start + NODE_SPAN * 0.42)
  const leaving = ramp(progress, start + NODE_HOLD, start + NODE_SPAN)

  return { index, focus: appearing * (1 - leaving) }
}

/** Donde hay que dejar el scroll para ver un nodo concreto. */
export function progressForNode(index) {
  return TOUR_START + index * NODE_SPAN + NODE_SPAN * 0.3
}

export function stageAt(progress) {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (progress >= STAGES[i].from) return STAGES[i]
  }
  return STAGES[0]
}

/**
 * Visibilidad de cada capa, en fracción de recorrido.
 *
 * `in` es cuándo aparece, `out` cuándo se va. `null` significa "no se va".
 * Los tramos se solapan a propósito: el interior ya está apareciendo mientras
 * la mascota todavía se desvanece, y ese solape es lo que evita el parpadeo
 * de negro entre una cosa y otra.
 */
export const LAYERS = {
  // El titular se va mucho antes que el personaje: si aguanta hasta que la
  // cámara ya está encima del cerebro, se lee encima del modelo y ensucia.
  heroCopy: { in: null, out: [0.02, 0.11] },
  // Se va justo cuando la cámara le pasa por delante. Antes seguía visible
  // después de cruzar y se veía el modelo por dentro.
  mascot: { in: null, out: [0.19, 0.29] },
  // El halo aguanta un poco más: es lo último que se ve al atravesarlo.
  handBrain: { in: null, out: [0.25, 0.32] },
  mind: { in: [0.23, 0.37], out: null },
  nodes: { in: [0.33, 0.45], out: null },
}

/** Interpolación suave (smoothstep) entre dos límites. */
export function ramp(value, start, end) {
  if (end === start) return value >= end ? 1 : 0
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/** Opacidad de una capa en un punto del recorrido. */
export function layerOpacity(name, progress) {
  const layer = LAYERS[name]
  if (!layer) return 1

  const appeared = layer.in ? ramp(progress, layer.in[0], layer.in[1]) : 1
  const left = layer.out ? ramp(progress, layer.out[0], layer.out[1]) : 0

  return appeared * (1 - left)
}

/**
 * Los puntos por los que pasa la cámara.
 *
 * `at` es en qué punto del recorrido la cámara está exactamente ahí. Entre
 * dos claves se interpola.
 *
 * El fallo del recorrido anterior estaba en `target`: desde el primer píxel de
 * scroll la mirada ya se iba hacia el interior, así que la cámara nunca
 * llegaba a apuntar al cerebro de la mano —se limitaba a pasar de largo cerca
 * de él. Aquí la mirada se queda clavada en el cerebro hasta que se está
 * encima (0.38), y solo entonces se abre hacia el fondo.
 */
/**
 * Cuándo pasa la cámara por cada punto.
 *
 * Los números están repartidos según la DISTANCIA de cada tramo, no a ojo. Si
 * un tramo largo y otro corto duran lo mismo, la cámara acelera de golpe al
 * pasar de uno a otro y se nota como un tirón.
 *
 * El único desequilibrio que queda es deliberado: el tramo del acercamiento
 * (0.32 a 0.48) es el más lento de todos, porque es el plano en el que hay que
 * mirar el cerebro antes de entrar.
 */
/**
 * El recorrido por los nodos.
 *
 * Entrar en un nodo, leerlo, seguir bajando y entrar en el siguiente. Esto
 * sustituye al panel fijo de abajo, y de paso arregla el problema de encuadre
 * en movil: si se viaja de nodo en nodo, los cinco no tienen que caber a la
 * vez y la camara puede acercarse de verdad a cada uno.
 *
 * Cada nodo tiene dos claves y no una: una de LLEGADA y otra de SALIDA casi en
 * el mismo sitio. El hueco entre las dos es el tiempo de lectura. Con una sola
 * clave la camara pasaria de largo sin detenerse, porque una curva no se para
 * nunca por si sola.
 */
export const TOUR_START = 0.45
/** Lo que ocupa cada nodo del recorrido total. Cinco nodos llenan hasta el 1. */
const NODE_SPAN = 0.11
/**
 * De ese hueco, cuanto se pasa QUIETO delante del nodo. Dos tercios largos:
 * el viaje entre nodos tiene que ser lo corto y la lectura lo largo, no al
 * reves.
 */
const NODE_HOLD = 0.078

/**
 * El vuelo de la cámara, como dos curvas suaves: por dónde pasa y hacia dónde
 * mira.
 *
 * Antes esto era una polilínea con una aceleración distinta en cada tramo, y
 * ahí estaba el fallo que se veía como "no va fluido, medio se para": dos
 * tramos seguidos con arranque suave significan que el primero TERMINA a
 * velocidad máxima y el siguiente EMPIEZA parado. La cámara se detenía en seco
 * en cada punto de la tabla. Con el contador marcando 60 fps, porque nunca fue
 * un problema de rendimiento.
 *
 * Una `CatmullRomCurve3` no tiene ese problema: pasa por todos los puntos con
 * la velocidad y la dirección encadenadas. Y de paso el recorrido deja de ser
 * una sucesión de rectas con esquinas y se convierte en un vuelo.
 *
 * `centripetal` es el tipo de curva importante aquí. El Catmull-Rom normal se
 * pasa de frenada cuando dos puntos están muy juntos —y los dos del
 * acercamiento lo están— y la cámara haría un bucle alrededor del cerebro en
 * vez de acercarse a él.
 */
export function cameraPath(
  t,
  { handBrain = null, mascotWidth = null, fov = 35, aspect = 1.6, nodeOrder = [] } = {},
) {
  const mascot = new Vector3(...t.mascot.position)
  // La posición medida sobre el modelo manda sobre la del token: el token es
  // solo el valor con el que se trabaja hasta que el GLB carga.
  const hand = handBrain ? handBrain.clone() : new Vector3(...t.handBrain.position)
  const mind = new Vector3(...t.mind.center)

  /**
   * Las dos distancias de cámara salen de la geometría, no de probar valores.
   *
   * En la portada hay que abarcar al personaje MÁS el hueco que ocupa a un
   * lado del centro: si está desplazado a la derecha para dejar sitio al
   * texto, la cámara tiene que retroceder lo suficiente para que quepan los
   * dos.
   */
  const halfHeight = t.mascot.height / 2
  const halfWidth = (mascotWidth ?? t.mascot.height * 0.95) / 2

  const heroDistance = fitDistance({
    halfWidth: halfWidth + Math.abs(mascot.x),
    halfHeight,
    fov,
    aspect,
    fill: t.mascot.fill,
  })

  /**
   * En el interior hay que abarcar la constelación entera. El nodo más lejano
   * está a 1,26 radios, y se añade margen para su etiqueta.
   */
  const mindReach = t.mind.radius * 1.45
  const mindDistance = fitDistance({
    halfWidth: mindReach,
    halfHeight: mindReach,
    fov,
    aspect,
    fill: t.mind.fill,
  })

  /**
   * La cámara de la portada mira a la ALTURA del personaje, no a su pecho.
   *
   * Apuntar al pecho inclinaba la cámara hacia arriba unos tres grados, y esa
   * inclinación sube el borde inferior del encuadre un tercio de unidad. Como
   * los pies quedaban a solo 0,17 del borde, el resultado era que a Olaz se le
   * cortaban las zapatillas por la mitad.
   *
   * La lección: inclinar la cámara no solo gira la imagen, mueve los cuatro
   * bordes del encuadre. Si un elemento está justo al filo, se pierde.
   */
  const heroLook = new Vector3(mascot.x, mascot.y, mascot.z)

  /**
   * Una parada por nodo, con su llegada y su salida.
   *
   * La cámara se coloca por delante y algo hacia fuera del nodo, y mira a un
   * punto entre el nodo y el cerebro. Ese sesgo hacia el centro es lo que
   * mantiene el cerebro asomando en el encuadre: sin él te quedas mirando un
   * punto luminoso en mitad de la nada y se pierde la referencia de dónde
   * estás.
   */
  const nodeViewDistance = fitDistance({
    halfWidth: t.mind.radius * 0.92,
    halfHeight: t.mind.radius * 0.6,
    fov,
    aspect,
    fill: 0.9,
  })

  const tourPositions = []
  const tourTargets = []
  const tourTiming = []

  const layout = nodePositions(t.mind.radius)

  nodeOrder.forEach((nodeName, index) => {
    const node = layout[nodeName]
    if (!node) return

    // Hacia fuera del cerebro, pero sobre todo hacia el espectador: así nunca
    // se acaba mirando la constelación desde detrás.
    const direction = node
      .clone()
      .normalize()
      .multiplyScalar(0.5)
      .add(new Vector3(0, 0.12, 1))
      .normalize()

    const arrive = mind.clone().add(node).add(direction.clone().multiplyScalar(nodeViewDistance))
    // Deriva mínima durante la lectura: quieta del todo parece congelada.
    const leave = arrive.clone().add(direction.clone().multiplyScalar(-t.mind.radius * 0.12))

    const look = mind.clone().add(node.clone().multiplyScalar(0.78))

    tourPositions.push(arrive, leave)
    tourTargets.push(look, look.clone())

    const start = TOUR_START + index * NODE_SPAN
    tourTiming.push(start, start + NODE_HOLD)
  })

  const positions = [
    new Vector3(mascot.x * 0.18, mascot.y, heroDistance),
    // Encuadre cerrado sobre el cerebro de la mano.
    hand.clone().add(new Vector3(0.02, 0.06, 1.3)),
    // Justo delante: el momento de entrar.
    hand.clone().add(new Vector3(0, 0, 0.1)),
    // Vista general de la constelación, antes de entrar en el primer nodo.
    mind.clone().add(new Vector3(0, t.mind.radius * 0.1, mindDistance)),
    ...tourPositions,
  ]

  const targets = [
    heroLook,
    hand.clone(),
    // La mirada se abre hacia el fondo justo al cruzar, no antes: mirar al
    // interior desde el primer píxel era lo que hacía que la cámara pasara de
    // largo sin llegar a apuntar nunca al cerebro.
    hand.clone().lerp(mind, 0.35),
    mind.clone(),
    ...tourTargets,
  ]

  /**
   * Los tiempos de las cuatro claves fijas, y luego los del recorrido.
   *
   * Van juntos con las posiciones en el mismo objeto porque su longitud
   * depende de cuántos nodos haya: si mañana hay seis secciones, la tabla se
   * ajusta sola en vez de haber que recontar a mano.
   */
  const timing = [0.0, 0.15, 0.3, 0.4, ...tourTiming]

  // Cierre: la cámara se retira despacio del último nodo. Sin esta clave el
  // recorrido se queda congelado en el tramo final.
  const last = positions[positions.length - 1]
  positions.push(last.clone().add(new Vector3(0, t.mind.radius * 0.1, t.mind.radius * 0.5)))
  targets.push(targets[targets.length - 1].clone())
  timing.push(1)

  return {
    timing,
    position: new CatmullRomCurve3(positions, false, 'centripetal'),
    target: new CatmullRomCurve3(targets, false, 'centripetal'),
  }
}

/**
 * Lee la cámara en un punto del recorrido y la escribe en los vectores que se
 * le pasan. No crea objetos: se llama sesenta veces por segundo.
 *
 * No lleva suavizado propio a propósito. El scroll es el que manda el tiempo:
 * cualquier aceleración añadida aquí se sentiría como que la cámara no
 * obedece al dedo. La continuidad ya la pone la amortiguación del reloj.
 */
export function sampleCamera(path, progress, outPosition, outTarget) {
  const p = Math.min(1, Math.max(0, progress))
  const timing = path.timing

  let i = 0
  while (i < timing.length - 2 && p >= timing[i + 1]) i += 1

  const span = timing[i + 1] - timing[i]
  const local = span <= 0 ? 1 : Math.min(1, Math.max(0, (p - timing[i]) / span))

  // `getPoint` reparte su parámetro por índice de punto, así que la posición
  // dentro del tramo se traduce directamente.
  const u = (i + local) / (timing.length - 1)

  path.position.getPoint(u, outPosition)
  path.target.getPoint(u, outTarget)
}
