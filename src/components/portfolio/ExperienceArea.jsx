import PortfolioSection from './PortfolioSection'
import { PendingList } from './Pending'
import { Mask } from './Type'
import { useDrawThread } from '../../animations/motion'
import { useScene } from '../../animations/editorial'
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

/** El ritmo de un eslabón de logística: dato, nombre, texto. Corto. */
const LINK_CUES = {
  meta: { at: 0, from: { y: 10, opacity: 0 }, stagger: 0.06, dur: 0.6 },
  title: { at: 0.1, from: { yPercent: 118 }, dur: 0.9 },
  body: { at: 0.4, from: { y: 14, opacity: 0 }, stagger: 0.08, dur: 0.7 },
}

/**
 * ── Y EL RITMO DE OVEUN, QUE ES OTRO ────────────────────────────────────────
 *
 * Más lento y con más pasos, porque es el eslabón donde cambia el oficio y es
 * la única pieza de la sección que se compone en vez de listarse:
 *
 *     contexto → el trazo → el nombre → el complemento → el papel → el relato
 *
 * El nombre entra en 0,22 y no termina hasta 1,32: casi la mitad de la
 * secuencia es ese nombre colocándose, y todo lo demás llega mientras. Es lo
 * que hace que se lea como una llegada y no como un elemento de una lista.
 */
const MARK_CUES = {
  meta: { at: 0, from: { y: 12, opacity: 0 }, stagger: 0.1, dur: 0.7 },
  rule: { at: 0.12, from: { scaleX: 0, transformOrigin: 'left center' }, dur: 0.9 },
  title: { at: 0.22, from: { yPercent: 116 }, stagger: 0.2, dur: 1.1 },
  lead: { at: 0.72, from: { y: 18, opacity: 0 }, dur: 0.8 },
  body: { at: 0.88, from: { y: 16, opacity: 0 }, stagger: 0.09, dur: 0.8 },
}

/*
  ── 9C.2: LA CADENA SE CONVIERTE EN TRAYECTORIA ───────────────────────────

  Hasta aquí el hilo era una regla vertical: los cuatro eslabones colgaban de
  la misma x, y lo único que cambiaba era el texto. Eso se lee como una lista
  con un separador, no como un recorrido.

  `NODE_DRIFT` es cuánto se aparta cada punto del eje —Vega en el origen, y a
  partir de ahí variación pequeña y no monótona: derecha, izquierda, derecha
  otra vez y algo más lejos en OVEUN, que es donde el camino cambia de
  oficio—. `THREAD_TURN` es el giro del TRAMO que sale de cada eslabón hacia
  el siguiente, así que el trazo apunta hacia donde está el punto que viene.

  Grados pequeños a propósito —entre 2° y 4°—: sobre los varios cientos de
  píxeles que mide un eslabón, eso ya separa el punto de llegada varias
  decenas de píxeles del de salida sin que el ojo lea un zigzag. Es la misma
  proporción que ya usa el resto del editorial para "poco, y a propósito".
*/
const NODE_DRIFT = [0, 12, -8, 20]
const THREAD_TURN = [2.2, -3.4, 4]

