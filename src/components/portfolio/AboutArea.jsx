import PortfolioSection from './PortfolioSection'
import { PendingList, PendingText } from './Pending'
import { about } from '../../data/portfolio'
import { knowledgeById } from '../../data/network'

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
export default function AboutArea({ index }) {
  const hasCta = Boolean(about.cta?.label && about.cta?.href)

  return (
    <PortfolioSection
      id="about"
      act="3"
      index={index}
      label="Sobre mí"
      title={about.headline || 'Quién hay detrás'}
      lead={about.summary || undefined}
    >
      <div className="mt-block grid gap-block lg:grid-cols-12">
        {/*
          La columna de lectura arranca en la cuarta doceava parte. El hueco de
          la izquierda es tan parte de la composición como el texto.
        */}
        <div className="lg:col-span-7 lg:col-start-5">
          {about.body.length > 0 ? (
            about.body.map((text) => (
              <p key={text.slice(0, 24)} className="mb-6 max-w-read text-body text-ink-soft">
                {text}
              </p>
            ))
          ) : (
            <PendingText label="presentación y trayectoria" lines={4} />
          )}

          {/*
            ── EL MANIFIESTO DE COCOBRAIN ────────────────────────────────

            Va al final de la columna porque el cuerpo termina contando qué es
            CocoBrain: estas dos frases son su remate, no un párrafo más.

            No lleva maquetación nueva. Es exactamente la clase con la que la
            coda de Contacto pinta la primera de las dos —`text-lead font-light
            text-ink-soft`—, así que la frase se ve igual en los dos sitios y se
            reconoce como la misma cosa. Y no es un enlace: un manifiesto que
            lleva a alguna parte deja de ser un manifiesto.
          */}
          {about.manifesto?.length > 0 && (
            <div className="mt-block space-y-4">
              {about.manifesto.map((line) => (
                <p key={line} className="max-w-read text-lead font-light text-ink-soft">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

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
              {about.cta.label} <span aria-hidden="true">→</span>
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
