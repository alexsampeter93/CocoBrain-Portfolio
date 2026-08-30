import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { journey } from '../../journey/clock'
import { emergence, hubFocus, hubReveal } from '../../journey/stages'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

/**
 * Marco de interfaz: marcas de encuadre, firma y navegación.
 *
 * El logotipo NO está aquí. Vive dentro de la escena 3D (Wordmark3D), donde
 * comparte perspectiva, paralaje y luz con el resto. Como imagen fija en una
 * esquina se leía como papel pegado encima del fondo.
 */
function CornerTicks() {
  const base = 'pointer-events-none fixed z-40 h-5 w-5 border-coco-light'
  return (
    <div aria-hidden="true">
      <div className={`${base} left-6 top-6 border-l border-t sm:left-10 sm:top-10`} />
      <div className={`${base} right-6 top-6 border-r border-t sm:right-10 sm:top-10`} />
      <div className={`${base} bottom-6 left-6 border-b border-l sm:bottom-10 sm:left-10`} />
      <div className={`${base} bottom-6 right-6 border-b border-r sm:bottom-10 sm:right-10`} />
    </div>
  )
}

/**
 * @param readingArea qué área se está leyendo, o `null` si aún se explora.
 *                    Cuando hay una, la navegación deja de volar la cámara y
 *                    salta al texto: si ya estás leyendo, mandarte de vuelta
 *                    arriba a la escena para bajar otra vez no es navegar.
 */
