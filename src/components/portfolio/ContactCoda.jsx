import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import EditorialObject from './EditorialObject'
import { SectionHeading } from './PortfolioSection'
import { useScene } from '../../animations/editorial'
import { MOTION } from '../../animations/tokens'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { PendingList } from './Pending'
import { contact } from '../../data/portfolio'
import { Icon } from '../ui/Icon'

gsap.registerPlugin(Flip)

/**
 * EL CIERRE — la conversión.
 *
 * ## Por qué no es un área con nodo
 *
 * Porque no es un sitio que se visita: es donde acabas. Ponerlo como sexta
 * parada lo dejaba a la misma altura que "Habilidades" —algo que se mira y se
 * abandona para seguir bajando— cuando es lo único de la página que pide una
 * acción.
 *
 * Sin formulario, a propósito. Nadie rellena un formulario en un portfolio, y
 * un campo de texto con su botón de enviar es justo la estética de plantilla
 * que el proyecto prohíbe. Un correo que se puede copiar y dos enlaces hacen el
 * mismo trabajo sin fingir un producto.
 *
 * Y aquí el eslogan cierra el círculo. Es lo primero que se lee en la portada y
 * lo último antes de irse: la web empieza y termina diciendo lo mismo.
 */
/**
 * ── EL RITMO DE UNA CODA ────────────────────────────────────────────────────
 *
 * Es el único de la página que va HACIA ATRÁS respecto de los demás: en un área
 * el titular llega pronto y el detalle después; aquí no hay ningún titular que
 * colocar —"Hablemos" vive entero en el telón, ver `CurtainReveal`, su propio
 * mecanismo y fuera de esta tabla— así que lo que cierra la secuencia es la
 * firma: Olaz, en `object`, con la duración más larga de las seis (fase 12D.2).
 *
 * `title` ya no aparece aquí: no queda ningún `data-cue="title"` en el árbol
 * de la coda, y una clave sin quien la lea no documenta nada, miente.
 */
const CODA_CUES = {
  index: { at: 0, from: { yPercent: 130 }, dur: 0.8 },
  rule: { at: 0.08, from: { scaleX: 0, transformOrigin: 'left center' }, dur: 0.9 },
  meta: { at: 0.16, from: { y: 12, opacity: 0 }, stagger: 0.1, dur: 0.7 },
  lead: { at: 0.62, from: { y: 16, opacity: 0 }, stagger: 0.14, dur: 0.9 },
  body: { at: 0.72, from: { y: 14, opacity: 0 }, stagger: 0.1, dur: 0.8 },
  object: { at: 0.86, from: { opacity: 0, scale: 0.9 }, dur: 1 },
}

