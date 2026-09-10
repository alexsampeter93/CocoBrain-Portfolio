import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { journey } from '../../journey/clock'
import { emergence, hubFocus, hubReveal } from '../../journey/stages'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { areaIndex, DARK_GROUND_AREAS } from '../../data/sections'
import { Icon, IconCalm, IconTheme } from './Icon'

/**
 * ── EL ÍNDICE DEL ÁREA QUE SE ESTÁ LEYENDO ──────────────────────────────────
 *
 * Dos cifras junto a la regla de lectura, y **cambian a la vista**: el número
 * que se va sube y sale por el canto de su máscara, y el que llega entra desde
 * abajo. Es el mismo gesto que hace el número dentro del encabezado de cada
 * área, aquí en permanente — así el folio de la página es una sola cosa que se
 * transforma y no cinco números que aparecen y desaparecen.
 *
 * ## Por qué esto NO sale del scroll, y por qué se permite
 *
 * La ley de la casa dice que lo único que puede mover la escena es el scroll.
 * Esta es la segunda excepción documentada —la primera es el acuse del clic en
 * un nodo— y por el mismo motivo: **un cambio de índice es un evento discreto,
 * no una posición**. No existe un "40% de haber cambiado de sección"; o estás
 * en una o estás en la otra. Lo que sí se conserva es el motivo de fondo de la
 * regla: dura medio segundo, se extingue sola y con el visitante quieto no
 * corre absolutamente nada.
 *
 * ## Y GSAP es el dueño del texto
 *
 * React pinta el primer valor y a partir de ahí lo escribe la línea de tiempo,
 * en su punto medio — cuando la cifra vieja ya no se ve y la nueva todavía no.
 * Si lo escribiera React, el número cambiaría antes de empezar a moverse y lo
 * que se vería es la cifra NUEVA saliendo, que es justo lo contrario.
 */
