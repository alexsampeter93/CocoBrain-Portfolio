import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MOTION } from './tokens'

gsap.registerPlugin(ScrollTrigger)

/**
 * ── LA PUESTA EN ESCENA DE UN ÁREA ──────────────────────────────────────────
 *
 * ## La diferencia entre aparecer y entrar en escena
 *
 * Hasta aquí, cada bloque del editorial tenía su propio gancho y su propio
 * disparador: el encabezado revelaba a sus hijos, el filete se dibujaba, la
 * captura se asentaba. Cada gesto era correcto y **todos empezaban a la vez**,
 * porque cada uno medía su propia posición contra la ventana. El resultado es
 * el que se puede describir en una frase: la página aparece.
 *
 * Una sección no aparece: **se monta**. Primero el número, después el trazo,
 * después el titular saliendo de su propia línea, y cuando el titular todavía
 * no ha terminado ya está entrando el objeto y empezando a ocupar sitio la
 * imagen. Ese solape es la diferencia entre una sucesión de revelados y una
 * secuencia — y no se consigue con más animaciones, sino con UNA sola línea de
 * tiempo que las ordene.
 *
 * ## Cómo se declara
 *
 * El componente marca sus elementos con `data-cue` y esta escena los ordena:
 *
 *     <section ref={useScene()}>
 *       <span data-cue="index" />
 *       <span data-cue="rule" />
 *       <h2   data-cue="title" />
 *       <p    data-cue="lead" />
 *
 * No hay que escribir tiempos: los trae `CUES`, que es el lenguaje. Y una
 * sección puede corregir el suyo —`useScene({ cues: { media: { at: 0.7 } } })`—
 * cuando su contenido pide otro ritmo, que es justo lo que impide que las seis
 * áreas se sientan la misma plantilla.
 *
 * ## Y sigue siendo UNA sola línea de tiempo, con `scrub`
 *
 * Que es lo que exige §6 del manual: no hay duración propia, el progreso de la
 * secuencia ES la posición del scroll. Se mueve mientras el dedo se mueve, se
 * para cuando se para y al subir se deshace. Los tiempos de `at` no son
 * segundos: son posiciones dentro de una línea de tiempo que el scroll recorre.
 *
 * Un disparador por sección, no uno por elemento. Antes había hasta nueve por
 * área.
 */

/** La ventana de la secuencia: empieza cuando el área asoma y termina cuando
 *  su cabecera está a media pantalla. Es más larga que la de un revelado
 *  suelto (`MOTION.START/END`) justamente porque dentro pasan varias cosas. */
export const SCENE = {
  START: 'top 88%',
  END: 'top 30%',
}

/**
 * ── EL LENGUAJE, EN OCHO PAPELES ────────────────────────────────────────────
 *
 * No son ocho efectos: son ocho PAPELES dentro de una composición editorial, y
 * cada uno se mueve como se mueve lo que representa.
 *
 * - **`index`** sube desde debajo de su propia línea, como el número de una
 *   página que pasa. Va dentro de una máscara (`<Mask>`), así que no se
 *   desvanece: asciende y aparece por el canto.
 * - **`rule`** se traza. Es el mismo gesto que el nodo de esa área tiene en la
 *   constelación, y por eso llega justo después del número: el trazo es lo que
 *   ata el editorial con la escena de la que vienes.
 * - **`title`** sale de su propia caja de texto, escalonando sus líneas. Es el
 *   único elemento que entra ENMASCARADO y no con opacidad, porque un titular
 *   a tamaño de cartel que se desvanece se lee como una imagen cargando; uno
 *   que sale de su línea se lee como tipografía colocándose.
 * - **`meta`** y **`lead`** entran cortos y con opacidad: son texto de lectura,
 *   y un texto que viaja mucho antes de poder leerse es un texto que estorba.
 * - **`object`** crece un punto desde su sitio. Su entrada de verdad —la
 *   llegada desde la profundidad— la hace él en 3D; esto solo es el hueco
 *   dejándole paso.
 * - **`media`** llega desde más abajo y desde más lejos que el texto: pesa más.
 * - **`aside`** entra por el lado, no por abajo. Es lo que hace que una columna
 *   secundaria se lea como acompañamiento y no como un párrafo más.
 *
 * Los `at` están escalonados y **se solapan a propósito**: `title` arranca en
 * 0,10 y dura hasta 1,10; `object` entra en 0,34 con el titular todavía a
 * medio camino. Ninguna espera a que termine la anterior.
 */
