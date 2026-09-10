import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import EditorialObject from './EditorialObject'
import { Mask, MaskLetters } from './Type'
import { Meta, ProjectStage, Stack } from './ProjectStage'
import { useMediaViewer } from './MediaViewer'
import { useScene } from '../../animations/editorial'
import { MOTION, useDrawThread, useDrift } from '../../animations/motion'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { Icon } from '../ui/Icon'

gsap.registerPlugin(ScrollTrigger)

/**
 * ── UN PROYECTO COMO CAPÍTULO, NO COMO FICHA ────────────────────────────────
 *
 * La ficha coloca el nombre, el objeto al lado, el abanico debajo y el caso
 * debajo del abanico. Es correcto y es una COLUMNA: cada cosa espera a que
 * termine la anterior, y el objeto 3D acaba leyéndose como un icono junto a un
 * título.
 *
 * Un capítulo se compone de otra manera, y son cuatro decisiones:
 *
 * **1. Hay un LOMO.** Una columna estrecha a la izquierda con el folio, un
 * trazo vertical y el nombre escrito en vertical, y va PEGADA (`sticky`): no se
 * mueve mientras pasan por delante la portada, las capturas y el caso. Eso es
 * lo que convierte tres pantallas sueltas en un capítulo — hay algo que
 * permanece mientras el contenido cambia—. Y el trazo se DIBUJA con el avance
 * del capítulo, así que además dice cuánto queda.
 *
 * **2. El nombre se compone A LA MEDIDA DE SU PISTA**, no a un cuerpo fijo ni
 * al ancho entero del capítulo. Cada proyecto declara su escala para que su
 * línea más larga ocupe alrededor de tres cuartos de las columnas que ocupa, y
 * como el cuerpo sale de la LONGITUD del nombre, los tres comparten regla y
 * ninguno comparte composición: "Zalent" cabe en una línea y "Las aventuras de
 * Cata y Trufa" pide tres y un cuerpo menor.
 *
 * Lo que NO se hace es llenar la medida. Se hizo, y era el error de §8 con otro
 * disfraz: la altura de una mayúscula llegaba a la cuarta parte de la pantalla,
 * la palabra dejaba de leerse como tipografía y no quedaba sitio para que el
 * objeto fuera nada más que un icono pegado a una letra.
 *
 * **3. EL NOMBRE Y EL OBJETO SE COLOCAN POR SEPARADO EN UN CAMPO DE DOCE
 * COLUMNAS.** Ninguno de los dos depende del otro: el nombre ocupa las columnas
 * que declara su partitura y el objeto las suyas, cada uno con su propio anclaje
 * vertical dentro de la portada. Ver `SCORE`.
 *
 * Esto sustituye a la versión anterior, en la que el objeto colgaba de una
 * medida en `em` DEL TITULAR y quedaba por detrás de la palabra. Aquello tenía
 * dos defectos que solo se ven en pantalla: la pieza medía menos que una letra
 * —o sea, era un icono— y no tenía sitio propio, así que se leía como el adorno
 * de un título. La lección salió del propio material: Cata y Trufa funcionaba y
 * las otras dos no, y la diferencia medible era que las dos carlinas son MÁS
 * GRANDES que la altura de una mayúscula y ocupan un hueco de la composición.
 *
 * **4. Cada capítulo se compone distinto, y el reparto sale del proyecto.** Ver
 * `SCORE`: una banda, una diagonal y un engaste. Mismo lenguaje —lomo, folio,
 * trazo, nombre compuesto letra a letra, objeto en su plano, banda del pie—,
 * tres composiciones que no se parecen.
 *
 * ## Lo que NO cambia
 *
 * El abanico es el mismo `ProjectStage` ya validado, con su reparto por número
 * de láminas y su visor. El caso —objetivo, problema, solución, características,
 * resultado— es el mismo texto en el mismo orden. Esto no reescribe el
 * contenido: lo pone en un escenario.
 */

