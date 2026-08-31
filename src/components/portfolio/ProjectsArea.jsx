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
  if (item?.kind === 'image' && item.src) {
    return (
      <figure className="relative w-full overflow-hidden border border-rule" style={{ aspectRatio: ratio }}>
        <img src={item.src} alt={item.alt || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </figure>
    )
  }

  if (item?.kind === 'video' && item.src) {
    return (
      <figure className="relative w-full overflow-hidden border border-rule" style={{ aspectRatio: ratio }}>
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
  return <PendingMedia ratio={ratio} kind={item?.kind === 'scene' ? 'objeto 3D' : kind} note={note} />
}

function ProjectShowcase({ project, position }) {
  const flip = position % 2 === 1
  const media = project.media ?? []
  const [hero, ...gallery] = media

  return (
    <article className="border-t border-rule pt-block">
      <div className="grid gap-block lg:grid-cols-12">
        {/* El medio y el texto se turnan de lado. */}
        <div className={`lg:col-span-7 ${flip ? 'lg:order-2 lg:col-start-6' : ''}`}>
          <MediaItem item={hero} ratio="16 / 10" kind="captura o escena" note={project.title} />

          {/*
            La galería secundaria. Solo aparece si hay más de un elemento en
            `media`: un proyecto con una única imagen no tiene por qué reservar
            el hueco de una fila que nunca se llena.
          */}
          {gallery.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {gallery.map((item, i) => (
                <MediaItem
                  key={item.src ?? item.id ?? i}
                  item={item}
                  ratio="4 / 3"
                  kind="detalle"
                />
              ))}
            </div>
          )}
        </div>

        <div className={`lg:col-span-5 ${flip ? 'lg:order-1 lg:row-start-1' : ''}`}>
          <p className="font-meta text-meta uppercase text-ink-faint">
            {[project.year, project.role, project.category, project.status]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <h3 className="mt-4 text-title font-display font-semibold text-ink">
            {project.title}
          </h3>

          {project.tagline && (
            <p className="mt-4 max-w-read text-lead font-light text-ink-soft">
              {project.tagline}
            </p>
          )}

          <dl className="mt-block space-y-8">
            {[
              ['Objetivo', project.objective],
              ['Problema', project.problem],
              ['Solución', project.solution],
              ['Resultado', project.outcome],
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
            <div className="mt-8">
              <h4 className="font-meta text-meta uppercase text-ink-faint">Características</h4>
              <ul className="mt-3 max-w-read space-y-2">
                {project.features.map((line) => (
                  <li key={line} className="text-body text-ink-soft">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-block">
            <Stack ids={project.stack} />
          </div>

          {project.links && (
            <div className="mt-8 flex flex-wrap gap-x-8">
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
