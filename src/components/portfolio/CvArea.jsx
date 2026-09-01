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
      {/*
        ── LA SECCIÓN DEJA DE SER UN PIE DE PÁGINA ─────────────────────────

        Medida a 1920 ocupaba 749 px, o sea 0,69 pantallas: la única de las
        cinco que no llegaba a llenar una, así que el cierre del portfolio
        entraba en el mismo cuadro que el encabezado de Contacto y se leía como
        un pie.

        Lo que le faltaba no era contenido —los highlights ya estaban— sino
        MEDIDA: cada línea entra ahora como un renglón de currículum a tamaño de
        destacado, con su filete y su aire, en vez de apretadas en una lista.
      */}
      <div className="mt-area grid gap-block lg:grid-cols-12">
        <div className="lg:col-span-7">
          {cv.highlights.length > 0 ? (
            <ul className="space-y-10">
              {cv.highlights.map((line) => (
                <li key={line} className="border-t border-rule pt-8 text-lead font-light text-ink">
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

          Se queda PEGADA mientras se leen las líneas de al lado: es la acción
          de la sección, y una acción que se va por arriba en cuanto empiezas a
          leer deja de estar disponible justo cuando has terminado de decidir.
          El filete lleva el acento del acto, igual que el encabezado, para que
          se lea como parte de la misma pieza y no como un módulo aparte.
        */}
        <div className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-24">
            <span aria-hidden="true" className="block h-px w-12 bg-accent sm:w-20" />
            <h3 className="mt-6 font-meta text-meta uppercase text-ink-faint">Documento</h3>

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
      </div>
    </PortfolioSection>
  )
}
