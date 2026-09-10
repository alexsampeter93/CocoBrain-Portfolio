import PortfolioSection from './PortfolioSection'
import EditorialObject from './EditorialObject'
import { Mask } from './Type'
import { useScene } from '../../animations/editorial'
import { PendingList, PendingText } from './Pending'
import { about } from '../../data/portfolio'
import { knowledgeById } from '../../data/network'
import { Icon } from '../ui/Icon'

/**
 * SOBRE MÍ — el área de la voz.
 *
 * ## La composición
 *
 * Cuatro tiempos, y cada uno con un ancho distinto a propósito: el ojo entiende
 * la jerarquía por la MEDIDA de la columna antes que por el tamaño de la letra.
 *
 *     titular          ancho de pantalla
 *     resumen          columna ancha, cuerpo grande
 *     cuerpo           columna de lectura, desplazada a la derecha
 *     formación        dos columnas estrechas al pie
 *
 * El desplazamiento del cuerpo hacia la derecha no es un capricho: deja una
 * banda vacía a la izquierda que sostiene el titular y evita que la sección se
 * lea como un documento alineado al margen. Es el mismo recurso de una revista.
 *
 * ## FASE 5B: cuatro campos más, con el mismo lenguaje visual
 *
 * Enfoque, intereses, tecnologías destacadas y un CTA de cierre. Ninguno trae
 * maquetación nueva: los dos primeros repiten exactamente el bloque de dos
 * columnas que ya usan Formación/Cómo trabajo, y los otros dos van debajo en un
 * único bloque, con las mismas clases que ya pinta el resto del área. Cuando
 * llegue contenido real se decide si esto necesita otra composición —eso es
 * juicio visual, y esta ronda es solo de datos—.
 */
/**
 * El manifiesto entra como entra un capítulo: el filete largo se traza y las
 * dos frases salen de su línea, una detrás de otra. Es el único sitio del área
 * donde el texto entra ENMASCARADO en vez de con opacidad, y es deliberado — no
 * es contenido, es la marca hablando.
 */
const MANIFESTO_CUES = {
  rule: { at: 0, from: { scaleX: 0, transformOrigin: 'left center' }, dur: 0.8 },
  title: { at: 0.24, from: { yPercent: 116 }, stagger: 0.24, dur: 1 },
}