export const CUES = {
  index: { at: 0, from: { yPercent: 135 }, dur: 0.8 },
  rule: { at: 0.16, from: { scaleX: 0, transformOrigin: 'left center' }, dur: 0.7 },
  title: { at: 0.1, from: { yPercent: 120 }, stagger: 0.16, dur: 1 },
  meta: { at: 0.42, from: { y: 12, opacity: 0 }, stagger: 0.08, dur: 0.7 },
  object: { at: 0.34, from: { opacity: 0, scale: 0.93 }, dur: 0.9 },
  lead: { at: 0.5, from: { y: 18, opacity: 0 }, stagger: 0.12, dur: 0.8 },
  body: { at: 0.62, from: { y: 20, opacity: 0 }, stagger: 0.1, dur: 0.8 },
  media: { at: 0.54, from: { y: 44, opacity: 0 }, stagger: 0.1, dur: 1 },
  aside: { at: 0.66, from: { x: 28, opacity: 0 }, stagger: 0.1, dur: 0.8 },
}

/**
 * Los elementos marcados de ESTA escena, sin los de las escenas de dentro.
 *
 * Hace falta por lo mismo que hizo falta el `:scope >` de `useReveal`: una
 * ficha de proyecto es una escena dentro de la escena del área, y sin este
 * filtro el área se llevaría también los `data-cue` de las tres fichas —tres
 * titulares entrando cuando entra el encabezado de la sección, y ninguno
 * cuando les toca—.
 *
 * Funciona porque los efectos de los hijos corren ANTES que los del padre, así
 * que cuando el área mira, las fichas ya se han marcado como escena.
 */
const ownCues = (root) =>
  gsap.utils.toArray('[data-cue]', root).filter((node) => node.closest('[data-scene]') === root)

/** Los elementos agrupados por el papel que hacen, en orden de documento. */
const byRole = (nodes) => {
  const groups = new Map()
  for (const node of nodes) {
    const name = node.dataset.cue
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(node)
  }
  return groups
}

/**
 * ── Y LA SALIDA, QUE ES LA MITAD QUE FALTABA ────────────────────────────────
 *
 * `useSectionExit` retira un bloque entero. Esto retira una COMPOSICIÓN: cada
 * papel se va a su manera y en su momento, igual que entró.
 *
 * Es lo que rompe la sensación de bloque → bloque. Mientras el titular de un
 * área todavía se está yendo hacia arriba y su filete se está recogiendo, el
 * número de la siguiente ya está subiendo por su máscara. **No hay ningún
 * frame en el que la pantalla esté entre dos secciones**, que era exactamente
 * la queja.
 *
 * Nada llega a cero. Un elemento que se apaga del todo obliga a que vuelva a
 * aparecer al subir, y esta página se puede leer en los dos sentidos.
 */
export const EXITS = {
  index: { at: 0, to: { yPercent: -120, opacity: 0.15 }, dur: 0.7 },
  rule: { at: 0.1, to: { scaleX: 0.12, transformOrigin: 'left center' }, dur: 0.8 },
  title: { at: 0.06, to: { yPercent: -34, opacity: 0.18 }, dur: 1 },
  meta: { at: 0.2, to: { y: -18, opacity: 0.12 }, dur: 0.8 },
  lead: { at: 0.24, to: { y: -22, opacity: 0.1 }, dur: 0.8 },
  body: { at: 0.3, to: { y: -16, opacity: 0.14 }, dur: 0.8 },
  media: { at: 0.16, to: { y: -30, opacity: 0.2, scale: 0.985 }, dur: 1 },
  aside: { at: 0.34, to: { x: -26, opacity: 0.12 }, dur: 0.8 },
  object: { at: 0.12, to: { opacity: 0.1, scale: 0.9 }, dur: 0.9 },
}

