/**
 * El reloj del recorrido.
 *
 * Dos números, y la diferencia entre ellos es la que quita los tirones.
 *
 * `target` es lo que escribe el scroll. `progress` es lo que lee el mundo, y
 * persigue al primero con amortiguación.
 *
 * Por qué hacen falta los dos: GSAP y el motor de render tienen cada uno su
 * propio `requestAnimationFrame`. Los dos corren en el mismo frame, pero no
 * hay garantía de en qué orden. Cuando el render iba primero, dibujaba con el
 * valor del frame anterior; cuando iba después, con el de este. Ese orden
 * cambia solo, así que el retraso oscilaba entre cero y un frame y el
 * movimiento se veía a trompicones —aunque el contador marcase 140 fps, que es
 * justo lo que despistaba.
 *
 * Persiguiendo el valor en vez de copiarlo, el desorden desaparece: da igual
 * si el dato llega un frame tarde, la posición dibujada es continua.
 *
 * Todo esto vive fuera de React a propósito. React es bueno decidiendo QUÉ hay
 * en pantalla; es el sitio equivocado para un número que cambia sesenta veces
 * por segundo.
 */
export const journey = {
  /** Lo que escribe el scroll. Salta. */
  target: 0,
  /** Lo que lee el mundo. Persigue a `target` y siempre es continuo. */
  progress: 0,
}

/**
 * Constante de tiempo de la persecución, en segundos: cuánto tarda en
 * recorrer el 63% de lo que le falta.
 *
 * Más bajo y vuelve el temblor; más alto y la cámara se despega del dedo.
 */
const TAU = 0.05

/**
 * Un paso de amortiguación, independiente de los fps.
 *
 * La forma ingenua (`progress += (target - progress) * 0.15`) parece que
 * funciona, pero avanza por frame en vez de por tiempo: a 144 Hz va casi el
 * doble de rápido que a 60. Con la exponencial, el recorrido tarda lo mismo en
 * cualquier pantalla.
 */
export function advance(delta) {
  const k = 1 - Math.exp(-Math.min(delta, 0.1) / TAU)
  journey.progress += (journey.target - journey.progress) * k
}

/**
 * Suscripción para la interfaz, que sí quiere enterarse —pero solo cuando
 * cambia el TRAMO, no en cada frame.
 */
const listeners = new Set()
let lastStageId = null

export function subscribeStage(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStageId() {
  return lastStageId
}

export function setTarget(value, stageId) {
  journey.target = value

  if (stageId !== lastStageId) {
    lastStageId = stageId
    listeners.forEach((listener) => listener())
  }
}
