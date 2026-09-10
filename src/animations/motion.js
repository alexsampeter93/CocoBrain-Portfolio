import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { DEPTH, FINE_POINTER, MOTION, isRoomy } from './tokens'
import { useScrollVelocity } from './velocity'

gsap.registerPlugin(ScrollTrigger)

/**
 * ── EL SISTEMA DE MOVIMIENTO DEL EDITORIAL ──────────────────────────────────
 *
 * ## La regla que lo ordena todo: NADA TIENE RELOJ PROPIO
 *
 * `CLAUDE.md` §6 dice, literalmente, "no crear timelines de GSAP independientes
 * por bloque editorial… una animación con su propio TIEMPO se desincroniza del
 * recorrido el primer día". Este módulo no la contradice: la aplica.
 *
 * Todo lo que hay aquí va con `scrub`. Una animación con `scrub` no tiene
 * duración: su progreso ES la posición del scroll, exactamente igual que
 * `journey.progress` y `journey.reading`. Se mueve mientras el dedo se mueve,
 * se para cuando el dedo se para, y **al subir deshace lo que bajar hizo**, que
 * es la misma ley de reversibilidad que `scripts/reverse.mjs` le exige a la
 * escena.
 *
 * Lo que sigue prohibido, y aquí no se usa: `gsap.to` sueltos, `delay`,
 * `repeat`, y cualquier cosa que siga corriendo con el visitante quieto.
 *
 * ## Por qué son varios ScrollTrigger y eso tampoco contradice nada
 *
 * `JourneyScroll` dice "un solo ScrollTrigger, ni uno por sección ni uno por
 * efecto". Esa regla existe para que no haya DOS cosas moviendo la MISMA
 * cámara. Los de aquí no tocan la cámara, ni el reloj, ni el progreso: leen la
 * posición de un elemento del documento y escriben `transform` y `opacity` en
 * ese mismo elemento. Son disjuntos del recorrido por construcción — viven en
 * `<main>`, donde la pista ya ha terminado.
 *
 * ## Y solo `transform` y `opacity`
 *
 * §9 del manual lo tiene medido: esas dos las resuelve el compositor sobre una
 * capa que ya está en la tarjeta, y `filter` y `mask-image` obligan a
 * rasterizar la capa entera. Por eso aquí NO hay `clip-path` —que es de la
 * misma familia— aunque sea el recurso habitual para un reveal: el mismo efecto
 * se consigue con una escala que se asienta dentro de un marco con
 * `overflow: hidden`, y esa sí es gratis.
 */


/**
 * La entrada de un bloque: sube y aparece, escalonando sus hijos directos si se
 * le pide.
 *
 * Devuelve una ref que hay que colgar del contenedor. Con `select` se eligen
 * los elementos que entran; sin él entra el contenedor entero.
 *
 * En reposo —con `prefers-reduced-motion`, con "cabeza despejada", o si algo
 * falla— **el elemento se queda tal cual está en el CSS**: visible, en su
 * sitio. Esa es la razón de usar `from` y no `fromTo` con un estado inicial
 * escrito en la hoja de estilos: sin JavaScript no hay nada que revelar porque
 * nada se ha escondido.
 */
