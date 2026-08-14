/**
 * Estado del recorrido, fuera de React a proposito.
 *
 * La version anterior guardaba el progreso del scroll en `useState`, asi que
 * cada frame de scroll re-renderizaba App y con el todo el arbol: la escena,
 * la mascota, los nodos, props nuevas y reconciliacion completa, sesenta
 * veces por segundo mientras la GPU intentaba dibujar. Esa era la causa real
 * de los tirones, no los efectos ni los modelos.
 *
 * Aqui el valor vive en un objeto plano: ScrollTrigger lo escribe y el bucle
 * de render lo lee. React no se entera de nada.
 */
export const journey = {
  /** 0 = portada, 1 = dentro del cerebro. */
  progress: 0,
}

/** Interpolacion suave entre dos umbrales, con arranque y frenada. */
export function ramp(value, start, end) {
  if (end === start) return value >= end ? 1 : 0
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
