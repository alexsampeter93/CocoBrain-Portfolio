import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import World from './three/World'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import JourneyScroll, { scrollToProgress } from './journey/JourneyScroll'
import { HUB_AT } from './journey/stages'

import StageReadout from './components/ui/StageReadout'
import HeroCopy from './components/ui/HeroCopy'
import Preloader from './components/ui/Preloader'
import Backdrops from './components/ui/Backdrops'
import PortalVeil from './components/ui/PortalVeil'
import FilmGrain from './components/ui/FilmGrain'
import Hud from './components/ui/Hud'
import Cursor from './components/ui/Cursor'
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
import { getTheme, subscribeTheme, toggleTheme } from './state/theme'
import { areaIndex, DARK_GROUND_AREAS, sections } from './data/sections'
import { journey } from './journey/clock'
import { MediaViewerProvider } from './components/portfolio/MediaViewer'
import Ambient from './components/ui/Ambient'

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
 * ── Y LAS ZONAS DEL MUNDO, QUE SON UNA MÁS ──────────────────────────────────
 *
 * El entorno observa también la CODA, y la navegación no.
 *
 * `sections` no lleva Contacto a propósito —no es un sitio que se visita, es
 * donde acabas, así que no tiene nodo en la constelación (§8)— y de ahí salía
 * un fallo que la ilustración de fondo estuvo tapando hasta la fase 9B: sin
 * Contacto en la lista, `useActiveArea` no lo devolvía nunca y el entorno se
 * quedaba con su estado por defecto durante toda la coda. O sea que **el final
 * de la web tenía exactamente el mismo terreno que el principio**, teniendo su
 * estado declarado en la tabla y sin que lo leyera nadie.
 *
 * Es el error de "una constante declarada y no usada MIENTE" (§13) con otro
 * disfraz: al documentar un estado hay que comprobar que alguien lo LEE, no que
 * existe.
 */
/**
 * Hasta que progreso el cuadro del recorrido sigue siendo CLARO, y cuanta
 * histeresis lleva el umbral. Sale de la tabla de luminancia del descenso
 * (ver el efecto del suelo, mas abajo): en 0,05 la esquina superior mide 213
 * y en 0,07 ya mide 151.
 */
const LIGHT_SCENE = 0.065
const LIGHT_HYST = 0.012