function AreaIndex({ id }) {
  const numberRef = useRef(null)
  const shown = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = numberRef.current
    const next = id ? areaIndex[id] : null
    if (!el || next === shown.current) return

    // Sin número al que ir —la portada, el hub— el marcador se retira.
    if (!next) {
      shown.current = null
      gsap.to(el.parentElement, { opacity: 0, duration: reduced ? 0 : 0.25 })
      return
    }

    const first = shown.current === null
    shown.current = next
    gsap.to(el.parentElement, { opacity: 1, duration: reduced ? 0 : 0.25 })

    if (reduced || first) {
      el.textContent = next
      gsap.set(el, { yPercent: 0, opacity: 1 })
      return
    }

    gsap
      .timeline()
      .to(el, { yPercent: -110, opacity: 0, duration: 0.2, ease: 'power2.in' })
      .add(() => {
        el.textContent = next
      })
      .fromTo(
        el,
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
      )
  }, [id, reduced])

  return (
    <div
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="pointer-events-none fixed bottom-[11.6rem] right-6 z-40 hidden overflow-hidden pb-[0.14em] font-mono text-[12px] leading-none text-ink sm:block"
    >
      <span ref={numberRef} className="block tabular-nums" />
    </div>
  )
}

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
/**
 * ── LA TINTA DEL HUD SALE DE LOS TOKENS, NO DE UN HEXADECIMAL (fase 10D) ────
 *
 * Llevaba `text-coco-dark` escrito a mano en cinco sitios, y un hexadecimal no
 * puede seguir a un fondo que cambia: en cuanto 10D puso un área sobre coco
 * oscuro, la lista de áreas desapareció entera.
 *
 * **Y el token solo NO bastaba, que es la corrección de 10F.** Este comentario
 * decía que sobre el marfil `text-ink` da el mismo píxel que `text-coco-dark`
 * porque `--ink` vale #2B211C en los tres actos editoriales. Es verdad para el
 * contenido y FALSO para el HUD, y el propio párrafo de abajo explicaba por
 * qué sin sacar la consecuencia: el HUD es `fixed`, no está dentro de ningún
 * `[data-act]`, así que resuelve contra `:root` — donde `--ink` es el marfil
 * de la mente. Medido en 10F contra el build, el HUD sobre las cinco áreas
 * claras:
 *
 *     CocoBrain — Alex   1,00 : 1        las cinco de la navegación   1,00–1,13
 *
 * O sea marfil sobre marfil. 10D arregló el área oscura y rompió las cinco
 * claras sin que su propia validación lo viera, porque midió el suelo nuevo y
 * no los cinco viejos — el mismo descuido, y en la misma fase, que el de
 * `--ink-faint`.
 *
 * Lo que faltaba no era otro token: era que `<html>` declarase TAMBIÉN el
 * suelo claro. Ahora lleva `data-ground="paper"` en las cinco áreas de marfil
 * y en la coda, `"dark"` en Experiencia, y nada durante el recorrido 3D, donde
 * los valores de la mente que hay en `:root` son los correctos.
 *
 * Y lo señalado —el área activa, el subrayado, el anillo de foco— va en
 * `--mark`, que es rosa en la mente y añil en el editorial. Estaba en
 * `brain-glow`, otro hexadecimal, y sobre el marfil daba 1,76 : 1.
 *
 * Quién le dice al documento sobre qué suelo se está leyendo: `App.jsx`.
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
  theme = 'light',
  onToggleTheme,
}) {
  const logoRef = useRef(null)
  const navRef = useRef(null)
  const backRef = useRef(null)
  const meterRef = useRef(null)
  const cueRef = useRef(null)
  const navVeilRef = useRef(null)
  const topVeilRef = useRef(null)
  /*
    Se está leyendo sobre suelo oscuro? Lo decide sections.js, no el HUD.

    Viaja por una REFERENCIA y no por una variable capturada porque quien lo
    lee es el bucle de fotogramas, y ese bucle se monta una sola vez: con una
    variable de render se quedaría con el valor que tuviera el día que se
    montó. Es el mismo motivo por el que el nodo señalado de la constelación
    tampoco pasa por el estado.
  */
  const darkRef = useRef(false)
  const roamRef = useRef(true)
  const navCornerRef = useRef(null)
  const themeRef = useRef(null)
  darkRef.current = DARK_GROUND_AREAS.has(readingArea)
  /* Se esta RECORRIENDO —no leyendo— cuando ninguna area esta activa. */
  roamRef.current = !readingArea
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
    let lastTopVeil = -1
    let lastNavVeil = -1
    let lastCorner = -1
    let lastTema = -1
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

      /* Cuanta pagina hay ya debajo del HUD. La leen la navegacion y las tres laminas. */
      const cortina = Math.min(1, journey.reading / 0.12)

      const back = backRef.current
      if (back) {
        const shown = cortina
        if (Math.abs(shown - lastBack) > 0.004) {
          lastBack = shown
          back.style.opacity = shown
          back.style.pointerEvents = shown > 0.4 ? '' : 'none'

        }
      }

      /*
        ── LAS TRES LAMINAS, CADA UNA CON SU PROPIA GUARDA (fase 11E) ────────

        Estaban DENTRO de la guarda de la navegacion —`if (Math.abs(shown -
        lastBack) > 0.004)`— y eso es el fallo que §13 ya tiene escrito con
        estas palabras: *una guarda de "solo escribo si algo cambio" tiene que
        vigilar TODAS las senales que se escriben dentro*.

        Aqui las laminas dependen ademas de si se esta RECORRIENDO o LEYENDO, y
        esa senal no mueve `shown`: en cuanto la lectura se asienta, el bloque
        deja de ejecutarse y las laminas se quedan con el ultimo valor que
        tuvieron. Medido: la de la esquina seguia a opacidad 1 sobre el
        editorial, comiendose el final de las lineas de la columna derecha.

        Es la tercera vez que este proyecto tropieza con la misma guarda.
      */
      /*
        La de ARRIBA no existe durante el recorrido, y es una decision de Alex
        con dos motivos:

        - en la portada, una banda de papel sobre el bodegon se lee como un
          recuadro pegado encima de la fotografia. La portada es un plano
          fotografico y no admite una capa de interfaz cruzandola;
        - y en el hub TAPA un nodo. La constelacion reparte los cinco
          alrededor del cerebro y el mas alto cae dentro de la banda: una
          lamina que respalda un rotulo de once pixeles y esconde un punto de
          la escena esta cambiando lo importante por lo accesorio.

        Asi que vuelve a su comportamiento de 10D —solo con papel debajo— y la
        legibilidad del HUD sobre la portada la resuelve la TINTA, que ahora
        se voltea con `data-ground` (ver `App.jsx`). Queda un bache: en el
        cruce de 0,07 la esquina superior da 3,33 : 1 durante unas decimas de
        recorrido. Se acepta: es transitorio, esta en movimiento, y la
        alternativa era permanente y tapaba la escena.
      */
      const veloTop = darkRef.current ? 1 : cortina
      if (topVeilRef.current && Math.abs(veloTop - lastTopVeil) > 0.004) {
        lastTopVeil = veloTop
        topVeilRef.current.style.opacity = veloTop
      }

      /*
        Las dos laminas de abajo solo existen sobre el suelo CLARO. Durante el
        recorrido eso es la portada y nada mas: en la mente y en el hub el
        suelo ya es oscuro y la tinta marfil se lee sola, asi que una lamina
        ahi no respalda nada y si tapa — se vio en captura, un borron oscuro
        sobre la constelacion. Es el mismo motivo por el que la de arriba
        salio del recorrido entero.

        `data-ground` ya dice cual de los dos regimenes manda, asi que se le
        pregunta a el en vez de repetir el umbral aqui.
      */
      const claro = document.documentElement.dataset.ground === 'paper'
      const veloNav = roamRef.current ? (claro ? 1 : 0) : cortina
      if (navVeilRef.current && Math.abs(veloNav - lastNavVeil) > 0.004) {
        lastNavVeil = veloNav
        navVeilRef.current.style.opacity = veloNav
      }

      /*
        Y la de la esquina existe SOLO durante el recorrido. En el editorial el
        suelo es un color controlado y plano y la navegacion ya da 10 a 12 : 1
        desde 10F: una lamina que no respalda nada y si tapa texto es
        exactamente lo que 9B le reprocho a las ilustraciones de area.
      */
      /*
        Y el conmutador del tema, que solo existe donde el tema se nota. Va
        con su propia guarda por lo mismo que las laminas: depende de una
        senal —recorrer o leer— que no mueve `cortina`.
      */
      const veloTema = roamRef.current ? 0 : cortina
      if (themeRef.current && Math.abs(veloTema - lastTema) > 0.004) {
        lastTema = veloTema
        themeRef.current.style.opacity = veloTema
        themeRef.current.inert = veloTema < 0.4
      }

      const veloCorner = roamRef.current && claro ? 1 : 0
      if (navCornerRef.current && Math.abs(veloCorner - lastCorner) > 0.004) {
        lastCorner = veloCorner
        navCornerRef.current.style.opacity = veloCorner
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

      <AreaIndex id={readingArea} />

      {/*
        ── LA ZONA SEGURA DE LA ESQUINA SUPERIOR ────────────────────────────

        "CocoBrain — Alex" y "Volver a la red" no llevan caja ni fondo —es la
        regla de todo el HUD— así que cualquier título que suba por detrás de
        ellos, en cualquiera de las seis áreas, comparte el mismo píxel.
        Medido en la transición de Habilidades a CV, a 1366×768: el encabezado
        "Moverme entre terrenos distintos" escrito encima del logotipo, los
        dos a opacidad 1.

        No se arregla apartando el contenido —seguiría pasando por ahí en la
        siguiente sección alta, y en la de después— sino dándole al HUD lo
        mismo que ya tiene el aviso móvil de abajo: una lámina del color del
        papel, sin borde, que se apoya en la esquina y se deshace hacia dentro.
        Ancho de sobra para las dos líneas de texto, sin llegar a la mitad de
        la pantalla.

        Vive DEBAJO del texto del HUD (`z-30` contra su `z-40`) y aparece con
        la misma señal que "Volver a la red": no hace falta durante el
        recorrido 3D, donde no hay papel que pueda esconderse detrás.
      */}
      <div
        ref={topVeilRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-28 transition-opacity sm:h-52"
      >
        {/*
          A todo el ancho, como el aviso móvil de abajo — y por el mismo
          motivo: sin un borde lateral dentro de la ventana, no hay ninguna
          arista que ver. Una prueba con una caja más estrecha y un degradado
          en diagonal sí dejaba un canto recto donde la caja terminaba antes
          que el color.
        */}
        {/*
          DOS degradados, uno por medida, y no uno con un reparto de
          compromiso — porque las dos medidas piden cosas opuestas.

          En vertical la lamina mide 7rem para no alcanzar el titular de la
          portada, que empieza en 110 px cuando el HUD acaba en 101: ahi el
          macizo tiene que llegar casi al final o "modo noche" se queda sin
          respaldo.

          En apaisado la lamina mide 13rem y el HUD termina en 117, asi que
          el macizo puede acabar en el 58% y dejar 88 px de desvanecido. Hace
          falta: con el reparto de vertical, el canto inferior se veia como
          una linea recta cruzando el bodegon.
        */}
        <div
          className="h-full w-full sm:hidden"
          style={{
            background:
              'linear-gradient(to bottom, var(--veil) 0%, var(--veil) 88%, transparent 100%)',
          }}
        />
        <div
          className="hidden h-full w-full sm:block"
          style={{
            background:
              'linear-gradient(to bottom, var(--veil) 0%, var(--veil) 58%, transparent 100%)',
          }}
        />
      </div>

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
          className="pointer-events-auto block pl-9 pt-9 font-mono text-[11px] text-ink transition-colors hover:text-mark"
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
          className="pointer-events-auto flex items-center gap-2 pr-9 pt-9 font-mono text-[11px] text-ink transition-colors hover:text-mark"
        >
          {/*
            ── LOS DOS INTERRUPTORES DEJAN DE SER UN CUADRADITO (fase 12A) ──

            Llevaban un cuadro de siete pixeles que se rellenaba. Funcionaba y
            no decia nada: un cuadrado no significa "sin movimiento" ni "de
            noche", asi que el interruptor dependia entero de su rotulo.

            Ahora cada uno lleva SU gesto, y el gesto es la idea: la onda se
            aplana cuando se para el movimiento, el sol se muerde hasta ser
            luna. Ninguno de los dos es una caja — la regla 2 prohibe la
            pildora, y de Amicro se toma el movimiento del icono, no su forma.

            El color lo pone `currentColor`, asi que los dos siguen al texto
            que tienen al lado y por tanto al suelo y al tema.
          */}
          <IconCalm calm={calm} size="1.25em" className="shrink-0" />
          cabeza despejada
        </button>

        {/*
          ── EL INTERRUPTOR DEL TEMA (fase 11D) ────────────────────────────

          Va pegado a "cabeza despejada" y con su misma forma porque son la
          misma familia: los dos interruptores de esta web, los dos en la
          esquina, los dos sin caja ni aspecto de boton.

          El cuadrito de la izquierda se rellena cuando el modo esta puesto,
          exactamente igual que el de al lado. Un icono de sol y luna habria
          sido lo esperable y es justo lo que la regla 2 llama estetica de
          maqueta: aqui no hay ni un icono en toda la interfaz.

          El texto dice a que estado LLEVA, no en cual estas: es un mando,
          no una etiqueta. Y `aria-pressed` cuenta el estado real a quien no
          ve el cuadrito.
        */}
        {/*
          ── EL CONMUTADOR DEL TEMA NO EXISTE EN LA PORTADA (fase 12A.1) ────

          Decision de Alex, y es la correcta: **el tema solo alcanza al
          editorial**. Eso no es una limitacion, es el diseno de 11D — la
          mente es oscura en los dos temas porque es un SITIO, no un estilo,
          y `data-ground` no existe durante la pista.

          Asi que en la portada y en el recorrido este boton no cambia nada de
          lo que se esta mirando. Un control que no hace nada visible no es
          discreto: es ruido, y encima ensena mal lo que el interruptor hace.

          Aparece con `reading`, la misma senal que trae el papel debajo — o
          sea justo cuando empieza a haber algo a lo que el tema afecte. Y se
          va con ella al subir.

          `inert` acompana a la opacidad: sin el, el boton sigue en el orden
          de tabulacion mientras es invisible, que es el fallo que §7 tiene
          documentado con las etiquetas de los nodos sobre el editorial.
        */}
        <button
          ref={themeRef}
          type="button"
          style={{ opacity: 0 }}
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          /*
            `py-2` no es aire: es la zona de TOQUE. Medido a 390 sin el, este
            control daba 122 x 17 px, o sea por debajo de los 24 que pide
            WCAG 2.5.8. El de al lado ya la tenia por su `pt-9`, que existe
            por lo mismo — agrandar la zona sensible sin agrandar el texto.
          */
          className="pointer-events-auto mt-1 flex items-center gap-2 py-2 pr-9 font-mono text-[11px] text-ink transition-colors hover:text-mark"
        >
          <IconTheme dark={theme === 'dark'} size="1.25em" className="shrink-0" />
          {/*
            ── Y LA PALABRA TENÍA QUE CAMBIAR CON EL ESTADO (fase 12H) ───────

            El comentario de arriba ya lo decía: "el texto dice a qué estado
            LLEVA, no en cuál estás". El código no lo hacía — "modo noche"
            estaba escrito a pelo, así que en tema oscuro el mando seguía
            ofreciendo ir a donde ya se está. Es la misma familia de fallo que
            §13 tiene documentada más de una vez: el comentario describe el
            comportamiento correcto y el código describe otro.
          */}
          {theme === 'dark' ? 'modo día' : 'modo noche'}
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
      {/*
        En vertical baja a 5,5rem. El logotipo lleva `pt-9` DENTRO del botón
        —para agrandar la zona de toque sin agrandar el texto— así que su caja
        llega a 77 px desde arriba; con "Volver" en 4,5rem (72 px) los dos se
        solapaban 5 px medidos. Ahora hay 11 px de aire, el mismo que en
        escritorio, donde el logo cae más abajo y por eso nunca falló.
      */}
      <div className="pointer-events-none fixed left-6 top-[5.5rem] z-40 sm:left-10 sm:top-[6.5rem]">
        <button
          ref={backRef}
          type="button"
          onClick={onBackToHub}
          style={{ opacity: 0, pointerEvents: 'none' }}
          /*
            `pointer-events-auto` NO es decorativo: el contenedor fijo lleva
            `pointer-events-none` y eso se HEREDA. El bucle de animación escribe
            `style.pointerEvents = ''` para activarlo, pero borrar el inline
            devuelve el control a la herencia, o sea a `none`.

            Sin esta clase el botón se veía, tenía foco y respondía al teclado
            —Enter dispara el manejador sin pasar por el puntero— pero un clic
            de ratón caía en la sección del editorial que hay debajo. Medido:
            `elementFromPoint` sobre su centro devolvía `SECTION#skills`.

            Los otros tres controles del HUD ya la llevan; este se quedó sin
            ella, y era el único camino explícito de vuelta al 3D.
          */
          className="group pointer-events-auto flex items-center gap-2 pl-9 font-mono text-[11px] leading-none text-ink transition-colors hover:text-mark focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-mark"
        >
          <span
            aria-hidden="true"
            className="h-px w-5 bg-mark transition-all duration-300 group-hover:w-8"
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
        Elige un área <span className="text-mark">·</span> o sigue bajando
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

      {/*
        ── EL VELO DE LA NAVEGACIÓN MÓVIL ────────────────────────────────────

        En 390 px la navegación va en fila abajo, fija y sin fondo, así que el
        texto del editorial le pasa por debajo y se leen los dos a la vez.
        Medido: 15 px de solape sobre la línea de metadatos de un proyecto.

        La solución no puede ser una caja: la regla de esta web es que la
        navegación no tenga ni borde, ni relleno, ni aspecto de botón. Lo que sí
        puede es apoyarse en el papel — un degradado del propio color de fondo
        que sube desde el borde inferior y se disuelve. No hay ninguna arista
        que ver, y aun así el texto deja de competir.

        Aparece con `reading`, así que durante el recorrido 3D —donde el fondo
        es la mente, no el papel— vale cero y no existe. Y solo en vertical: en
        apaisado la navegación vive en la esquina, sobre el margen vacío.

        **Y su color sale de `--veil`, no de `--surface-paper` (fase 10F).**
        Estaba escrito al papel fijo, así que sobre el área de suelo oscuro
        dibujaba una franja de marfil subiendo desde el borde inferior —visible
        en la captura de Experiencia a 390—. Es el mismo cabo que 10D ató en el
        velo de ARRIBA y dejó suelto en este: un velo existe para respaldar al
        texto del HUD, así que tiene que ser del color del suelo que hay debajo,
        sea cual sea.
      */}
      <div
        ref={navVeilRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 sm:hidden"
      >
        <div
          className="h-full w-full"
          style={{
            background:
              'linear-gradient(to top, var(--veil) 0%, var(--veil) 42%, transparent 100%)',
          }}
        />
      </div>

      {/*
        ── LA LAMINA DE LA ESQUINA DE LA NAVEGACION, EN APAISADO (11E) ──────

        La de abajo, a todo el ancho, es de movil. En apaisado la navegacion
        vive en la esquina derecha y una banda de lado a lado seria una caja
        donde no hace falta: basta un degradado anclado a esa esquina.

        Existe por lo mismo que la de arriba: medido en pixel sobre el
        bodegon, las cinco secciones dan **4,04 a 5,48 : 1** a 1440 y **3,93 a
        4,36** a 390, o sea por debajo del 4,5 que pide un texto de doce
        pixeles. Y no se lee mal por una tinta equivocada: se lee mal porque
        detras hay una FOTOGRAFIA, y su luminancia cambia con el scroll.

        Su color sale de `--veil`, asi que en la portada es papel y dentro de
        la mente es la mente: donde el suelo coincide con ella, no se ve.
      */}
      <div
        ref={navCornerRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed bottom-0 right-0 z-30 hidden h-[26rem] w-[34rem] sm:block"
      >
        <div
          className="h-full w-full"
          style={{
            background:
            /*
              Dos cosas, y la segunda se ve y no se mide.

              El macizo llega al borde SUPERIOR de la columna, no al centro:
              medido a 1440 el nav ocupa y 716..860 y x 1275..1400, y con un
              reparto mas corto "Sobre mi" -la de arriba- se quedaba fuera y
              daba 2,98 : 1.

              Y los radios son 100%, no 150%. Con extensiones mayores que la
              caja, el degradado todavia es OPACO cuando llega a su borde, asi
              que se corta en recto: en captura se veia un rectangulo con dos
              cantos rectos cruzando el bodegon. Una lamina que se nota deja
              de ser un suelo y pasa a ser una caja.
            */
              'radial-gradient(100% 100% at 100% 100%, var(--veil) 0%, var(--veil) 58%, transparent 100%)',
          }}
        />
      </div>

      <nav
        ref={navRef}
        aria-label="Secciones"
        /*
          ── LA FILA NO PUEDE COMPARTIR BANDA CON LAS ESQUINAS (fase 10F) ────

          Estaba en `bottom-6`, o sea exactamente donde viven las marcas de
          esquina del marco, que también van a `bottom-6`. Medido a 360, 390 y
          430: los dos ocupaban la misma banda —y 800 a 820— en las tres, así
          que el filete de la esquina cruzaba la "S" de "Sobre mí" por la
          izquierda y la "V" de "CV" por la derecha. No era un caso límite de
          una pantalla estrecha: pasaba siempre.

          Sube a `bottom-12`. En apaisado no cambia nada: allí la navegación
          vive en la esquina derecha, en columna, lejos del borde inferior.
        */
        className="pointer-events-none fixed inset-x-0 bottom-12 z-40 flex justify-center transition-opacity sm:inset-x-auto sm:bottom-10 sm:right-10 sm:block"
      >
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
                    className={`hidden h-px bg-mark transition-all duration-300 sm:block ${
                      isActive ? 'w-9' : 'w-0 group-hover:w-6'
                    }`}
                  />
                  <span
                    className={`transition-colors duration-200 ${
                      isActive
                        ? 'text-mark'
                        : 'text-ink group-hover:text-mark'
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