/**
 * ── LA PARTITURA DE CADA CAPÍTULO ───────────────────────────────────────────
 *
 * La portada es un CAMPO de doce columnas y una fila del alto de la portada. El
 * nombre y el objeto son dos habitantes de ese campo, y cada uno declara dónde
 * vive. No hay ninguna relación geométrica escrita entre los dos: lo que los
 * relaciona es la rejilla y el aire.
 *
 * `lines` — dónde se parte el nombre. Se DECLARA, no se calcula: un titular
 * editorial se corta donde el diseño quiere, no donde cae el ancho.
 *
 * `scale` — el cuerpo del nombre, como múltiplo de `--step-chapter`. Sale de que
 * la línea más larga ocupe alrededor de tres cuartos de SU PISTA —no de la
 * medida entera—, así que un nombre corto en una pista de seis columnas y uno
 * largo en una de ocho acaban con el mismo aire alrededor.
 *
 * **Y son cuerpos mucho menores que los de 8C.** Aquello llenaba dos tercios de
 * la medida con la palabra sola y la altura de una mayúscula se comía la cuarta
 * parte de la pantalla: a ese cuerpo el nombre deja de ser tipografía y pasa a
 * ser una mancha, el gesto de componerlo letra a letra no se percibe, y no queda
 * sitio para que el objeto sea otra cosa que un icono pegado a una letra. Es el
 * error que este manual ya tiene escrito en §8 con el caso de OVEUN —*un titular
 * que llega al borde no tiene jerarquía: tiene ruido*— cometido otra vez y a
 * mayor tamaño.
 *
 * `title` — la pista del nombre: `col` (columnas de la rejilla) y `self` (a qué
 * borde de la portada se ancla: `start`, `center` o `end`).
 *
 * `object` — la pista de la pieza. Las mismas dos, más `size` —el lado del
 * lienzo— y `mb` / `ml`, dos retoques de apoyo.
 *
 * Van en MÁRGENES y no en transformaciones porque de la transformación de esos
 * nodos ya son dueños el plano de profundidad y la escena: un dueño por
 * propiedad. Y son FRACCIONES DEL TAMAÑO DE LA PIEZA, no píxeles — el lienzo
 * encoge con la ventana y un margen fijo no, así que el mismo −10 rem que
 * posaba la casa a 1920 la hundía por debajo del filete a 1366. Es el mismo
 * error que ya costó una vuelta cuando el objeto colgaba de un porcentaje del
 * bloque de texto.
 *
 * `cover` — **el alto de la portada, y es una decisión de composición, no un
 * número heredado.** Las tres medían 86vh y era el motivo real del "espacio
 * vacío": con los cuerpos corregidos, una banda apoyada abajo dejaba dos
 * tercios de pantalla sin nada encima. El formato de una página es una variable
 * editorial como el cuerpo o la columna — una portada apaisada y baja no es la
 * misma pieza que una alta —, así que cada capítulo declara el suyo: Zalent es
 * ancho y bajo, ActiHome alto porque su tema es el espacio, y Cata queda en
 * medio.
 *
 * `foot` — en qué orden se lee la banda del pie.
 *
 * `flip` — hacia qué lado se abre el abanico, y con él la columna del caso.
 */
