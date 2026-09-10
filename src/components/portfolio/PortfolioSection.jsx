import { useRef } from 'react'
import { Mask } from './Type'
import { useDrawThread } from '../../animations/motion'
import { useScene } from '../../animations/editorial'
import { areaStamp, DARK_GROUND_AREAS } from '../../data/sections'

/**
 * El marco de un área del portfolio.
 *
 * Es el único componente que se repite en las cinco, y hace tres cosas: fija el
 * ritmo vertical, declara el acto cromático y pone el encabezado. **Nada más.**
 * El interior de cada área lo compone cada área, porque si las cinco
 * compartieran layout volveríamos a tener cinco bloques idénticos, que es
 * exactamente lo que había antes.
 *
 * ## El encabezado dice de dónde vienes
 *
 * `NODO 03 · PROYECTOS` no es decoración: es la misma etiqueta que lleva el
 * nodo en la escena. Al bajar desde la constelación, lo primero que se lee es
 * el nombre del sitio del que acabas de salir. Es lo que evita que el texto
 * aparezca sin contexto —que el usuario sepa dónde está sin tener que
 * deducirlo—.
 *
 * ## Y desde la fase 7B el encabezado se MONTA, no aparece
 *
 * Antes entraba escalonado: los tres elementos subían veinte píxeles y
 * aparecían, todos con la misma curva y en el mismo momento. Ahora es una
 * secuencia con papeles —número, filete, titular, rótulo, resumen— y cada uno
 * se mueve como se mueve lo que representa, solapándose. Ver
 * `animations/editorial.js`.
 */

/** El encabezado se retira con el reparto por defecto del lenguaje. */
const HEAD_EXITS = {}

/**
 * El filete numerado que abre cada área.
 *
 * Se exporta porque el cierre de contacto lo usa sin ser un área con nodo.
 */
export function SectionHeading({ index, label, lead, area }) {
  /*
    ── EL SELLO: DE DÓNDE VIENE LO QUE SE ESTÁ LEYENDO ──────────────────────

    El ángulo y el radio con los que esta área está colocada alrededor del
    cerebro. No es un adorno con pinta de dato: es EL MISMO número que pone su
    nodo en la escena, leído desde el otro lado — si algún día se mueve el
    nodo, el sello se mueve solo. Ver `areaStamp`.

    Y es lo que convierte el índice en un sistema en vez de una numeración.
    Hasta aquí "01" era una cifra decorativa al lado de un rótulo; ahora el
    encabezado dice de qué punto de la mente sale este texto, y lo dice con el
    mismo dato con el que la constelación lo dibuja. Repetido en las seis
    áreas, deja de ser un detalle y pasa a ser una firma.
  */
  const stamp = area ? areaStamp[area] : null
  return (
    <header className="max-w-editorial">
      {/*
        ── EL NÚMERO SALE DE SU PROPIA LÍNEA ───────────────────────────────

        Sube desde debajo del renglón, dentro de una máscara. No es un fundido:
        el número de un área es un folio, y un folio no se desvanece — pasa.

        ── Y EL FILETE LLEVA EL ACENTO DEL ACTO ────────────────────────────

        Iba en `bg-rule`, o sea el gris de los separadores. Medido con
        `scripts/palette.mjs` sobre el editorial, la página daba **90% neutro,
        0% rosa y 0% añil**: los cinco acentos estaban declarados por acto en
        `index.css` y el único sitio donde llegaban a verse era la palabra
        "pendiente".

        Es el mismo filete que ya lleva el nodo de esa área en la escena, así
        que ponerle su color no añade un elemento: hace que el encabezado de la
        sección y el punto de luz del que se viene sean reconociblemente la
        misma cosa.

        El número se queda en el gris de los metadatos: si los dos llevaran
        acento, el encabezado pasaría de tener una nota de color a ser un
        elemento de color, y eso es otra cosa.
      */}
      <p className="flex items-center gap-4 font-meta text-meta uppercase text-ink-faint">
        {index && (
          <Mask cue="index" className="tabular-nums">
            {index}
          </Mask>
        )}
        <span data-cue="rule" aria-hidden="true" className="h-px w-12 bg-accent sm:w-20" />
        <Mask cue="meta">{label}</Mask>

        {stamp?.angle != null && (
          <Mask
            cue="meta"
            className="ml-auto hidden tabular-nums text-ink-faint/70 sm:block"
          >
            {stamp.angle}° · r{stamp.radius.replace('.', ',')}
          </Mask>
        )}
      </p>

      {lead && (
        <p data-cue="lead" className="mt-block max-w-read-lead text-lead font-light text-ink-soft">
          {lead}
        </p>
      )}
    </header>
  )
}

