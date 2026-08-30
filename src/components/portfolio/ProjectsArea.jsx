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
 * Así que cada proyecto ocupa la pantalla entera y se lee en cuatro tiempos:
 *
 *     el qué        título, año, una línea
 *     el problema   por qué había que hacerlo
 *     la solución   qué se hizo, y cuál fue mi papel
 *     el resultado  qué salió y qué aprendí
 *
 * Es la estructura de un caso, no de una ficha. Y es la que un reclutador
 * técnico busca: no quiere saber que usaste React, quiere saber qué decidiste.
 *
 * ## El sitio del medio
 *
 * Cada proyecto reserva un hueco grande y apaisado, alternando el lado en los
 * impares para que bajar por la sección no sea bajar por una lista. Ese hueco
 * admite captura, vídeo o un objeto 3D propio, y hasta que exista se dibuja
 * vacío con su proporción: la composición ya se puede juzgar sin las imágenes.
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

function ProjectShowcase({ project, position }) {
  const flip = position % 2 === 1

  return (
    <article className="border-t border-rule pt-block">
      <div className="grid gap-block lg:grid-cols-12">
        {/* El medio y el texto se turnan de lado. */}
        <div className={`lg:col-span-7 ${flip ? 'lg:order-2 lg:col-start-6' : ''}`}>
          {project.media ? null : (
            <PendingMedia
              ratio="16 / 10"
              kind="captura o escena"
              note={project.title}
            />
          )}
        </div>

        <div className={`lg:col-span-5 ${flip ? 'lg:order-1 lg:row-start-1' : ''}`}>
          <p className="font-meta text-meta uppercase text-ink-faint">
            {project.year}
            {project.role && ` · ${project.role}`}
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