const SCORE = {
  /**
   * ── ZALENT · LA BANDA ─────────────────────────────────────────────────────
   *
   * Es una herramienta, y una herramienta se presenta como un producto: sola,
   * de frente y sobre una superficie. Así que el nombre y el maletín se ANCLAN
   * LOS DOS ABAJO, en pistas separadas y sin tocarse, y lo que los relaciona es
   * que comparten la línea sobre la que se apoyan — que no es una línea nueva:
   * es el filete con el que ya abre la banda del pie.
   *
   * Toda la mitad de arriba de la portada queda vacía a propósito. No es un
   * hueco: es lo que convierte dos elementos sueltos en una composición con
   * suelo. Y es la lectura más precisa y más estructurada de las tres, que es lo
   * que el proyecto pide.
   *
   * El maletín ya no se solapa con nada. Lo que le da presencia no es dónde
   * está: es que mide el triple que la altura de una mayúscula del nombre.
   */
  zalent: {
    lines: ['Zalent'],
    scale: 0.92,
    cover: '66vh',
    title: { col: '1 / span 6', self: 'end' },
    /* El maletín se normaliza dentro de un lienzo con más aire por debajo que
       el de la casa —modelo distinto, padding distinto—, así que el mismo
       -0,09 lo dejaba flotando 70-90 px por encima del filete mientras la casa
       de ActiHome lo rozaba. Medido contra el build en 1920 y 1366: hacía
       falta -0,28 para que también él se apoyara en la línea que comparten. */
    object: { col: '8 / span 5', self: 'end', size: 'clamp(12rem, 20vw, 23rem)', mb: -0.28 },
    foot: 'meta-lead',
    flip: false,
    cues: {},
  },

  /**
   * ── ACTIHOME · LA DIAGONAL ────────────────────────────────────────────────
   *
   * Es un alojamiento, o sea un sitio, así que lo que tiene que leerse es el
   * ESPACIO: el nombre en la pista izquierda y la casa abajo en la contraria,
   * con la diagonal entre los dos. Un rótulo, y un volumen apoyado.
   *
   * **Y la diagonal es corta.** La primera versión mandaba el nombre al techo y
   * la casa al suelo de una portada de 92vh, y eso no era espacio: eran dos
   * elementos demasiado lejos para relacionarse, con media pantalla de crema
   * entre medias. Un vacío solo se lee como distancia cuando los dos extremos
   * se ven a la vez y pesan; si no, se lee como que falta algo.
   *
   * Y es la más grande de las tres piezas porque es la única que tiene que
   * leerse como arquitectura y no como objeto de mano. Se apoya en el mismo
   * filete que Zalent, con el que aquí sí llega a rozar: una casa se posa.
   *
   * La banda del pie va invertida —primero para qué sirve, después el dato— por
   * lo de siempre: es el único de los tres nombres que no dice de qué va.
   */
  actihome: {
    lines: ['ActiHome'],
    scale: 0.7,
    cover: '70vh',
    title: { col: '1 / span 7', self: 'center' },
    object: {
      col: '7 / span 6',
      self: 'end',
      just: 'end',
      size: 'clamp(13rem, 28vw, 34rem)',
      /* El lienzo se ancla al filete y el modelo va CENTRADO dentro de él, así
         que su base queda un palmo por encima. Y esta pieza es ancha y baja
         —una casa con su parcela—, o sea que ese palmo son ciento cuarenta
         píxeles. El margen negativo la posa; se mide en pantalla, no se deduce. */
      /* La fracción cubre dos cosas: el aire que el modelo deja dentro de su
         lienzo —va centrado— y la calle que la banda del pie abre por encima de
         su filete. La casa tiene que ROZAR ese filete: es lo que la posa. */
      mb: -0.37,
    },
    foot: 'lead-meta',
    flip: true,
    cues: {
      /* Más seguida que la de Zalent: es la aplicación más directa de las tres
         y su nombre lleva dos palabras dentro de una. */
      letter: { at: 0.12, from: { yPercent: 115 }, stagger: 0.042, dur: 0.85 },
      /* Y la casa llega ANTES y desde más abajo: se está posando. */
      object: { at: 0.3, from: { opacity: 0, scale: 0.9, x: -34, y: 70 }, dur: 1.1 },
    },
  },

  /**
   * ── CATA Y TRUFA · EL ENGASTE ─────────────────────────────────────────────
   *
   * Esta es la que ya funcionaba, y se conserva. El nombre se parte en tres
   * líneas —"Las aventuras" es el género y las dos protagonistas van una por
   * línea— y la mancha de texto abre una escalera hacia la derecha: las carlinas
   * viven en ese hueco, DENTRO del titular. Es el único caso en el que un solape
   * es la composición y no un accidente, y funciona por el mismo motivo por el
   * que los otros dos no funcionaban: las dos juntas son más anchas que dos
   * letras, así que son personajes y no un icono.
   *
   * Lo único que cambia es que ahora ocupan una pista declarada como las demás,
   * en vez de colgar de una medida en `em` del titular, y que el cuerpo del
   * nombre baja un punto para que el engaste tenga aire.
   */
  'cata-trufa': {
    lines: ['Las aventuras', 'de Cata', 'y Trufa'],
    scale: 0.62,
    cover: '78vh',
    title: { col: '1 / span 9', self: 'center' },
    object: {
      /*
        Ancladas al PRINCIPIO de su pista, no centradas en ella. Estuvieron
        centradas con un margen negativo que las metía en la escalera, y ese
        margen era una fracción del tamaño de la PIEZA: como la pieza encoge con
        la ventana y el hueco del texto no, a 1366 se quedaban a doscientos
        cincuenta píxeles del titular y dejaban de engastar. Lo que decide dónde
        está el hueco es la rejilla, que es la misma que compone el texto.
      */
      col: '6 / span 5',
      just: 'start',
      self: 'center',
      size: 'clamp(12rem, 21vw, 24rem)',
      mb: -0.19,
    },
    foot: 'meta-lead',
    flip: false,
    cues: {
      /* Las líneas ya escalonan solas, así que las letras van más juntas. */
      letter: { at: 0.1, from: { yPercent: 112 }, stagger: 0.038, dur: 0.9 },
      /*
        Y las protagonistas entran GIRADAS, que es el único guiño de juego de
        todo el editorial — el mismo recurso que ya tenía la ficha del
        videojuego, conservado al pasar a capítulo.
      */
      object: { at: 0.44, from: { opacity: 0, scale: 0.84, rotate: -6, x: -24, y: 40 }, dur: 1.1 },
    },
  },
}