/**
 * ── EL ESTADO EN REPOSO, DECLARADO Y NO ADIVINADO ───────────────────────────
 *
 * Es la pieza que evita el fallo más caro de toda la fase 7B, así que conviene
 * que esté contado entero.
 *
 * Un `.from()` de GSAP no declara su destino: lo LEE del elemento la primera
 * vez que se dibuja. Eso funciona mientras esa lectura ocurra con el elemento
 * en su sitio — y en esta página no ocurre. `ScrollTrigger.refresh()` se
 * dispara varias veces después del montaje (cargan las fuentes, monta el canvas
 * del recorrido, llegan las imágenes, la pista fijada se remide), y en alguna
 * de esas pasadas el elemento ya está en su estado INICIAL. GSAP graba entonces
 * el inicio como final: la animación va de A a A y no se mueve nunca.
 *
 * Medido sobre el build, en el encabezado de Sobre mí, con el disparador a
 * progreso 1 y las cinco interpolaciones a progreso 1:
 *
 *     index  ty 17      · su `from` era yPercent 135
 *     title  ty 100,3   · su `from` era yPercent 120
 *     rule   scale(0,1) · su `from` era scaleX 0
 *     meta   ty 12, opacidad 0
 *     lead   ty 18, opacidad 0
 *
 * O sea: TODO clavado en su estado de partida, con la secuencia dándose por
 * terminada. Eso es el titular invisible dentro de su máscara, el resumen a
 * opacidad cero, las capturas que no aparecen y los huecos en blanco.
 *
 * Se arregla declarando los dos extremos con `fromTo`. Ninguno de estos
 * elementos tiene una transformación en reposo —GSAP es su único dueño, que es
 * la ley de la casa— así que su sitio ES el neutro, y el neutro se puede
 * escribir en vez de medirse.
 */
const NEUTRAL = {
  x: 0,
  y: 0,
  xPercent: 0,
  yPercent: 0,
  opacity: 1,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
}

/**
 * ── UN `yPercent` SIN SU `y` DEJA PÍXELES MUERTOS ───────────────────────────
 *
 * La segunda mitad del mismo fallo, y la más difícil de ver porque la
 * interpolación decía la verdad: pedía `yPercent` de 135 a 0, terminaba en
 * progreso 1, y el elemento se quedaba 17 px por debajo igualmente.
 *
 * La caché de transformaciones de GSAP guarda `x`/`y` en PÍXELES y
 * `xPercent`/`yPercent` aparte, y al pintar los suma. Cuando GSAP se encuentra
 * un `transform: translate(0px, 17px)` ya escrito en línea —lo escribió una
 * pasada anterior— lo lee como `y = 17px`. Una interpolación que solo mueve
 * `yPercent` devuelve el porcentaje a cero y **no toca esos píxeles**, así que
 * el elemento nunca vuelve a su sitio.
 *
 * Medido en el encabezado de Sobre mí, con la interpolación a progreso 1:
 *
 *     índice   yPercent 0  ·  y "17,0859px"   (135% de sus 13 px de alto)
 *     titular  yPercent 0  ·  y "100,312px"   (120% de sus 83,6 px)
 *
 * Así que un eje se declara ENTERO: quien mueve `yPercent` fija también `y`, y
 * quien mueve `xPercent` fija `x`. Los dos extremos, las dos mitades.
 */
const wholeAxes = (vars) => {
  const out = { ...vars }
  if ('yPercent' in out && !('y' in out)) out.y = 0
  if ('xPercent' in out && !('x' in out)) out.x = 0
  return out
}

export const settled = (to) =>
  Object.fromEntries(
    Object.keys(to)
      .filter((key) => key in NEUTRAL)
      .map((key) => [key, NEUTRAL[key]]),
  )

/** La ventana de la salida. Empieza cuando el pie de la sección cruza la mitad
 *  de la pantalla —o sea, cuando la siguiente ya lleva rato entrando— y termina
 *  cuando ese pie se va por arriba. El solape es de diseño, no casual. */
export const EXIT_WINDOW = { START: 'bottom 62%', END: 'bottom -12%' }

/**
 * ── LA ESCENA COMPLETA: ENTRADA Y SALIDA SOBRE LA MISMA RAÍZ ────────────────
 *
 * Devuelve UNA ref. Con `exits` construye además la línea de tiempo de salida
 * sobre los mismos elementos, en su propia ventana de scroll — que empieza
 * mucho antes de que la sección se haya ido y por eso se solapa con la entrada
 * de la siguiente.
 *
 * Dos líneas de tiempo sobre las mismas propiedades y no se pelean porque sus
 * ventanas son disjuntas: cuando la de entrada termina se queda clavada en su
 * estado final y deja de escribir; la de salida arranca justo desde ahí. Es la
 * misma convivencia que ya tenían `useReveal` y `useSectionExit` desde 6E.
 */
