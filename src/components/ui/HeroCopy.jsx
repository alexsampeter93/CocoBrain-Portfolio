import { useEffect, useRef } from 'react'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'

/**
 * El titular de la portada.
 *
 * Se desvanece leyendo el mismo reloj que mueve la cámara, en un bucle de
 * `requestAnimationFrame` que escribe la opacidad directamente en el estilo.
 * No pasa por React a propósito: es el mismo motivo que en la escena, un valor
 * que cambia sesenta veces por segundo no debe disparar renders.
 *
 * `pointer-events-none` es imprescindible. Este bloque está por encima del
 * canvas, y sin él se come todos los clics y el personaje deja de responder al
 * cursor —ese fue un bug real que costó tres intentos localizar.
 */
export default function HeroCopy() {
  const ref = useRef(null)

  useEffect(() => {
    let frame
    let last = -1

    const tick = () => {
      const opacity = layerOpacity('heroCopy', journey.progress)

      // Escribir en el estilo obliga al navegador a recalcular la composición.
      // La opacidad vale 1 casi todo el tiempo, así que solo se escribe cuando
      // de verdad cambia.
      if (ref.current && Math.abs(opacity - last) > 0.002) {
        last = opacity
        ref.current.style.opacity = opacity
        // Deja de recibir clics en cuanto es invisible, aunque siga montado.
        ref.current.style.visibility = opacity < 0.01 ? 'hidden' : 'visible'
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-0 bottom-24 px-6 sm:px-10 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-[20rem] sm:max-w-[26rem] lg:max-w-[24rem]">
          <p className="text-[clamp(1.9rem,7vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Alex
            <span className="block text-coco-light">desarrollo web</span>
          </p>

          <p className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px]">
            Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue una vez
            nuestra mayor <em className="not-italic text-coco-light">debilidad</em>.
          </p>

          <p className="mt-3 font-mono text-[11px] text-coco-mid sm:mt-6">
            Baja para entrar <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </div>
  )
}
