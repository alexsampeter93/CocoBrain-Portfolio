import { useEffect, useRef } from 'react'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'

/**
 * Los dos fondos ilustrados, con fundido cruzado.
 *
 * ## Por qué van en el DOM y no en la escena
 *
 * Podrían ser planos o texturas de fondo dentro de WebGL, y sería lo
 * "natural". Pero son imágenes fijas que no necesitan ni perspectiva ni luz ni
 * profundidad: meterlas en la escena las convertiría en píxeles que la tarjeta
 * tiene que sombrear en cada frame, y ahora mismo el presupuesto está justo
 * —el cerebro de cristal ya obliga a dibujar la escena dos veces—.
 *
 * Como capas del navegador cuestan prácticamente cero: se componen una vez y
 * el fundido es una propiedad que la GPU resuelve sola.
 *
 * Van con `position: fixed`, nunca con `background-attachment: fixed`, que
 * obliga a repintar la ventana entera en cada frame de scroll.
 */

/** Se cruzan con el mismo reloj que mueve la cámara: entran cuando entra la mente. */
const LAYER = 'mind'

export default function Backdrops() {
  const heroRef = useRef(null)
  const mindRef = useRef(null)

  useEffect(() => {
    let frame
    let last = -1

    const tick = () => {
      const value = layerOpacity(LAYER, journey.progress)

      // Solo se escribe cuando cambia de verdad. Tocar el estilo obliga al
      // navegador a recomponer, y el valor está quieto casi todo el recorrido.
      if (Math.abs(value - last) > 0.002) {
        last = value
        if (heroRef.current) heroRef.current.style.opacity = 1 - value
        if (mindRef.current) mindRef.current.style.opacity = value
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <img
        ref={heroRef}
        src="/img/bg-hero.webp"
        srcSet="/img/bg-hero-sm.webp 900w, /img/bg-hero.webp 1920w"
        sizes="100vw"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <img
        ref={mindRef}
        src="/img/bg-mind.webp"
        srcSet="/img/bg-mind-sm.webp 900w, /img/bg-mind.webp 1920w"
        sizes="100vw"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-0"
      />
    </div>
  )
}
