import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setTarget } from './clock'
import { stageAt } from './stages'

gsap.registerPlugin(ScrollTrigger)

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
export default function JourneyScroll({ trackRef, pinRef }) {
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      ScrollTrigger.create({
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
        onUpdate: (self) => setTarget(self.progress, stageAt(self.progress).id),
      })
    })

    return () => context.revert()
  }, [trackRef, pinRef])

  return null
}

/**
 * Lleva el scroll al punto donde vive un tramo. Lo usa la navegación: pulsar
 * "Proyectos" tiene que mover la CÁMARA, no saltar al texto de abajo.
 */
export function scrollToProgress(trackRef, progress) {
  const track = trackRef.current
  if (!track) return

  const distance = track.offsetHeight - window.innerHeight
  const target = track.offsetTop + distance * Math.min(1, Math.max(0, progress))

  window.scrollTo({ top: target, behavior: 'smooth' })
}