/**
 * ── EL TELÓN QUE SE ABRE: LA REFERENCIA ES damrod.dev, EL COLOR Y EL
 *    ESLOGAN SON LOS NUESTROS (fase 12D.2, corregida dos veces) ────────────
 *
 * Alex trajo esta referencia para el cierre: se llega a la sección y, con el
 * scroll, un telón con el título ESCRITO ENCIMA se abre en dos mitades antes
 * de que aparezca la info y el nodo con el que ya se contacta hoy — el mismo
 * gesto, con la palabra puesta en el telón en vez de detrás de él.
 *
 * ## El titular vive UNA sola vez, y es el del telón
 *
 * El primer intento dejaba dos copias: una gigante en el telón y la de
 * siempre —el `<Mask as="h2" cue="title">` de toda la vida— debajo, para
 * cuando el telón se hubiera ido. Alex lo corrigió: **"el hablemos solo
 * tiene que ser el del telón, el otro quitarlo"**. Tiene razón, y no es solo
 * gusto — un titular que aparece dos veces en la misma pantalla, aunque sea
 * a tamaños distintos, se lee como una redundancia y no como un cartel. El
 * `<Mask cue="title">` real ha salido del árbol y con él la clave `title` de
 * `CODA_CUES`: la única "Hablemos" de toda la coda es esta, la del telón, y
 * cuando el telón se abre lo que queda detrás es directamente el NODO, sin
 * ningún titular pequeño esperando su turno.
 *
 * ## Y el telón tapa TODO lo que hay que descubrir, Olaz incluido
 *
 * Cubría al principio solo el titular y la fila del nodo; Alex pidió que
 * "tape todo, incluido a Olaz" — la firma final es parte de "mi info" tanto
 * como el correo, así que el mismo telón que revela el nodo revela también
 * la mascota que cierra. Lo único que queda FUERA es el sello de arriba
 * (`SectionHeading`, con su propia entrada por `index`/`rule`/`meta`) y la
 * línea "CocoBrain — Alex" del pie, que es firma tipográfica permanente y no
 * "información" que descubrir.
 *
 * ## El color no es un acento: es EL MISMO tono que hay debajo
 *
 * Fue `coco.warm` —el acento del acto 5— en la primera versión, y Alex lo
 * corrigió también: **"el color que sea igual al de abajo, al tener el
 * hablemos en el telón, se nota la animación aún siendo el mismo color del
 * fondo"**. Es la observación correcta: lo que vende el gesto no es que el
 * panel contraste con la página, es que "Hablemos" —tinta oscura, enorme—
 * se desliza y se parte. Con el panel del mismo tono que el papel de debajo
 * no hay ninguna costura de color que gestionar mientras el telón cruza por
 * encima del nodo y de Olaz, y al abrirse del todo no queda ningún borde
 * que se note: el panel se disuelve en la página de la que salió.
 *
 * Por eso va en `bg-surface`/`text-ink` y no en un hexadecimal ni en el
 * acento del acto: son los mismos dos tokens que ya pintan cualquier
 * superficie y cualquier párrafo del editorial, así que el telón seguirá
 * al suelo si algún día cambia —y CAMBIA: en tema noche `--surface` y
 * `--ink` voltean solos, sin que este componente tenga que saberlo—. Un
 * color fijo aquí se habría roto el día que se activa el modo noche, la
 * misma lección que §13 tiene escrita para el HUD y para el visor de medios.
 *
 * Y esto responde también a la otra mitad de la petición de Alex —"darle
 * una solución a los botones para que se adapten bien"—: con el panel
 * igualado al fondo no hay nada que adaptar, porque nunca hay un instante en
 * el que un botón conviva con un bloque de color ajeno a la página. El
 * telón dejó de ser un objeto que se posa sobre la interfaz y pasó a ser la
 * misma superficie, desplazándose.
 *
 * ## Cómo se parte la palabra en dos sin cortar ninguna letra
 *
 * Cada mitad es un marco (`overflow-hidden`, la mitad del ancho) con dentro
 * una copia ENTERA de la palabra, del DOBLE de ancho que su propio marco y
 * centrada en él. Ancladas por el lado que las une —la izquierda por su
 * izquierda, la derecha por su derecha— las dos copias ocupan exactamente el
 * mismo tramo del mundo, así que lo que cada marco recorta son las dos
 * mitades EXACTAS de una sola palabra, sin una costura que se note.
 *
 * ## Por qué `translateX` y no `scaleX`
 *
 * El primer intento encogía cada panel con `scaleX`, y con solo color eso
 * bastaba —es el mismo truco que ya usa `rule` para trazarse—. En cuanto el
 * panel lleva una palabra dentro, encogerlo la ESTRUJA: las letras se
 * arriñonan en vez de deslizarse. Un telón no encoge sus mitades, las
 * DESPLAZA, así que cada mitad viaja el 100% de su propio ancho hacia su
 * lado — la palabra sale entera, del tamaño que entró.
 *
 * ## Por qué es SU PROPIO disparador, y no una clave más en `CODA_CUES`
 *
 * `useScene` da por hecho que el reposo de un papel es su estado NEUTRO
 * —`settled()` lo deriva de `NEUTRAL`, y ahí `x` vale 0—. Eso es justo lo
 * que quieren `index`, `rule`, `lead`: llegar a su sitio de siempre. Un
 * telón quiere lo CONTRARIO: reposar FUERA, en el 100% que lo saca de
 * cuadro. Forzar esa excepción dentro de `editorial.js` cambiaría el
 * comportamiento de las otras cinco áreas que también lo usan. Un
 * `ScrollTrigger` propio, con su propia ventana, no toca nada de eso — la
 * misma razón por la que `useDrawThread` o `useVelocityPlane` viven fuera
 * del sistema de papeles y no dentro.
 *
 * Y dos disparadores en una sección no rompe "uno por sección": esa regla
 * cuenta los que llegaron a ser NUEVE por área antes de 7B. Dos, aquí, es la
 * misma compañía que ya tienen `PortfolioSection` (`useScene` +
 * `useDrawThread`) o `ExperienceArea` (`useScene` + el giro del hilo).
 */
