import { PendingMedia } from './Pending'
import { canView } from './MediaViewer'
import { useMediaReveal, usePlate, useStage, useVelocityPlane, useVideoPlayback } from '../../animations/motion'
import { knowledgeById } from '../../data/network'

/**
 * ── EL ESCENARIO DE LÁMINAS, Y LAS PIEZAS QUE LO RODEAN ─────────────────────
 *
 * Todo esto vivía dentro de `ProjectsArea.jsx`, que hacía tres trabajos a la
 * vez: la sección, la ficha de un proyecto y la maquinaria del medio. Se separa
 * al aparecer el CAPÍTULO (`ProjectChapter`), que necesita exactamente estas
 * piezas y ninguna de las otras.
 *
 * **No cambia ni un número.** El abanico, el reparto por cantidad de láminas, el
 * cálculo del alto y el botón de ampliar son los mismos que ya estaban
 * validados; lo único nuevo es que ahora se pueden importar desde dos sitios.
 */

/**
 * Las tecnologías de un proyecto, nombradas desde la red cuando existen ahí.
 *
 * ── Y ESTA ES LA TRANSICIÓN HACIA HABILIDADES ─────────────────────────────
 *
 * Iba en el cuerpo de los metadatos, en mayúsculas y muy tenue: era un pie de
 * ficha. Ahora usa exactamente el mismo tratamiento que el campo de
 * tecnologías de Habilidades — misma familia tipográfica, mismo cuerpo, mismo
 * punto medio como separador.
 *
 * **Eso ES la transición entre las dos áreas, y por eso no hace falta ninguna
 * animación de paso.** Al terminar el último proyecto se lee
 * `Phaser 3 · JavaScript · ES modules · Vite`; unas pantallas más abajo se lee
 * lo mismo con las veintiséis. El lector no necesita que nadie le explique que
 * una cosa lleva a la otra: reconoce la forma.
 */