function ExperienceItem({ item, last, drift = 0, turn = 0 }) {
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

  /*
    ── EL HILO SE DIBUJA MIENTRAS SE BAJA ─────────────────────────────────

    Estaba pintado entero desde el principio: una línea que ilustra un
    recorrido. Ahora se traza al ritmo al que se baja por los puestos, así
    que el recorrido no se ilustra — se recorre. Es el mismo gesto que el
    filete de acento que abre cada área, girado noventa grados.

    Y desde 9C.2 lleva el giro de la trayectoria: `turn` apunta el tramo
    hacia el punto siguiente. Solo existe en pantalla ancha — la propia
    `useDrawThread` lo apaga por debajo de 1024, ver `motion.js`.
  */
  const thread = useDrawThread({ rotate: turn })

  /* Y el eslabón entero se monta: cada papel en su momento. */
  const link = useScene({
    cues: software ? MARK_CUES : LINK_CUES,
    start: software ? 'top 84%' : 'top 88%',
    end: software ? 'top 26%' : 'top 46%',
  })

  /*
    ── EL NOMBRE SE PARTE DONDE LO PARTE UNA MARCA ────────────────────────

    "OVEUN Software & Tech" es un nombre con dos mitades: la marca y lo que
    hace. Escrito seguido a tamaño de cartel ocupa dos líneas rotas por donde
    cae el ancho —"OVEUN Software &" / "Tech"— que es exactamente lo que hacía
    que la pieza se leyera pesada y mal compuesta.

    Partido por el primer espacio, la marca va sola y grande y el resto va
    debajo en cuerpo secundario. No se inventa nada: es el mismo texto de
    `portfolio.js`, compuesto.
  */
  const [mark, ...restOfName] = item.company.split(' ')
  const qualifier = restOfName.join(' ')

  return (
    <li ref={link} className="relative grid gap-6 pb-area last:pb-0 md:grid-cols-12">
      {/*
        El trazo que une con el siguiente eslabón. Es un elemento decorativo con
        función: sin él, tres puestos seguidos se leen como tres bloques sueltos
        en vez de como un recorrido.

        9C.2: visible desde el primer breakpoint, no solo desde `md`. Antes la
        cadena entera desaparecía en móvil; ahora baja recta ahí —el giro es
        cosa de escritorio, ver `useDrawThread`— y el concepto punto-trazo se
        conserva en toda pantalla.
      */}
      {!last && (
        <span
          ref={thread}
          aria-hidden="true"
          className="absolute left-0 top-3 block h-full w-px bg-rule"
        />
      )}

      {/*
        ── EL ESLABÓN EN EL QUE CAMBIA EL CAMINO ────────────────────────────

        El punto sobre la cadena. En los tramos de logística es un filete hueco
        del color de los separadores; en el de desarrollo se llena con el acento
        del acto.

        `track` no clasifica nada que no estuviera dicho: OVEUN se declara en su
        propio texto como "prácticas del ciclo DAM" y como la primera
        experiencia relacionada con el desarrollo de software.

        9C.2: `--exp-drift` es la variación espacial del eslabón. Es un valor
        ESTÁTICO —nadie más escribe el `transform` de este punto— y solo se
        aplica desde `lg`, la misma frontera que usa el giro del hilo: por
        debajo, cadena recta.
      */}
      <span
        aria-hidden="true"
        style={{ '--exp-drift': `${drift}px` }}
        className={`absolute -left-[3px] top-3 block h-[7px] w-[7px] rounded-full lg:translate-x-[var(--exp-drift)] ${
          software ? 'bg-accent' : 'bg-rule'
        }`}
      />

      {/*
        ── EL PERIODO DEJA DE SER UN PIE DE FOTO ──────────────────────────

        Va al cuerpo de lectura y en la tinta suave: sigue sin competir con el
        nombre de la empresa, que es lo que manda, pero ya se ve desde lejos que
        la columna izquierda es CUÁNDO.
      */}
      <div className="pl-5 md:col-span-3 md:pl-8">
        <p
          data-cue="meta"
          className="font-meta text-body uppercase leading-tight tracking-[0.06em] text-ink-soft"
        >
          {item.period}
        </p>
      </div>

      <div className="pl-5 md:col-span-9 md:pl-0">
        {software ? (
          /*
            ── OVEUN SE COMPONE, NO SE LISTA ────────────────────────────────

            Es el eslabón donde la trayectoria cambia de oficio, así que es la
            única pieza de la sección que tiene puesta en escena propia. Lo que
            estaba mal no era el tamaño —era que NO HABÍA COMPOSICIÓN: un
            nombre enorme a sangre, pegado al borde de la columna, con el resto
            del contenido colgando debajo en el mismo cuerpo que los otros tres
            eslabones. Grande no es lo mismo que importante.

            Lo que hace ahora:

            - **el nombre baja de cuerpo y sube de peso relativo.** Pasa de
              `--step-display` (88 px a 1920) a `--step-mark` (62 px), que sigue
              siendo un 22% mayor que el de los otros eslabones —51 px— pero ya
              no llena el ancho. Un titular que llega al borde no tiene aire, y
              sin aire no hay jerarquía: hay ruido;
            - **se parte en marca y complemento.** "OVEUN" solo, y "Software &
              Tech" debajo en cuerpo de titular ligero. Dos pesos, una lectura;
            - **el papel se va a la derecha, alineado con la línea de base del
              nombre.** Nombre a la izquierda, función a la derecha, y entre los
              dos el aire: es la composición de una portadilla;
            - **el trazo del acento lo abre y es LARGO**, el mismo gesto que
              abre cada área. Aquí dice "esto es un capítulo";
            - **el relato sube a cuerpo de destacado** y se limita a 34 rem, así
              que la pieza tiene una medida de lectura propia y no hereda la de
              una lista;
            - **las tareas van en dos columnas con su filete**, numeradas. Son
              dos, y en una sola columna volvían a colgar del nombre.

            Lectura resultante: arriba el contexto, en el centro la marca, y el
            detalle abajo. Arriba → centro → detalle.
          */
          <div className="lg:pr-6">
            <span
              data-cue="rule"
              aria-hidden="true"
              className="block h-px w-full max-w-[26rem] bg-accent"
            />

            {/*
              El papel va PEGADO al nombre, no en el otro extremo de la
              columna. Con `justify-between` quedaban 330 px de aire entre
              "Software & Tech" y "Desarrollador · Prácticas" —medido a 1920— y
              el dato se leía como una etiqueta suelta en mitad del blanco. A
              cuarenta píxeles de la última letra, el nombre y lo que se hacía
              allí forman una sola pieza, y su borde derecho cae a la altura
              del filete que la abre.
            */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-10">
              <h3 className="font-display font-semibold text-ink">
                <Mask
                  cue="title"
                  className="text-[length:var(--step-mark)] leading-[0.86] tracking-[-0.035em]"
                >
                  {mark}
                </Mask>
                {qualifier && (
                  <Mask
                    cue="title"
                    className="mt-2 font-display text-title font-light leading-[1] tracking-[-0.01em] text-ink/70"
                  >
                    {qualifier}
                  </Mask>
                )}
              </h3>

              <p
                data-cue="meta"
                className="shrink-0 font-meta text-meta uppercase text-accent sm:pb-3"
              >
                {item.role}
              </p>
            </div>

            {item.summary && (
              <p data-cue="lead" className="mt-10 max-w-read-lead text-lead font-light text-ink">
                {item.summary}
              </p>
            )}

            {item.responsibilities?.length > 0 && (
              <ul className="mt-block grid gap-x-block gap-y-6 sm:grid-cols-2">
                {item.responsibilities.map((line, i) => (
                  <li key={line} data-cue="body" className="border-t border-rule pt-4">
                    <span className="font-meta text-meta text-ink-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-3 text-body text-ink-soft">{line}</p>
                  </li>
                ))}
              </ul>
            )}

            {item.stack?.length > 0 && (
              <ul data-cue="body" className="mt-10 flex flex-wrap items-baseline">
                {item.stack.map((id, i) => (
                  <li key={id} className="font-display text-body font-light text-ink-soft">
                    {knowledgeById.get(id)?.label ?? id}
                    {i < item.stack.length - 1 && (
                      <span aria-hidden="true" className="mx-4 text-ink-faint/35">
                        ·
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <Mask
              as="h3"
              cue="title"
              className="font-display text-title font-semibold leading-[1.05] text-ink/85"
            >
              {item.company}
            </Mask>

            <p data-cue="meta" className="mt-3 font-meta text-meta uppercase text-ink-faint">
              {item.role}
            </p>

            {item.summary && (
              <p data-cue="body" className="mt-6 max-w-read text-body text-ink-soft">
                {item.summary}
              </p>
            )}

            {[
              ['Responsabilidades', item.responsibilities],
              ['Logros', item.achievements],
            ]
              .filter(([, list]) => list?.length > 0)
              .map(([term, list]) => (
                <div key={term} data-cue="body" className="mt-8">
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
              <ul data-cue="body" className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
                {item.stack.map((id) => (
                  <li key={id} className="font-meta text-meta uppercase text-ink-faint">
                    {knowledgeById.get(id)?.label ?? id}
                  </li>
                ))}
              </ul>
            )}
          </>
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
              drift={NODE_DRIFT[i] ?? 0}
              turn={THREAD_TURN[i] ?? 0}
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