function CurtainReveal({ children }) {
  const wrapRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const left = leftRef.current
    const right = rightRef.current
    if (!wrap || !left || !right) return

    /*
      ── UN PORCENTAJE FIJO NO BASTA: LA CUNETA NO ES SIMÉTRICA ───────────

      `xPercent: -100` mueve el panel exactamente su propio ancho: el canto
      que quedaba pegado al texto llega justo al borde de este envoltorio. Y
      el envoltorio no empieza en el borde de la ventana ni acaba en él —
      `hud-safe-r` le resta más sitio por la derecha, para el HUD, que por la
      izquierda—, así que un mismo margen fijo para los dos lados sobra en
      uno y falta en el otro. Medido a 1920: con un +20% de margen (`OUT`
      fijo en 120) el panel izquierdo despejaba de sobra —necesitaba 114%— y
      al derecho, que necesitaba 126%, le quedaba una astilla de ocho
      caracteres de "Hablemos" asomando en el canto: 48 px de un total de
      800, justo el hueco que el `hud-safe-r` añade de más por ese lado.

      La cuneta real no se adivina: se MIDE contra el propio envoltorio —que
      nunca lleva transform, así que su rectángulo es estable pase lo que
      pase el telón— y contra el ancho de la ventana. Y se mide con una
      FUNCIÓN, no con un número calculado una vez al montar: GSAP llama a un
      valor-función cuando el tween se invalida, que es exactamente lo que ya
      dispara `invalidateOnRefresh` en cada resize — la misma pareja que ya
      usa el resto de la web para no fijar en JS una geometría que cambia.
    */
    const MARGIN = 6 // puntos porcentuales de sobra, por si el scrub no llega a converger del todo

    const clearance = () => {
      const rect = wrap.getBoundingClientRect()
      const panelWidth = rect.width / 2
      return {
        // el borde derecho del panel izquierdo tiene que llegar a 0
        left: -(((rect.left + panelWidth) / panelWidth) * 100 + MARGIN),
        // el borde izquierdo del panel derecho tiene que llegar a innerWidth
        right: ((window.innerWidth - rect.left - panelWidth) / panelWidth) * 100 + MARGIN,
      }
    }

    // El reposo es "abierto": con movimiento reducido no hay telón que
    // cruzar, el contenido está donde tiene que estar desde el primer
    // frame — la misma ley que ya sigue el resto del editorial.
    if (reduced) {
      const { left: leftOut, right: rightOut } = clearance()
      gsap.set(left, { xPercent: leftOut })
      gsap.set(right, { xPercent: rightOut })
      return
    }

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: wrap,
            /*
              ── LA VENTANA CRECIÓ CON EL TELÓN, Y EL FINAL NO PUEDE SER UN
                 PORCENTAJE: CONTACTO ES LA ÚLTIMA SECCIÓN ─────────────────

              Con solo título+grid detrás, `top 90% -> top 62%` bastaba: el
              bloque era corto y su centro —donde vive "Hablemos"— entraba en
              pantalla casi a la vez que el disparador arrancaba. Al crecer
              el telón hasta cubrir también a Olaz, el envoltorio pasó a medir
              ~430 px de alto y su centro vertical se quedó fuera de cuadro
              en el arranque: medido, con la ventana vieja el texto entero no
              llegaba a asomar antes de que ya estuviera partiéndose.

              El primer intento de arreglarlo puso `end: 'top 15%'` — más del
              doble de recorrido— y parecía correcto hasta medirlo contra el
              final REAL del documento: Contacto es la última sección, y
              detrás del envoltorio solo queda la firma "CocoBrain — Alex" y
              su relleno. Medido en el build a 1920×1080: el scroll se agota
              con el envoltorio todavía al 36% de la ventana, nunca llega al
              15% que el `end` pedía. El telón se quedaba parado al 62% de su
              apertura PARA SIEMPRE — ni el usuario más insistente, scrolleando
              hasta el final absoluto de la página, conseguía verlo abrirse
              del todo. Es la misma familia de fallo que ya tiene este manual
              con otro disfraz: un número que promete una geometría que el
              documento no tiene sitio para cumplir.

              La solución no es adivinar un porcentaje más prudente — eso
              solo cambia DÓNDE se queda corto, no si se queda corto en una
              pantalla distinta— es anclar el final a un punto que por
              construcción SIEMPRE coincide con el tope real del scroll:
              `endTrigger` aparte de `trigger`, apuntando a la sección
              entera, con `end: 'bottom bottom'`. El fondo de la ÚLTIMA
              sección de la página toca el fondo de la ventana exactamente
              en el máximo scroll posible, sea cual sea la altura de la
              ventana o cuánto mida el pie. No es una aproximación: es la
              misma cosa vista desde el disparador correcto.
            */
            start: 'top 70%',
            endTrigger: wrap.closest('section'),
            end: 'bottom bottom',
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(left, { xPercent: 0 }, { xPercent: () => clearance().left, ease: 'none' }, 0)
        .fromTo(right, { xPercent: 0 }, { xPercent: () => clearance().right, ease: 'none' }, 0)
    }, wrap)

    return () => ctx.revert()
  }, [reduced])

  return (
    <div ref={wrapRef} className="relative">
      {children}
      <div
        ref={leftRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center overflow-hidden bg-surface"
      >
        <div className="flex w-[200%] shrink-0 justify-center">
          <span className="font-display text-project font-semibold uppercase leading-none tracking-tight text-ink">
            Hablemos
          </span>
        </div>
      </div>
      <div
        ref={rightRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end overflow-hidden bg-surface"
      >
        <div className="flex w-[200%] shrink-0 justify-center">
          <span className="font-display text-project font-semibold uppercase leading-none tracking-tight text-ink">
            Hablemos
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * ── COPIAR EL CORREO (fase 12B) ─────────────────────────────────────────────
 *
 * Es el control más típico que le faltaba a este portfolio, y el que más se
 * usa de verdad: quien quiere escribirle a alguien casi nunca quiere que se le
 * abra el cliente de correo del sistema — quiere la dirección en el
 * portapapeles para pegarla donde ya está escribiendo.
 *
 * ## Y no rompe el silencio de la coda
 *
 * Esta sección tiene escrito que "poner aquí un botón convertiría el final en
 * otra sección", y esa regla habla del aire alrededor de Olaz: ahí él es una
 * firma y no puede compartir la pantalla con nada. Este control no está ahí:
 * está pegado al correo, que es el SUJETO de la coda, y no añade una cosa
 * nueva que leer — añade una forma de usar la que ya está.
 *
 * ## El acuse vuelve solo
 *
 * "copiado" dura dos segundos y vuelve a "copiar". Un control que se queda
 * cambiado para siempre deja de decir lo que hace, y a la segunda visita ya no
 * se entiende. Es la misma ley que el acuse del clic en un nodo: se extingue
 * solo. Y el cambio de rótulo lo anuncia un lector de pantalla porque el botón
 * es `aria-live`, así que el acuse no es solo visual.
 *
 * ## Si no se puede copiar, no hay botón
 *
 * El portapapeles solo existe en contexto seguro. En vez de dejar un control
 * que no hace nada —que es peor que no tenerlo— se comprueba al montar y no se
 * dibuja. El correo sigue estando: es un `mailto` de toda la vida, y este
 * botón nunca fue la única puerta.
 */
function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false)
  const [able, setAble] = useState(false)
  const timer = useRef(0)

  // Se mira DESPUÉS de montar, no durante el render: leer capacidades del
  // navegador mientras se renderiza es la clase de efecto que React reserva
  // para un efecto, y aquí además solo puede cambiar una vez.
  useEffect(() => {
    setAble(Boolean(navigator.clipboard?.writeText))
    return () => clearTimeout(timer.current)
  }, [])

  if (!able) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Sin acuse: decir "copiado" cuando no se ha copiado es peor que callar.
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="link-quiet"
      aria-live="polite"
      data-cursor="button"
      data-cursor-label="Copiar"
    >
      {copied ? 'copiado' : 'copiar'}
      <Icon name={copied ? 'check' : 'copy'} size="1.05em" className="link-arrow-still" />
    </button>
  )
}

