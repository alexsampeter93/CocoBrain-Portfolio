import { Vector3 } from 'three'

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
  { id: 'hero', label: 'Portada', from: 0.0, to: 0.34 },
  { id: 'approach', label: 'Acercamiento', from: 0.34, to: 0.56 },
  { id: 'entry', label: 'Entrada', from: 0.56, to: 0.72 },
  { id: 'mind', label: 'La mente', from: 0.72, to: 1.0 },
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
  mascot: { in: null, out: [0.4, 0.54] },
  handBrain: { in: null, out: [0.52, 0.61] },
  mind: { in: [0.44, 0.64], out: null },
  nodes: { in: [0.6, 0.76], out: null },
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
export function cameraPath(t) {
  const mascot = new Vector3(...t.mascot.position)
  const hand = new Vector3(...t.handBrain.position)
  const mind = new Vector3(...t.mind.center)

  // A la altura del pecho, no de los pies: encuadrar por el centro de masa
  // deja al personaje demasiado bajo.
  const chest = new Vector3(mascot.x, mascot.y + t.mascot.height * 0.2, mascot.z)

  return [
    {
      at: 0.0,
      position: new Vector3(mascot.x * 0.18, 0.15, t.heroDistance),
      target: chest,
    },
    {
      // Encuadre cerrado sobre el cerebro de la mano. Este es el plano que
      // antes no existía y por el que todo parecía "muy lejos".
      at: 0.38,
      position: hand.clone().add(new Vector3(0.02, 0.06, 1.3)),
      target: hand.clone(),
      ease: 'in',
    },
    {
      // Justo delante del cerebro, ya mirando al fondo: el momento de entrar.
      at: 0.56,
      position: hand.clone().add(new Vector3(0, 0, 0.1)),
      target: mind.clone(),
      ease: 'in',
    },
    {
      at: 0.74,
      position: mind.clone().add(new Vector3(0, 0.35, t.mind.radius * 2.25)),
      target: mind.clone(),
      ease: 'out',
    },
    {
      // Deriva lenta al final. Sin esto el tramo de exploración se queda
      // congelado y parece que la web se ha colgado.
      at: 1.0,
      position: mind
        .clone()
        .add(new Vector3(t.mind.radius * 0.5, 0.12, t.mind.radius * 2.0)),
      target: mind.clone(),
    },
  ]
}

function ease(k, kind) {
  if (kind === 'in') return k * k
  if (kind === 'out') return 1 - (1 - k) * (1 - k)
  return k * k * (3 - 2 * k)
}

/**
 * Lee la cámara en un punto del recorrido y la escribe en los vectores que se
 * le pasan. No crea objetos: se llama sesenta veces por segundo.
 */
export function sampleCamera(path, progress, outPosition, outTarget) {
  const p = Math.min(1, Math.max(0, progress))

  let i = 0
  while (i < path.length - 2 && p >= path[i + 1].at) i += 1

  const a = path[i]
  const b = path[i + 1]
  const span = b.at - a.at
  const k = span <= 0 ? 1 : Math.min(1, Math.max(0, (p - a.at) / span))
  const e = ease(k, b.ease)

  outPosition.lerpVectors(a.position, b.position, e)
  outTarget.lerpVectors(a.target, b.target, e)
}
