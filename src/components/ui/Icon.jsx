import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ICONS, ICON_BOX, ICON_STROKE } from '../../data/icons'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * ── UN ICONO ES UN TRAZO DEL MISMO SISTEMA, NO UNA IMAGEN ───────────────────
 *
 * Todo va EN LÍNEA: cero peticiones, cero bytes de asset, y el color sale de
 * `currentColor`, así que un icono sigue solo al suelo y al tema. Esa última
 * parte no es un detalle — desde 11D hay tres regímenes de tinta, y §13 tiene
 * documentado lo que le pasó al HUD por llevar un hexadecimal escrito a mano.
 *
 * El tamaño lo pone quien lo usa, en `em`: así el icono crece con la letra a la
 * que acompaña en vez de quedarse fijo cuando la tipografía es fluida.
 *
 * Y va siempre `aria-hidden`: un icono al lado de su rótulo no aporta nada a un
 * lector de pantalla, y sin rótulo el nombre accesible lo pone el `aria-label`
 * del control. Un icono nunca es el texto.
 */
export function Icon({ name, className = '', size = '1em' }) {
  const d = ICONS[name]
  if (!d) return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  )
}

/**
 * ── EL CONMUTADOR DEL TEMA: UN SOL QUE SE MUERDE (fase 12A) ─────────────────
 *
 * Llevaba un cuadradito de siete píxeles que se rellenaba. Funcionaba y no
 * decía nada: un cuadrado no significa "de día" ni "de noche", así que el
 * interruptor dependía entero de su rótulo.
 *
 * **Y no son dos iconos que se cambian.** Un sol que desaparece y una luna que
 * aparece es un corte, y encima obliga a que las dos formas se parezcan lo
 * bastante para que no dé un salto. Aquí hay UNA forma: un círculo al que un
 * segundo círculo —que vive fuera del cuadro— entra a morderle un lado hasta
 * dejarlo en cuarto creciente. Los rayos se encogen a la vez.
 *
 * Es exactamente el recurso de Amicro leído como gesto y no como código: allí
 * es un componente de Motion dentro de una píldora, que es la forma que la
 * regla 2 prohíbe. Aquí es el mismo movimiento con GSAP, que ya está instalado,
 * y sin caja.
 *
 * ## Por qué una máscara aquí sí
 *
 * §9 prohíbe animar una máscara EN CADA FRAME DE SCROLL, porque rasteriza la
 * capa entera. Esto son 14 píxeles y se mueve una vez por pulsación: es la
 * misma excepción, y por el mismo motivo, que el telón de 11D.
 */
export function IconTheme({ dark, className = '', size = '1em' }) {
  const cutRef = useRef(null)
  const raysRef = useRef(null)
  const bodyRef = useRef(null)
  const reduced = usePrefersReducedMotion()
  const id = useRef(`cb-moon-${Math.random().toString(36).slice(2, 8)}`).current

  useLayoutEffect(() => {
    const cut = cutRef.current
    const rays = raysRef.current
    const body = bodyRef.current
    if (!cut || !rays || !body) return

    /*
      El estado en reposo se escribe SIEMPRE, también con movimiento reducido:
      lo que se apaga es el gesto, nunca el resultado. Es la lección de 10G, que
      dejó a Olaz invisible por tener su reposo dentro de una línea de tiempo.
    */
    const destino = dark
      ? { cutX: 15, cutY: 7, rayos: 0, cuerpo: 8.4 }
      : { cutX: 30, cutY: -8, rayos: 1, cuerpo: 5.6 }

    if (reduced) {
      gsap.set(cut, { attr: { cx: destino.cutX, cy: destino.cutY } })
      gsap.set(rays, { opacity: destino.rayos, scale: destino.rayos ? 1 : 0.4 })
      gsap.set(body, { attr: { r: destino.cuerpo } })
      return
    }

    const tl = gsap.timeline()
    tl.to(cut, { attr: { cx: destino.cutX, cy: destino.cutY }, duration: 0.5, ease: 'power3.inOut' }, 0)
      .to(body, { attr: { r: destino.cuerpo }, duration: 0.5, ease: 'power3.inOut' }, 0)
      .to(
        rays,
        { opacity: destino.rayos, scale: destino.rayos ? 1 : 0.4, duration: 0.34, ease: 'power2.out' },
        dark ? 0 : 0.16,
      )
    return () => tl.kill()
  }, [dark, reduced])

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      className={className}
    >
      <mask id={id}>
        {/* Lo blanco se dibuja; el círculo negro es el mordisco. */}
        <rect x="0" y="0" width={ICON_BOX} height={ICON_BOX} fill="white" />
        <circle ref={cutRef} cx="30" cy="-8" r="8.6" fill="black" />
      </mask>

      <circle ref={bodyRef} cx="12" cy="12" r="5.6" fill="currentColor" stroke="none" mask={`url(#${id})`} />

      {/*
        Los ocho rayos giran alrededor del centro con `transform-box: fill-box`,
        que es lo que hace que la escala se calcule contra la caja del grupo y
        no contra el origen del sistema de coordenadas del SVG — el mismo
        detalle que ya costó una vuelta con el campo topográfico en 9B.
      */}
      <g ref={raysRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M12 1.6v2.2M12 20.2v2.2M22.4 12h-2.2M3.8 12H1.6" />
        <path d="m19.35 4.65-1.56 1.56M6.21 17.79l-1.56 1.56M19.35 19.35l-1.56-1.56M6.21 6.21 4.65 4.65" />
      </g>
    </svg>
  )
}

/**
 * ── "CABEZA DESPEJADA": UNA ONDA QUE SE APLANA (fase 12A) ───────────────────
 *
 * El interruptor que apaga todo el movimiento de la web es un guiño al tema —
 * una mente que no para y un botón para pararla, así lo dice `calmMode.js`— y
 * llevaba el mismo cuadradito genérico que el del tema.
 *
 * Ahora es lo que significa: una onda que **se aplana hasta ser una línea**
 * cuando el modo está puesto. No es un icono distinto, es el mismo trazo con la
 * escala vertical a cero — así que el gesto ES la idea, y no hace falta
 * explicarla.
 *
 * Con movimiento reducido no se interpola: se escribe el estado y ya.
 */
export function IconCalm({ calm, className = '', size = '1em' }) {
  const waveRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const wave = waveRef.current
    if (!wave) return
    const destino = { scaleY: calm ? 0.04 : 1 }
    if (reduced) {
      gsap.set(wave, destino)
      return
    }
    const tw = gsap.to(wave, { ...destino, duration: 0.42, ease: 'power3.inOut' })
    return () => tw.kill()
  }, [calm, reduced])

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <g ref={waveRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {/*
          El trazo NO se escala con el grupo. Sin esto, al aplanar la onda su
          grosor se aplana con ella —1,6 x 0,04 = 0,06 px— y la linea plana se
          queda practicamente invisible: el icono desaparecia justo en el
          estado que tiene que comunicar. Es la misma propiedad, y por el
          mismo motivo, que el campo topografico usa desde 9B.
        */}
        <path
          vectorEffect="non-scaling-stroke"
          d="M2 12c2.2 0 2.2-6.4 4.4-6.4S8.6 18.4 10.8 18.4 13 5.6 15.2 5.6 17.4 12 19.6 12H22"
        />
      </g>
    </svg>
  )
}