const WORLD_IDS = [...AREA_IDS, 'contacto']

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
  /* El umbral mide su propio cruce: de él cuelga la retirada. Ver `clock.js`. */
  const thresholdRef = useRef(null)

  const tokens = tokensFor(compact)

  /**
   * Qué área se está leyendo. Es lo que mantiene al visitante orientado cuando
   * el recorrido 3D ya ha quedado atrás: la misma navegación que antes marcaba
   * la parada de la cámara ahora marca la sección que tiene delante.
   */
  const readingArea = useActiveArea(AREA_IDS)

  /*
    Y en qué zona del MUNDO se está, que incluye la coda. Son dos observadores
    del mismo tipo y no uno solo con la lista larga: si la navegación observara
    Contacto, marcaría como activa un área que no está en su índice y el HUD se
    quedaría sin ninguna encendida justo al llegar al final.
  */
  const worldArea = useActiveArea(WORLD_IDS)

  /**
   * El tema. Se lee con `useSyncExternalStore` igual que "cabeza despejada",
   * y por el mismo motivo: es un almacén externo, no un contexto, para que
   * pueda cruzar al reconciliador de react-three-fiber el día que haga falta.
   */
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light')

  /*
    ── EL DOCUMENTO SABE SOBRE QUÉ SUELO SE ESTÁ LEYENDO (10D, ampliado en 10F)

    La superficie oscura de un área la pinta la propia sección, pero el HUD
    —marco, navegación, regla de lectura, índice— es `fixed`: vive fuera del
    árbol de la sección, así que resuelve sus variables contra `:root` y se
    queda con la tinta de la MENTE, que es marfil.

    10D marcó solo el suelo oscuro, y eso arregló el área oscura y dejó rotas
    las cinco claras: medido en 10F contra el build, el HUD daba entre 1,00 y
    1,13 : 1 sobre el marfil —o sea que no se veía— y en cambio se leía
    perfectamente sobre Experiencia. El fallo no era el mecanismo: era que
    solo declaraba UNO de los dos suelos.

    Ahora declara los dos, y la ausencia del atributo significa la tercera
    cosa que hay de verdad: el recorrido 3D, donde los valores de `:root`
    —la mente— son los correctos y no hay nada que voltear.

        dark    Experiencia
        paper   las otras cinco áreas y la coda
        (nada)  el recorrido 3D

    Cuelga de `worldArea` y no de `readingArea` porque la coda también es
    editorial y también tiene el HUD encima; `readingArea` solo observa las
    cinco del índice. Y no pisa al editorial: cada área declara sus tokens en
    su propio `[data-act]`, que es un ancestro más cercano y por tanto gana.

    Es una escritura DISCRETA —una por cambio de área, no una por frame—, y
    está medido en 10D que no cuesta nada: los rangos con y sin el atributo se
    solapan enteros.
  */
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme

    /*
      Y el suelo, que ahora depende de las dos cosas.

          claro   Experiencia -> dark     el resto -> paper
          noche   TODAS -> night
          (3D)    sin atributo, en los dos temas

      En noche no hay un valor especial para Experiencia, y no es un olvido:
      su distinción ya no la lleva la TINTA sino su lámina, que se eleva en
      cálido. Ver `.section-ground` en `index.css`. Con el suelo ya oscuro, no
      hay ninguna tinta que voltear.
    */
    /*
      ── Y EL RECORRIDO TAMBIEN TIENE SUELO (fase 11E) ─────────────────────

      La portada es CLARA, y el HUD llevaba encima la tinta de la mente:
      medido en pixel, "CocoBrain — Alex" sobre la crema del bodegon daba
      **1,28 : 1**. O sea que no estaba. Es el mismo fallo de 10D/10F, en el
      unico suelo que se habia quedado fuera.

      Y no se arregla con un punto de volteo, porque las dos esquinas del HUD
      cruzan en momentos DISTINTOS. Medido el suelo bajo cada una a lo largo
      del descenso:

          progreso   arriba-izq   abajo-der    marfil(izq/der)  coco(izq/der)
          0,00          228          132         1,28 / 3,83    10,69 / 3,59
          0,07          151          166         3,33 / 2,44     4,12 / 5,63
          0,09          104          175         6,39 / 2,31     2,15 / 5,94
          0,16          oscuro       oscuro     12,56 /12,83     1,09 / 1,07

      La izquierda se oscurece hacia 0,07; la derecha primero se ACLARA hasta
      0,09 y se oscurece despues. No hay ninguna tinta que sirva para las dos
      a la vez en ese tramo, asi que la tinta sola no basta: cada esquina
      necesita su propia lamina, y eso lo pone `Hud`.

      Lo que decide este atributo es solo cual de los dos regimenes manda, y
      el punto sale de la tabla: por debajo de 0,065 el cuadro sigue siendo la
      portada. Con HISTERESIS, para que quedarse parado justo encima del
      umbral no lo haga parpadear.
    */
    let claro = journey.progress < LIGHT_SCENE
    let escrito = null
    let frame

    const aplicar = () => {
      const p = journey.progress
      if (claro && p > LIGHT_SCENE + LIGHT_HYST) claro = false
      else if (!claro && p < LIGHT_SCENE - LIGHT_HYST) claro = true

      let next
      if (worldArea) {
        next = theme === 'dark' ? 'night' : DARK_GROUND_AREAS.has(worldArea) ? 'dark' : 'paper'
      } else {
        next = claro ? 'paper' : null
      }

      /*
        Un solo dueno del atributo, y una escritura solo cuando de verdad
        cambia. El bucle lee un numero y compara; lo que esta prohibido es
        ESCRIBIR en `:root` por frame, no leer el reloj.
      */
      if (next !== escrito) {
        escrito = next
        if (next) root.setAttribute('data-ground', next)
        else root.removeAttribute('data-ground')
      }
      frame = requestAnimationFrame(aplicar)
    }
    frame = requestAnimationFrame(aplicar)

    return () => {
      cancelAnimationFrame(frame)
      root.removeAttribute('data-ground')
    }
  }, [worldArea, theme])

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
      /**
       * ── Y SE LLEGA CON EL TELON, NO VOLANDO (fase 11E) ─────────────────
       *
       * Iba con `behavior: smooth`, y eso son 1.896 ms de vuelo por 28.000
       * px. Para el atajo de la portada eso es exactamente lo que se quiere
       * —ver el viaje que te saltas— y por eso ese tiene su propia funcion.
       * Para la navegacion del HUD es un castigo: se usa muchas veces
       * mientras se lee, y volar veinte mil pixeles cada vez que saltas del
       * CV a Proyectos no es navegar, es esperar.
       *
       * Asi que aqui el salto es INSTANTANEO y lo tapa el telon: el mismo
       * gesto que 11D construyo para el tema, porque es la misma pregunta
       * -como se cambia de un estado del cuadro a otro sin un corte-.
       *
       * Y esta comprobado que funciona sobre el canvas: una view transition
       * congela la pagina en una captura, y medido antes de construir nada,
       * esa captura incluye el WebGL con diferencia 0,0 por canal.
       */
      const element = document.getElementById(id)
      if (!element) return
      const saltar = () => {
        window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY })
      }
      if (typeof document.startViewTransition !== 'function') {
        saltar()
        return
      }
      document.documentElement.dataset.vt = 'nav'
      const vt = document.startViewTransition(saltar)
      vt.finished.finally(() => document.documentElement.removeAttribute('data-vt')).catch(() => {})
    },
    [],
  )

  /**
   * ── EL ATAJO DE LA PORTADA VUELA, Y ESE ES SU TRABAJO ────────────────
   *
   * Alex señalo que "o ir directo al portfolio" hacia exactamente lo mismo
   * que pulsar "Sobre mi" en el HUD — las dos llamaban a `goToNode`— y tenia
   * razon. Lo que las diferencia no es a donde llevan: es COMO.
   *
   * El HUD salta con telon porque se usa muchas veces. El atajo de la
   * portada vuela, con scroll suave, porque se usa UNA y porque enseña lo
   * que te estas saltando: medido, 1.896 ms con p95 de 19 ms y dos frames
   * largos. Un atajo que enseña el viaje no es lo mismo que un salto.
   */
  const flyTo = useCallback((id) => {
    const element = document.getElementById(id)
    if (!element) return
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'smooth',
    })
  }, [])

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

  /**
   * ── UN ENLACE CON ANCLA TIENE QUE ATERRIZAR (fase 11B) ──────────────────
   *
   * Medido: entrando en `/#skills` la página se quedaba en scrollY 0. No es que
   * el ancla no exista —las seis áreas son DOM real y están siempre montadas—
   * es que **todavía no está donde va a estar** cuando el navegador intenta
   * saltar: React aún no ha pintado el editorial y, sobre todo, ScrollTrigger
   * aún no ha fijado la pista, que es la que empuja las secciones 27.000 px
   * hacia abajo. El navegador salta a una posición que caduca un frame
   * después.
   *
   * Así que no se salta antes: se salta cuando la geometría es definitiva, y
   * quien sabe eso es ScrollTrigger. Se escucha su `refresh` UNA vez.
   *
   * Va sin `behavior: 'smooth'` a propósito. Un enlace con ancla es una
   * petición explícita de estar YA en un sitio; el vuelo de casi dos segundos
   * es lo correcto cuando alguien pulsa "ir directo al portfolio" desde la
   * portada —ahí el viaje que te saltas es parte del mensaje— y es un estorbo
   * cuando has pegado una URL.
   *
   * Y no pelea con el reinicio de `index.html`: aquel solo actúa cuando NO hay
   * ancla.
   */
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return

    let done = false
    const land = () => {
      if (done) return
      const element = document.querySelector(hash)
      if (!element) return
      done = true
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY })
    }

    ScrollTrigger.addEventListener("refresh", land)
    // Y una red por si el refresco ya había pasado antes de suscribirse.
    const timer = setTimeout(land, 1200)
    return () => {
      ScrollTrigger.removeEventListener("refresh", land)
      clearTimeout(timer)
    }
  }, [])

  /**
   * ── EL TELÓN ────────────────────────────────────────────────────────────
   *
   * El cambio de tema va envuelto en `startViewTransition`, así que el
   * navegador congela la página, aplica el cambio y anima entre las dos
   * capturas. El gesto —un telón que se abre desde el centro— vive entero en
   * CSS, en `index.css`.
   *
   * Sin soporte, se cambia y ya. Es la misma forma que trae la referencia de
   * Alex y es lo correcto: el telón es el adorno, el tema es el resultado.
   */
  const switchTheme = useCallback((event) => {
    if (typeof document.startViewTransition !== 'function') {
      toggleTheme()
      return
    }

    /*
      ── EL TEMA TIENE SU PROPIO GESTO, DISTINTO DEL DE NAVEGAR (12A.1) ─────

      El telon que abre desde el centro pasó a ser el de la NAVEGACION en
      11E, y dos cosas que ocurren por motivos distintos no pueden verse
      igual: si saltar de area y cambiar de tema dan el mismo gesto, el gesto
      deja de decir cual de las dos ha pasado.

      El del tema es un IRIS que se abre desde el propio interruptor. Eso ata
      el cambio al control que se ha pulsado —el color sale de donde has
      tocado— y es lo que lo distingue de una transicion de pagina, que viene
      de fuera.

      El centro y el radio se miden del boton en el momento del clic: el radio
      es la distancia a la esquina mas lejana, o sea lo justo para que el
      circulo cubra la ventana sin pasarse. Escrito a mano seria un numero que
      caduca en cuanto el boton cambie de sitio.
    */
    const root = document.documentElement
    const caja = event?.currentTarget?.getBoundingClientRect?.()
    const x = caja ? caja.left + caja.width / 2 : window.innerWidth
    const y = caja ? caja.top + caja.height / 2 : 0
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    root.style.setProperty('--vt-x', `${x}px`)
    root.style.setProperty('--vt-y', `${y}px`)
    root.style.setProperty('--vt-r', `${Math.ceil(r)}px`)
    root.dataset.vt = 'tema'
    const vt = document.startViewTransition(() => {
      /*
        `flushSync` no hace falta: `toggleTheme` avisa a sus suscriptores de
        forma síncrona y React 18 procesa esa actualización antes de que el
        navegador tome la segunda captura. Lo que SÍ hace falta es que el
        atributo del documento se escriba aquí dentro, y eso lo garantiza el
        efecto de arriba al depender de `theme`.
      */
      toggleTheme()
    })

    /* Y se retira la marca al acabar: si se queda, la navegacion heredaria el
       gesto del tema la proxima vez. */
    vt.finished.finally(() => root.removeAttribute('data-vt')).catch(() => {})
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
    /*
      El visor de medios envuelve la aplicación entera y no la sección de
      proyectos, por dos motivos: su portal cuelga del `body` —así que no queda
      encerrado por el contexto de apilado de una ficha— y así cualquier otra
      área que en el futuro tenga evidencia que ampliar puede abrirlo sin
      montar un segundo sistema.
    */
    <MediaViewerProvider>
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
        EL ENTORNO. Va justo después del color plano y antes del canvas: el
        campo topográfico es parte del mundo, no de la interfaz, así que el 6%
        de escena que sobrevive a la lectura se dibuja por delante de él.
      */}
      <Ambient area={worldArea} />

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

      {/*
        El cursor propio, solo dentro de `<main>` — decisión de Alex: ver
        `components/ui/Cursor.jsx`. Se queda fuera de la escena por completo
        si el movimiento está reducido o si no hay ratón de verdad.
      */}
      <Cursor />

      <Preloader />

      <Hud
        sections={sections}
        activeSection={openNode}
        readingArea={readingArea}
        onSelect={goToNode}
        onClose={goToStart}
        onBackToHub={goToHub}
        calm={calm}
        theme={theme}
        onToggleTheme={switchTheme}
        onToggleCalm={toggleCalmMode}
      />

      <JourneyScroll
        trackRef={trackRef}
        pinRef={pinRef}
        readingRef={readingRef}
        thresholdRef={thresholdRef}
      />

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
          <HeroCopy onSkip={() => flyTo('about')} />
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
        <ReadingThreshold ref={thresholdRef} />

        {/*
          El orden NO es el de los nodos, y es deliberado.

          La constelación va Sobre mí → Experiencia → Proyectos → Habilidades →
          CV porque ese recorrido funciona en el espacio. Leyendo funciona otro:
          primero quién eres, después lo que has hecho —que es lo que de verdad
          se viene a ver—, y solo entonces el respaldo. Los proyectos suben.

          Las anclas siguen coincidiendo con los ids de las áreas, así que
          pulsar un nodo lleva al sitio correcto sea cual sea el orden.
        */}
        <AboutArea index={areaIndex.about} />
        <ProjectsArea index={areaIndex.work} />
        <ExperienceArea index={areaIndex.experience} />
        <SkillsArea index={areaIndex.skills} />
        <CvArea index={areaIndex.cv} />

        <ContactCoda />
      </main>

      {import.meta.env.DEV && <StageReadout />}
    </MediaViewerProvider>
  )
}
