import PortfolioSection from './PortfolioSection'
import { PendingList, PendingMedia } from './Pending'
import { projects } from '../../data/portfolio'
import { knowledgeById } from '../../data/network'

/**
 * PROYECTOS — el área que decide si te llaman.
 *
 * ## Por qué no es una cuadrícula de tarjetas
 *
 * Una cuadrícula dice "aquí hay seis cosas" y deja que elijas. Un portfolio de
 * alguien que empieza no tiene seis cosas: tiene dos o tres que valen, y lo que
 * importa de cada una no es que exista, es CÓMO se pensó. Una tarjeta de 300
 * píxeles con un título y tres etiquetas no puede contar eso.
 *
 * Así que cada proyecto ocupa la pantalla entera y se lee en tiempos —el qué,
 * el objetivo, el problema, la solución, el resultado—. Es la estructura de un
 * caso, no de una ficha. Y es la que un reclutador técnico busca: no quiere
 * saber que usaste React, quiere saber qué decidiste.
 *
 * ## El sitio del medio
 *
 * Cada proyecto reserva un hueco grande y apaisado, alternando el lado en los
 * impares para que bajar por la sección no sea bajar por una lista. Ese hueco
 * admite captura, vídeo o un objeto 3D propio, y hasta que exista se dibuja
 * vacío con su proporción: la composición ya se puede juzgar sin las imágenes.
 *
 * ## FASE 5B: el medio ahora se DIBUJA de verdad
 *
 * Hasta esta ronda, `media` solo decidía si se enseñaba el hueco pendiente:
 * si el campo tenía algo, no pasaba nada —no existía ningún componente que
 * pintara la imagen—. Rellenar un proyecto con una foto real no habría
 * enseñado la foto. Ahora `media` es un array y cada elemento se dibuja según
 * su `kind`: el primero ocupa el hueco principal, el resto —si los hay— entra
 * debajo en una fila de miniaturas. Un `kind: 'scene'` sigue mostrando el
 * hueco pendiente, porque el objeto 3D de proyecto no está implementado.
 */

/** Las tecnologías de un proyecto, nombradas desde la red cuando existen ahí. */
function Stack({ ids = [] }) {
  if (ids.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {ids.map((id) => (
        <li key={id} className="font-meta text-meta uppercase text-ink-faint">
          {/*
            Si el id existe en la red se usa su etiqueta, y si no, el propio id.
            Un proyecto puede mencionar algo que todavía no esté en el cerebro:
            el portfolio no puede quedarse en blanco esperando a la red.
          */}
          {knowledgeById.get(id)?.label ?? id}
        </li>
      ))}
    </ul>
  )
}

/**
 * Un elemento de `media`, en su forma real —imagen o vídeo— o como hueco
 * pendiente cuando es una escena 3D todavía sin implementar.
 */
function MediaItem({ item, ratio, kind, note }) {
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
      <figure className="relative w-full overflow-hidden border border-rule" style={{ aspectRatio: box }}>
        <img src={item.src} alt={item.alt || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </figure>
    )
  }

  if (item?.kind === 'video' && item.src) {
    return (
      <figure className="relative w-full overflow-hidden border border-rule" style={{ aspectRatio: box }}>
        <video
          src={item.src}
          poster={item.poster || undefined}
          controls
          preload="none"
          className="h-full w-full object-cover"
        />
      </figure>
    )
  }

  // `kind: 'scene'`, o un elemento sin `src`: el objeto 3D de proyecto no
  // existe todavía, así que se declara en vez de fingirse.
  return <PendingMedia ratio={box} kind={item?.kind === 'scene' ? 'objeto 3D' : kind} note={note} />
}

