import { useCallback, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrollVelocity } from '../../animations/velocity'

/**
 * ── LA BANDA HORIZONTAL: EL PRIMER MOVIMIENTO QUE CRUZA LA PANTALLA ─────────
 *
 * Ocho pantallas de editorial y todo bajaba. Es la observación que abre §7: el
 * movimiento y la composición son el mismo problema, y la solución no fue un
 * gesto nuevo sino usar el eje que el editorial no había tocado nunca.
 *
 * Vive entre el encabezado de Proyectos y el primer capítulo, con los nombres
 * del trabajo cruzando la pantalla. Sale de una referencia de Alex —la banda
 * horizontal de TBWA, §7— con una corrección que se mantiene: **no lleva fondo
 * propio.** La referencia usaba una franja de color; aquí el suelo ya es
 * identidad desde 9B, y un fondo no puede tener dos fondos. Lleva su acento y
 * dos filetes, y basta.
 *
 * ## Y AHORA SE MUEVE SOLA (fase 11C, decisión de Alex)
 *
 * En 10E cruzaba UNA vez, atada al scroll, porque §6 prohíbe "cualquier cosa
 * que siga corriendo con el visitante quieto". Esa regla se enmienda aquí, y
 * conviene entender qué prohibía de verdad antes de darla por relajada.
 *
 * **La regla nació para la ESCENA.** Su argumento está medido en §7: un nodo
 * emisivo que crece un 26% por su cuenta cruza el umbral de floración del bloom
 * y lo que se ve no es vida, es un PARPADEO. A eso se sumaba que la escena
 * tiene que ser una función pura del scroll para que `reverse.mjs` pueda
 * exigirle que volver al mismo punto dé el mismo cuadro.
 *
 * Nada de eso aplica a una banda de texto en el DOM: no pasa por el bloom, no
 * la mide `reverse.mjs`, no toca la cámara y no forma parte del estado del
 * recorrido. Y la casa ya tenía tres excepciones vivas de la misma familia —el
 * acuse del clic en un nodo, el cambio de índice del HUD y el balanceo de Olaz
 * en el preloader, que es un `repeat: -1` de verdad—.
 *
 * Lo que la enmienda NO relaja, y por eso esto no es una puerta abierta:
 *
 * - **cero trabajo invisible.** Un `IntersectionObserver` la para en cuanto
 *   sale de pantalla y la reanuda al volver. Con el visitante en Contacto, esta
 *   banda no existe;
 * - **cero movimiento no pedido.** Con "cabeza despejada" o con
 *   `prefers-reduced-motion` no se crea ninguna interpolación: el texto se
 *   queda quieto y legible desde el primer frame;
 * - **y sigue respondiendo al scroll**, que es lo que la ata a la página en vez
 *   de dejarla como un adorno que corre por su cuenta. Ver abajo.
 *
 * ## El bucle es sin costura, y por eso el contenido va DUPLICADO
 *
 * La pista lleva la lista dos veces y la interpolación va de `xPercent: 0` a
 * `-50`, o sea exactamente el ancho de una copia. Al reiniciar, el píxel que
 * queda bajo cada punto de la pantalla es el mismo, así que no hay salto que
 * ver. Es la única forma de que un bucle infinito no tenga costura, y es la
 * razón de que `HALVES` valga dos y no sea un número elegido por gusto.
 *
 * ## La velocidad es constante en PÍXELES, no en tiempo
 *
 * La duración se deduce del ancho medido de la pista, no se escribe a mano. Si
 * se fijara la duración, la banda iría más deprisa en una pantalla ancha que en
 * un móvil —más píxeles que recorrer en el mismo tiempo— y la sensación de
 * calma dependería del tamaño de la ventana. Con `SPEED` en píxeles por
 * segundo, un nombre tarda lo mismo en cruzar su propio ancho en las dos.
 *
 * ## Y el scroll la empuja
 *
 * `useScrollVelocity` da un valor con signo entre −1 y 1, y aquí modula el
 * `timeScale` de la interpolación: bajando acelera, subiendo **invierte** el
 * sentido. Eso es lo que impide que se lea como un carrusel de plantilla —algo
 * que corre igual pase lo que pase— y la convierte en algo que reacciona a lo
 * que estás haciendo. En reposo el `timeScale` vuelve a 1 solo, porque la
 * fuente vuelve a cero sola y sin bucle.
 *
 * ## Decorativa, y lo dice
 *
 * Los nombres reales de los proyectos ya están en cada capítulo, con su propio
 * encabezado accesible. Esto es la MISMA información en otro registro —para
 * hojear, no para leer— así que va `aria-hidden` entera: duplicarla para un
 * lector de pantalla sería leer tres veces la misma lista.
 */