const DEFAULT_SCORE = {
  lines: null,
  scale: 0.9,
  cover: '76vh',
  title: { col: '1 / span 7', self: 'end' },
  object: { col: '8 / span 5', self: 'end', size: 'clamp(12rem, 20vw, 22rem)' },
  foot: 'meta-lead',
  flip: false,
  cues: {},
}

/**
 * ── EL RITMO DE UN CAPÍTULO ─────────────────────────────────────────────────
 *
 * El folio primero, porque es el marcador: antes de saber qué proyecto es, se
 * sabe que empieza uno. Después el nombre, letra a letra y ocupando casi todo
 * el tramo. El objeto llega DESPUÉS de la mitad del nombre —cuando ya hay algo
 * con lo que componerse— y el dato frío y el lema cierran, que es el orden en
 * el que se leen.
 *
 * ## Y el objeto entra DESDE EL LADO DEL LOMO
 *
 * No desde abajo y de frente. Es la única continuidad que se ha añadido, y no
 * es un efecto nuevo: es una DIRECCIÓN. El trazo del lomo baja por la
 * izquierda, entrega al capítulo siguiente y ahí mismo aparece su pieza, que
 * llega desde ese lado y se coloca. Lo que enlaza dos capítulos es que algo
 * viaja siempre en el mismo sentido, no que haya un efecto entre medias.
 */
const CHAPTER_CUES = {
  folio: { at: 0, from: { yPercent: 130 }, dur: 0.8 },
  letter: { at: 0.12, from: { yPercent: 115 }, stagger: 0.055, dur: 0.9 },
  object: { at: 0.38, from: { opacity: 0, scale: 0.88, x: -40, y: 44 }, dur: 1.1 },
  media: { at: 0.58, from: { y: 60, opacity: 0 }, dur: 1.1 },
  meta: { at: 0.66, from: { y: 12, opacity: 0 }, stagger: 0.06, dur: 0.7 },
  lead: { at: 0.74, from: { y: 18, opacity: 0 }, dur: 0.8 },
}

/**
 * Y la salida. El nombre se va por arriba dejando las letras a media opacidad
 * —nada llega a cero, que es la ley del editorial: esta página se lee en los
 * dos sentidos— y el objeto se va hacia el LOMO, que es por donde vino y por
 * donde va a bajar el trazo que entrega al capítulo siguiente.
 *
 * El folio NO se va: es lo único que se queda hasta el final del capítulo. Su
 * `skip` es lo que hace que el lomo siga estando cuando ya se está leyendo el
 * caso, tres pantallas más abajo.
 */
const CHAPTER_EXITS = {
  letter: { at: 0, to: { yPercent: -40, opacity: 0.16 }, stagger: 0.03, dur: 1 },
  object: { at: 0.05, to: { opacity: 0.08, scale: 0.82, x: -64, y: 26 }, dur: 0.9 },
  meta: { at: 0.14, to: { y: -18, opacity: 0.1 }, dur: 0.8 },
  lead: { at: 0.18, to: { y: -20, opacity: 0.1 }, dur: 0.8 },
  media: { at: 0.02, to: { y: -30, opacity: 0.2 }, dur: 1 },
  folio: { skip: true },
}

/**
 * ── LAS SEÑALES DE CADA CAPÍTULO, COMPUESTAS UNA SOLA VEZ ───────────────────
 *
 * Y esto NO es una optimización: es la corrección de un fallo real. Pasarle a
 * `useScene` un `{ ...CHAPTER_CUES, ...score.cues }` escrito en el cuerpo del
 * componente crea un objeto NUEVO en cada render, y ese objeto está en las
 * dependencias del efecto: la escena se revertía y se volvía a montar sin
 * parar. Medido sobre el build, el resultado era que el nombre se quedaba con
 * la primera letra colocada y las otras cinco clavadas en su estado de
 * partida —a 371 px por debajo de su línea— dijera lo que dijera el scroll.
 *
 * Compuestas al cargar el módulo, la identidad es estable y el efecto se monta
 * una vez.
 */
const CUES_BY_ID = Object.fromEntries(
  Object.entries(SCORE).map(([id, s]) => [id, { ...CHAPTER_CUES, ...(s.cues ?? {}) }]),
)

