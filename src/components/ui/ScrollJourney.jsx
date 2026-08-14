import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { journey, ramp } from '../../state/journey'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

/**
 * Coreografia del recorrido.
 *
 * Un solo ScrollTrigger fija la portada y va escribiendo el progreso. Nada de
 * esto pasa por el estado de React: el valor va a un objeto mutable que lee
 * el bucle de render, y las opacidades del texto se escriben directamente en
 * el DOM con `quickSetter`, que evita crear objetos por frame.
 *
 * ScrollSmoother da la inercia en escritorio. En tactil se queda apagado a
 * proposito: el scroll nativo del movil siempre va mas fino que cualquier
 * suavizado por JavaScript, y forzarlo es de donde salen los enganchones.
 */
export default function ScrollJourney({ heroRef, pinRef, heroTextRef, insideTextRef }) {
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

      const setHero = gsap.quickSetter(heroTextRef.current, 'opacity')
      const setInside = gsap.quickSetter(insideTextRef.current, 'opacity')

      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinRef.current,
        pinSpacing: false,
        // `scrub: true` sin numero: sigue al scroll sin retardo propio. La
        // inercia ya la pone ScrollSmoother, y sumar las dos hace que la
        // camara llegue tarde y parezca que patina.
        scrub: true,
        onUpdate: (self) => {
          journey.progress = self.progress

          setHero(1 - ramp(self.progress, 0.04, 0.26))
          setInside(ramp(self.progress, 0.58, 0.74))
        },
      })

      return () => smoother?.kill()
    })

    return () => context.revert()
  }, [heroRef, pinRef, heroTextRef, insideTextRef, reducedMotion])

  return null
}
