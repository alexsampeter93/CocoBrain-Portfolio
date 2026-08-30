import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import World from './three/World'
import JourneyScroll, { scrollToProgress } from './journey/JourneyScroll'
import { HUB_AT } from './journey/stages'

import StageReadout from './components/ui/StageReadout'
import HeroCopy from './components/ui/HeroCopy'
import Preloader from './components/ui/Preloader'
import Backdrops from './components/ui/Backdrops'
import PortalVeil from './components/ui/PortalVeil'
import FilmGrain from './components/ui/FilmGrain'
import Hud from './components/ui/Hud'
import ReadingThreshold from './components/portfolio/ReadingThreshold'
import AboutArea from './components/portfolio/AboutArea'
import ProjectsArea from './components/portfolio/ProjectsArea'
import ExperienceArea from './components/portfolio/ExperienceArea'
import SkillsArea from './components/portfolio/SkillsArea'
import CvArea from './components/portfolio/CvArea'
import ContactCoda from './components/portfolio/ContactCoda'
import { tokensFor } from './layout/tokens'
import { useCompact } from './layout/useCompact'
import { useActiveArea } from './layout/useActiveArea'
import { getCalmMode, subscribeCalmMode, toggleCalmMode } from './state/calmMode'
import { sections } from './data/sections'

/**
 * Alturas de pantalla que dura el recorrido 3D.
 *
 * Veinte, y el número sale de una cuenta, no de una sensación. Se multiplica
 * cada tramo de `stages.js` por este número y tiene que dar algo que se pueda
 * leer sin correr:
 *
 *     portada 1,0 · acercamiento 1,5 · umbral 1,5 · descenso 1,8
 *     entrada 2,6 · red interior 3,6 · salida 3,0 · cada nodo 1,0
 *
 * Eran once cuando el recorrido acababa en la vista general y los nodos. Al
 * meter la entrada física y la salida —cuatro tramos nuevos y casi la mitad
 * del recorrido— mantener once habría dejado cada nodo en media pantalla:
 * pasarían tan rápido que no serían un sitio al que llegas, serían un destello.
 *
 * El precio es una pista larga. Es el precio correcto: con `scrub` el usuario
 * manda sobre el ritmo, y un tramo corto no se puede mirar despacio aunque se
 * quiera.
 */
/**
 * ── Y AHORA SON TREINTA, PERO EL REPARTO YA NO ES PROPORCIONAL ────────────
 *
 * Este número decide cuánto scroll dura el recorrido ENTERO; cuánto se lleva
 * cada tramo lo decide la tabla de reparto de `journey/stages.js`. Antes eran
 * lo mismo —el progreso avanzaba a scroll constante— y por eso el descenso se
 * llevaba diez pantallas para la información que aporta mientras el hub, que
 * es el destino del viaje, tenía cuatro.
 *
 * Con el reparto separado, subir de 26 a 30 no alarga todo por igual: alarga
 * lo que hacía falta. El hub pasa de cuatro pantallas a ocho y media y el
 * descenso baja de diez a menos de ocho.
 */
const JOURNEY_SCREENS = 30

/** Los ids de las áreas, en orden de documento. Los observa la navegación. */
const AREA_IDS = sections.map((section) => section.id)

/**
 * ## Cómo está montada la página
 *
 * Tres capas, y el orden importa:
 *
 *     fondo      Backdrops — ilustraciones y clima. `fixed`, z -20
 *     escena     World — el canvas. `fixed`, z 0. NUNCA se desmonta
 *     contenido  la pista y el portfolio. `relative`, z 10
 *
 * **El canvas es `fixed` y vive fuera de la pista.** Antes estaba dentro del
 * elemento fijado por ScrollTrigger, lo que funcionaba mientras el 3D solo
 * existiera durante el recorrido. Ahora la escena sigue viva por detrás del
 * texto —muy atenuada, con la constelación a la deriva— y para eso tiene que
 * ser una capa de pantalla completa independiente del scroll.
 *
 * Eso es lo que hace que no haya un "antes" y un "después": el universo no se
 * apaga cuando empiezas a leer, se retira.
 */