export function useReveal({ select, stagger = true, rise = MOTION.RISE } = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const root = ref.current
    if (!root || reduced) return

    const ctx = gsap.context(() => {
      const targets = select ? gsap.utils.toArray(select, root) : [root]
      if (targets.length === 0) return
      /*
        ── DOS REVELADOS SOBRE EL MISMO ELEMENTO SE PELEAN ──────────────────

        Costó un fallo visible y merece quedar escrito. `PortfolioSection`
        revela `[data-enter]`, y cada ficha de proyecto marca los suyos con lo
        mismo — pero la sección ENVUELVE a las fichas, así que su selector
        alcanzaba también los títulos de los proyectos. Dos tweens escribiendo
        `opacity` en el mismo nodo, cada uno atado a un disparador distinto: el
        de la sección, que a esa altura ya vale uno, y el de la ficha, que
        acaba de empezar.

        En escritorio los dos coincidían en uno y no se notaba. En 390 la
        sección mide varias pantallas más, los dos disparadores dejan de estar
        de acuerdo, y el título del proyecto **se quedaba invisible**.

        `:scope >` limita cada revelado a sus hijos DIRECTOS. Un contenedor no
        puede robarle la entrada a otro que tiene dentro.
      */

      /*
        ── LOS DOS EXTREMOS SE DECLARAN ─────────────────────────────────────

        Era un `from`, y un `from` no declara su destino: lo LEE del elemento
        la primera vez que se dibuja. En esta página esa lectura cae a veces con
        el elemento ya escondido —`ScrollTrigger.refresh()` se dispara al cargar
        las fuentes, al montar el canvas y al llegar las imágenes— y entonces
        GSAP graba el inicio como final: la entrada va de A a A y el bloque se
        queda invisible para siempre. Está contado con los números medidos en
        `animations/editorial.js`.
      */
      gsap.fromTo(
        targets,
        { y: rise, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          // Lineal a propósito: la curva la pone el `scrub`, que es lo que hace
          // que el movimiento se sienta atado al dedo y no a una fórmula.
          ease: 'none',
          duration: 1,
          stagger: stagger ? MOTION.STAGGER : 0,
          scrollTrigger: {
            trigger: root,
            start: MOTION.START,
            end: MOTION.END,
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        },
      )
    }, root)

    return () => ctx.revert()
  }, [reduced, select, stagger, rise])

  return ref
}

/**
 * La entrada de una imagen: sube, y además se ASIENTA en su marco.
 *
 * La escala arranca por encima de uno y termina exactamente en uno. No es un
 * zoom: es que la lámina llega a su sitio. Y termina en uno porque el encuadre
 * en reposo tiene que ser el que se eligió al recortar la captura — una escala
 * final mayor que uno recortaría contenido para siempre, y en una captura de
 * aplicación eso es perder evidencia.
 *
 * El marco lleva `overflow: hidden` desde antes de esta fase, así que la escala
 * no desborda nada.
 */
export function useMediaReveal() {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const figure = ref.current
    if (!figure || reduced) return
    /*
      Se anima la ENVOLTURA, no la imagen, y por un motivo muy concreto: GSAP
      escribe `transform` en el atributo `style`, y una regla de CSS no puede
      ganarle a un estilo en línea. Con la escala del reveal puesta sobre la
      imagen, el `:hover` de `.media-frame img` no volvería a aplicarse nunca.

      Un dueño por propiedad y por elemento: GSAP manda en la envoltura, la
      hoja de estilos manda en la imagen.
    */
    const inner = figure.querySelector('[data-media-inner]')
    if (!inner) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: figure,
          start: MOTION.START,
          end: MOTION.END,
          scrub: MOTION.SCRUB,
          invalidateOnRefresh: true,
        },
      })
      /*
        Los dos con destino declarado. Con `from` la captura se quedaba a
        opacidad cero de forma permanente —el fallo que hacía que las láminas
        de los proyectos no se vieran aunque el visor sí las abriera—, porque
        GSAP grababa como destino el estado escondido. Ver `editorial.js`.

        Y la escala termina en UNO EXACTO, que es la condición de siempre: el
        encuadre en reposo tiene que ser el que se recortó en la fase 5E.
      */
      tl.fromTo(
        figure,
        { y: MOTION.RISE_MEDIA, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none', duration: 1 },
        0,
      )
      tl.fromTo(inner, { scale: MOTION.SETTLE }, { scale: 1, ease: 'none', duration: 1 }, 0)
    }, figure)

    return () => ctx.revert()
  }, [reduced])

  return ref
}

