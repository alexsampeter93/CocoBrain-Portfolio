import PortfolioSection from './PortfolioSection'
import { PendingList, PendingText } from './Pending'
import { about } from '../../data/portfolio'

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
 */
export default function AboutArea({ index }) {
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
    </PortfolioSection>
  )
}
