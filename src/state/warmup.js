/**
 * ── CUÁNDO HA TERMINADO EL PRECALENTAMIENTO ─────────────────────────────────
 *
 * `Warmup` dibuja la mente entera detrás del preloader —veinticuatro paradas,
 * seis frames cada una— para que la primera compilación de cada material no
 * caiga durante el viaje. La idea es correcta y llevaba una atadura que la
 * rompía: nadie le decía al preloader cuándo había acabado.
 *
 * El velo se retiraba por un temporizador, `MIN_VISIBLE_MS`, y ese número se
 * calibró cuando el barrido eran TRES paradas. Hoy son veinticuatro. Medido
 * contra el build, el resultado era exactamente lo que Alex describe como "la
 * web se inicia desde el cerebro":
 *
 *     el velo se retira a los 3.966 ms
 *     y en pantalla hay el INTERIOR del cerebro
 *     250 ms después, el cerebro entero visto desde fuera
 *     dos frames de 183 y 167 ms, ya a la vista
 *
 * No era el scroll: `scrollRestoration` está en `manual` y la página abre en
 * cero —comprobado en los tres caminos—. Era el barrido corriendo en pantalla,
 * con sus frames caros pagándose a la vista, que es justo lo contrario de para
 * lo que existe.
 *
 * ## Por qué una señal y no un número más grande
 *
 * Subir `MIN_VISIBLE_MS` habría tapado esta medición y habría caducado en la
 * siguiente: la duración del barrido depende de cuántas paradas tenga, de lo
 * que tarde cada compilación y de la máquina de quien entre. Es exactamente la
 * clase de dato que §13 documenta como caducable —*un número copiado a mano de
 * una medición caduca cuando cambia lo medido*— y ya caducó una vez.
 *
 * Quien sabe cuándo ha terminado el barrido es el barrido. Es el mismo patrón,
 * y por el mismo motivo, que `state/curtain.js`: una señal de una sola
 * dirección, sin inversa, que contesta `true` a quien pregunte tarde en vez de
 * dejarlo esperando un evento que ya pasó.
 */
let warmed = false
const listeners = new Set()

export function isWarmed() {
  return warmed
}

export function markWarmed() {
  if (warmed) return
  warmed = true
  listeners.forEach((listener) => listener())
}

export function subscribeWarmup(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