/**
 * El desplazamiento diferencial entre dos columnas.
 *
 * **Es lo único que hace de paralaje en el editorial, y mueve el MARCO, nunca
 * la imagen.** Desplazar la imagen dentro de su marco obligaría a ampliarla, y
 * ampliar una captura de aplicación recorta la interfaz que se está enseñando.
 * Moviendo el marco, la profundidad sale de que una columna avance a distinta
 * velocidad que la otra, que es de donde sale de verdad.
 *
 * Solo en pantallas anchas: por debajo de 1024 las columnas se apilan y dos
 * cosas apiladas no pueden ir a velocidades distintas sin abrir un hueco.
 */
export function useDrift(distance = MOTION.DRIFT) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        gsap.fromTo(
          el,
          { y: distance },
          {
            y: -distance,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: MOTION.DRIFT_START,
              end: MOTION.DRIFT_END,
              scrub: MOTION.SCRUB,
            },
          },
        )
      })
      return () => mm.revert()
    }, el)

    return () => ctx.revert()
  }, [reduced, distance])

  return ref
}

/**
 * El filete de acento que abre cada área, dibujándose de izquierda a derecha.
 *
 * Es el detalle que ata el editorial con la escena: ese mismo trazo es el que
 * lleva el nodo del área en la constelación. Que se dibuje en vez de aparecer
 * lo convierte en un gesto —algo que ocurre— en lugar de un adorno que ya
 * estaba.
 *
 * `scaleX` sobre un elemento de un píxel de alto: no hay nada más barato.
 */
export function useDrawRule() {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          transformOrigin: 'left center',
          ease: 'none',
          duration: 1,
          scrollTrigger: {
            trigger: el,
            start: MOTION.START,
            end: MOTION.END,
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        },
      )
    }, el)

    return () => ctx.revert()
  }, [reduced])

  return ref
}

/**
 * El mismo trazo, pero VERTICAL y a lo largo de todo su recorrido.
 *
 * Es el hilo de Experiencia: se dibuja de arriba abajo al ritmo al que se baja
 * por los puestos, así que la trayectoria no se ilustra —se recorre—. Por eso
 * su ventana no es la de una entrada, sino la travesía entera del elemento:
 * el trazo tarda en completarse exactamente lo que tardas tú.
 *
 * `scaleY` sobre un elemento de un píxel de ancho. Como el horizontal, no hay
 * nada más barato.
 *
 * ── 9C.2: EL GIRO ES OPCIONAL, Y SOLO EXISTE EN PANTALLA ANCHA ─────────────
 *
 * `rotate` es un grado constante, no una animación: entra en el mismo
 * `fromTo` que ya dibuja el trazo, así que sigue habiendo un único dueño del
 * `transform` de este elemento. Con él en cero —el valor por defecto, y el
 * único que usan los otros cuatro sitios que llaman a este hook— el
 * resultado es exactamente el de siempre.
 *
 * Por debajo de 1024 el hilo baja recto, la misma regla que ya usan
 * `useDrift` y `useSectionExit`: apilado, un giro no tiene hacia dónde
 * apuntar.
 */
export function useDrawThread({ rotate = 0 } = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const draw = (turn) =>
      gsap.fromTo(
        el,
        { scaleY: 0, rotate: turn, transformOrigin: 'top center' },
        {
          scaleY: 1,
          rotate: turn,
          transformOrigin: 'top center',
          ease: 'none',
          duration: 1,
          scrollTrigger: {
            trigger: el,
            start: 'top 78%',
            end: 'bottom 62%',
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        },
      )

    const ctx = gsap.context(() => {
      if (rotate === 0) {
        draw(0)
        return
      }
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => draw(rotate))
      mm.add('(max-width: 1023.98px)', () => draw(0))
      return () => mm.revert()
    }, el)

    return () => ctx.revert()
  }, [reduced, rotate])

  return ref
}

