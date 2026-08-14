import { CatmullRomCurve3, Vector3 } from 'three'

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
  { id: 'hero', label: 'Portada', from: 0.0, to: 0.28 },
  { id: 'approach', label: 'Acercamiento', from: 0.28, to: 0.48 },
  { id: 'entry', label: 'Entrada', from: 0.48, to: 0.7 },
  { id: 'mind', label: 'La mente', from: 0.7, to: 1.0 },
]

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
  heroCopy: { in: null, out: [0.04, 0.2] },
  // Se va justo cuando la cámara le pasa por delante. Antes seguía visible
  // después de cruzar y se veía el modelo por dentro.
  mascot: { in: null, out: [0.34, 0.48] },
  // El halo aguanta un poco más: es lo último que se ve al atravesarlo.
  handBrain: { in: null, out: [0.44, 0.52] },
  mind: { in: [0.4, 0.62], out: null },
  nodes: { in: [0.58, 0.76], out: null },
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
const TIMING = [0.0, 0.32, 0.48, 0.8, 1.0]

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
export function cameraPath(t, measuredHandBrain = null) {
  const mascot = new Vector3(...t.mascot.position)
  // La posición medida sobre el modelo manda sobre la del token: el token es
  // solo el valor con el que se trabaja hasta que el GLB carga.
  const hand = measuredHandBrain ? measuredHandBrain.clone() : new Vector3(...t.handBrain.position)
  const mind = new Vector3(...t.mind.center)

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

  const positions = [
    new Vector3(mascot.x * 0.18, mascot.y, t.heroDistance),
    // Encuadre cerrado sobre el cerebro de la mano.
    hand.clone().add(new Vector3(0.02, 0.06, 1.3)),
    // Justo delante: el momento de entrar.
    hand.clone().add(new Vector3(0, 0, 0.1)),
    mind.clone().add(new Vector3(0, 0.35, t.mind.radius * 2.25)),
    // Deriva lenta al final. Sin esto el tramo de exploración se queda
    // congelado y parece que la web se ha colgado.
    mind.clone().add(new Vector3(t.mind.radius * 0.5, 0.12, t.mind.radius * 2.0)),
  ]

  const targets = [
    heroLook,
    hand.clone(),
    // La mirada se abre hacia el fondo justo al cruzar, no antes: mirar al
    // interior desde el primer píxel era lo que hacía que la cámara pasara de
    // largo sin llegar a apuntar nunca al cerebro.
    hand.clone().lerp(mind, 0.35),
    mind.clone(),
    mind.clone().add(new Vector3(t.mind.radius * 0.15, 0, 0)),
  ]

  return {
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

  let i = 0
  while (i < TIMING.length - 2 && p >= TIMING[i + 1]) i += 1

  const span = TIMING[i + 1] - TIMING[i]
  const local = span <= 0 ? 1 : Math.min(1, Math.max(0, (p - TIMING[i]) / span))

  // `getPoint` reparte su parámetro por índice de punto, así que la posición
  // dentro del tramo se traduce directamente.
  const u = (i + local) / (TIMING.length - 1)

  path.position.getPoint(u, outPosition)
  path.target.getPoint(u, outTarget)
}