/**
 * La línea de metadatos: año · papel · categoría · estado.
 *
 * Era un `join(' · ')` dentro de un `<p>`, y con cuatro datos en una columna
 * estrecha rompía por donde le tocaba al carácter, no por donde tiene sentido:
 *
 *     2026 · DESARROLLO COMPLETO · APLICACIÓN DE ESCRITORIO /
 *     IA · EN DESARROLLO
 *
 * Ahora cada dato es un elemento de una lista en flex: un salto de línea solo
 * puede ocurrir ENTRE datos, nunca dentro de uno. El separador va como `::after`
 * del propio elemento —no suelto entre dos— para que al envolver se quede al
 * final de la línea anterior en vez de abrir la siguiente con un punto huérfano.
 */
function Meta({ items }) {
  const values = items.filter(Boolean)
  if (values.length === 0) return null

  return (
    <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-meta text-meta uppercase text-ink-faint">
      {values.map((value, i) => (
        <li key={value} className="whitespace-nowrap">
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

function ProjectShowcase({ project, position }) {
  const flip = position % 2 === 1
  const media = project.media ?? []
  const [hero, ...gallery] = media

  return (
    <article className="border-t border-rule pt-block">
      {/*
        ── EL ENCABEZADO OCUPA EL ANCHO ENTERO ─────────────────────────────

        El título y el lema estaban dentro de la columna estrecha del texto, o
        sea a 482 px de los 1248 disponibles. Un proyecto que abre su caso a un
        tercio del ancho no se lee como el sujeto de la sección.

        Sacándolos fuera de la retícula, cada proyecto empieza como empieza un
        artículo: nombre grande, una línea que lo explica, y solo entonces el
        cuerpo en columnas.
      */}
      <header>
        <Meta items={[project.year, project.role, project.category, project.status]} />

        <h3 className="mt-5 font-display text-title font-semibold text-ink">{project.title}</h3>

        {project.tagline && (
          <p className="mt-4 max-w-editorial text-lead font-light text-ink-soft">
            {project.tagline}
          </p>
        )}
      </header>

      <div className="mt-block grid gap-block lg:grid-cols-12">
        {/*
          ── EL REPARTO SE INVIERTE ─────────────────────────────────────────

          El medio se llevaba 7 columnas de 12 y el texto 5. Medido a 1920: la
          columna del medio ocupaba 701 × 1646 px con una figura de 438 px
          dentro, o sea 1208 px de columna VACÍA — el 73% de la altura de la
          ficha— mientras el texto se estrechaba a 482 px y se estiraba hacia
          abajo.

          Ahora el texto se lleva 7 y el medio 5. El texto pasa de 482 a unos
          700 px de caja, la ficha se acorta sola, y el hueco del medio deja de
          ser una columna gigante.

          Y el medio se queda PEGADO mientras el caso se lee (`lg:sticky`): es
          lo que hace que la columna no se vacíe nunca por mucho que el texto
          siga bajando. No cuesta un frame —lo resuelve el compositor— y cuando
          entren las capturas reales van a acompañar la lectura en vez de
          quedarse arriba del todo.
        */}
        <div
          className={`lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : ''}`}
        >
          <div className="lg:sticky lg:top-24">
            {/*
              ── LA PROPORCIÓN SALE DEL ASSET, NO AL REVÉS ──────────────────

              Estaba en 4/3 y 1/1, elegidas cuando el hueco estaba vacío y solo
              había que reservar un peso visual. Las capturas reales son de
              1920 × 1140, o sea 1,68, y `object-cover` recorta por el centro:
              en 4/3 se comía el 21% del ancho y en 1/1 el 40%.

              En una captura de aplicación eso no es un encuadre, es perder
              contenido — la navegación de ActiHome y su columna derecha se
              quedaban fuera. 16/10 es lo más cerca que hay del original en la
              escala del proyecto, y deja el recorte por debajo del 5%.
            */}
            <MediaItem item={hero} ratio="16 / 10" kind="captura o escena" note={project.title} />

            {/*
              La galería secundaria. Solo aparece si hay más de un elemento en
              `media`: un proyecto con una única imagen no tiene por qué
              reservar el hueco de una fila que nunca se llena.

              Y la rejilla se ajusta a CUÁNTAS hay, hasta tres. Estaba fija en
              tres columnas, y con dos capturas el tercer hueco se quedaba vacío
              a la derecha: no se lee como aire, se lee como que falta algo. Con
              dos, cada miniatura pasa de 151 a 245 px de ancho, que además es
              la diferencia entre adivinar la pantalla y verla.
            */}
            {gallery.length > 0 && (
              <div
                className="mt-4 grid gap-3"
                style={{ gridTemplateColumns: `repeat(${Math.min(gallery.length, 3)}, minmax(0, 1fr))` }}
              >
                {gallery.map((item, i) => (
                  <MediaItem
                    key={item.src ?? item.id ?? i}
                    item={item}
                    ratio="16 / 10"
                    kind="detalle"
                  />
                ))}
              </div>
            )}

            {/*
              El stack acompaña al medio, no al texto. Son las dos cosas que se
              miran de un vistazo —qué aspecto tiene y con qué está hecho— y
              juntas dejan el caso limpio para leerse seguido.
            */}
            <div className="mt-8">
              <Stack ids={project.stack} />
            </div>
          </div>
        </div>

        <div className={`lg:col-span-7 ${flip ? 'lg:order-1 lg:row-start-1' : ''}`}>
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

          {/*
            Las características en dos columnas a partir de tamaño medio. Zalent
            tiene siete y en una sola columna estiraban la ficha cuarenta líneas
            por debajo de las otras dos.
          */}
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

          {/*
            ── EL RESULTADO CIERRA EL CASO ──────────────────────────────────

            Estaba dentro del mismo `dl` que Objetivo, Problema y Solución, o
            sea que el remate del relato tenía exactamente el mismo peso que sus
            antecedentes y se leía como una coletilla.

            Fuera de la lista, con su filete encima y a tamaño de destacado,
            hace lo que hace el último párrafo de un reportaje. Es el mismo
            recurso que ya usa el manifiesto en Sobre mí: cambia la medida, no
            el lenguaje.
          */}
          {project.outcome && (
            <div className="mt-block border-t border-rule pt-8">
              <p className="font-meta text-meta uppercase text-accent/80">Resultado</p>
              <p className="mt-4 max-w-read text-lead font-light text-ink">{project.outcome}</p>
            </div>
          )}

          {/*
            Los enlaces solo se dibujan si hay alguno. Con las tres claves
            declaradas y vacías, el contenedor se montaba igual y dejaba su
            margen suelto al pie de cada ficha.
          */}
          {project.links && Object.values(project.links).some(Boolean) && (
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {Object.entries(project.links)
                .filter(([, href]) => href)
                .map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="link-quiet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {label} <span aria-hidden="true">↗</span>
                  </a>
                ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ProjectsArea({ index }) {
  return (
    <PortfolioSection
      id="work"
      act="3"
      index={index}
      label="Proyectos"
      title="Lo que he construido"
      lead={
        projects.length > 0
          ? undefined
          : 'Cada proyecto se cuenta como un caso: qué problema había, qué decidí y qué salió.'
      }
    >
      {projects.length > 0 ? (
        <div className="mt-area space-y-area">
          {projects.map((project, position) => (
            <ProjectShowcase key={project.id} project={project} position={position} />
          ))}
        </div>
      ) : (
        <div className="mt-block space-y-block">
          <PendingList
            label="proyectos"
            note="Dos o tres bien contados valen más que seis enumerados. Cada uno necesita problema, solución, mi papel y resultado."
          />

          {/*
            El hueco de un proyecto, dibujado una vez para poder juzgar el ritmo
            de la sección antes de que exista ninguno.
          */}
          <div className="grid gap-block lg:grid-cols-12">
            <div className="lg:col-span-7">
              <PendingMedia ratio="16 / 10" kind="captura, vídeo o escena 3D" />
            </div>
            <div className="lg:col-span-5">
              <PendingMedia ratio="4 / 3" kind="detalle" />
            </div>
          </div>
        </div>
      )}
    </PortfolioSection>
  )
}
