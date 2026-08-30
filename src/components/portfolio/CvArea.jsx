import PortfolioSection from './PortfolioSection'
import { PendingList } from './Pending'
import { cv } from '../../data/portfolio'

/**
 * CV — el resumen profesional, en una pantalla.
 *
 * ## Qué NO es
 *
 * No es un PDF incrustado en un visor. Un `<iframe>` con un documento dentro
 * rompe la experiencia de golpe: cambia la tipografía, el fondo, el scroll y la
 * escala, y deja claro que la web era una cosa y el CV es otra.
 *
 * Tampoco es una copia de las tres secciones anteriores. Si el CV repite
 * palabra por palabra experiencia y habilidades, sobra una de las dos.
 *
 * Es la versión de diez segundos: cuatro líneas que se pueden leer de pie, la
 * fecha de actualización —un currículum sin fecha no se cree— y la descarga
 * para quien la quiera. La descarga es un enlace de verdad a un archivo de
 * verdad; mientras no exista, no se enseña un botón que no lleva a ninguna
 * parte.
 */
export default function CvArea({ index }) {
  const hasFile = Boolean(cv.file)

  return (
    <PortfolioSection
      id="cv"
      act="5"
      index={index}
      label="CV"
      title="El resumen"
      lead={cv.summary || undefined}
    >
      <div className="mt-area grid gap-block lg:grid-cols-12">
        <div className="lg:col-span-7">
          {cv.highlights.length > 0 ? (
            <ul className="space-y-6">
              {cv.highlights.map((line) => (
                <li key={line} className="border-t border-rule pt-6 text-lead font-light text-ink">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <PendingList
              label="resumen profesional"
              note="Tres o cuatro líneas: lo que alguien debería recordar si solo lee esta sección."
            />
          )}
        </div>

        {/*
          La descarga va en su propia columna y con aire alrededor. Es la única
          acción de toda la página junto al contacto, y compartir sitio con el
          texto la convertiría en un enlace más.
        */}
        <div className="lg:col-span-4 lg:col-start-9">
          <h3 className="font-meta text-meta uppercase text-ink-faint">Documento</h3>

          {hasFile ? (
            <div className="mt-6">
              <a href={cv.file} download className="link-quiet">
                Descargar CV <span aria-hidden="true">↓</span>
              </a>
              {cv.updated && (
                <p className="mt-4 font-meta text-meta uppercase text-ink-faint">
                  actualizado · {cv.updated}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <PendingList
                label="PDF"
                note="El archivo va en public/ y su ruta en cv.file. Sin archivo no se enseña el enlace."
              />
            </div>
          )}
        </div>
      </div>
    </PortfolioSection>
  )
}
