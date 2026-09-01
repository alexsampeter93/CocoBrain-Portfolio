import PortfolioSection from './PortfolioSection'
import { PendingList } from './Pending'
import { experience } from '../../data/portfolio'
import { knowledgeById } from '../../data/network'

/**
 * EXPERIENCIA — la trayectoria como cadena, no como línea de tiempo.
 *
 * ## Por qué no una timeline
 *
 * La línea de tiempo con puntitos y una barra vertical es el cliché por
 * excelencia del portfolio, y además miente sobre lo que importa: dibuja el
 * TIEMPO —que es lo menos interesante— y deja el contenido apretado a un lado.
 * En una trayectoria corta es peor todavía, porque enseña el hueco.
 *
 * Aquí cada puesto es un eslabón: el periodo queda a la izquierda como dato
 * pequeño, el puesto ocupa la línea grande, y un filete vertical une un eslabón
 * con el siguiente. La forma es la misma que la de las conexiones de la red
 * —dos nodos y un trazo entre ellos—, y ese eco es lo que hace que la sección
 * pertenezca a CocoBrain en vez de venir de una plantilla.
 *
 * Se lee "una cosa llevó a la siguiente", que es lo que una trayectoria tiene
 * que contar, sin necesidad de dibujar un calendario.
 */

function ExperienceItem({ item, last }) {
  /*
    ── QUÉ VA EN LA LÍNEA GRANDE ──────────────────────────────────────────

    Iba el PUESTO, y con el contenido real eso rompía la sección: tres de los
    cuatro eslabones dicen "Operario de logística", así que el titular se
    repetía idéntico tres veces mientras lo único que los distingue
    —Vegosupermercados, Leroy Merlin, Inditex— iba en cuerpo pequeño debajo.

    Ahora manda la EMPRESA, que es el dato que cambia, y el puesto baja a la
    línea de metadatos junto al periodo. Se lee "dónde → qué → cuándo", que
    además es el orden en el que se lee un currículum.
  */
  const software = item.track === 'software'

  return (
    <li className="relative grid gap-6 pb-area last:pb-0 md:grid-cols-12">
      {/*
        El trazo que une con el siguiente eslabón. Es un elemento decorativo con
        función: sin él, tres puestos seguidos se leen como tres bloques sueltos
        en vez de como un recorrido.
      */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-3 hidden h-full w-px bg-rule md:block"
        />
      )}

      {/*
        ── EL ESLABÓN EN EL QUE CAMBIA EL CAMINO ────────────────────────────

        El punto sobre la cadena. En los tramos de logística es un filete hueco
        del color de los separadores; en el de desarrollo se llena con el acento
        del acto.

        Es toda la señal que hace falta: la trayectoria se sigue leyendo como
        una cadena de cuatro eslabones iguales, y el ojo encuentra solo el punto
        en el que deja de ser logística. No hay flechas, ni etiquetas, ni una
        línea de tiempo dibujada — que es exactamente lo que no se quería.

        `track` no clasifica nada que no estuviera dicho: OVEUN se declara en su
        propio texto como "prácticas del ciclo DAM" y como la primera
        experiencia relacionada con el desarrollo de software.
      */}
      <span
        aria-hidden="true"
        className={`absolute -left-[3px] top-3 hidden h-[7px] w-[7px] rounded-full md:block ${
          software ? 'bg-accent' : 'bg-rule'
        }`}
      />

      <div className="md:col-span-3 md:pl-8">
        <p className="font-meta text-meta uppercase text-ink-faint">{item.period}</p>
      </div>

      <div className="md:col-span-9">
        <h3
          className={`font-display text-title font-semibold ${
            software ? 'text-ink' : 'text-ink/85'
          }`}
        >
          {item.company}
        </h3>

        {/*
          El puesto baja aquí, a la línea de metadatos. Lleva el acento solo en
          el eslabón de desarrollo: es la segunda vez que el color aparece en el
          mismo eslabón, y las dos veces dice lo mismo.

          El periodo no se repite: ya está en su columna, que en apaisado cae a
          la izquierda y en vertical justo encima.
        */}
        <p
          className={`mt-3 font-meta text-meta uppercase ${
            software ? 'text-accent' : 'text-ink-faint'
          }`}
        >
          {item.role}
        </p>

        {item.summary && (
          <p className="mt-6 max-w-read text-body text-ink-soft">{item.summary}</p>
        )}

        {[
          ['Responsabilidades', item.responsibilities],
          ['Logros', item.achievements],
        ]
          .filter(([, list]) => list?.length > 0)
          .map(([term, list]) => (
            <div key={term} className="mt-8">
              <h4 className="font-meta text-meta uppercase text-ink-faint">{term}</h4>
              <ul className="mt-3 max-w-read space-y-2">
                {list.map((line) => (
                  <li key={line} className="text-body text-ink-soft">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {item.stack?.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
            {item.stack.map((id) => (
              <li key={id} className="font-meta text-meta uppercase text-ink-faint">
                {knowledgeById.get(id)?.label ?? id}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export default function ExperienceArea({ index }) {
  return (
    <PortfolioSection
      id="experience"
      act="4"
      index={index}
      label="Experiencia"
      title="Dónde he estado"
    >
      {experience.length > 0 ? (
        <ol className="mt-area">
          {experience.map((item, i) => (
            <ExperienceItem
              key={`${item.company}-${item.period}`}
              item={item}
              last={i === experience.length - 1}
            />
          ))}
        </ol>
      ) : (
        <div className="mt-block">
          <PendingList
            label="trayectoria"
            note="Empresa, puesto, periodo, responsabilidades, logros y tecnologías. Si la trayectoria es corta, cuentan también las prácticas y los proyectos de formación: lo que no vale es dejarlo vacío."
          />
        </div>
      )}
    </PortfolioSection>
  )
}