export default function Hud({
  sections,
  activeSection,
  readingArea = null,
  onSelect,
  onClose,
  onBackToHub,
  calm,
  onToggleCalm,
}) {
  const logoRef = useRef(null)
  const navRef = useRef(null)
  const backRef = useRef(null)
  const meterRef = useRef(null)
  const cueRef = useRef(null)
  const reducedMotion = usePrefersReducedMotion()

  /**
   * ── LA NAVEGACIÓN SE APARTA EN EL ACTO 7 ──────────────────────────────────
   *
   * Al salir del cerebro, los cinco nodos de la constelación SON el índice del
   * portfolio: llevan el nombre del área, su color y su acceso. Esta lista dice
   * exactamente lo mismo en la esquina, así que en el tramo final había dos
   * índices en pantalla a la vez —y el de la esquina, por ser DOM plano y
   * quieto, le ganaba la atención al que de verdad forma parte de la escena—.
   *
   * No se retira: se aparta. Baja al 18% y deja de recibir el puntero mientras
   * la composición está montada, y vuelve entera en cuanto empieza la lectura
   * editorial, donde ya no hay nodos que la sustituyan. Quitarla del árbol
   * rompería la navegación por teclado y dejaría el tramo final sin ninguna
   * salida accesible, que es peor que duplicarla.
   *
   * Se escribe en el estilo, no en el estado: es un valor que cambia en cada
   * frame de scroll, y pasarlo por React sería un render por píxel.
   */
  useEffect(() => {
    let frame
    let last = -1
    let lastBack = -1
    let lastRead = -1
    let lastCue = -1

    const tick = () => {
      const nav = navRef.current
      if (nav) {
        /* Vuelve en cuanto empieza el editorial: ahí los nodos ya no se ven. */
        const away = emergence(journey.progress) * (1 - Math.min(1, journey.reading / 0.08))
        if (Math.abs(away - last) > 0.004) {
          last = away
          nav.style.opacity = 1 - away * 0.82
          nav.style.pointerEvents = away > 0.75 ? 'none' : ''
        }
      }
      /*
        ── Y LA VUELTA A LA RED APARECE AL LEER ──────────────────────────

        Es el reverso exacto de la nav: donde una se aparta, la otra entra. En
        el hub no hace falta —ya se esta ahi— y en cuanto empieza el editorial
        se convierte en la unica forma de volver sin buscar el sitio a mano.
        Aparece con `reading`, que es el segundo canal del mismo reloj.
      */
      /*
        ── EL AVANCE DE LA LECTURA ──────────────────────────────────────

        Durante el editorial no habia ninguna senal de donde estabas. El
        recorrido 3D la tiene —la escena entera ES el indicador— pero en
        cuanto empieza el texto lo unico que queda es una lista de cinco
        nombres en una esquina, y esa lista dice a que area pertenece lo que
        lees, no cuanto queda. En una pagina de scroll largo eso es la
        diferencia entre explorar y no saber si se ha acabado.

        Es el mismo filete de la navegacion, llenandose. No es una barra de
        progreso de interfaz: es la regla vertical que ya une los cinco
        nombres, con la parte recorrida en el acento del acto. Cuesta escribir
        una transformacion por frame, que es gratis.
      */
      /*
        ── LA PISTA DEL HUB ──────────────────────────────────────────────

        La portada dice "Baja para entrar". El hub no decia nada, y es el
        unico tramo de la web donde el visitante tiene que hacer algo distinto
        de seguir bajando: los cinco nodos llevan su nombre, pero nada dice
        que se pueden pulsar. En tactil, ademas, no hay hover que lo insinue.

        Aparece con la composicion —`hubReveal`, o sea cuando ya hay cinco
        cosas que elegir— y se va en cuanto se elige una o en cuanto empieza
        el enfoque. Una pista que sigue en pantalla despues de haber sido
        atendida deja de ser una pista y pasa a ser ruido.
      */
      const cue = cueRef.current
      if (cue) {
        const shown =
          hubReveal(journey.progress) *
          (1 - hubFocus(journey.progress)) *
          (activeSection ? 0 : 1) *
          (1 - Math.min(1, journey.reading / 0.05))
        if (Math.abs(shown - lastCue) > 0.004) {
          lastCue = shown
          cue.style.opacity = shown
          cue.style.transform = `translateY(${(1 - shown) * 8}px)`
        }
      }

      const meter = meterRef.current
      if (meter) {
        const read = Math.min(1, Math.max(0, journey.reading))
        if (Math.abs(read - lastRead) > 0.003) {
          lastRead = read
          meter.style.transform = `scaleY(${read})`
          meter.style.opacity = Math.min(1, journey.reading / 0.12)
        }
      }

      const back = backRef.current
      if (back) {
        const shown = Math.min(1, journey.reading / 0.12)
        if (Math.abs(shown - lastBack) > 0.004) {
          lastBack = shown
          back.style.opacity = shown
          back.style.pointerEvents = shown > 0.4 ? '' : 'none'
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [activeSection])

  useEffect(() => {
    if (reducedMotion || !logoRef.current) return

    // Revelado por máscara: la marca se descubre de izquierda a derecha en
    // vez de aparecer con un fundido genérico.
    const tween = gsap.fromTo(
      logoRef.current,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.inOut', delay: 0.4 },
    )

    return () => tween.kill()
  }, [reducedMotion])

  return (
    <>
      <CornerTicks />

      {/* El logotipo ya no vive aqui: esta dentro de la escena 3D, detras de
          Olaz, para que comparta perspectiva y luz con el resto. Como imagen
          fija en una esquina se leia como papel pegado encima. */}
      <div className="pointer-events-none fixed left-6 top-6 z-40 sm:left-10 sm:top-10">
        <button
          ref={logoRef}
          type="button"
          onClick={onClose}
          /* Sobre la pared de marfil de la portada (218 de luminancia) el
             `coco-mid` quedaba por debajo del contraste mínimo: en las
             capturas el logotipo no se leía. */
          className="pointer-events-auto block pl-9 pt-9 font-mono text-[11px] text-coco-dark transition-colors hover:text-brain-glow"
        >
          CocoBrain — Alex
        </button>
      </div>

      {/*
        Modo "cabeza despejada". Es el interruptor accesible de la web y a la
        vez parte del tema: una mente que no para, y la posibilidad de
        pararla. No se esconde en un menu de ajustes por eso mismo.
      */}
      <div className="pointer-events-none fixed right-6 top-6 z-40 sm:right-10 sm:top-10">
        <button
          type="button"
          onClick={onToggleCalm}
          aria-pressed={calm}
          className="pointer-events-auto flex items-center gap-2 pr-9 pt-9 font-mono text-[11px] text-coco-dark transition-colors hover:text-brain-glow"
        >
          <span
            aria-hidden="true"
            className={`h-[7px] w-[7px] border transition-colors ${
              calm ? 'border-brain-glow bg-brain-glow' : 'border-coco-light'
            }`}
          />
          cabeza despejada
        </button>
      </div>

      {/*
        Navegacion sin caja, sin relleno y sin aspecto de boton: solo la
        palabra y una regla que crece.

        En movil va en fila abajo del todo. En vertical a la derecha se
        solapaba con el personaje, que en pantalla estrecha ocupa el centro.
      */}
      {/*
        Volver a la red. Va arriba a la izquierda, debajo del logotipo, porque
        es la accion inversa de "bajar a leer" y ahi es donde el ojo busca el
        camino de vuelta. No es una escena nueva: lleva el scroll al final de
        la pista, que es donde vive el acto 7.
      */}
      <div className="pointer-events-none fixed left-6 top-[4.5rem] z-40 sm:left-10 sm:top-[6.5rem]">
        <button
          ref={backRef}
          type="button"
          onClick={onBackToHub}
          style={{ opacity: 0, pointerEvents: 'none' }}
          className="group flex items-center gap-2 pl-9 font-mono text-[11px] leading-none text-coco-dark transition-colors hover:text-brain-glow focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-brain-glow"
        >
          <span
            aria-hidden="true"
            className="h-px w-5 bg-brain-glow transition-all duration-300 group-hover:w-8"
          />
          Volver a la red
        </button>
      </div>

      {/*
        La pista del hub. Centrada abajo, en el mismo sitio y con la misma voz
        que "Baja para entrar" en la portada: las dos son la misma frase del
        narrador, una al empezar el viaje y otra al llegar.

        No es un botón y no lo parece —ni caja, ni borde, ni color de acento—
        porque no hay nada que pulsar aquí: lo que hay que pulsar son los cinco
        nodos, y esto solo lo dice.
      */}
      <div
        ref={cueRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-40 text-center font-mono text-[11px] leading-none text-cream/70 transition-opacity sm:bottom-10"
      >
        Elige un área <span className="text-brain-glow">·</span> o sigue bajando
      </div>

      {/*
        ── LA REGLA DE LA LECTURA ────────────────────────────────────────────

        Un filete vertical pegado a la navegación que se llena conforme se lee.
        No es una barra de progreso de interfaz —no lleva caja, ni porcentaje,
        ni bordes redondeados—: es la misma regla que ya separa el HUD del
        contenido, con la parte recorrida en el acento del acto en curso.

        Existe porque durante el editorial no había ninguna señal de avance. El
        recorrido 3D no la necesita: la escena entera ES el indicador, se ve
        perfectamente que se está bajando hacia algo. En cuanto empieza el
        texto lo único que queda es una lista de cinco nombres, y esa lista dice
        a qué área pertenece lo que lees, no cuánto falta.

        Solo en apaisado: en vertical la navegación va abajo, en fila, y un
        filete vertical al lado no tendría contra qué medirse.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-10 right-[2.15rem] z-40 hidden h-32 w-px overflow-hidden bg-rule sm:block"
      >
        <div
          ref={meterRef}
          className="h-full w-full origin-top bg-accent"
          style={{ transform: 'scaleY(0)', opacity: 0 }}
        />
      </div>

      <nav
        ref={navRef}
        aria-label="Secciones"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center transition-opacity sm:inset-x-auto sm:bottom-10 sm:right-10 sm:block"
      >
        {/*
          En móvil, UNA línea y sin envolver.

          Con `flex-wrap` las cinco secciones se partían en dos filas
          descolgadas y el bloque entero se leía como un error de maquetación.
          Si no caben, se desplaza en horizontal —que es un gesto que en un
          teléfono se entiende— en vez de romper la fila.
        */}
        {/*
          En móvil la lista ENVUELVE en vez de desplazarse.

          Iba en `overflow-x-auto`: cinco áreas a 12 px no caben en 390 px, así
          que "CV" quedaba cortado por el borde derecho sin ningún indicio de
          que hubiera más. Un menú que esconde su última opción está roto, y el
          desplazamiento lateral no se ve.

          Envolviendo y centrado no se puede cortar nada: si no cabe en una
          línea, baja a la siguiente.
        */}
        <ul className="flex max-w-full flex-row flex-wrap justify-center gap-x-4 gap-y-1 px-4 sm:flex-col sm:flex-nowrap sm:items-end sm:gap-3 sm:px-0 sm:pb-9 sm:pr-9">
          {sections.map((section) => {
            const isActive = activeSection === section.id || readingArea === section.id
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="pointer-events-auto group flex items-center gap-2 whitespace-nowrap py-1 font-mono text-[12px] leading-none sm:gap-3 sm:py-0"
                >
                  <span
                    aria-hidden="true"
                    className={`hidden h-px bg-brain-glow transition-all duration-300 sm:block ${
                      isActive ? 'w-9' : 'w-0 group-hover:w-6'
                    }`}
                  />
                  <span
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'text-brain-glow'
                        : 'text-coco-dark group-hover:text-brain-glow'
                    }`}
                  >
                    {section.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
