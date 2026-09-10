import PortfolioSection from './PortfolioSection'
import { PendingList, PendingMedia } from './Pending'
import ProjectChapter from './ProjectChapter'
import { projects } from '../../data/portfolio'
import SignatureBand from './SignatureBand'

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
 * ## Y tampoco es una sucesión de fichas
 *
 * Hasta la fase 8C cada proyecto era una FICHA: nombre, objeto al lado,
 * abanico debajo, caso debajo del abanico. Correcto, y una columna — cada cosa
 * esperando a que terminara la anterior, con el objeto 3D leyéndose como un
 * icono puesto junto a un título.
 *
 * Ahora los tres son CAPÍTULOS (`ProjectChapter`): lomo pegado con folio y
 * trazo, portada a pantalla completa con el nombre compuesto a la medida de la
 * columna, el objeto 3D solapado con él, y un trazo que baja al terminar y
 * entrega al capítulo siguiente.
 *
 * **Mismo lenguaje, distinta composición.** Los tres comparten las piezas y
 * ninguno comparte el reparto: cada uno declara su partitura en `SCORE`, dentro
 * de `ProjectChapter`. Bajar por Proyectos no puede ser bajar por una lista.
 *
 * La maquinaria del medio —el abanico, el reparto por número de láminas, el
 * botón de ampliar— vive en `ProjectStage.jsx`.
 */

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
      /*
        9C.1: el hilo genérico que enlaza con el área siguiente se apaga aquí.
        Cada capítulo —el último incluido— ya baja el suyo propio: el mismo
        trazo en el acento, a la altura del lomo, que mide exactamente el
        hueco hasta el borde de la sección. Con los dos encendidos se veían
        dos líneas de sitio y color distintos una detrás de otra; con uno solo
        la trayectoria de Proyectos entra en Experiencia sin cortarse.
      */
      thread={false}
    >
      {projects.length > 0 ? (
        <>
          {/*
            ── 10E: LA BANDA CRUZA ANTES DE QUE EMPIECE EL PRIMER CAPÍTULO ────
            Ver `SignatureBand`. Es la primera pieza de movimiento HORIZONTAL
            de todo el editorial — hasta aquí, ocho pantallas y todo bajaba.
          */}
          <div className="mt-block">
            <SignatureBand items={projects.map((project) => project.title)} />
          </div>
          <div className="mt-area space-y-area">
            {projects.map((project, position) => (
              <ProjectChapter key={project.id} project={project} position={position} />
            ))}
          </div>
        </>
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
