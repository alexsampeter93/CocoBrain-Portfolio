/**
 * El reloj del recorrido.
 *
 * Un objeto mutable, fuera de React a propósito. Lo escribe ScrollTrigger y lo
 * lee el bucle de render de three sesenta veces por segundo.
 *
 * Esto no es un atajo, es la corrección de un error concreto: antes el
 * progreso vivía en un `useState` y cada frame de scroll re-renderizaba la
 * aplicación entera. De ahí venían los tirones. React es bueno decidiendo QUÉ
 * hay en pantalla; es el sitio equivocado para un número que cambia sesenta
 * veces por segundo.
 */
export const journey = {
  /** 0 = arriba del todo, 1 = final del recorrido. */
  progress: 0,
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

export function setProgress(value, stageId) {
  journey.progress = value

  if (stageId !== lastStageId) {
    lastStageId = stageId
    listeners.forEach((listener) => listener())
  }
}