/**
 * ── UNA CAPTURA COMO LÁMINA FÍSICA ──────────────────────────────────────────
 *
 * El cursor la inclina. Muy poco: 2,2 grados como máximo, que es el ángulo en
 * el que se percibe que el objeto tiene una cara sin que se lea como un efecto.
 * Por encima de 4 grados ya es la tarjeta que gira de cualquier plantilla.
 *
 * ## Un dueño por elemento, otra vez
 *
 * Aquí conviven tres transformaciones sobre la misma imagen y por eso hay tres
 * envoltorios, cada uno con un único dueño:
 *
 *     figure .media-frame     el marco. Perspectiva y color de borde  (CSS)
 *       [data-media-plate]    la inclinación del cursor               (este hook)
 *         [data-media-inner]  la escala que se asienta al entrar      (GSAP)
 *           img               el acercamiento del hover               (CSS)
 *
 * Parece mucho hasta que se intenta con menos: GSAP escribe `transform` en
 * línea y gana a cualquier regla de CSS, así que dos dueños sobre el mismo
 * elemento significa que uno de los dos deja de funcionar sin avisar.
 *
 * ## Y se escribe a pelo, sin React y sin rAF
 *
 * `pointermove` ya llega como mucho una vez por frame. Meter estado de React
 * por medio sería re-renderizar el árbol del proyecto entero a cada píxel del
 * ratón, y un `requestAnimationFrame` propio solo añadiría una cola. Se escribe
 * la propiedad y se acabó — es `transform`, la resuelve el compositor.
 */
const TILT = 2.2
/**
 * Cuánto se despega de la mesa al pasar el cursor por encima.
 *
 * Eran 5, calibrados cuando una lámina secundaria medía unos 505 px. En 10C
 * las láminas crecen a 642 —el reparto se rehízo para el escenario ancho— y
 * un alzado es una señal ÓPTICA: sobre un objeto un 27% mayor, los mismos
 * cinco píxeles se leen menos. 7 conserva la proporción y sigue muy por
 * debajo del umbral que este manual marca: "a diez ya es una tarjeta que
 * salta".
 */
const LIFT = 7

export function usePlate(frameRef) {
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || reduced) return
    // Solo donde hay un cursor de verdad: en táctil no hay nada que seguir.
    if (!window.matchMedia(FINE_POINTER).matches) return
    const plate = frame.querySelector('[data-media-plate]')
    if (!plate) return

    const onMove = (event) => {
      const r = frame.getBoundingClientRect()
      const x = ((event.clientX - r.left) / r.width) * 2 - 1
      const y = ((event.clientY - r.top) / r.height) * 2 - 1

      /*
        ── LA LÁMINA SE DESPEGA ─────────────────────────────────────────────

        El `translateY` va DENTRO de la misma cadena que la inclinación y no
        en una regla de CSS, por la razón de siempre: este elemento ya tiene
        un dueño —este manejador— y dos fuentes escribiendo `transform` sobre
        el mismo nodo significa que una deja de aplicarse.

        Cinco píxeles. Lo justo para que se lea como una hoja levantándose de
        la mesa; a diez ya es una tarjeta que salta.
      */
      plate.style.transform =
        `translateY(${-LIFT}px) rotateY(${x * TILT}deg) rotateX(${-y * TILT}deg)`

      // La luz se mueve con la cara: es lo que hace que la inclinación se lea
      // como volumen y no como una lámina torcida.
      plate.style.setProperty('--sheen-x', `${((x + 1) / 2) * 100}%`)
      plate.style.setProperty('--sheen-y', `${((y + 1) / 2) * 100}%`)

      /*
        ── Y LA SOMBRA VA AL LADO CONTRARIO ─────────────────────────────────

        Esto es lo que de verdad separa un objeto de una imagen con un efecto
        encima. Al inclinar la lámina hacia la izquierda, su sombra sale por
        la derecha — y al levantarla, se aleja y se ablanda.

        Con la sombra quieta mientras la cara gira, el cerebro no sabe
        nombrar qué falla, pero deja de creérselo. Es la mentira más barata de
        arreglar que tenía la composición.
      */
      frame.style.setProperty('--sx', -x * 15)
      frame.style.setProperty('--sy', 34 - y * 11)
      // 10C: 0,22 era MENOS que el 0,26 de reposo, así que al acercar el
      // cursor la sombra se ACLARABA y la lámina parecía posarse en vez de
      // levantarse. Ahora sube, que es lo que corresponde a algo que se alza.
      frame.style.setProperty('--sblur', 72)
      frame.style.setProperty('--salpha', 0.34)
    }

    const onLeave = () => {
      plate.style.transform = ''
      plate.style.removeProperty('--sheen-x')
      plate.style.removeProperty('--sheen-y')
      // Se vuelve a apoyar: la sombra regresa a su sitio y se recoge.
      frame.style.removeProperty('--sx')
      frame.style.removeProperty('--sy')
      frame.style.removeProperty('--sblur')
      frame.style.removeProperty('--salpha')
    }

    frame.addEventListener('pointermove', onMove, { passive: true })
    frame.addEventListener('pointerleave', onLeave)
    return () => {
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', onLeave)
      onLeave()
    }
  }, [reduced, frameRef])
}

