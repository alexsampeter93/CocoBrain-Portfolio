import { useLayoutEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setReadingTarget, setTarget } from './clock'
import { stageAt, unwarp, warp } from './stages'

gsap.registerPlugin(ScrollTrigger)

/**
 * El disparador de la PISTA, guardado a nivel de modulo.
 *
 * Lo necesita `scrollToProgress`, que es la unica forma de llevar el scroll a
 * un punto del recorrido. Preguntarselo a el en vez de recalcular la geometria
 * es lo que evita tener dos versiones de la misma cuenta — y con la pista
 * fijada, la que se calcula a mano no coincide.
 */
let track = null

/**
 * Traduce el scroll de la página al número que mueve el mundo.
 *
 * Un solo ScrollTrigger, fijando la portada. Ni uno por sección ni uno por
 * efecto: dos disparadores compitiendo por la misma cámara es exactamente lo
 * que hacía que las transiciones parecieran sucias.
 *
 * ## Sin ScrollSmoother, y por qué
 *
 * Estuvo puesto y ha salido. ScrollSmoother no hace scroll: bloquea la página
 * y desplaza el contenido con una transformación de CSS, animándola hacia el
 * valor real. Eso obliga al navegador a recomponer la página entera en cada
 * frame, y con un canvas de WebGL a pantalla completa y un elemento fijado
 * encima, en Windows sale caro.
 *
 * Peor todavía: su retardo se sumaba al de la cámara. Dos amortiguaciones
 * encadenadas no se ven como el doble de suave, se ven como que la web va
 * lenta y no obedece.
 *
 * El scroll nativo llega directo y sin recomposición. La suavidad la pone la
 * amortiguación del reloj, que actúa donde importa —la cámara— en vez de sobre
 * el documento entero.
 */
export default function JourneyScroll({ trackRef, pinRef, readingRef }) {
  // Solo sirve para volver a intentarlo en el frame siguiente si las
  // referencias no estaban listas. Ver la nota de dentro.
  const [attempt, setAttempt] = useState(0)

  useLayoutEffect(() => {
    /**
     * ── ESPERAR A QUE LAS REFERENCIAS EXISTAN ─────────────────────────────
     *
     * React ejecuta los efectos de disposición EN ORDEN DE ÁRBOL, y va
     * enlazando las referencias por el camino. Este componente se declara
     * antes que la pista, así que en el primer montaje `pinRef.current`
     * todavía es `null` — y `ScrollTrigger` con `pin: null` no falla: crea el
     * disparador SIN fijar nada, en silencio.
     *
     * En desarrollo no se veía porque `StrictMode` monta, desmonta y vuelve a
     * montar: en la segunda pasada las referencias ya están y el pin funciona.
     * En producción solo hay una pasada, y la portada se quedaba al final de la
     * pista: el titular aparecía a 10.686 px del borde superior, o sea fuera de
     * la pantalla. **La web se publicaba sin titular.**
     *
     * Costó encontrarlo porque todas las herramientas de captura apuntaban al
     * servidor de desarrollo. Desde ahora `shoot.mjs` mira también al build.
     */
    if (!trackRef.current || !pinRef.current) {
      const retry = requestAnimationFrame(() => setAttempt((value) => value + 1))
      return () => cancelAnimationFrame(retry)
    }

    const context = gsap.context(() => {
      track = ScrollTrigger.create({
        trigger: trackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinRef.current,
        // La pista ya mide lo que dura el recorrido; que GSAP añadiera su
        // propio hueco duplicaría la altura.
        pinSpacing: false,
        // Enlace directo con el scroll, sin retardo propio. El suavizado ya lo
        // pone el reloj.
        scrub: true,
        /*
          El scroll NO es el recorrido: pasa por el reparto de la tabla, que
          decide cuántas pantallas cuesta cada tramo. Es la unica traduccion que
          hay entre los dos, y su inversa esta abajo en scrollToProgress.
        */
        onUpdate: (self) => {
          const progress = warp(self.progress)
          setTarget(progress, stageAt(progress).id)
        },
      })

      /**
       * El segundo, para la lectura. Sin pin, sin scrub y sin animar nada: solo
       * mide por dónde vas y lo deja en el reloj.
       *
       * Que sea otro ScrollTrigger no contradice la regla de "uno solo". La
       * regla existe para que no haya DOS cosas moviendo la misma cámara, y
       * este no mueve nada: escribe un número que otros leen. Los dos tramos
       * son disjuntos —donde acaba la pista empieza el texto—, así que nunca
       * hay dos disparadores activos discutiendo por el mismo frame.
       */
      if (readingRef?.current) {
        ScrollTrigger.create({
          trigger: readingRef.current,
          start: 'top bottom',
          end: 'bottom bottom',
          onUpdate: (self) => setReadingTarget(self.progress),
        })
      }
    })

    /**
     * ── REFRESCAR DESPUÉS DE MEDIR, Y ESTO SOLO FALLABA EN PRODUCCIÓN ──────
     *
     * ScrollTrigger mide el documento cuando se crea el disparador. Si en ese
     * momento el editorial todavía no está maquetado, `end: 'bottom bottom'`
     * sale mal y el disparador nace creyéndose terminado: la portada se pinta
     * al FINAL de la pista —medido, a 10.686 px del borde superior— y el
     * titular no está en pantalla al cargar.
     *
     * GSAP ya refresca solo con el evento `load`. El problema es el ORDEN: en
     * el build de producción los módulos llegan tan rápido que `load` dispara
     * ANTES de que React monte esto, así que ese refresco no encuentra nada que
     * refrescar. En desarrollo llega después y por eso no se veía.
     *
     * Es el ejemplo perfecto de por qué las capturas no pueden hacerse solo
     * contra el servidor de desarrollo: este fallo llevaba ahí sin que ninguna
     * herramienta lo tocara.
     *
     * Dos refrescos, y los dos hacen falta: uno tras el siguiente reparto de
     * frames —cuando la maquetación ya está— y otro en `load` por si aún
     * quedaban imágenes cambiando la altura.
     */
    const settle = requestAnimationFrame(() => ScrollTrigger.refresh())
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)

    return () => {
      cancelAnimationFrame(settle)
      window.removeEventListener('load', onLoad)
      context.revert()
      track = null
    }
  }, [trackRef, pinRef, readingRef, attempt])

  return null
}