/** Píxeles por segundo. Un paso de lectura, no un carrusel. */
const SPEED = 58

/**
 * Cuánto empuja el scroll. Con 2,6 y la velocidad al máximo, bajando la banda
 * va a 3,6 veces su paso y subiendo se invierte: es un empujón que se nota y
 * que no llega a leerse como un tirón.
 */
const PUSH = 2.6
const TS_MIN = -2.2
const TS_MAX = 4.2

/**
 * Dos copias de la lista, ni una más. Es lo que hace que `xPercent: -50` caiga
 * exactamente sobre el mismo dibujo. Ver arriba.
 */
const HALVES = 2

export default function SignatureBand({ items }) {
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const tweenRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  /**
   * El empujón del scroll. Va por una REF y no por estado: llega con cada
   * evento de scroll y pasar eso por React sería volver a renderizar la banda
   * entera decenas de veces por segundo, que es justo el bucle que este
   * proyecto evita en todas partes.
   */
  const onVelocity = useCallback((v) => {
    const tween = tweenRef.current
    if (!tween) return
    tween.timeScale(gsap.utils.clamp(TS_MIN, TS_MAX, 1 + v * PUSH))
  }, [])

  useScrollVelocity(onVelocity, { enabled: !reduced })

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    if (!wrap || !track || reduced) return

    const ctx = gsap.context(() => {
      /*
        El ancho de UNA copia. Se mide del elemento montado —no se calcula a
        partir del número de nombres y un ancho supuesto— porque la tipografía
        es fluida y una letra mide distinto en cada ventana. Es la regla de
        §13: si un dato depende de la geometría, se mide.
      */
      const build = () => {
        tweenRef.current?.kill()
        const half = track.scrollWidth / HALVES
        if (half < 1) return
        gsap.set(track, { xPercent: 0, x: 0 })
        tweenRef.current = gsap.to(track, {
          xPercent: -100 / HALVES,
          x: 0,
          duration: half / SPEED,
          ease: 'none',
          repeat: -1,
        })
      }
      build()

      /*
        Fuera de pantalla no corre nada. Un bucle infinito que sigue vivo
        mientras lees el CV es exactamente el "trabajo invisible" que la
        enmienda de §6 no permite.
      */
      const io = new IntersectionObserver(
        ([entry]) => {
          const tween = tweenRef.current
          if (!tween) return
          if (entry.isIntersecting) tween.resume()
          else tween.pause()
        },
        { threshold: 0 },
      )
      io.observe(wrap)

      // La ventana cambia de ancho: la pista mide otra cosa y su paso también.
      let resizeTimer
      const onResize = () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(build, 180)
      }
      window.addEventListener('resize', onResize)

      return () => {
        io.disconnect()
        window.removeEventListener('resize', onResize)
        clearTimeout(resizeTimer)
        tweenRef.current?.kill()
        tweenRef.current = null
      }
    }, wrap)

    return () => ctx.revert()
  }, [reduced])

  if (!items?.length) return null

  /*
    Suficientes nombres para que UNA copia llene el ancho de la pantalla más
    grande; después, la copia entera se repite `HALVES` veces para el bucle.
    Es contenido real repetido a propósito, no relleno: cada palabra es un
    proyecto que existe.
  */
  const perHalf = Math.max(4, Math.ceil(10 / items.length))
  const half = Array.from({ length: perHalf }, () => items).flat()
  const line = Array.from({ length: HALVES }, () => half).flat()

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="relative -mx-gutter overflow-hidden border-y border-rule py-4 sm:py-6"
    >
      <div
        ref={trackRef}
        className="flex w-max items-center whitespace-nowrap font-display text-[clamp(2.2rem,7vw,5.5rem)] font-semibold uppercase leading-none tracking-tight text-indigo"
      >
        {line.map((label, i) => (
          <span key={i} className="flex items-center">
            {label}
            <span className="mx-6 text-ink-faint sm:mx-10" aria-hidden="true">
              /
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