/**
 * ── EL TRAZO DEL LOMO SE DIBUJA CON EL CAPÍTULO ─────────────────────────────
 *
 * No con su propia travesía. El trazo vive dentro de la caja pegada, así que
 * mide siempre lo mismo y está siempre en el mismo sitio de la pantalla: si su
 * disparador colgara de él, se dibujaría en cuanto apareciera y ahí se
 * quedaría. Colgando del CAPÍTULO, el trazo avanza mientras avanza la lectura —
 * es el mismo dato que el lomo ya está diciendo, dicho con una línea.
 *
 * Es la misma técnica que `useDrawThread` y no lo reutiliza por esto mismo:
 * aquel mide su propio elemento, y aquí hace falta medir otro.
 */
function useSpineDraw(chapterRef) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const rule = ref.current
    const chapter = chapterRef.current
    if (!rule || !chapter || reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rule,
        { scaleY: 0, transformOrigin: 'top center' },
        {
          scaleY: 1,
          transformOrigin: 'top center',
          ease: 'none',
          scrollTrigger: {
            trigger: chapter,
            /* Arranca cuando el filete del capítulo asoma, no a media
               pantalla: así el trazo del lomo continúa el que acaba de bajar
               desde el capítulo anterior en vez de empezar otro más abajo. Una
               sola línea cruzando la costura. */
            start: 'top 88%',
            end: 'bottom 78%',
            scrub: MOTION.SCRUB,
            invalidateOnRefresh: true,
          },
        },
      )
    }, rule)

    return () => ctx.revert()
  }, [chapterRef, reduced])

  return ref
}