/** Lleva el scroll al punto del recorrido que se le pida. */
/**
 * ── Y EL DESTINO SE LO PREGUNTA AL PROPIO SCROLLTRIGGER ───────────────────
 *
 * Esto lo calculaba a mano: `track.offsetTop + (offsetHeight − innerHeight) ·
 * progreso`. Dos cosas mal, y la segunda no se arregla con la primera:
 *
 * - `offsetTop` es relativo al primer ancestro POSICIONADO, no al documento
 *   —el error que este manual ya tiene escrito para las mediciones del
 *   editorial—;
 * - y aunque se mida bien con `getBoundingClientRect`, la pista lleva **pin**.
 *   Con un elemento fijado, la geometría del documento durante el scroll no es
 *   la que se mide estando parado: el destino calculado y el destino real no
 *   coinciden.
 *
 * Llevaba escondido porque el único uso era ir al PRINCIPIO, y con progreso
 * cero un origen equivocado se nota poco. Se vio en cuanto hubo que volver al
 * final —"Volver a la red"—: el scroll aterrizaba en 1,13, o sea pasado el acto
 * 7 y ya dentro de la lectura.
 *
 * El trigger sabe exactamente entre qué dos posiciones de scroll vive su
 * progreso: `start` y `end`. Preguntárselo es la única forma de no tener dos
 * versiones de la misma cuenta.
 */
export function scrollToProgress(_trackRef, progress) {
  if (!track) return

  /*
    El argumento es un punto del RECORRIDO, no una fraccion de la pista: hay
    que deshacer el reparto antes de convertirlo en pixeles. Sin esto, pedir el
    hub (0,84) aterrizaria en el 84% de la pista, que con el reparto nuevo es
    todavia la salida del cerebro.
  */
  const value = unwarp(Math.min(1, Math.max(0, progress)))
  const target = track.start + (track.end - track.start) * value

  window.scrollTo({ top: target, behavior: 'smooth' })
}