export default function App() {
  const compact = useCompact()
  const calm = useSyncExternalStore(subscribeCalmMode, getCalmMode, () => false)

  const trackRef = useRef(null)
  const pinRef = useRef(null)
  const readingRef = useRef(null)

  const tokens = tokensFor(compact)

  /**
   * Qué área se está leyendo. Es lo que mantiene al visitante orientado cuando
   * el recorrido 3D ya ha quedado atrás: la misma navegación que antes marcaba
   * la parada de la cámara ahora marca la sección que tiene delante.
   */
  const readingArea = useActiveArea(AREA_IDS)

  /** Pulsar a Olaz le hace saltar. Un contador basta: cada subida es un salto. */
  const [reaction, setReaction] = useState(0)
  const poke = useCallback(() => setReaction((value) => value + 1), [])

  /**
   * Nodo abierto. La información vive en los nodos, así que pulsar uno abre su
   * ficha ahí mismo sin sacarte del espacio 3D. Las áreas de más abajo son el
   * contenido profundo, y salen de datos distintos: la escena no conoce ni un
   * párrafo del portfolio.
   */
  const [openNode, setOpenNode] = useState(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenNode(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * La navegación mueve la CÁMARA hasta el nodo, no la página hasta el texto.
   *
   * Pulsar "Proyectos" deja el scroll justo en el tramo de ese nodo, así que
   * la cámara vuela hasta él y su ficha aparece al llegar. Es el mismo
   * recorrido que si hubieras bajado a mano: no hay dos formas de llegar al
   * mismo sitio, que es de donde salen las incoherencias.
   */
  const goToNode = useCallback(
    (id) => {
      /**
       * Dos formas de llegar al mismo sitio, según dónde estés.
       *
       * Explorando, la navegación mueve la CÁMARA: pulsar Proyectos deja el
       * scroll en el tramo de ese nodo y la cámara vuela hasta él. Leyendo,
       * salta al texto. Mandar a alguien que está en mitad del editorial de
       * vuelta arriba, a la escena, para que vuelva a bajar, no es navegar: es
       * hacerle repetir el camino.
       */
      /**
       * ── SIEMPRE AL TEXTO, YA NO A UN NODO DE LA ESCENA ──────────────────
       *
       * Esto solo saltaba al DOM si ya se estaba leyendo; si no, volaba la
       * cámara hasta la parada del área dentro del cerebro. Esa parada ya no
       * existe: las cinco áreas son contenido editorial y viven FUERA del
       * cerebro —su recorrido en la escena es el siguiente checkpoint—, así que
       * apuntar ahí llevaría a un punto del interior donde no hay nada suyo.
       *
       * El contenido de las cinco áreas es DOM real y está siempre montado, así
       * que llevar ahí es correcto en cualquier momento del recorrido.
       */
      const element = document.getElementById(id)
      if (element) {
        window.scrollTo({
          top: element.getBoundingClientRect().top + window.scrollY,
          behavior: 'smooth',
        })
      }
    },
    [],
  )

  /**
   * ── PULSAR UN NODO YA NO SALE DEL 3D ──────────────────────────────────
   *
   * Hacia dos cosas: marcar el area y navegar de golpe al texto. Y eso
   * convertia el acto 7 en un menu: cinco botones que abandonan la experiencia
   * en cuanto se toca uno.
   *
   * Ahora seleccionar es SOLO seleccionar. El nodo se enciende, los demas se
   * apartan y se abre su ficha ahi mismo, en el espacio. Desde la ficha se
   * entra al texto —o se cierra y se sigue mirando—, que es lo que convierte
   * la constelacion en un sitio donde se explora en vez de un indice del que
   * se sale.
   */
  /**
   * ── SELECCIONAR ES MOVER EL RECORRIDO, NO ANIMAR LA CÁMARA ────────────
   *
   * Pulsar un nodo hace exactamente dos cosas, y el orden importa poco porque
   * son independientes:
   *
   *     marca cuál está elegido      → escalas y opacidades de la escena
   *     lleva el scroll a la fase B  → y ES el scroll el que mueve la cámara
   *
   * **No hay ninguna animación aquí, y eso es la decisión de fondo.** Volar la
   * cámara desde el clic habría creado una segunda autoridad sobre ella: la
   * misma posición de scroll daría dos cuadros distintos según lo que hubiera
   * pulsado, la rueda no podría interrumpir el movimiento y subir dejaría de
   * deshacer lo que bajar hizo. Pidiendo un punto del recorrido, el enfoque lo
   * produce el mismo mecanismo que produce todo lo demás.
   */
  const selectArea = useCallback(
    (id) => {
      /* Fuera del actualizador: en desarrollo React lo ejecuta dos veces, y un
         efecto dentro de una funcion pura es un error aunque aqui fuera
         idempotente. */
      const next = openNode === id ? null : id
      setOpenNode(next)
      scrollToProgress(trackRef, next ? HUB_AT.focus : HUB_AT.discover)
    },
    [openNode],
  )

  /** Cerrar la ficha y volver a ver las cinco: la fase A del hub. */
  const closeArea = useCallback(() => {
    setOpenNode(null)
    scrollToProgress(trackRef, HUB_AT.discover)
  }, [])

  const goToStart = useCallback(() => scrollToProgress(trackRef, 0), [])

  /**
   * ── VOLVER A LA RED ────────────────────────────────────────────────────
   *
   * Con el editorial abajo y el hub arriba, entrar en una seccion no puede ser
   * un viaje de ida: el visitante tiene que poder volver a mirar la
   * constelacion sin buscar el sitio a mano.
   *
   * No es una escena nueva ni un estado nuevo: es el MISMO scroll llevado al
   * final de la pista, que es donde vive el acto 7. El recorrido sigue siendo
   * la unica fuente de verdad, y subir a mano hace exactamente lo mismo.
   */
  const goToHub = useCallback(() => {
    /* Se vuelve a la vista de las cinco, no al enfoque de la ultima elegida:
       quien vuelve a la red quiere ver la red. */
    setOpenNode(null)
    scrollToProgress(trackRef, HUB_AT.discover)
  }, [])

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      {/* El titular vive en la escena 3D, que no es texto indexable. Este h1
          es el que leen los buscadores y los lectores de pantalla. */}
      <h1 className="sr-only">
        Alex — desarrollo web. CocoBrain: nuestra mayor inspiración fue una vez
        nuestra mayor debilidad.
      </h1>

      <Backdrops />

      {/*
        La escena, en su propia capa fija por detrás de todo el documento. Se
        queda montada de principio a fin: montar y desmontar un canvas de WebGL
        obliga a recompilar shaders, y eso son varios frames perdidos justo en el
        peor momento.

        OJO CON EL Z-INDEX: aquí va `z-0` y NO un valor negativo, aunque un
        negativo parezca lo natural para una capa de fondo. Con `-z-10` el
        canvas SE PINTA BIEN pero sale del reparto de eventos por encima de
        `#root`, y entonces es `#root` quien se queda todos los clics: los nodos
        dejan de responder, no hay ningún error en consola y la escena sigue
        viéndose perfecta. Costó encontrarlo precisamente por eso.

        Lo que ordena las capas es que la pista y el texto lleven `z-10`.
      */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <World
          tokens={tokens}
          sections={sections}
          compact={compact}
          reaction={reaction}
          onPoke={poke}
          activeSection={openNode}
          onSelectSection={selectArea}
          onOpenSection={goToNode}
          onCloseSection={closeArea}
        />
      </div>

      {/*
        Los dos cruces de la corteza, entre la escena y el contenido. Es una
        capa de pantalla completa por encima del canvas: `pointer-events-none`
        dentro del componente es lo que impide que se quede los clics de los
        nodos.
      */}
      <PortalVeil />

      {/*
        El grano y la viñeta. Por DELANTE de la escena y del texto: es lo
        unico que comparten los dos, y por eso es lo que los ata en una sola
        imagen. Ver FilmGrain: capa estatica, coste de composicion y nada mas.
      */}
      <FilmGrain />

      <Preloader />

      <Hud
        sections={sections}
        activeSection={openNode}
        readingArea={readingArea}
        onSelect={goToNode}
        onClose={goToStart}
        onBackToHub={goToHub}
        calm={calm}
        onToggleCalm={toggleCalmMode}
      />

      <JourneyScroll trackRef={trackRef} pinRef={pinRef} readingRef={readingRef} />

      {/*
        La pista: su altura es la duración del recorrido. Y NO recibe el
        puntero.

        Es un elemento posicionado de veinte pantallas de alto, así que se pinta
        por encima del canvas —que ahora es una capa fija de fondo— y se quedaba
        con todos los clics: los nodos dejaron de responder en cuanto la escena
        salió de aquí dentro. Dejándola transparente al puntero, los eventos
        atraviesan hasta la escena, que es de quien son.
      */}
      <section
        ref={trackRef}
        className="pointer-events-none relative z-10"
        style={{ height: `${JOURNEY_SCREENS * 100}vh` }}
      >
        {/*
          El elemento fijado. Ya no contiene el canvas —vive arriba, en su capa
          propia—, solo el titular de la portada, que sí tiene que quedarse
          quieto mientras dura el recorrido.
        */}
        <div ref={pinRef} className="pointer-events-none h-[100dvh] w-full overflow-hidden">
          <HeroCopy />
        </div>
      </section>

      {/*
        El contenido editorial. Es DOM real, no un espejo generado por
        JavaScript: es lo que leen los buscadores y los lectores de pantalla, y
        lo que queda si el 3D no llega a cargar.

        `pointer-events-auto` sobre un fondo transparente: el canvas está detrás
        y no intercepta nada porque su capa es `pointer-events-none`.
      */}
      <main id="contenido" ref={readingRef} className="relative z-10">
        <ReadingThreshold />

        {/*
          El orden NO es el de los nodos, y es deliberado.

          La constelación va Sobre mí → Experiencia → Proyectos → Habilidades →
          CV porque ese recorrido funciona en el espacio. Leyendo funciona otro:
          primero quién eres, después lo que has hecho —que es lo que de verdad
          se viene a ver—, y solo entonces el respaldo. Los proyectos suben.

          Las anclas siguen coincidiendo con los ids de las áreas, así que
          pulsar un nodo lleva al sitio correcto sea cual sea el orden.
        */}
        <AboutArea index="01" />
        <ProjectsArea index="03" />
        <ExperienceArea index="02" />
        <SkillsArea index="04" />
        <CvArea index="05" />

        <ContactCoda />
      </main>

      {import.meta.env.DEV && <StageReadout />}
    </>
  )
}