export function useScene({
  start = SCENE.START,
  end = SCENE.END,
  cues = {},
  exits = null,
  exitStart = EXIT_WINDOW.START,
  exitEnd = EXIT_WINDOW.END,
  /*
    De qué elemento cuelga la ventana de SALIDA. Por defecto el mismo, pero un
    encabezado necesita irse cuando se acaba su SECCIÓN, no cuando se acaba él:
    medido contra su propia caja, el titular de un área empezaría a retirarse a
    las tres líneas de haber entrado.
  */
  exitTrigger = null,
} = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Se marca SIEMPRE, también con movimiento reducido: es lo que impide que
    // una escena de fuera se lleve los elementos de esta.
    el.dataset.scene = ''
    if (reduced) return

    const ctx = gsap.context(() => {
      const groups = byRole(ownCues(el))
      if (groups.size === 0) return

      const enter = gsap.timeline({
        scrollTrigger: { trigger: el, start, end, scrub: MOTION.SCRUB, invalidateOnRefresh: true },
      })
      for (const [name, targets] of groups) {
        const spec = { ...(CUES[name] ?? CUES.body), ...(cues[name] ?? {}) }
        /*
          `fromTo` y no `from`: el destino se DECLARA. Ver `settled`. Con
          `from` el destino se lee del elemento, y en esta página esa lectura
          cae a veces con el elemento ya escondido — y entonces la entrada va
          de su estado inicial a su estado inicial.

          `transformOrigin` viaja en los dos extremos porque no es un valor que
          se interpole: es desde dónde se interpola todo lo demás.
        */
        const origin = spec.from.transformOrigin
          ? { transformOrigin: spec.from.transformOrigin }
          : null

        const from = wholeAxes(spec.from)

        enter.fromTo(
          targets,
          from,
          {
            ...settled(from),
            ...origin,
            // Lineal a propósito: la curva la pone el `scrub`, que es lo que
            // hace que el movimiento se sienta atado al dedo.
            ease: 'none',
            duration: spec.dur ?? 1,
            stagger: spec.stagger ?? 0,
          },
          spec.at,
        )
      }

      if (!exits) return

      /* Solo por encima de 1024: apilado no hay lado hacia el que retirarse, y
         una salida en vertical se comería el texto que se está leyendo. */
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const out = gsap.timeline({
          scrollTrigger: {
            trigger: exitTrigger?.current ?? el,
            start: exitStart,
            end: exitEnd,
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        })
        for (const [name, targets] of groups) {
          const spec = { ...(EXITS[name] ?? EXITS.body), ...(exits[name] ?? {}) }
          if (spec.skip) continue
          /*
            ── LA SALIDA PARTE DE LA COMPOSICIÓN, NO DE LO QUE HUBIERA ────────

            Con un `.to()` a secas GSAP apunta el valor de partida la primera vez
            que la interpolación se dibuja — y eso ocurre al montarla, cuando el
            titular todavía está en el estado INICIAL de su entrada, al 120% por
            debajo de su línea. Resultado medido en el paso de Zalent a
            ActiHome: al arrancar la salida el titular pegaba un salto de 53 px
            HACIA ABAJO y desde ahí subía. Un salto en mitad de una transición
            es exactamente lo que esta transición viene a quitar.

            Con `fromTo` desde el neutro —y `immediateRender: false`, o la
            salida escribiría su estado inicial encima de la entrada nada más
            montarse— la salida empieza siempre donde la composición terminó.
          */
          const to = wholeAxes(spec.to)

          out.fromTo(
            targets,
            { ...settled(to), immediateRender: false },
            { ...to, ease: 'none', duration: spec.dur ?? 1, stagger: spec.stagger ?? 0 },
            spec.at,
          )
        }
      })
      return () => mm.revert()
    }, el)

    return () => ctx.revert()
  }, [reduced, start, end, cues, exits, exitStart, exitEnd, exitTrigger])

  return ref
}