export default function AboutArea({ index }) {
  /*
    ── SOBRE MÍ ES LA PRIMERA JERARQUÍA QUE SE LEE ──────────────────────────

    Es lo primero después del umbral, así que su orden de lectura tiene que
    quedar claro sin que nadie lo explique: identidad (el número y el rótulo),
    titular, contenido, y el objeto colocándose mientras se lee lo anterior.

    Dos escenas y no una: el cuerpo está a media pantalla del encabezado y el
    manifiesto a tres pantallas. Una sola secuencia habría terminado de
    reproducirse antes de que se llegara a ninguno de los dos.
  */
  const body = useScene({ start: 'top 84%', end: 'top 40%' })

  /*
    El manifiesto entra como entra un capítulo: el filete largo se traza y las
    dos frases salen de su línea, una detrás de otra. Es el único sitio del
    área donde el texto entra ENMASCARADO en vez de con opacidad, y es
    deliberado — no es contenido, es la marca hablando.
  */
  const manifesto = useScene({ start: 'top 82%', end: 'top 42%', cues: MANIFESTO_CUES })

  const hasCta = Boolean(about.cta?.label && about.cta?.href)

  return (
    <PortfolioSection
      id="about"
      act="3"
      index={index}
      label="Sobre mí"
      title={about.headline || 'Quién hay detrás'}
      lead={about.summary?.length ? about.summary : undefined}
    >
      <div ref={body} className="mt-block grid gap-block lg:grid-cols-12">
        {/*
          ── EL OBJETO COCOBRAIN, EN EL HUECO QUE YA EXISTÍA ──────────────────

          La columna de lectura arranca en la quinta doceava parte, así que las
          cuatro primeras llevaban vacías desde que existe esta sección — el
          manual las tenía anotadas como "media columna vacía". No se rellenan
          con contenido: se rellenan con la marca.

          El coco partido a 380 px, PEGADO mientras el relato se lee. Esa es la
          diferencia entre un objeto y un icono: un icono aparece al lado de una
          frase y se va con ella; este acompaña los siete párrafos enteros,
          girando despacio con el scroll, y cuando se llega al manifiesto sigue
          ahí. Es el objeto de CocoBrain presidiendo lo que CocoBrain cuenta de
          sí mismo.

          No compite con el texto porque no está en su columna: está en el aire
          que la composición ya reservaba.
        */}
        <div className="hidden lg:col-span-3 lg:col-start-1 lg:block">
          <div className="sticky top-28">
            <EditorialObject
              model="/models/cocobrain_abstract_lo.glb"
              cue="object"
              className="w-full"
              style={{ height: 'clamp(16rem, 24vw, 24rem)' }}
            />
          </div>
        </div>

        <div className="lg:col-span-7 lg:col-start-5">
          {about.body.length > 0 ? (
            about.body.map((text) => (
              <p
                key={text.slice(0, 24)}
                data-cue="body"
                className="mb-6 max-w-read text-body text-ink-soft"
              >
                {text}
              </p>
            ))
          ) : (
            <PendingText label="presentación y trayectoria" lines={4} />
          )}

        </div>
      </div>

      {/*
        ── EL MANIFIESTO SALE DE LA COLUMNA ───────────────────────────────────

        Estaba al final del cuerpo, dentro de la columna de lectura y con un
        filete al costado. Funcionaba como cita, y una cita es exactamente lo
        que NO es esto: no es alguien citado dentro de un texto, es la marca
        hablando en primera persona. Al final de una columna de siete párrafos,
        las dos frases que resumen CocoBrain se leían como el remate de un
        párrafo más.

        Ahora ocupan una banda propia, a todo el ancho, en cuerpo de titular y
        empujadas al tercio derecho. La asimetría es el recurso: el aire de la
        izquierda es lo que hace que se lean como una declaración y no como
        contenido. Y el filete del acento pasa a ser LARGO y horizontal, el
        mismo que abre cada área — así el manifiesto se lee como un capítulo,
        no como un aparte.

        No lleva caja, ni comillas, ni color propio. Sigue siendo un trazo y
        una sangría, pero a la escala que le corresponde.

        Las dos frases son intocables (`CLAUDE.md` §2): aquí solo cambia dónde
        y de qué tamaño se leen.
      */}
      {about.manifesto?.length > 0 && (
        <div ref={manifesto} className="mt-area border-t border-rule pt-block">
          <div className="lg:ml-[33%]">
            <span
              data-cue="rule"
              aria-hidden="true"
              className="block h-px w-20 bg-accent sm:w-32"
            />
            <div className="mt-block space-y-8">
              {about.manifesto.map((line) => (
                <Mask
                  key={line}
                  as="p"
                  cue="title"
                  className="max-w-[38rem] font-display text-title font-light leading-[1.12] text-ink"
                >
                  {line}
                </Mask>
              ))}
            </div>
          </div>
        </div>
      )}

      {/*
        Formación y forma de trabajar van al pie y en dos columnas: son
        información de apoyo, y darles el mismo ancho que al relato los pondría
        a la misma altura de importancia.
      */}
      <div className="mt-area grid gap-block border-t border-rule pt-block md:grid-cols-2">
        <div>
          <h3 className="font-meta text-meta uppercase text-ink-faint">Formación</h3>
          {about.education.length > 0 ? (
            <ul className="mt-6 space-y-6">
              {about.education.map((item) => (
                <li key={item.title}>
                  <p className="text-body font-medium text-ink">{item.title}</p>
                  <p className="mt-1 font-meta text-meta uppercase text-ink-faint">
                    {[item.place, item.period].filter(Boolean).join(' · ')}
                  </p>
                  {item.note && <p className="mt-2 text-body text-ink-soft">{item.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <PendingList label="formación" note="Estudios, cursos y certificaciones." />
            </div>
          )}
        </div>

        <div>
          <h3 className="font-meta text-meta uppercase text-ink-faint">Cómo trabajo</h3>
          {about.principles.length > 0 ? (
            <ul className="mt-6 space-y-6">
              {about.principles.map((item) => (
                <li key={item.title}>
                  <p className="text-body font-medium text-ink">{item.title}</p>
                  <p className="mt-2 max-w-read text-body text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <PendingList
                label="principios"
                note="Tres o cuatro. Es lo que diferencia a un portfolio de un currículum."
              />
            </div>
          )}
        </div>
      </div>

      {/*
        ── ENFOQUE E INTERESES ────────────────────────────────────────────

        Mismo bloque que Formación/Cómo trabajo, repetido: dos columnas, el
        mismo filete superior, los mismos tamaños de letra. No es una decisión
        de diseño nueva, es el mismo recurso usado una vez más.
      */}
      <div className="mt-area grid gap-block border-t border-rule pt-block md:grid-cols-2">
        <div>
          <h3 className="font-meta text-meta uppercase text-ink-faint">Enfoque</h3>
          {about.focus ? (
            <p className="mt-6 max-w-read text-body text-ink-soft">{about.focus}</p>
          ) : (
            <div className="mt-6">
              <PendingList
                label="enfoque"
                note="Una o dos frases: a qué tipo de trabajo se dedica, o querría dedicarse."
              />
            </div>
          )}
        </div>

        <div>
          <h3 className="font-meta text-meta uppercase text-ink-faint">Intereses</h3>
          {about.interests.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
              {about.interests.map((item) => (
                <li key={item} className="font-meta text-meta uppercase text-ink-faint">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <PendingList
                label="intereses"
                note="Áreas que le interesan más allá de lo que ya usa en esta web."
              />
            </div>
          )}
        </div>
      </div>

      {/*
        ── TECNOLOGÍAS DESTACADAS Y CIERRE ────────────────────────────────

        Un subconjunto pequeño de `knowledge.js` —no el inventario, para eso
        está Habilidades— y el único CTA de toda el área. Van juntos porque los
        dos son el remate: con qué se identifica y hacia dónde se sigue.
      */}
      <div className="mt-area border-t border-rule pt-block">
        <h3 className="font-meta text-meta uppercase text-ink-faint">Tecnologías destacadas</h3>
        {about.stack.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
            {about.stack.map((id) => (
              <li key={id} className="font-meta text-meta uppercase text-ink-faint">
                {knowledgeById.get(id)?.label ?? id}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <PendingList
              label="tecnologías destacadas"
              note="Ids de knowledge.js: las dos o tres con las que Alex se identifica más, no todo el inventario."
            />
          </div>
        )}

        <div className="mt-block">
          {hasCta ? (
            <a href={about.cta.href} className="link-quiet">
              {about.cta.label}
              {/* Lleva DENTRO de la web, así que su flecha es horizontal y no
                  la diagonal de salir: ver `.link-arrow-right`. */}
              <Icon name="forward" size="1.05em" className="link-arrow-right" />
            </a>
          ) : (
            <PendingList
              label="CTA"
              note="Un enlace de cierre: a proyectos, al CV o al correo. Hace falta el texto y el destino."
            />
          )}
        </div>
      </div>
    </PortfolioSection>
  )
}