/**
 * ── EL NODO QUE SE CIERRA: EL MISMO GESTO QUE ELEGIR UN ÁREA ────────────────
 *
 * Idea de Alex, y cierra el círculo de verdad y no solo en apariencia: en el
 * hub, elegir un nodo hace que su ficha aparezca y los demás se aparten; aquí,
 * el ÚLTIMO nodo del recorrido —que nunca existió en la constelación 3D,
 * porque Contacto "no es un sitio que se visita, es donde acabas"— vive en el
 * DOM con el mismo lenguaje —un punto en `--mark`, con su halo— y el mismo
 * gesto: pulsarlo abre su ficha.
 *
 * ## Por qué Flip, y no un tween de opacidad y escala
 *
 * El nodo cerrado y la tarjeta abierta no son del mismo tamaño ni de la misma
 * forma: uno es una fila de treinta píxeles de alto, la otra es un bloque con
 * nombre, correo y enlaces. Animar eso a mano exige medir el ANTES y el
 * DESPUÉS y interpolar cada propiedad — que es exactamente lo que `Flip`
 * hace, y `Flip` ya está en `node_modules/gsap` desde que existe el proyecto,
 * sin usar. Es la misma pieza que hace que un elemento "vuele" de un tamaño a
 * otro en el visor de medios cuando se abre una captura, aplicada aquí a un
 * cambio de FORMA en vez de a un vuelo entre dos sitios de la pantalla.
 *
 * `absolute: true` es lo que evita que el eslogan y Olaz, que están debajo,
 * salten de golpe mientras la tarjeta crece: Flip saca el elemento del flujo
 * durante la transición y lo devuelve a su sitio al terminar.
 *
 * ## Y sigue siendo un gesto, no una animación de scroll
 *
 * Es un clic, no el scroll: la misma excepción documentada para el acuse del
 * clic en un nodo y para el telón del tema. Con movimiento reducido no hay
 * interpolación —`Flip` no se llama— y el cambio de estado es instantáneo.
 */
