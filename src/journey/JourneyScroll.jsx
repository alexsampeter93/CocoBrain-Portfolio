import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { setProgress } from './clock'
import { stageAt } from './stages'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

/**
 * Traduce el scroll de la página al número que mueve el mundo.
 *
 * Un solo ScrollTrigger, fijando la portada. Ni uno por sección ni uno por
 * efecto: dos disparadores compitiendo por la misma cámara es exactamente lo
 * que hacía que las transiciones parecieran "sucias".
 *
 * ScrollSmoother da la inercia en escritorio. En táctil se queda apagado a
 * propósito —el scroll nativo del móvil siempre va más fino que cualquier
 * suavizado por JavaScript, y forzarlo es de donde salían los enganchones.
 */
export default function JourneyScroll({ trackRef, pinRef }) {
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      let smoother

      if (!reducedMotion && ScrollSmoother.get() === undefined) {
        smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper',
          content: '#smooth-content',
          smooth: 1.1,
          smoothTouch: false,
          effects: false,
          normalizeScroll: true,
        })
      }

      ScrollTrigger.create({
        trigger: trackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinRef.current,
        pinSpacing: false,
        // `scrub: true` sin número: sigue al scroll sin retardo propio. La
        // inercia ya la pone ScrollSmoother, y sumar las dos hace que la
        // cámara llegue tarde y parezca que patina.
        scrub: true,
        onUpdate: (self) => setProgress(self.progress, stageAt(self.progress).id),
      })

      return () => smoother?.kill()
    })

    return () => context.revert()
  }, [trackRef, pinRef, reducedMotion])

  return null
}

/**
 * Lleva el scroll al punto donde vive un tramo. Lo usa la navegación: pulsar
 * "Proyectos" tiene que mover la CÁMARA, no saltar al texto de abajo.
 */
export function scrollToProgress(trackRef, progress) {
  const track = trackRef.current
  if (!track) return

  const start = track.offsetTop
  const distance = track.offsetHeight - window.innerHeight
  const target = start + distance * Math.min(1, Math.max(0, progress))

  const smoother = ScrollSmoother.get()
  if (smoother) smoother.scrollTo(target, true)
  else window.scrollTo({ top: target, behavior: 'smooth' })
}
