/**
 * ── CUÁNDO SE HA LEVANTADO EL VELO ──────────────────────────────────────────
 *
 * El preloader se gestiona entero solo: mide su propio mínimo en pantalla,
 * espera a que `useProgress` diga que todo está cargado, se desvanece y se
 * desmonta. No le hacía falta contárselo a nadie.
 *
 * Deja de ser cierto en cuanto algo tiene que ENTRAR justo detrás de él. La
 * entrada de la portada dura un segundo y medio; sin esta señal se reproduce
 * mientras el velo todavía tapa la pantalla y el visitante llega a una portada
 * ya montada, que es exactamente lo que la fase 11F existe para evitar.
 *
 * ## Por qué una señal y no una cuenta
 *
 * Lo barato habría sido que la portada esperase el mismo tiempo: 2,6 segundos
 * de mínimo, más lo que tarde la carga, más los 0,7 del desvanecido. Eso es
 * copiar tres números que viven en otro archivo, y este manual tiene escrito lo
 * que pasa con las copias —§13: *un número copiado a mano de una medición
 * caduca cuando cambia lo medido*—. Medido contra el build, el velo se retira a
 * los 3,85–3,89 s, y ese valor depende de la red de quien entre.
 *
 * Así que quien sabe cuándo se ha ido es el propio velo, y lo dice.
 *
 * ## Y es de una sola dirección
 *
 * `markLifted()` no tiene inversa: el velo se levanta una vez por carga y no
 * vuelve. Quien se suscriba tarde recibe `true` inmediatamente al preguntar, en
 * vez de quedarse esperando un evento que ya pasó — que es el fallo clásico de
 * este patrón.
 */
let lifted = false
const listeners = new Set()

export function isCurtainLifted() {
  return lifted
}

export function markCurtainLifted() {
  if (lifted) return
  lifted = true
  listeners.forEach((listener) => listener())
}

export function subscribeCurtain(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