export default function PortfolioSection({
  id,
  act,
  index,
  label,
  title,
  /** El titular partido en las líneas que quiere el diseño. Ver `Mask`. */
  titleLines,
  lead,
  cues,
  children,
  /**
   * 9C.1: apaga el hilo genérico de abajo. Existe para el área que ya baja el
   * suyo propio con más precisión que este —hoy, solo Proyectos, cuyo último
   * capítulo entrega en el acento a la altura del lomo—. Dos hilos en el
   * mismo hueco no se leen como uno reforzado: se leen como dos.
   */
  thread = true,
}) {
  /*
    ── LA LLEGADA A UN ÁREA ───────────────────────────────────────────────

    Lo que se monta es el ENCABEZADO: número, filete, titular, rótulo y
    resumen, en ese orden y solapándose. El cuerpo del área NO entra aquí —
    cada bloque declara su propia escena, porque una sección mide varias
    pantallas y una secuencia que las abarcara todas terminaría de reproducirse
    antes de que el lector llegue a la mitad.

    Y se RETIRA con la sección, no consigo mismo: la ventana de salida cuelga
    de `section`, así que el titular empieza a irse cuando se acaba el área y
    no a las tres líneas de haber entrado.
  */
  const section = useRef(null)
  const head = useScene({ cues, exits: HEAD_EXITS, exitTrigger: section })

  /*
    ── EL HILO QUE ENLAZA UNA SECCIÓN CON LA SIGUIENTE ────────────────────

    Cada área tenía su propia llegada, pero entre una y otra no había NADA:
    terminaba el contenido, venía el relleno vertical, y empezaba la siguiente.
    Seis llegadas seguidas no son un recorrido, son seis cajas.

    Esto es un trazo de un píxel que baja por el margen izquierdo del último
    tramo de cada sección y se dibuja mientras sales de ella. Justo debajo
    empieza el filete de acento de la siguiente, trazándose de izquierda a
    derecha. El gesto se pasa el testigo: bajar → girar → entrar.

    Va alineado con el margen del contenido —no centrado— porque ahí es donde
    nace el filete de acento de la sección siguiente. Si naciera en otro sitio
    serían dos gestos, no uno continuado.
  */
  const threadRef = useDrawThread()
  /**
   * ── Y TENÍA QUE MEDIR EL HUECO REAL, NO UNA CONSTANTE (fase 12D) ────────
   *
   * Medía `7rem` fijos, y el hueco entre dos áreas no es fijo: es
   * `--gap-area` de relleno inferior de ESTA sección más `--gap-area` de
   * relleno superior de la SIGUIENTE —la misma variable que ya genera
   * `py-area` en las dos—. `--gap-area` es un `clamp(7rem, 14vh, 12rem)`, así
   * que el hilo llegaba a media distancia en el mejor caso y a menos de un
   * tercio en el peor.
   *
   * Medido contra el build, recorriendo las cuatro costuras que usan este
   * hilo: en las cuatro el trazo se apagaba en el aire, entre 100 y 200 px
   * antes de llegar al filete de la sección siguiente. Era la causa de que
   * dos de las "tres uniones" que este manual documenta como deliberadas
   * —Experiencia → Habilidades y Habilidades → CV— no se vieran: el gesto
   * estaba descrito y el trazo real no llegaba a su destino.
   *
   * No se mide con JS: `--gap-area` ya lo sabe, y depende de la ALTURA de la
   * ventana —así que un `getBoundingClientRect` se desincronizaría en cada
   * resize—. Se deriva en CSS, con el mismo token, dos veces.
   *
   * Y el margen es POSITIVO, no negativo. Medido contra el build en las
   * cinco costuras, el hueco real —de donde acaba el contenido a donde
   * empieza el filete de la siguiente— es `2 · --gap-area` más 6,5 px
   * constantes en las cinco, sea cual sea el contenido: el medio interlineado
   * de la fila del encabezado, que está antes del filete. Restar un margen de
   * seguridad —la primera versión quitaba 0,5rem— alejaba el trazo del
   * filete en vez de acercarlo. Sumar 0,4rem lo deja llegando exactamente a
   * la fila, con el mismo margen en las cinco.
   */
  const REACH = 'calc(2 * var(--gap-area) + 0.4rem)'

  /*
    10D: el suelo NO se recibe por propiedad, se DERIVA del id. Con una
    propiedad, "qué áreas son oscuras" quedaría escrito en el área y otra vez
    en el HUD, y dos copias del mismo dato dejan de coincidir. La lista vive
    en `sections.js` y la leen los dos.
  */
  const dark = DARK_GROUND_AREAS.has(id)

  return (
    <section
      id={id}
      ref={section}
      /**
       * El acto va como atributo y no como clase de color.
       *
       * La atmósfera la escribe `Backdrops` en variables CSS interpoladas con
       * el scroll, así que aquí no se elige ningún color: se declara a qué acto
       * pertenece esta área y se deja que el clima llegue solo. Es lo que hace
       * que el paso de un área a otra sea un degradado y no un corte.
       */
      data-act={act}
      data-ground={dark ? 'dark' : undefined}
      // Cada área es una región con nombre: un lector de pantalla puede saltar
      // de una a otra y anunciar cuál es, en vez de leer cinco bloques
      // indistinguibles de texto.
      aria-labelledby={`${id}-title`}
      className="composition scroll-mt-24 px-gutter py-area"
    >
      {/*
        La superficie va ANTES que el contenido en el DOM y en el plano ART,
        así que todo lo demás se lee encima de ella sin que nadie tenga que
        subir un z-index. Ver `.section-ground`.
      */}
      {dark && <div aria-hidden="true" className="section-ground" />}

      <div className="hud-safe-r relative mx-auto max-w-editorial">
        <div ref={head}>
          <SectionHeading index={index} label={label} area={id} />

          {/*
            El título del área a tamaño de cartel, saliendo de su propia línea.
            Es el ancla visual de la sección: sin algo grande, una página de
            texto se lee como documentación y no como un portfolio.

            Con `titleLines` se parte en las líneas que quiere el diseño y cada
            una entra un poco después que la anterior; sin él, una sola línea.
          */}
          <h2
            id={`${id}-title`}
            className="mt-block max-w-editorial font-display text-display font-semibold leading-[0.95] text-ink"
          >
            {(titleLines ?? [title]).map((line) => (
              <Mask key={line} cue="title">
                {line}
              </Mask>
            ))}
          </h2>

          {/*
            El resumen admite UNA frase o VARIAS.

            Con una cadena se pinta un párrafo, como siempre. Con un array se
            pinta uno por entrada, con el mismo tamaño y el mismo color: no es un
            tratamiento nuevo, es el mismo con las pausas que el texto ya tenía.
            Sobre mí llegaba a once líneas seguidas antes del primer respiro.
          */}
          {Array.isArray(lead)
            ? lead.length > 0 && (
                <div className="mt-8 space-y-5">
                  {lead.map((line) => (
                    <p
                      key={line.slice(0, 28)}
                      data-cue="lead"
                      className="max-w-read-lead text-lead font-light text-ink-soft"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )
            : lead && (
                <p data-cue="lead" className="mt-8 max-w-read-lead text-lead font-light text-ink-soft">
                  {lead}
                </p>
              )}
        </div>

        {children}

        {/*
          El hilo hacia la siguiente sección. `aria-hidden` y `pointer-events`
          desactivados: es tejido visual, no contenido ni navegación.

          Altura y posición salen del MISMO cálculo (`REACH`) a propósito: son
          la misma distancia mirada desde dos extremos. Si solo se corrigiera
          una, el trazo o bien no llegaría, o bien empezaría a dibujarse desde
          dentro del propio contenido.
        */}
        {thread && (
          <span
            ref={threadRef}
            aria-hidden="true"
            // El marcador es para las herramientas de medida, no para CSS: un
            // área puede tener otros trazos con las mismas clases —Habilidades
            // lleva uno junto a su índice— y sin él no hay forma de distinguir
            // ESTE de los demás desde fuera del componente.
            data-thread="link"
            className="pointer-events-none absolute left-0 hidden w-px bg-rule lg:block"
            style={{ bottom: `calc(-1 * ${REACH})`, height: REACH }}
          />
        )}
      </div>
    </section>
  )
}
