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
    /**
     * ── DÓNDE VA EL TEXTO, Y POR QUÉ AHÍ ──────────────────────────────────
     *
     * Estaba dentro de un contenedor centrado de `max-w-6xl` (1152 px). En una
     * pantalla de 1920 eso empuja la columna hasta x=384 mientras Olaz empieza
     * en x=675, así que el texto se metía 93 píxeles DENTRO de su caja. Medido
     * con `node scripts/hero.mjs`, que proyecta la caja del modelo a píxeles:
     *
     *     1920   texto 384→768   Olaz desde 675   solapa  93 px
     *     1440   texto 144→528   Olaz desde 507   solapa  21 px
     *     1366   texto 107→491   Olaz desde 480   solapa  11 px
     *
     * El dato que resuelve el problema es que **Olaz empieza siempre en el 35%
     * del ancho**, en las tres. No es casualidad: su distancia sale de `fill`
     * por geometría, así que su posición en pantalla es proporcional.
     *
     * Así que la columna deja de ir centrada y se ancla al borde izquierdo con
     * un ancho de `28vw`: se queda siempre en el tercio izquierdo, crece con la
     * pantalla y nunca alcanza el 35%. No hay `z-index` de por medio —poner el
     * texto por delante habría dejado los párrafos escritos sobre el pecho del
     * personaje, que es tapar el problema, no resolverlo—.
     *
     * De paso deja de ser una columna centrada, que es de lo que el manual
     * huye: esto es una composición editorial, texto a la izquierda y sujeto a
     * la derecha.
     *
     * ## Y EN VERTICAL EL TEXTO PASA ARRIBA
     *
     * Estaba en `bottom-20`, debajo del personaje, de cuando Olaz flotaba en
     * mitad del cuadro. Ahora se planta en el pedestal del bodegón, que en la
     * lámina cae en el 87% del alto, así que ocupa el tercio de abajo entero y
     * ahí no cabe nada más. Arriba, en cambio, la lámina es la pared lisa —lo
     * más limpio que tiene— y las dos cosas dejan de disputarse el mismo sitio.
     *
     * En apaisado no cambia nada: `lg:top-1/2` con su centrado sigue mandando.
     */
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-0 top-[13dvh] px-6 sm:px-10 lg:top-1/2 lg:-translate-y-1/2 lg:px-[4vw]"
    >
      <div className="w-full">
        <div className="max-w-[20rem] sm:max-w-[26rem] lg:max-w-[min(34rem,28vw)]">
          {/*
            El cuerpo crece con la pantalla, pero atado al ancho de la columna:
            `7vw` daba 134 px en 1920 y se recortaba a 3,6 rem, o sea que en la
            pantalla más grande el titular era el más pequeño en proporción. Con
            `3,4vw` la línea larga —"desarrollo web"— sigue cabiendo en la
            columna en las cuatro medidas comprobadas.
          */}
          <p className="text-[clamp(2rem,3.4vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            <span className="block" data-hero-line="nombre">
              Alex
            </span>
            <span className="block text-coco-light" data-hero-line="oficio">
              desarrollo web
            </span>
          </p>

          <p data-hero-line="claim" className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px]">
            Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue una vez
            nuestra mayor <em className="not-italic text-coco-light">debilidad</em>.
          </p>

          {/* Estos dos renglones caen sobre las piedras del bodegón, que tienen
              mucho más contraste que la pared lisa de la sala anterior. Van con
              la tinta principal entera: en la captura, al 70% desaparecían. */}
          <p className="mt-3 font-mono text-[11px] text-coco-dark sm:mt-6">
            Baja para entrar <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </div>
  )
}