function ContactNode() {
  const wrapRef = useRef(null)
  const nodeRef = useRef(null)
  const closeRef = useRef(null)
  const flipState = useRef(null)
  // Distingue "acabo de cambiar de estado" de "acabo de montarme": sin esto,
  // el efecto se dispara también en el primer render y se roba el foco de la
  // página nada más llegar a la sección — nadie ha pulsado nada todavía.
  const interacted = useRef(false)
  const reduced = usePrefersReducedMotion()
  const [open, setOpen] = useState(false)
  /*
    ── POR QUÉ EL OBJETO 3D ESPERA A QUE LA TARJETA SE ASIENTE ──────────────

    `Flip` con `absolute: true` fija el tamaño de LAYOUT de la tarjeta en el
    destino desde el primer frame (553×313 ya en t=30ms, medido) y anima solo
    un `transform: scale()` encima — el tamaño real nunca cambia, solo su
    apariencia. Pero react-three-fiber mide su contenedor con el rectángulo
    transformado, no con la caja de layout, y lo hace en cuanto el
    `IntersectionObserver` de `EditorialObject` decide que está a la vista —
    que ocurre casi al instante, con la tarjeta todavía a escala 0,37×0,08.
    Ese tamaño diminuto se queda para siempre: el lienzo no vuelve a medirse
    porque su caja de layout —52×52, fija por estilo— nunca cambia de verdad.

    Medido con la animación completa: sin esperar, el lienzo se queda en
    19×4 px para toda la sesión de la tarjeta abierta.

    La solución no es forzar una remedición: es no montar el `<canvas>`
    mientras la tarjeta todavía se está escalando. `settled` pasa a true
    solo cuando `Flip` termina —o al instante, sin `Flip`, con movimiento
    reducido— y el objeto no se monta hasta entonces.
  */
  const [settled, setSettled] = useState(false)

  const toggle = () => {
    flipState.current = Flip.getState(wrapRef.current)
    interacted.current = true
    setSettled(false)
    setOpen((value) => !value)
  }

  /*
    ── EL BOTÓN QUE SE PULSA DESAPARECE, ASÍ QUE EL FOCO HAY QUE LLEVARLO ────

    Abrir cambia qué rama se dibuja: el botón "Toca para escribirme" no se
    oculta, se DESMONTA, y React no tiene a qué devolver el foco. Sin este
    paso se cae al `<body>` — el mismo fallo que ya tiene medido `MediaViewer`
    con un visor entero, aquí a la escala de una tarjeta.
  */
  useLayoutEffect(() => {
    const state = flipState.current
    flipState.current = null
    if (!wrapRef.current) return

    if (!interacted.current) return // el primer render no es una interacción

    const foco = open ? closeRef.current : nodeRef.current

    if (reduced || !state) {
      gsap.set(wrapRef.current, { clearProps: 'all' })
      foco?.focus()
      setSettled(true)
      return
    }

    const tl = Flip.from(state, {
      target: wrapRef.current,
      duration: 0.55,
      ease: 'power3.inOut',
      absolute: true,
      scale: true,
      onComplete: () => {
        foco?.focus()
        setSettled(true)
      },
    })

    // El contenido nuevo entra con un pelín de retraso: si aparece a la vez
    // que el marco todavía está cambiando de tamaño, se lee borroso — dos
    // cosas moviéndose a la vez cuando solo una tiene que notarse.
    const content = wrapRef.current.querySelector('[data-node-content]')
    if (content) {
      tl.fromTo(content, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2)
    }
  }, [open, reduced])

  return (
    <div ref={wrapRef} className={open ? 'contact-card relative p-7' : 'inline-block'}>
      <div data-node-content>
        {open ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              {/*
                ── EL NOMBRE, EN LA MISMA VOZ QUE EN LA PORTADA ────────────

                Llevaba `font-display` —Outfit, la voz de titulares y marca—
                y esa no es la voz de "Alex": en `HeroCopy` el nombre de la
                persona va sin ella, en la pila de cuerpo. Outfit firma la
                MARCA y los rótulos editoriales, no al sujeto. Y `text-title`
                es la escala de un encabezado de sección a pantalla completa;
                en una tarjeta eso pesa como un cartel, no como un nombre.
              */}
              <div>
                <p className="font-body text-lead font-semibold leading-tight text-ink">
                  Alex
                </p>
                <p className="mt-1 font-meta text-meta uppercase text-ink-faint">
                  Desarrollo web
                </p>
                <p className="font-meta text-meta uppercase text-ink-faint">A Coruña</p>
              </div>
              {/*
                El sello de identidad en 3D: el mismo modelo que ya firma
                "Sobre mí" —"la marca en tres dimensiones al lado de la marca
                en palabras"—, aquí a escala de tarjeta. No es Olaz: Olaz ya
                cierra la sección entera, más abajo y grande. Esto es la
                firma, no el sujeto.

                El hueco se reserva siempre —52×52, fijo— y lo que espera a
                `settled` es solo el `<canvas>` de dentro. Así el botón de
                cerrar no da un salto cuando el objeto por fin se monta.
              */}
              <div
                className="hidden shrink-0 lg:block"
                style={{ width: '3.25rem', height: '3.25rem' }}
              >
                {settled && (
                  <EditorialObject
                    model="/models/cocobrain_abstract_lo.glb"
                    className="block h-full w-full"
                  />
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={toggle}
                aria-label="Cerrar la tarjeta"
                className="link-quiet ml-auto shrink-0"
                data-cursor="button"
                data-cursor-label="Cerrar"
              >
                <Icon name="close" size="1.05em" className="link-arrow-still" />
              </button>
            </div>

            <div className="border-t border-rule pt-5">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="link-quiet text-lead normal-case"
                >
                  <Icon name="mail" size="0.8em" className="link-arrow-still shrink-0" />
                  {contact.email}
                </a>
              )}
              <div className="mt-3">
                <CopyEmail email={contact.email} />
              </div>
            </div>

            {contact.links.length > 0 && (
              <div className="border-t border-rule pt-5">
                <ul className="flex flex-wrap gap-x-8 gap-y-3">
                  {contact.links.map((link) => {
                    /*
                      El trazo de LinkedIn es un OBJETO, no una dirección: no
                      se mueve al pasar el cursor, como ya hace `mail`. Los
                      demás enlaces —`links` es genérico, "GitHub, LinkedIn,
                      o cualquier otro perfil"— siguen con la flecha de
                      salida de siempre.
                    */
                    const linkedin = link.label === 'LinkedIn'
                    return (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="link-quiet"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {link.label}
                          <Icon
                            name={linkedin ? 'linkedin' : 'external'}
                            size="1.1em"
                            className={linkedin ? 'link-arrow-still' : 'link-arrow'}
                          />
                        </a>
                      </li>
                    )
                  })}
                </ul>
                {/*
                  "Disponible para crear": el mismo punto con halo que ya usa
                  el nodo cerrado de esta sección, prestado aquí como señal de
                  estado y no como control — pero en verde
                  (`--status-available`), a petición de Alex: el color de un
                  piloto que dice "disponible" y no el de algo señalado. No
                  respira ni pulsa solo —seguiría siendo el parpadeo que §7
                  prohíbe—: es un punto quieto, igual que el del nodo en
                  reposo.
                */}
                <p className="mt-3 flex items-center gap-2 font-meta text-meta uppercase text-ink-faint">
                  <span aria-hidden="true" className="contact-node-dot contact-node-dot--status" />
                  Disponible para crear
                </p>
              </div>
            )}

            {/*
              ── EL DETALLE DE IMPRESIÓN ──────────────────────────────────

              Una "ñ" pequeña, en la esquina, en la voz de metadatos y casi
              sin tinta: la misma idea del sello de coordenadas de cada
              área —una marca discreta en la voz monoespaciada, no un dato
              que haya que leer—. Aquí no hay ángulo ni radio que poner
              —Contacto no tiene nodo—, así que la marca es la letra que
              ninguna tipografía de sistema fuera de España tiene: la firma
              de que esto es una tarjeta impresa por Alex, no una plantilla.
            */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 right-3 font-meta text-[0.65rem] tracking-[0.16em] text-ink-faint/45"
            >
              ñ
            </span>
          </div>
        ) : (
          <button
            ref={nodeRef}
            type="button"
            onClick={toggle}
            aria-expanded={false}
            className="contact-node group"
            data-cursor="button"
            data-cursor-label="Abrir"
          >
            <span aria-hidden="true" className="contact-node-dot" />
            <span className="font-meta text-meta uppercase text-ink-faint transition-colors group-hover:text-ink">
              Toca para escribirme
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function ContactCoda() {
  const coda = useScene({ cues: CODA_CUES, start: 'top 86%', end: 'top 18%' })
  const hasEmail = Boolean(contact.email)

  return (
    <section id="contacto" data-act="5" className="composition scroll-mt-24 px-gutter py-area">
      <div ref={coda} className="hud-safe-r relative mx-auto max-w-editorial">
        <SectionHeading label="Contacto" />

        {/*
          ── EL TELÓN CUBRE TODA "MI INFO", OLAZ INCLUIDO ───────────────────

          Corrección de Alex sobre el primer intento: el titular real no vive
          DOS veces —el de tamaño de cartel, en el telón, es el único "Hablemos"
          que hay— y el telón no se para en el nodo: sigue cubriendo hasta la
          firma de Olaz, que es lo último que hay que descubrir. Lo único que
          queda fuera es el sello de arriba (ya tiene su propia entrada) y la
          línea "CocoBrain — Alex" del pie, que es firma permanente y no "info".
        */}
        <CurtainReveal>
          <div className="mt-area grid gap-block lg:grid-cols-12">
            <div className="lg:col-span-6">
              {/*
                El nodo lleva `data-cue="lead"` para entrar en el mismo momento
                en que antes entraba el enlace del correo — la coreografía de la
                coda no cambia, solo lo que ocupa ese papel.
              */}
              <div data-cue="lead">
                {hasEmail ? (
                  <ContactNode />
                ) : (
                  <PendingList
                    label="correo y enlaces"
                    note="Un correo y los perfiles que importen. Nada más."
                  />
                )}
              </div>
            </div>

            <div className="lg:col-span-5 lg:col-start-8">
              <p data-cue="lead" className="max-w-read-lead text-lead font-light text-ink-soft">
                Nuestra mayor <em className="not-italic text-accent">inspiración</em> fue una vez
                nuestra mayor <em className="not-italic text-accent">debilidad</em>.
              </p>
            </div>
          </div>

          {/*
            ── OLAZ DESPIDE ─────────────────────────────────────────────────

            El cierre de la experiencia, y el único sitio del editorial donde
            la mascota vuelve a aparecer. Al principio del recorrido Olaz está
            de pie sobre el podio y te invita a bajar; al final está SENTADO,
            que es lo que hace alguien cuando ya ha contado lo que tenía que
            contar.

            A la derecha y pequeño —200 px— porque no es el sujeto: el sujeto
            es el correo. Es una firma.
          */}
          <div className="mt-area flex justify-end">
            {/*
              Olaz llega desde el doble de lejos y tarda casi el doble en
              llegar (`arrival="coda"`): entra midiendo el 28% de su tamaño en
              vez del 37%. Es la única entrada teatral de todo el editorial y
              se la lleva el último objeto de la página, que es donde llegar
              de lejos se lee como un final. Lo que NO puede hacer es tardar
              más — el documento se acaba y su recorrido se queda a medias;
              está medido en `EditorialObject`. Lo demás —escala final, giro,
              vuelta ocasional y dueño de `rotation.y`— es idéntico al de los
              otros tres, y el telón no le cambia ni uno: solo decide cuándo
              deja de estar tapado.
            */}
            <EditorialObject
              model="/models/cocobrain_mascot_sitt.glb"
              arrival="coda"
              cue="object"
              className="hidden lg:block"
              style={{ width: '13rem', height: '13rem' }}
            />
          </div>
        </CurtainReveal>

        <p
          data-cue="body"
          className="mt-block border-t border-rule pt-8 font-meta text-meta uppercase text-ink-faint"
        >
          CocoBrain — Alex
        </p>
      </div>
    </section>
  )
}