/**
 * ── LAS LÁMINAS SE SEPARAN AL PASAR ─────────────────────────────────────────
 *
 * Cada elemento marcado con `data-depth="n"` se desplaza a su propia velocidad
 * mientras el escenario cruza la pantalla. La principal casi no se mueve; las
 * secundarias, que están DELANTE, se mueven más.
 *
 * Eso es paralaje de verdad y no el de las plantillas: no es que la página se
 * mueva, es que **tres objetos a distinta distancia se desplazan distinto**, que
 * es lo único que el ojo lee como profundidad. Y por eso el número es la
 * distancia, no la velocidad: `data-depth="2"` está el doble de cerca.
 *
 * Solo en escritorio. Apiladas en una columna estrecha, dos láminas a
 * velocidades distintas abren un hueco entre ellas en vez de separarse en
 * profundidad.
 */
/**
 * ── UNA SECCIÓN SE RETIRA PARA DEJAR PASO A LA SIGUIENTE ────────────────────
 *
 * Hasta ahora cada área ENTRABA y ya: se quedaba puesta hasta que el scroll la
 * sacaba del cuadro. Eso convierte el último tramo del editorial en cuatro
 * bloques que se suceden.
 *
 * Esto es lo simétrico de `useReveal`: mientras el elemento SALE por arriba,
 * pierde densidad y se recoge hacia el margen. No desaparece —sigue siendo
 * legible mientras se ve— pero deja de reclamar la mirada justo cuando lo que
 * importa es lo que viene.
 *
 * En Habilidades es lo que convierte el campo de veintiséis tecnologías en la
 * línea de Experiencia: el campo se retira, el índice de familias se queda, y
 * el hilo que baja hacia la siguiente área se lee como lo que ha quedado de esa
 * estructura. Conocimiento → orden → trayectoria, sin duplicar ni un dato.
 *
 * `pull` es hacia dónde se recoge. Negativo, hacia la izquierda: en Habilidades
 * el índice está a la izquierda, así que el campo se retira HACIA su estructura
 * y no en una dirección cualquiera.
 */
export function useSectionExit({ pull = -28, floor = 0.16 } = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      // Solo en pantallas anchas: apilado, retirar un bloque hacia un lado no
      // significa nada porque no hay lado hacia el que retirarse.
      mm.add('(min-width: 1024px)', () => {
        gsap.to(el, {
          opacity: floor,
          x: pull,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            // Empieza a retirarse cuando ya se ha leído —su pie cruza la mitad
            // de la pantalla— y termina justo antes de salir del cuadro.
            start: 'bottom 55%',
            end: 'bottom 5%',
            scrub: MOTION.SCRUB,
          },
        })
      })
      return () => mm.revert()
    }, el)

    return () => ctx.revert()
  }, [reduced, pull, floor])

  return ref
}