export default function ProjectChapter({ project, position = 0 }) {
  const chapter = useRef(null)
  const media = project.media ?? []
  const [hero, ...gallery] = media
  const viewer = useMediaViewer()
  const score = { ...DEFAULT_SCORE, ...(SCORE[project.id] ?? {}) }
  const lines = score.lines ?? [project.title]

  /*
    El visor necesita algo más que "qué lista, qué índice": necesita el
    ELEMENTO pulsado, para poder despegarlo de donde estaba, y el área y el
    nombre del proyecto, para el sello y el encabezado.
  */
  const openViewer = (list, index, originEl) =>
    viewer?.open?.(list, index, { originEl, area: 'work', title: project.title })

  const scene = useScene({
    cues: CUES_BY_ID[project.id] ?? CHAPTER_CUES,
    exits: CHAPTER_EXITS,
    /*
      Empieza en cuanto el capítulo ENTRA por abajo, no cuando ya está dentro.
      La diferencia se ve en la costura: con la ventana en 92% el nombre no
      empezaba a componerse hasta tener el filete casi arriba, así que entre el
      último párrafo de un caso y la primera letra del siguiente quedaba una
      pantalla en la que no pasaba nada. Empezando en 100%, el folio y las
      primeras letras del capítulo que llega se mueven mientras el anterior
      todavía se está yendo — dos capítulos compartiendo pantalla, que es lo
      contrario de un cambio de diapositiva.
    */
    start: 'top 100%',
    end: 'top 18%',
    // La salida cuelga del CAPÍTULO entero: el nombre no se retira a las tres
    // líneas de haber entrado, sino cuando el capítulo se está acabando.
    exitTrigger: chapter,
    exitStart: 'bottom 78%',
    exitEnd: 'bottom 8%',
  })

  const spine = useSpineDraw(chapter)
  // El hilo que baja al final del capítulo y entrega al siguiente. Es el mismo
  // gesto que ya enlaza un área con la siguiente en `PortfolioSection`.
  const handoff = useDrawThread()
  /*
    ── EL OBJETO VA EN OTRO PLANO QUE EL TEXTO ──────────────────────────────

    44 px de desplazamiento diferencial a lo largo de toda su travesía. Es
    más que `MOTION.DRIFT` y ahora importa MÁS que cuando el objeto estaba
    solapado con el nombre: con cada uno en su pista, lo único que impide que la
    portada se lea como dos cosas pegadas al mismo cristal es que no viajen a la
    misma velocidad.

    Y va en una envoltura, no en el propio objeto: `EditorialObject` ya tiene
    dueño para su transformación —la escena, por su `data-cue`— y dos fuentes
    escribiendo el mismo `transform` significa que una deja de aplicarse.
  */
  const objectPlane = useDrift(44)

  const folio = String(position + 1).padStart(2, '0')
  const titleSize = `calc(var(--step-chapter) * ${score.scale})`

  return (
    <article
      ref={(node) => {
        chapter.current = node
        scene.current = node
      }}
      className="composition relative border-t border-rule pt-block"
    >
      {/*
        ── DOS COLUMNAS: EL LOMO Y EL CAPÍTULO ─────────────────────────────

        El lomo se lleva un ancho fijo y el capítulo el resto. En vertical no
        hay lomo —cuatro rem y media de una pantalla de 390 son el 18% del
        ancho— así que el folio vuelve a ponerse en horizontal encima del
        nombre y la rejilla se convierte en una sola columna.
      */}
      <div className="grid gap-x-6 lg:grid-cols-[4.5rem_minmax(0,1fr)]">
        <div className="relative hidden lg:block">
          {/*
            ── EL LOMO ───────────────────────────────────────────────────────

            Pegado a un sexto de la altura de la ventana: lo bastante alto para
            no competir con el nombre en la portada, lo bastante bajo para que
            no se lea como parte del marco de la interfaz.

            El folio, el trazo y el nombre van SEGUIDOS: son una sola pieza
            vertical, no tres elementos apilados en un margen.

            El trazo va en el ACENTO del acto, que es el mismo color con el que
            abre el encabezado del área y el mismo que lleva el nodo de
            Proyectos en la constelación. Así el lomo no es un adorno nuevo: es
            el filete que ya existe, puesto de pie.
          */}
          {/* `max` y no `16vh` a secas: a 768 de alto ese 16% son 123 px y el
              rótulo "Volver a la red" del HUD acaba en 116. El folio le quedaba
              a catorce píxeles. El suelo en rem lo despeja sin mover nada en
              pantallas altas, donde manda el porcentaje. 9B.3: el valor vive
              ahora en `--hud-top-lomo` (index.css), junto al resto de la zona
              segura del HUD, en vez de solo dentro de esta clase. */}
          <div
            className="sticky flex flex-col items-center"
            style={{ top: 'var(--hud-top-lomo)' }}
          >
            <Mask
              cue="folio"
              className="font-display text-folio font-semibold tabular-nums text-ink"
            >
              {folio}
            </Mask>

            {/*
              `bg-accent` a pelo, sin modificador de opacidad. `bg-accent/70`
              no pinta NADA: el acento es una variable CSS con un color en
              hexadecimal, y el modificador de Tailwind necesita el color en
              canales sueltos para poder componer el alfa. El resultado es una
              declaración inválida que el navegador tira — el trazo estaba en su
              sitio, con su alto y su escala, y era invisible.
            */}
            <span
              ref={spine}
              aria-hidden="true"
              className="mt-4 block w-px bg-accent"
              style={{ height: '22vh' }}
            />

            <span
              aria-hidden="true"
              className="mt-4 font-meta text-meta uppercase text-ink-faint [writing-mode:vertical-rl] [text-orientation:mixed]"
            >
              {project.title}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          {/*
            ── LA PORTADA DEL CAPÍTULO ──────────────────────────────────────

            Una pantalla. El `min-h` solo existe en escritorio: en vertical,
            reservar el 86% de la pantalla para un titular y una línea de
            metadatos es dejar la pantalla medio vacía.
          */}
          {/* El `pt` lleva suelo en rem: a 768 el 7% del alto deja el titular de
              ActiHome —que va anclado arriba— pisando "Volver a la red". 9B.3:
              el valor vive en `--hud-top-pad` (index.css), junto a los demás
              números de la zona segura del HUD. Solo en escritorio: en vertical
              no hay lomo que despejar y el padding por defecto es cero. */}
          <div
            className="flex flex-col lg:pt-[var(--hud-top-pad)]"
            style={{ '--cover': score.cover }}
          >
            {/* El folio, en horizontal, para cuando no hay lomo. */}
            <p className="flex items-center gap-4 font-meta text-meta uppercase text-ink-faint lg:hidden">
              <Mask cue="folio" className="tabular-nums">
                {folio}
              </Mask>
              <span aria-hidden="true" className="h-px w-10 bg-accent" />
              <span>Proyecto</span>
            </p>

            {/*
              ── EL CAMPO DE LA PORTADA ──────────────────────────────────────

              Doce columnas y UNA fila del alto de lo que queda de portada. El
              nombre y el objeto son dos habitantes de ese campo: cada uno tiene
              su pista de columnas y su anclaje vertical, y ninguno se coloca
              respecto del otro.

              Los dos llevan `gridRow: 1` escrito. Sin eso, dos pistas que se
              solapan en columnas —que es exactamente lo que necesita el engaste
              de Cata y Trufa— hacen que la colocación automática mande la
              segunda a una fila nueva, y el engaste se convierte en dos cosas
              apiladas.

              Y la fila mide `1fr`, no `auto`: si midiera su contenido, `end` y
              `start` darían lo mismo y no habría diagonal que valga.
            */}
            <div className="relative pt-block lg:grid lg:min-h-[calc(var(--cover)-14vh)] lg:flex-1 lg:grid-cols-12 lg:grid-rows-[1fr] lg:gap-x-6 lg:pt-0">
              {/*
                La pieza, en su pista y en su plano. La envoltura lleva el
                desplazamiento diferencial y el hijo lleva la escena: dos dueños,
                dos elementos, que es la ley de la casa para el DOM.

                El margen inferior es un RETOQUE de apoyo, y va en margen y no en
                transformación por lo mismo. El modelo se normaliza dentro de su
                lienzo, así que su base no está en el borde: con el lienzo
                anclado al filete, la pieza quedaría flotando un palmo por encima
                de él. Un par de rem de margen negativo la posan.

                9B.3: llevaba además `lg:mr-28 2xl:mr-0` para no asomar bajo la
                lista del HUD. Ya no hace falta: `.hud-safe-r`, en el envoltorio
                de `PortfolioSection`, estrecha la rejilla entera por ese lado, así
                que el borde de la columna 12 —donde se ancla este `justifySelf:
                end`— ya nace despejado. Un margen puesto en el objeto y otro en
                la rejilla habrían sumado los dos.
              */}
              <div
                aria-hidden="true"
                className="layer-object pointer-events-none hidden lg:block"
                style={{
                  gridColumn: score.object.col,
                  gridRow: 1,
                  alignSelf: score.object.self,
                  justifySelf: score.object.just ?? 'center',
                  width: score.object.size,
                  height: score.object.size,
                  marginBottom: score.object.mb
                    ? `calc(${score.object.size} * ${score.object.mb})`
                    : undefined,
                  marginLeft: score.object.ml
                    ? `calc(${score.object.size} * ${score.object.ml})`
                    : undefined,
                }}
              >
                <div ref={objectPlane} className="h-full w-full">
                  {project.object3d && (
                    <EditorialObject model={project.object3d} cue="object" className="h-full w-full" />
                  )}
                </div>
              </div>

              <h3
                className="layer-text font-display font-semibold text-ink"
                style={{
                  gridColumn: score.title.col,
                  gridRow: 1,
                  alignSelf: score.title.self,
                  fontSize: titleSize,
                }}
              >
                <span className="sr-only">{project.title}</span>
                {lines.map((line) => (
                  <MaskLetters
                    key={line}
                    as="span"
                    silent
                    text={line}
                    cue="letter"
                    className="block leading-[0.95] tracking-[-0.045em]"
                  />
                ))}
              </h3>
            </div>

            {/*
              ── EL PIE DE LA PORTADA ────────────────────────────────────────

              Un filete a todo el ancho y, debajo, el dato frío y el lema en los
              dos extremos. Es una banda, no dos párrafos apilados: usa el ancho
              de la columna en vez de dejarlo vacío, y le pone un borde inferior
              a la portada para que se lea como una página.

              El ORDEN lo decide la partitura.
            */}
            {/* 9B.3: el `lg:pr-32 2xl:pr-0` que despejaba la lista del HUD se
                sube a `.hud-safe-r`, en el envoltorio de `PortfolioSection` —
                así protege esta banda Y el resto del editorial, no solo aquí. */}
            <div className="layer-text mt-block border-t border-rule pt-6">
              <div
                className={`flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-block ${
                  score.foot === 'lead-meta' ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <Meta items={[project.year, project.role, project.category, project.status]} />
                {project.tagline && (
                  <p
                    data-cue="lead"
                    className={`max-w-read-lead text-lead font-light text-ink-soft ${
                      score.foot === 'lead-meta' ? 'lg:text-left' : 'lg:text-right'
                    }`}
                  >
                    {project.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/*
            ── LA EVIDENCIA ──────────────────────────────────────────────────

            El mismo abanico de siempre. Se lee antes que el caso a propósito:
            primero se ve la aplicación, después se lee por qué.
          */}
          <ProjectStage
            hero={hero}
            gallery={gallery}
            flip={score.flip}
            title={project.title}
            media={media}
            onOpen={openViewer}
          />

          {/* ── EL CASO ────────────────────────────────────────────────── */}
          {/* 9B.3: aquí vivía el segundo `lg:pr-32 2xl:pr-0` — a 1366 la
              columna de tecnologías llegaba al borde y el HUD se pintaba
              encima de "Ollama" y "Mammoth". Mismo motivo que la banda del
              pie, mismo arreglo: lo hereda de `.hud-safe-r`. */}
          <div className="layer-text mt-area grid gap-block lg:grid-cols-12">
            <div className={`lg:col-span-8 ${score.flip ? 'lg:order-2' : ''}`}>
              <dl className="space-y-8">
                {[
                  ['Objetivo', project.objective],
                  ['Problema', project.problem],
                  ['Solución', project.solution],
                ]
                  .filter(([, value]) => value)
                  .map(([term, value]) => (
                    <div key={term}>
                      <dt className="font-meta text-meta uppercase text-ink-faint">{term}</dt>
                      <dd className="mt-3 max-w-read text-body text-ink-soft">{value}</dd>
                    </div>
                  ))}
              </dl>

              {project.features?.length > 0 && (
                <div className="mt-block">
                  <h4 className="font-meta text-meta uppercase text-ink-faint">Características</h4>
                  <ul className="mt-4 grid gap-x-block gap-y-3 md:grid-cols-2">
                    {project.features.map((line) => (
                      <li key={line} className="text-body text-ink-soft">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {project.outcome && (
                <div className="mt-block border-t border-rule pt-8">
                  <p className="font-meta text-meta uppercase text-accent">Resultado</p>
                  <p className="mt-4 max-w-read-lead text-lead font-light text-ink">{project.outcome}</p>
                </div>
              )}

              {project.links && Object.values(project.links).some(Boolean) && (
                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                  {Object.entries(project.links)
                    .filter(([, href]) => href)
                    .map(([label, href]) => (
                      <a key={label} href={href} className="link-quiet" target="_blank" rel="noreferrer">
                        {label}
                        <Icon name="external" size="1.05em" className="link-arrow" />
                      </a>
                    ))}
                </div>
              )}
            </div>

            {/* Con qué está hecho, pegado mientras se lee el caso. Cambia de
                lado con el abanico: la columna estrecha acompaña siempre al
                costado por el que el capítulo está abierto. */}
            <div className={`lg:col-span-4 ${score.flip ? 'lg:order-1' : ''}`}>
              <div className="lg:sticky lg:top-28">
                <Stack ids={project.stack} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*
        ── LA ENTREGA ──────────────────────────────────────────────────────

        El capítulo no termina: baja. Este trazo arranca en el borde inferior
        del capítulo (`top-full`), mide exactamente el hueco que hay hasta el
        siguiente (`--gap-area`) y se dibuja mientras el capítulo sale de
        pantalla, así que muere justo en el filete horizontal con el que abre el
        capítulo siguiente. Bajar, girar, entrar — el mismo gesto que ya enlaza
        un área con la siguiente, aquí entre dos proyectos.

        Va en el ACENTO y no en el gris de los separadores porque es la
        continuación del trazo del lomo: la misma línea que ha acompañado el
        capítulo entero es la que lo entrega.

        Y va a `left-9`, no a `left-0`: el lomo mide 4,5 rem y su trazo está
        CENTRADO en él, o sea a 36 px del borde. Con el trazo de la entrega
        pegado al borde, las dos líneas quedaban a 36 px una de otra y se leían
        como dos rayas en vez de como una que continúa.

        ── 9C.1: Y EL ÚLTIMO CAPÍTULO TAMBIÉN LO LLEVA ──────────────────────

        Antes se apagaba aquí, con el argumento de que abajo ya estaba el hilo
        genérico de `PortfolioSection`. Medido, ese hilo es GRIS y vive a
        `left-0`: dos trazos distintos, de color y de sitio distintos, uno
        detrás del otro. Lo que se veía al llegar a "Dónde he estado" no era
        una trayectoria continuando, era una sección terminando y otra
        empezando.

        La altura es la MISMA `--gap-area` que usan los otros dos capítulos —
        no una nueva medida— y por construcción llega exactamente al borde
        inferior de la sección: `--gap-area` es también el `padding-bottom`
        de `.py-area`, así que el trazo (que arranca en el borde del capítulo)
        y el borde de la sección coinciden siempre, en cualquier ventana, sin
        necesidad de medir nada aparte. Como este trazo ya cubre el hueco
        entero, `ProjectsArea` apaga el hilo genérico de `PortfolioSection`
        (`thread={false}`) en vez de dejar los dos superpuestos.
      */}
      <span
        ref={handoff}
        aria-hidden="true"
        className="pointer-events-none absolute left-9 top-full hidden w-px bg-accent lg:block"
        style={{ height: 'var(--gap-area)' }}
      />
    </article>
  )
}
