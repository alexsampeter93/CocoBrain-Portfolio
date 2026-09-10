import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { journey } from '../../journey/clock'
import { layerOpacity } from '../../journey/stages'
import { MaskLetters } from '../portfolio/Type'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { isCurtainLifted, subscribeCurtain } from '../../state/curtain'
import { Icon } from './Icon'

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
export default function HeroCopy({ onSkip }) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  /**
   * ── LA PORTADA SE COMPONE AL LEVANTARSE EL VELO (fase 11F) ──────────────
   *
   * Hasta aqui el titular estaba montado desde el primer frame: el velo se
   * iba y detras habia una pagina ya hecha. La marca SI se componia -eso es
   * 10G- asi que lo que ocurria era peor que no tener entrada: la primera
   * pantalla tenia gesto y la segunda no.
   *
   * Los papeles son los que §6 ya define, y en su registro:
   *
   *     0,00  el NOMBRE, letra a letra, subiendo desde debajo del renglon
   *     0,22  el OFICIO, igual y mas rapido: es la segunda linea del mismo
   *           titular, no un bloque nuevo
   *     0,78  el eslogan y los dos renglones de abajo: corto y con opacidad,
   *           que es lo que §6 le pide a un texto de lectura
   *
   * ## Por que letra a letra aqui y no en la marca
   *
   * En 10G no se pudo: el logotipo es una ILUSTRACION -letras extruidas, dos
   * cocos y un cerebro- y medida su cobertura alfa no hay un solo hueco entre
   * glifos donde cortar. Aqui el titular es TEXTO, asi que `MaskLetters` -que
   * ya existe y ya compone los nombres de capitulo- hace exactamente eso sin
   * estrenar mecanismo. Es lo que Alex pidio desde el principio.
   *
   * ## Y espera al velo, no a un reloj
   *
   * La entrada dura segundo y medio y el preloader tarda 3,85-3,89 s en
   * irse -medido, y depende de la red de quien entre-. Copiar esos tres
   * numeros aqui seria la clase de dato duplicado que §13 tiene documentada
   * como caducable, asi que el velo lo dice el mismo: ver `state/curtain.js`.
   *
   * ## Y no toca la opacidad de la RAIZ
   *
   * De esa ya es dueno el bucle de abajo, que la escribe desde el reloj del
   * recorrido. La entrada anima los HIJOS. Un dueno por elemento, la ley de
   * la casa — y es literalmente el fallo que costo una vuelta en 10C.
   */
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || reduced) return

    let soltar
    const ctx = gsap.context(() => {
      const nombre = root.querySelectorAll('[data-cue="hero-name"]')
      const oficio = root.querySelectorAll('[data-cue="hero-trade"]')
      const resto = root.querySelectorAll('[data-enter]')
      if (!nombre.length) return

      /*
        `fromTo` con los dos extremos escritos, y el eje ENTERO: quien mueve
        `yPercent` fija tambien `y`. Las dos reglas salen del fallo de 7B que
        §13 cuenta con sus numeros.

        Y nace pausada con `immediateRender`, que es lo que escribe el estado
        de partida en el mismo frame del montaje: sin eso habria un frame con
        el titular ya puesto antes de que empiece a componerse.
      */
      const linea = { yPercent: 120, y: 0, opacity: 0 }
      const puesta = { yPercent: 0, y: 0, opacity: 1 }

      const tl = gsap.timeline({ paused: true })
      tl.fromTo(nombre, linea, { ...puesta, duration: 0.72, ease: 'power3.out', stagger: 0.05 }, 0)
        .fromTo(oficio, linea, { ...puesta, duration: 0.68, ease: 'power3.out', stagger: 0.028 }, 0.22)
        .fromTo(
          resto,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.11 },
          0.78,
        )

      /*
        Y una red por si el velo no llega a avisar nunca -un fallo suyo, una
        pestana en segundo plano-. Una portada invisible es mucho peor que una
        portada sin entrada, asi que a los ocho segundos entra igual. Es la
        misma precaucion que el propio preloader lleva contra si mismo.
      */
      const arrancar = () => tl.play()
      if (isCurtainLifted()) arrancar()
      else {
        const off = subscribeCurtain(arrancar)
        const red = setTimeout(arrancar, 8000)
        soltar = () => {
          off()
          clearTimeout(red)
        }
      }
    }, root)

    return () => {
      soltar?.()
      ctx.revert()
    }
  }, [reduced])

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
            {/*
              El nombre lo compone `MaskLetters`, que ya existe: una banda con
              el recorte y las letras moviendose DENTRO. El recorte va en la
              linea y nunca en la letra — §13 tiene contado con sus medidas lo
              que pasa al reves: el interletraje negativo afeita el costado de
              todas las letras y el interlineado cerrado se come ascendentes y
              descendentes.

              El envoltorio conserva `data-hero-line`, que es lo que lee
              `scripts/hero.mjs` para comparar el titular con Olaz. Una
              herramienta que deja de encontrar su ancla mide otra web.
            */}
            <span className="block" data-hero-line="nombre">
              <MaskLetters text="Alex" cue="hero-name" />
            </span>
                        {/*
              El oficio va en el coco MEDIO, no en el claro (decision de Alex,
              11E). Con `#C99B6E` -el acento del acto 1- sobre la crema del
              bodegon daba **2,10 : 1**, y un texto de este cuerpo pide 3,0.

              No se arregla con mas luz: la luz lateral aclara el FONDO, que
              es lo contrario de lo que hace falta. Medidas las alternativas
              de la paleta sobre ese suelo: #8A5A3C 4,47 · #6B4530 6,40 ·
              #2C4A73 6,91 · #2B211C 12,06.

              Se elige el primero porque pasa y ademas sigue siendo coco, asi
              que conserva el contraste de PESO con "Alex" -dos tonos del
              mismo color, una lectura- en vez de igualarlos.
            */}
            <span className="block text-coco-warm" data-hero-line="oficio">
              <MaskLetters text="desarrollo web" cue="hero-trade" />
            </span>
          </p>

          <p data-enter data-hero-line="claim" className="mt-5 text-[15px] leading-[1.45] sm:mt-7 sm:text-[17px]">
            Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue una vez
            nuestra mayor <em className="not-italic text-coco-light">debilidad</em>.
          </p>

          {/* Estos dos renglones caen sobre las piedras del bodegón, que tienen
              mucho más contraste que la pared lisa de la sala anterior. Van con
              la tinta principal entera: en la captura, al 70% desaparecían. */}
          <p data-enter className="mt-3 font-mono text-[11px] text-coco-dark sm:mt-6">
            Baja para entrar
            <Icon name="down" size="1.05em" className="link-arrow-down ml-1 inline-block align-[-0.15em]" />
          </p>

          {/*
            ── Y UNA SALIDA PARA QUIEN NO QUIERE HACER EL VIAJE (fase 11A) ──

            La página mide 53 pantallas y el recorrido 3D se lleva 30 de
            ellas. Está medido que ese reparto no se puede recortar: el máximo
            seguro son 25 pantallas —el descenso tiene un suelo de cinco o la
            caída de luz se lee como un interruptor— y eso es un 9%, que no se
            nota. Así que el recorrido no se acorta: se puede SALTAR.

            No es un botón: es una segunda línea del mismo narrador que ya dice
            "Baja para entrar", en su misma voz. Un botón con borde y esquinas
            redondeadas aquí sería exactamente la estética que la regla 2
            prohíbe, y además competiría con Olaz, que es el sujeto del plano.

            **Y se ofrece SIEMPRE, no solo a quien vuelve.** Lo natural parecía
            recordar la visita y enseñarlo la segunda vez. Es al revés: quien
            más lo necesita es quien llega por primera vez con cuarenta
            segundos —un reclutador— y ese, por definición, no ha estado antes.

            Reutiliza `goToNode`, la misma navegación del HUD, así que no hay una
            segunda forma de llegar al editorial. Y va con scroll SUAVE a
            propósito: medido, el vuelo son 1.896 ms con p95 de 19 ms y dos
            frames largos. Se ve el recorrido pasar a velocidad en vez de
            teletransportarte, que es lo que convierte un salto en un atajo y
            no en otra página.

            El foco lleva su color escrito a mano, y es una excepción con fecha
            de caducidad: la portada es el único suelo de la web que todavía no
            declara `data-ground`, así que ahí `--mark` vale el rosa de la mente y
            sobre la crema da 1,9 : 1. No se puede arreglar extendiendo
            `paper` a la portada porque la navegación de abajo se lee justo
            gracias a que cae sobre la parte OSCURA del bodegón. Es trabajo de
            11E, y está anotado en §16.
          */}
          {onSkip && (
            <button
              type="button"
              data-enter
              onClick={onSkip}
              className="pointer-events-auto mt-1 py-2 font-mono text-[11px] text-coco-dark underline decoration-coco-dark/30 decoration-1 underline-offset-4 transition-colors hover:decoration-coco-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coco-dark"
            >
              o ir directo al portfolio
              <Icon name="external" size="1.05em" className="link-arrow ml-1 inline-block align-[-0.15em]" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