export function Stack({ ids = [] }) {
  if (ids.length === 0) return null

  return (
    <ul className="flex flex-wrap items-baseline">
      {ids.map((id, i) => (
        <li
          key={id}
          className="font-display text-body font-light leading-[1.7] text-ink-soft"
        >
          {/*
            Si el id existe en la red se usa su etiqueta, y si no, el propio id.
            Un proyecto puede mencionar algo que todavía no esté en el cerebro:
            el portfolio no puede quedarse en blanco esperando a la red.
          */}
          {knowledgeById.get(id)?.label ?? id}
          {i < ids.length - 1 && (
            <span aria-hidden="true" className="mx-4 text-ink-faint/35">
              ·
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * La línea de metadatos: año · papel · categoría · estado.
 *
 * Era un `join(' · ')` dentro de un `<p>`, y con cuatro datos en una columna
 * estrecha rompía por donde le tocaba al carácter, no por donde tiene sentido.
 * Ahora cada dato es un elemento de una lista en flex: un salto de línea solo
 * puede ocurrir ENTRE datos, nunca dentro de uno. El separador va como `::after`
 * del propio elemento —no suelto entre dos— para que al envolver se quede al
 * final de la línea anterior en vez de abrir la siguiente con un punto huérfano.
 */
export function Meta({ items }) {
  const values = items.filter(Boolean)
  if (values.length === 0) return null

  return (
    <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-meta text-meta uppercase text-ink-faint">
      {values.map((value, i) => (
        <li key={value} data-cue="meta" className="whitespace-nowrap">
          {value}
          {i < values.length - 1 && (
            <span aria-hidden="true" className="ml-3 text-ink-faint/45">
              ·
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * ── LA LÁMINA SE PUEDE ABRIR ────────────────────────────────────────────────
 *
 * Un botón transparente a tamaño de la lámina, dentro del marco. No es un icono
 * de lupa flotando en una esquina: la evidencia entera es el control, que es lo
 * que un lector espera de una captura en un caso.
 *
 * Va como `<button>` de verdad y no como un `onClick` sobre la figura, por lo
 * de siempre: así hay foco, hay Enter y Espacio nativos, y un lector de pantalla
 * anuncia qué se amplía. El texto sale del `alt` que ya trae `portfolio.js`.
 */
function ExpandButton({ item, onOpen }) {
  if (!onOpen || !canView(item)) return null
  return (
    <button
      type="button"
      onClick={(event) => {
        /*
          El botón se enfoca ANTES de abrir, y no es una floritura: el visor
          devuelve el foco a donde estaba al abrirse, y un clic de ratón no
          siempre deja el foco en el elemento pulsado. Sin esta línea, cerrar
          con Escape tras un clic devolvía el foco al BODY —comprobado— y
          el teclado volvía al principio del documento.

          Y le pasa al visor el elemento pulsado: de su rectángulo sale el
          vuelo de apertura. Ver `MediaViewer`.
        */
        event.currentTarget.focus()
        onOpen(event.currentTarget)
      }}
      data-cursor="view"
      data-cursor-label="Ver"
      className="media-open absolute inset-0 z-10"
    >
      <span className="sr-only">Ampliar{item.alt ? `: ${item.alt}` : ''}</span>
    </button>
  )
}

function MediaItem({ item, ratio, kind, note, onOpen }) {
  /*
    ── LA CAPTURA SE ASIENTA EN SU MARCO ──────────────────────────────────

    Sube un poco y su imagen llega desde una escala un 4,5% mayor hasta uno
    exacto. No es un zoom: es una lámina que aterriza. Y termina en uno
    porque el encuadre en reposo tiene que ser el que se recortó en la fase
    5E — una escala final mayor recortaría la interfaz para siempre, y en una
    captura de aplicación eso es perder la evidencia.

    Sin `clip-path`: §9 tiene medido que animar una máscara rasteriza la capa
    entera, y `clip-path` es de esa familia. Una escala dentro de un marco con
    `overflow: hidden` da la misma lectura y la resuelve el compositor.
  */
  const frame = useMediaReveal()
  // Y el cursor la inclina. El mismo elemento, dos comportamientos que no se
  // pisan porque cada uno escribe en una capa distinta. Ver `usePlate`.
  usePlate(frame)
  // Y si el elemento es un vídeo, se reproduce solo mientras se ve.
  const film = useVideoPlayback()

  /*
    ── LA PROPORCIÓN LA PUEDE TRAER EL ELEMENTO ───────────────────────────

    El marco valía 16/10 para todos porque las únicas capturas que había eran
    de una aplicación de escritorio. El juego no lo es: sus capturas son
    1920 × 960 una vez fuera el marco del navegador, o sea 2/1, y metidas en
    16/10 el `object-cover` se comía el 18% del ANCHO — que es justo donde
    viven el marcador de misión, a la derecha, y el estado de las dos
    protagonistas, a la izquierda.

    Es la misma regla que ya obligó a pasar de 4/3 a 16/10 unas líneas más
    abajo, aplicada hasta el final: la proporción sale del asset. `ratio`
    sigue siendo el valor por defecto del sitio donde se pinta.
  */
  const box = item?.ratio ?? ratio

  if (item?.kind === 'image' && item.src) {
    return (
      <figure
        ref={frame}
        className="media-frame relative w-full overflow-hidden border border-rule"
        style={{ aspectRatio: box }}
      >
        <div data-media-plate className="media-plate relative w-full">
          <div data-media-inner className="h-full w-full">
            {/*
              ── EL ACERCAMIENTO VA HACIA LO QUE IMPORTA ────────────────────

              El hover acerca la imagen un 1,2%, y hasta ahora lo hacía desde
              su centro geométrico — que en una captura de aplicación casi
              nunca es donde está lo que hay que ver.

              Con `focus` declarado, el origen de la transformación es ESE
              punto: en Zalent el bloque "Por qué encaja", en el juego las dos
              perras, en ActiHome las tarjetas del catálogo. La imagen deja de
              hacer zoom y pasa a enseñarte algo.

              Es opcional a propósito. Una captura sin un punto importante
              —una pantalla de acceso centrada— no lleva `focus` y se comporta
              como siempre. Inventarle un centro de interés a una imagen que no
              lo tiene es peor que no tenerlo.
            */}
            <img
              src={item.src}
              alt={item.alt || ''}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={
                item.focus
                  ? { transformOrigin: `${item.focus[0]}% ${item.focus[1]}%` }
                  : undefined
              }
            />
          </div>
        </div>
        <ExpandButton item={item} onOpen={onOpen} />
      </figure>
    )
  }

  if (item?.kind === 'video' && item.src) {
    return (
      <figure
        ref={frame}
        className="media-frame relative w-full overflow-hidden border border-rule"
        style={{ aspectRatio: box }}
      >
        <div data-media-plate className="media-plate relative w-full">
          <div data-media-inner className="h-full w-full">
            {/*
              ── EL VÍDEO ES UNA CAPTURA QUE SE MUEVE ──────────────────────

              Ni controles, ni sonido, ni botón de play: el mismo marco, la
              misma sombra y la misma inclinación que una captura fija, y
              dentro pasan cosas. Un reproductor incrustado rompería el
              editorial igual que lo rompería un `<iframe>` con un PDF.

              `poster` es obligatorio en la práctica: es lo que se ve mientras
              el vídeo carga, así que sin él hay un rectángulo negro justo
              donde debería estar la evidencia. Y `preload="metadata"` —no
              `auto`— para que la página no descargue tres vídeos que quizá
              nadie llegue a ver; el observador de `useVideoPlayback` los
              arranca al entrar en pantalla y los PARA al salir.

              `playsInline` es lo que impide que iOS lo abra a pantalla
              completa en cuanto empieza. Sin ese atributo, en un iPhone el
              vídeo secuestra la página.
            */}
            <video
              ref={film}
              src={item.src}
              poster={item.poster || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              // El vídeo es evidencia, no contenido textual: quien no lo vea
              // tiene el caso escrito al lado. `alt` no existe en `<video>`,
              // así que la descripción viaja aquí.
              aria-label={item.alt || undefined}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <ExpandButton item={item} onOpen={onOpen} />
      </figure>
    )
  }

  // `kind: 'scene'`, o un elemento sin `src`: el objeto 3D de proyecto no
  // existe todavía, así que se declara en vez de fingirse.
  return <PendingMedia ratio={box} kind={item?.kind === 'scene' ? 'objeto 3D' : kind} note={note} />
}

/**
 * ── EL REPARTO, POR NÚMERO DE LÁMINAS ───────────────────────────────────────
 *
 * Una composición por cantidad, no una fórmula. Añadir una captura a un
 * proyecto es añadir una entrada a `media` y ya: el escenario elige el reparto,
 * el abanico las recoge midiendo, y no hay que escribir ni una animación nueva.
 *
 * **Todos los números son fracciones del ANCHO del escenario**, incluida la
 * vertical. Eso es lo que cambia en la fase 7A y es la corrección de fondo del
 * solapamiento; está contado entero en `stageHeight`.
 *
 * `side` dice de qué borde cuelga —`out` es el lado libre, el contrario al que
 * ocupa la principal— para que el reparto se pueda espejar entero cuando el
 * proyecto va invertido.
 */
/*
  ── RECALIBRADO EN 10B/10C ────────────────────────────────────────────────
  Las fracciones anteriores se escribieron con el escenario en ~1150 px. Al
  abrir la caja editorial a 106rem el escenario pasó a 1504 px y las mismas
  proporciones dejaron de funcionar por dos motivos MEDIDOS:

    · las láminas del lado libre nunca llegaron a solapar la principal —había
      80 px de hueco a 1150 y 105 a 1504—, así que a este tamaño dejan de
      leerse como una pila y se leen como tres imágenes sueltas;
    · el escenario medía 1126 px de alto contra una ventana de 1080: la
      composición no cabía entera en pantalla NUNCA.

  Ahora todas las láminas SOLAPAN a la principal y el conjunto cabe en una
  ventana de escritorio. Es la misma regla que ya ordena esta composición
  —"tres pruebas impresas apoyadas unas sobre otras"—: sin solape no hay pila.
*/
const STAGE_LAYOUTS = {
  0: { hero: 0.78, asides: [] },
  1: {
    hero: 0.7,
    asides: [{ w: 0.44, side: 'out', x: '0%', y: 0.22, rot: 1.5 }],
  },
  2: {
    hero: 0.68,
    asides: [
      { w: 0.44, side: 'out', x: '0%', y: 0.18, rot: 1.4 },
      { w: 0.38, side: 'in', x: '6%', y: 0.36, rot: -1.1 },
    ],
  },
  3: {
    hero: 0.66,
    asides: [
      { w: 0.42, side: 'out', x: '0%', y: 0.13, rot: 1.6 },
      { w: 0.38, side: 'out', x: '8%', y: 0.33, rot: -1.2 },
      { w: 0.34, side: 'in', x: '6%', y: 0.36, rot: 1.0 },
    ],
  },
  4: {
    hero: 0.62,
    asides: [
      { w: 0.4, side: 'out', x: '0%', y: 0.1, rot: 1.5 },
      { w: 0.36, side: 'out', x: '9%', y: 0.27, rot: -1.3 },
      { w: 0.33, side: 'in', x: '5%', y: 0.34, rot: 1.1 },
      { w: 0.3, side: 'in', x: '28%', y: 0.46, rot: -0.9 },
    ],
  },
  5: {
    hero: 0.6,
    asides: [
      { w: 0.38, side: 'out', x: '0%', y: 0.09, rot: 1.5 },
      { w: 0.35, side: 'out', x: '9%', y: 0.25, rot: -1.2 },
      { w: 0.32, side: 'in', x: '3%', y: 0.33, rot: 1.2 },
      { w: 0.3, side: 'in', x: '26%', y: 0.44, rot: -1.0 },
      { w: 0.28, side: 'out', x: '16%', y: 0.55, rot: 0.8 },
    ],
  },
}

const layoutFor = (n) => STAGE_LAYOUTS[Math.min(n, 5)] ?? STAGE_LAYOUTS[2]

/** El hueco por defecto de una lámina, y su proporción como número. */
export const RATIO = '16 / 10'
const ratioOf = (item, fallback = RATIO) => {
  const [w, h] = String(item?.ratio ?? fallback).split('/').map((n) => Number(n.trim()))
  return w > 0 && h > 0 ? w / h : 1.6
}

/**
 * ── POR QUÉ EL ALTO DEL ESCENARIO SE CALCULA Y NO SE ESCRIBE ────────────────
 *
 * Es la causa medida del fallo que abre la fase 7A, y es de aritmética.
 *
 * Las láminas secundarias van en posición absoluta con `top` en PORCENTAJE, y
 * un porcentaje de `top` se resuelve contra el alto de su contenedor. El alto
 * del contenedor era el de la lámina principal más un relleno inferior escrito
 * a mano (`pad: '20%'`) — o sea que el sitio que ocupaban las láminas dependía
 * de un número que a su vez tenía que adivinar cuánto sitio iban a ocupar.
 *
 * Con tres secundarias, la última salía en `top: 92%` de un contenedor que
 * medía 0,575 anchos: empezaba en 0,529 y ocupaba 0,169 más, o sea terminaba en
 * 0,698 — **doce centésimas de ancho por debajo del contenedor**, unos 153 px a
 * 1248. Ahí abajo ya no hay escenario: hay texto. Y como una lámina en posición
 * absoluta se pinta en la capa de los posicionados, y la columna de tecnologías
 * es `sticky` —o sea también posicionada, y posterior en el DOM—, el resultado
 * medido fueron hasta **4.048 px² de nombres de tecnología escritos encima de
 * una captura**.
 *
 * No se arregla con `z-index`: con la lámina delante, lo que queda tapado es el
 * texto, que es peor. Se arregla haciendo que el escenario mida lo que ocupa.
 *
 * `AIR` es lo único que se elige: el aire bajo la lámina más baja. Existe
 * porque la sombra de una lámina mide 26 px de desplazamiento y 52 de difusión,
 * así que sin él la sombra llegaría al primer renglón del caso.
 */
const AIR = 0.05

function stageHeight(layout, hero, gallery) {
  const heroH = layout.hero / ratioOf(hero)
  let bottom = heroH
  layout.asides.forEach((spec, i) => {
    bottom = Math.max(bottom, spec.y + spec.w / ratioOf(gallery[i]))
  })
  return { height: bottom + AIR, heroH }
}

/**
 * Una lámina secundaria: su sitio en el reparto, y su plano de profundidad.
 *
 * Es un componente y no un trozo del bucle porque necesita un hook propio —el
 * plano de velocidad— y un hook no puede vivir dentro de un `map`.
 */
function StagePlate({ spec, item, edge, top, onOpen }) {
  /*
    ── DOS DUEÑOS, DOS ELEMENTOS ────────────────────────────────────────────

    El div de fuera lo escribe GSAP: es el abanico, que lo lleva desde el
    montón hasta su sitio con el scroll. El de dentro lo escribe la velocidad.
    Nunca los dos el mismo nodo — la ley de la casa, que en el DOM se cumple
    metiendo una envoltura y en 3D con canales (`animations/pose.js`).

    El plano viene del REPARTO y no del elemento de `media`, y esa es la
    respuesta a "¿debería cada captura declarar su comportamiento?": el plano
    es dirección de arte —depende de dónde cae la lámina en la composición— y
    `portfolio.js` es contenido. Una captura no sabe si va delante o detrás;
    lo sabe el sitio que ocupa. Por defecto, 2: es lo que está DELANTE, y se
    retrasa casi el doble que la principal cuando bajas deprisa.
  */
  const lag = useVelocityPlane(spec.plane ?? 2)

  return (
    <div
      data-plate="aside"
      data-rot={spec.rot}
      className="absolute"
      style={{ width: `${spec.w * 100}%`, [edge]: spec.x, top }}
    >
      <div ref={lag}>
        <MediaItem item={item} ratio={RATIO} kind="detalle" onOpen={onOpen} />
      </div>
    </div>
  )
}

/**
 * ── EL ESCENARIO DE LÁMINAS ─────────────────────────────────────────────────
 *
 * Las capturas estaban en una columna: la principal arriba y dos miniaturas
 * debajo, en una rejilla. Eso son imágenes metidas en cajas, por muy bien
 * alineadas que estén.
 *
 * Aquí son **tres láminas apoyadas unas sobre otras**, como se dejan tres
 * pruebas impresas encima de una mesa: la grande al fondo, las otras dos
 * solapándola por una esquina, cada una girada un grado y pico. Y al pasar,
 * cada una se desplaza a su propia velocidad —las de delante más— así que se
 * SEPARAN mientras bajas. Eso es lo que se lee como profundidad; una rejilla
 * ordenada no puede leerse así por bien hecha que esté.
 */
export function ProjectStage({ hero, gallery, flip, title, media, onOpen }) {
  const stage = useStage()
  const layout = layoutFor(gallery.length)
  const { height, heroH } = stageHeight(layout, hero, gallery)
  // La principal está en el plano medio: se mueve, pero la mitad que las que
  // se le echan encima.
  const heroLag = useVelocityPlane(1)

  return (
    /* El papel `media` va en la RAÍZ del escenario y no en las láminas: las
       láminas ya tienen dueño —el abanico— y dos fuentes escribiendo el mismo
       `transform` significa que una deja de aplicarse. */
    <div ref={stage} data-cue="media" data-flip={flip ? '1' : '0'} className="layer-media mt-block">
      {/* ── ESCRITORIO: las tres apoyadas ── */}
      {/*
        `box-shadow` y no `filter: drop-shadow`. Las dos dibujan lo mismo aquí
        —la lámina es un rectángulo opaco, no una silueta con alfa— pero un
        `filter` obliga a rasterizar la capa entera, y §9 lo tiene medido como
        una de las dos propiedades caras. Estas capas se DESPLAZAN al pasar, así
        que la diferencia no es teórica.
      */}
      <div
        className="relative hidden lg:block"
        style={{ paddingBottom: `${(height - heroH) * 100}%` }}
      >
        <div
          data-plate="hero"
          className={flip ? 'ml-auto' : ''}
          style={{ width: `${layout.hero * 100}%` }}
        >
          <div ref={heroLag}>
            <MediaItem
              item={hero}
              ratio={RATIO}
              kind="captura o escena"
              note={title}
              onOpen={(el) => onOpen(media, 0, el)}
            />
          </div>
        </div>

        {/*
          Las secundarias se colocan por el reparto y el abanico las recoge
          midiendo dónde han quedado. El giro viaja en `data-rot` en vez de en
          el estilo porque a partir de aquí el `transform` tiene un solo dueño:
          GSAP. Dos fuentes escribiendo la misma propiedad y una deja de
          aplicarse sin avisar.

          El `top` se convierte aquí: el reparto habla en fracciones del ancho y
          el CSS quiere un porcentaje del alto. Es una división, y es lo que
          impide que una lámina termine por debajo del escenario.
        */}
        {gallery.slice(0, layout.asides.length).map((item, i) => {
          const spec = layout.asides[i]
          // `out` es el lado libre: el contrario al que ocupa la principal.
          const edge = (spec.side === 'out') !== flip ? 'right' : 'left'
          return (
            <StagePlate
              key={item.src ?? i}
              spec={spec}
              item={item}
              edge={edge}
              top={`${(spec.y / height) * 100}%`}
              onOpen={(el) => onOpen(media, i + 1, el)}
            />
          )
        })}
      </div>

      {/* ── TABLETA Y MÓVIL: la columna de siempre, que es lo que se lee ── */}
      <div className="lg:hidden">
        <MediaItem
          item={hero}
          ratio={RATIO}
          kind="captura o escena"
          note={title}
          onOpen={(el) => onOpen(media, 0, el)}
        />
        {gallery.length > 0 && (
          <div
            className="mt-3 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(gallery.length, 3)}, minmax(0, 1fr))` }}
          >
            {gallery.map((item, i) => (
              <MediaItem
                key={item.src ?? item.id ?? i}
                item={item}
                ratio={RATIO}
                kind="detalle"
                onOpen={(el) => onOpen(media, i + 1, el)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
