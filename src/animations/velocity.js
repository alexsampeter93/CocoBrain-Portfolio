import { useEffect } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * ── LA VELOCIDAD DEL SCROLL: UNA FUENTE, LOS SUSCRIPTORES QUE HAGA FALTA ────
 *
 * El scroll de esta web ya dice DÓNDE estás —eso es `journey.progress` y es lo
 * que mueve la escena entera—. Lo que no decía es CÓMO vas, y esa es la
 * diferencia entre una página que responde y una que se limita a obedecer: si
 * bajas de golpe, las cosas que tienes cerca tendrían que notarlo.
 *
 * ## Es un valor con signo, entre −1 y 1
 *
 * Negativo subiendo, positivo bajando, y `MAX` es la velocidad a partir de la
 * cual ya da igual ir más deprisa: 2.600 px/s, que es un golpe de rueda largo.
 * Sin ese tope, un `scrollTo` programático —volver a la red, saltar a un área—
 * mete picos de decenas de miles y lo que se ve es un tirón.
 *
 * ## Y NO hay ningún bucle
 *
 * Ese era el riesgo entero de esta primitiva. Aquí no hay `requestAnimationFrame`
 * permanente ni `gsap.ticker` propio:
 *
 * - **mientras se hace scroll**, todo el trabajo cuelga del propio evento de
 *   scroll, que es el mismo que ya mueve el resto de la web;
 * - **al soltar**, un temporizador de 90 ms lleva el valor a cero con la misma
 *   interpolación, que termina sola y no se reprograma;
 * - **quieto**, no corre absolutamente nada. Cero trabajo, que es la condición
 *   que este proyecto le pone a cualquier movimiento desde la fase 5E;
 * - **sin suscriptores**, la fuente ni siquiera existe: el disparador se crea
 *   con el primero y se destruye con el último.
 *
 * La suavización es `quickTo`, o sea UNA interpolación reutilizada, no una nueva
 * por cada evento de scroll. Con sesenta eventos por segundo, crear un tween en
 * cada uno sería el bucle que se está evitando, escrito de otra manera.
 *
 * ## Quién debe suscribirse
 *
 * Muy pocas cosas. La velocidad es un condimento: si la usa todo, la página
 * entera tiembla al bajar y eso es exactamente la estética de plantilla que el
 * manual prohíbe. En esta fase la usan las láminas del abanico y los objetos
 * editoriales, que son las dos familias de las que se espera que tengan cuerpo.
 */

/** A partir de aquí ya da igual ir más deprisa. En píxeles por segundo. */
const MAX = 2600
/**
 * Cuánto tarda el valor en alcanzar al scroll, y en volver a cero al soltar:
 * es la misma interpolación en los dos sentidos. El mismo papel que la
 * constante de amortiguación del reloj del recorrido.
 */
const SMOOTH = 0.42

const state = { v: 0 }
const listeners = new Set()

let trigger = null
let toValue = null
let last = 0
let lastAt = 0
let idle = 0

const notify = () => {
  for (const fn of listeners) fn(state.v)
}

const start = () => {
  if (trigger) return
  toValue = gsap.quickTo(state, 'v', { duration: SMOOTH, ease: 'power3', onUpdate: notify })

  /*
    ── UN OYENTE DE SCROLL, Y NO UN ScrollTrigger ───────────────────────────

    Lo primero que se intentó fue un ScrollTrigger sin animación al que
    preguntarle `getVelocity()`. Es lo que parece idiomático y no funciona
    aquí: comprobado con la sonda contra el build, en las dos formas —sin
    elemento con `start: 0`, y colgado de `document.body`— el valor se quedaba
    clavado en cero mientras el scroll avanzaba de verdad, y solo saltaba en
    los saltos programáticos. Un disparador sin animación ni pin en una página
    que ya fija la pista no es terreno firme, y para esto no hace falta.

    Lo que hace falta es un delta partido por un tiempo. Un `scroll` pasivo es
    exactamente el mismo evento que ScrollTrigger escucha, sin intermediario y
    sin nada que refrescar.
  */
  last = window.scrollY
  lastAt = performance.now()
  window.addEventListener('scroll', onScroll, { passive: true })
  trigger = true
}

const onScroll = () => {
  const now = performance.now()
  const y = window.scrollY
  const dt = now - lastAt
  // Por debajo de ~4 ms el cociente se dispara por el ruido del reloj, no por
  // la velocidad de nadie.
  if (dt >= 4) {
    const raw = ((y - last) / dt) * 1000
    toValue?.(Math.max(-1, Math.min(1, raw / MAX)))
    lastAt = now
  }
  last = y

  // Y al dejar de llegar eventos, el valor vuelve a cero solo. Es un
  // temporizador, no un bucle: se agota y no se reprograma.
  clearTimeout(idle)
  idle = setTimeout(release, 90)
}

/*
  ── Y VOLVER A CERO ES LA MISMA INTERPOLACIÓN, NO OTRA ──────────────────────

  Aquí estuvo el fallo que costó cuatro mediciones. La vuelta a cero era un
  `gsap.to(state, { v: 0, overwrite: true })`, y `overwrite` hace exactamente lo
  que dice: MATA las demás interpolaciones de ese objeto — incluida la de
  `quickTo`, que es una sola y se reutiliza para siempre. O sea que el primer
  frenazo dejaba la fuente muerta: los eventos seguían llegando —medido,
  veinte— y con la velocidad correcta —3.509 px/s— pero ya no había nada que
  moviera el valor.

  Con `quickTo` no hacen falta dos interpolaciones: pedirle cero ES frenar.
*/
const release = () => toValue?.(0)

const stop = () => {
  if (!trigger) return
  window.removeEventListener('scroll', onScroll)
  clearTimeout(idle)
  trigger = null
  toValue = null
  gsap.killTweensOf(state)
  state.v = 0
  notify()
}

/**
 * Se suscribe a la velocidad del scroll mientras `enabled` sea cierto.
 *
 * `handler` recibe el valor suavizado con signo. Se le llama solo cuando el
 * valor cambia, y se le llama con cero al desmontar para que nadie se quede con
 * un desplazamiento pegado.
 *
 * Con movimiento reducido no se suscribe: no es que se mueva menos, es que no
 * se mueve. La velocidad es movimiento ornamental por definición.
 */
export function useScrollVelocity(handler, { enabled = true } = {}) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!enabled || reduced || !velocityEnabled() || typeof handler !== 'function') return

    listeners.add(handler)
    start()

    return () => {
      listeners.delete(handler)
      handler(0)
      if (listeners.size === 0) stop()
    }
  }, [handler, enabled, reduced])
}

/**
 * `?vel=0` apaga la respuesta a la velocidad.
 *
 * El mismo mecanismo que `?obj3d=0`, `?bloom=0` o `?grain=0`, y por el mismo
 * motivo: para poder atribuir un coste hay que poder comparar con y sin sobre
 * el MISMO build.
 */
export const velocityEnabled = () => {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get('vel') !== '0'
}

/** El valor actual, para quien lo necesite sin suscribirse. */
export const scrollVelocity = () => state.v

/*
  La sonda. Sin DOM y sin coste: una función que devuelve tres números cuando
  alguien pregunta. Es la única forma de comprobar contra el BUILD que la fuente
  está viva y que en reposo vale cero, que es la condición que este proyecto le
  pone a cualquier cosa que se mueva.
*/
if (typeof window !== 'undefined') {
  window.__velocity = () => ({ v: Number(state.v.toFixed(3)), subs: listeners.size, on: !!trigger })
}