export function useStage() {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const stage = ref.current
    if (!stage || reduced) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const hero = stage.querySelector('[data-plate="hero"]')
        const plates = gsap.utils.toArray('[data-plate="aside"]', stage)
        if (!hero) return

        /*
          ── EL ABANICO ──────────────────────────────────────────────────────

          Las láminas llegan RECOGIDAS, casi encima unas de otras, y se van
          extendiendo hasta su composición mientras bajas. No es que aparezcan
          tres imágenes: es que alguien las está desplegando sobre la mesa.

          ## De dónde salen las posiciones

          De medir, no de escribirlas dos veces. La posición FINAL de cada
          lámina la decide el layout —CSS absoluto— y aquí solo se calcula el
          desplazamiento que hay que deshacer para llevarla al montón. Así,
          añadir una cuarta o una quinta captura no obliga a tocar ni una línea
          de animación: se coloca donde toque y el abanico la recoge sola.

          ## Dónde está el montón, y por qué NO en el centro

          Recogerlas sobre el centro de la principal taparía justo lo que la
          principal demuestra —en Zalent, el bloque "Por qué encaja · 47%"—.
          Así que el montón se forma en la esquina EXTERIOR de abajo, la que
          queda del lado libre, y solapa apenas un cuarto de la lámina grande.
          Se lee igual de bien como montón y no esconde nada.

          Una composición que oculta la evidencia que compone está mal por
          bonita que quede.
        */
        const heroBox = hero.getBoundingClientRect()
        const flipped = stage.dataset.flip === '1'

        plates.forEach((plate, i) => {
          const box = plate.getBoundingClientRect()
          // La esquina donde se junta el montón, en coordenadas de ventana.
          const gatherX = flipped
            ? heroBox.left + heroBox.width * 0.16
            : heroBox.right - heroBox.width * 0.16 - box.width
          const gatherY = heroBox.bottom - heroBox.height * 0.3

          const rot = Number(plate.dataset.rot) || 0

          gsap.fromTo(
            plate,
            {
              x: gatherX - box.left,
              y: gatherY - box.top,
              rotate: rot * 0.2,
              scale: 0.93,
            },
            {
              x: 0,
              y: 0,
              rotate: rot,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: stage,
                start: 'top 82%',
                // Cada lámina termina de extenderse un poco después que la
                // anterior. No es un `stagger` —eso es tiempo— sino un tramo
                // de scroll distinto: la segunda tarda un 12% más en llegar.
                end: `bottom ${72 - i * 8}%`,
                scrub: MOTION.SCRUB,
                invalidateOnRefresh: true,
              },
            },
          )
        })

        // Y la principal conserva su deriva, que es lo que la separa en
        // profundidad de las que se le echan encima.
        gsap.fromTo(
          hero,
          { y: MOTION.DRIFT * 0.6 },
          {
            y: -MOTION.DRIFT * 0.6,
            ease: 'none',
            scrollTrigger: {
              trigger: stage,
              start: MOTION.DRIFT_START,
              end: MOTION.DRIFT_END,
              scrub: MOTION.SCRUB,
            },
          },
        )
      })
      return () => mm.revert()
    }, stage)

    return () => ctx.revert()
  }, [reduced])

  return ref
}

/**
 * ── UN VÍDEO QUE SE COMPORTA COMO UNA LÁMINA ────────────────────────────────
 *
 * Un vídeo de proyecto no es un reproductor: es una captura que se mueve. Por
 * eso no lleva controles, ni sonido, ni botón de play — lleva exactamente el
 * mismo marco, la misma sombra y la misma inclinación que las capturas fijas, y
 * la única diferencia es que dentro pasan cosas.
 *
 * ## Solo se reproduce lo que se está viendo
 *
 * Un `<video autoplay loop>` decodifica fotogramas mientras exista, esté o no
 * en pantalla. Con tres vídeos en la página eso son tres decodificadores
 * corriendo todo el rato para que se vea uno. El observador los enciende al
 * entrar y los PARA al salir: fuera del cuadro no cuestan nada.
 *
 * El umbral es del 25% y no de un píxel a propósito: con un píxel, pasar rozando
 * el borde inferior arranca y para el vídeo varias veces por segundo.
 *
 * ## Y con movimiento reducido no se reproduce solo
 *
 * Ahí el vídeo se queda en su póster —que es la captura de siempre— y aparecen
 * los controles nativos. No se esconde el contenido: se deja de imponer el
 * movimiento y se le devuelve al visitante la decisión de verlo.
 */
export function useVideoPlayback() {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const video = ref.current
    if (!video) return

    if (reduced) {
      video.pause()
      video.controls = true
      return
    }
    video.controls = false

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // `play()` devuelve una promesa que el navegador RECHAZA si el vídeo
          // no cumple las condiciones de reproducción automática. Sin capturarla
          // aparece un error sin gestionar en consola por cada intento.
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(video)
    return () => {
      io.disconnect()
      video.pause()
    }
  }, [reduced])

  return ref
}

export { MOTION, isRoomy }

/**
 * ── UN PLANO QUE NOTA LA PRISA ──────────────────────────────────────────────
 *
 * Devuelve una ref para una envoltura que se retrasa cuando bajas deprisa y se
 * recoloca sola al soltar. Cuanto más cerca está el plano —ver `DEPTH`— más se
 * retrasa, que es lo mismo que pasa cuando mueves la cabeza: lo que tienes a un
 * palmo se desplaza mucho y el fondo casi no.
 *
 * ## Por qué esto no es "paralaje en todo"
 *
 * Porque no responde a la POSICIÓN del scroll —eso ya lo hace `useDrift`, y el
 * manual tiene escrito por qué no se pone en más sitios— sino a su VELOCIDAD.
 * Quieto, el valor es cero y el elemento está exactamente donde lo dejó la
 * composición: no hay ningún encuadre nuevo que calibrar, ni nada recortado, ni
 * un desplazamiento permanente que corrija a ojo. Solo se nota mientras te
 * mueves, y por eso se puede usar donde un paralaje de posición sería un
 * estorbo.
 *
 * ## Y va en su propia envoltura, como todo lo demás
 *
 * Es la ley de la casa: en el DOM, un dueño por ELEMENTO. Las láminas del
 * abanico ya tienen a GSAP escribiéndoles `transform` desde `useStage`, así que
 * la velocidad no puede tocar ese nodo — escribe en uno de dentro. Para las
 * propiedades que no admiten envoltorio, como la rotación de un objeto 3D, la
 * composición se hace por canales; ver `animations/pose.js`.
 *
 * Solo por encima de 1024 y nunca con movimiento reducido.
 */
const VELOCITY_SHIFT = 15

export function useVelocityPlane(plane = 2, { enabled = true } = {}) {
  const ref = useRef(null)
  const [roomy, setRoomy] = useState(isRoomy)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setRoomy(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const onVelocity = useCallback(
    (v) => {
      const el = ref.current
      if (!el) return
      const shift = v * VELOCITY_SHIFT * (DEPTH[plane] ?? 1)
      // Se escribe la propiedad y se acabó: es `transform`, la resuelve el
      // compositor, y meter React por medio sería re-renderizar un árbol
      // entero sesenta veces por segundo para mover quince píxeles.
      el.style.transform = v === 0 ? '' : `translate3d(0, ${shift.toFixed(2)}px, 0)`
    },
    [plane],
  )

  useScrollVelocity(onVelocity, { enabled: enabled && roomy })

  return ref
}
