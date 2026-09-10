import PortfolioSection from './PortfolioSection'
import { PendingList } from './Pending'
import { useMediaViewer } from './MediaViewer'
import { useDrawThread, useMediaReveal, usePlate } from '../../animations/motion'
import { useScene } from '../../animations/editorial'
import { cv } from '../../data/portfolio'
import { Icon } from '../ui/Icon'

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
 *
 * ## Y VER no es lo mismo que DESCARGAR (petición de Alex)
 *
 * La hoja era el único enlace: pulsarla descargaba directamente. Dos acciones
 * distintas —"mírala más grande" y "guárdatela"— compartían un solo gesto, y
 * quien solo quería confirmar que el documento existe se encontraba con una
 * descarga que no había pedido.
 *
 * Ahora son DOS controles, cada uno con su verbo: la hoja abre el visor de
 * medios —el mismo que ya usan las capturas de Proyectos, con el mismo vuelo
 * desde su sitio— y la descarga vive fuera, en su propia fila, con su propio
 * icono. Es la misma pieza (`MediaViewerProvider`) que ya existe; no se crea
 * un segundo visor para un solo documento.
 */
/**
 * ── EL RITMO DEL CV: EL DESCANSO ────────────────────────────────────────────
 *
 * Es el único bloque del editorial que NO tiene que llamar la atención. Viene
 * después de veintiséis tecnologías y antes del cierre, y su trabajo es dejar
 * respirar: cuatro líneas y un documento.
 *
 * Así que su secuencia es la más corta y la más plana — las líneas suben doce
 * píxeles, el filete se traza, la hoja llega desde un poco más abajo — y no
 * hay ni una máscara tipográfica. Que una sección se mueva menos que las demás
 * también es composición: sin un tramo tranquilo, el ritmo de la página es una
 * sola nota repetida.
 */
const CV_CUES = {
  rule: { at: 0, from: { scaleX: 0, transformOrigin: 'left center' }, dur: 0.7 },
  meta: { at: 0.12, from: { y: 10, opacity: 0 }, dur: 0.6 },
  body: { at: 0.06, from: { y: 12, opacity: 0 }, stagger: 0.14, dur: 0.7 },
  media: { at: 0.3, from: { y: 30, opacity: 0 }, dur: 1 },
}

export default function CvArea({ index }) {
  const sheetScene = useScene({ cues: CV_CUES, start: 'top 86%', end: 'top 34%' })
  // La hoja se comporta como una lámina: entra asentándose y responde al
  // cursor con la misma inclinación y la misma sombra que las capturas.
  const sheet = useMediaReveal()
  usePlate(sheet)
  // El hilo que llega de Experiencia y el filete en el que se convierte.
  const arrival = useDrawThread()
  const viewer = useMediaViewer()

  const hasFile = Boolean(cv.file)
  const hasPreview = Boolean(cv.preview)

  /*
    El visor recibe una lista de UN elemento —no hay galería que recorrer,
    es un documento— y el mismo `meta` que ya usan los proyectos: el
    elemento pulsado (para el vuelo desde su sitio) y el área, para que el
    sello del visor diga "CV" y no invente un nombre.
  */
  const openPreview = (event) => {
    viewer?.open?.([cv.preview], 0, { originEl: event.currentTarget, area: 'cv', title: 'Curriculum Vitae' })
  }

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

        ── Y LA HOJA ERA UNA ISLA PEQUEÑA EN UN CAMPO VACÍO (12C) ───────────

        Medido a 1920: la columna del documento medía 4/12 —ya estrecha— y
        dentro de ESA columna la hoja se topaba en 19rem (304 px), sin llegar
        a llenar ni su propio hueco. Dos capas de desperdicio, no una: la
        columna dejaba aire de sobra y la hoja no usaba ni el aire que tenía.

        Ahora la columna del texto cede una parte —de 7 a 6, que no le hace
        falta: `max-w-read-lead` topa las líneas por CARACTERES, no por
        columna, así que perder una doceava parte no acorta ni una palabra—
        y la hoja crece hasta 26rem. Como su proporción es A4 fija, crecer en
        ancho la hace crecer en alto en la misma medida: es la palanca que
        también corrige que la sección midiera 1,6 pantallas contra las 2 a 10
        de las demás.
      */}
      <div ref={sheetScene} className="mt-area grid gap-block lg:grid-cols-12">
        <div className="lg:col-span-6">
          {cv.highlights.length > 0 ? (
            <ul className="space-y-10">
              {cv.highlights.map((line) => (
                <li
                  key={line}
                  data-cue="body"
                  className="max-w-read-lead border-t border-rule pt-8 text-lead font-light text-ink"
                >
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
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="relative lg:sticky lg:top-24">
            {/*
              ── EL HILO LLEGA Y SE CONVIERTE EN EL FILETE DEL DOCUMENTO ────

              Es la unión entre Experiencia y CV, y es literal: el mismo trazo
              vertical que enhebra los cuatro puestos baja hasta aquí, y al
              llegar gira noventa grados y se convierte en el filete que abre
              el documento.

              La trayectoria que acabas de recorrer **es** el borde superior
              del papel que la resume. No hay metáfora dibujada encima: es el
              mismo píxel de ancho, el mismo gris, dibujándose con el mismo
              scroll, que cambia de dirección.

              Va por encima del filete y colgando hacia arriba (`-top-24`), en
              el aire que la sección ya tenía entre el encabezado y esta
              columna. No ocupa sitio nuevo.
            */}
            <span
              ref={arrival}
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-0 hidden h-24 w-px bg-rule lg:block"
            />

            <span data-cue="rule" aria-hidden="true" className="block h-px w-12 bg-accent sm:w-20" />
            <h3 data-cue="meta" className="mt-6 font-meta text-meta uppercase text-ink-faint">
              Documento
            </h3>

            {hasFile ? (
              <>
                {hasPreview ? (
                  /*
                    ── LA HOJA ABRE EL VISOR, NO DESCARGA ────────────────

                    Un currículum es un DOCUMENTO, y el editorial ya tiene un
                    lenguaje para los objetos que se pueden coger: la lámina
                    de las capturas. Aquí hay una hoja en proporción A4 —
                    1 : 1,414, la del papel de verdad— con su borde, su
                    sombra larga y muy tenue, y el mismo comportamiento: se
                    inclina con el cursor, se despega al pasarle por encima
                    y su sombra se va al lado contrario.

                    Pulsarla abre el visor —el mismo que ya usan las
                    capturas de Proyectos, con el mismo vuelo desde su
                    sitio—, no descarga nada: para eso está el control de
                    abajo, fuera de la hoja. `type="button"` y un `sr-only`
                    dicen qué hace, porque la lámina no lleva ni una palabra
                    encima — es la propia PORTADA del documento, la captura
                    real generada con `scripts/cv-preview.mjs`, y no un PDF
                    incrustado: esa regla sigue en pie, esto es una imagen.
                  */
                  <button
                    ref={sheet}
                    type="button"
                    onClick={openPreview}
                    data-cue="media"
                    data-cursor="view"
                    data-cursor-label="Ver"
                    className="media-frame relative mt-6 block w-full max-w-[26rem] overflow-hidden border border-rule bg-surface"
                    style={{ aspectRatio: '1 / 1.414' }}
                  >
                    <span className="sr-only">Ampliar: portada del currículum de Alex</span>
                    <span data-media-plate className="media-plate relative block h-full w-full">
                      {/*
                        `useMediaReveal` busca `[data-media-inner]` dentro de
                        la misma referencia que anima y le aplica la escala
                        del asentamiento. Tiene que envolver la imagen
                        entera, no ser su hermana — si no, la portada entra a
                        golpe mientras el marco se asienta despacio.
                      */}
                      <span data-media-inner className="relative block h-full w-full">
                        <img
                          src={cv.preview.src}
                          srcSet={cv.preview.srcSet}
                          sizes="(max-width: 640px) 60vw, 19rem"
                          alt={cv.preview.alt}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </span>
                    </span>
                  </button>
                ) : (
                  /*
                    Sin captura todavía: la hoja se queda en el rótulo de
                    siempre. No es un botón —no hay nada que ampliar— así
                    que es un `div`: sigue inclinándose con el cursor porque
                    es un objeto físico, pero no ofrece una acción que no
                    existe.
                  */
                  <div
                    ref={sheet}
                    data-cue="media"
                    className="media-frame mt-6 block w-full max-w-[26rem] overflow-hidden border border-rule bg-surface"
                    style={{ aspectRatio: '1 / 1.414' }}
                  >
                    <span data-media-plate className="media-plate relative block h-full w-full">
                      <span data-media-inner className="relative flex h-full w-full flex-col p-7">
                        <span aria-hidden="true" className="block h-px w-10 bg-accent" />
                        <span className="mt-5 block font-display text-title font-semibold leading-[0.95] text-ink">
                          Curriculum
                          <br />
                          Vitae
                        </span>
                      </span>
                    </span>
                  </div>
                )}

                {/*
                  ── LA DESCARGA VIVE FUERA, EN SU PROPIA FILA ─────────────

                  Ver es una cosa y guardarse el archivo es otra, y hasta
                  ahora compartían un solo gesto: pulsar la hoja descargaba
                  directamente, sin posibilidad de solo mirarla. Ahora son
                  dos controles con dos verbos, y este es el segundo — el
                  mismo `link-quiet` y la misma flecha que ya usa el resto
                  del editorial para "algo que baja".
                */}
                <div className="mt-5 flex items-center justify-between gap-4">
                  {cv.updated && (
                    <span className="font-meta text-meta uppercase text-ink-faint">
                      actualizado · {cv.updated}
                    </span>
                  )}
                  <a href={cv.file} download className="link-quiet ml-auto">
                    Descargar PDF
                    <Icon name="download" size="1.15em" className="link-arrow-down" />
                  </a>
                </div>
              </>
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
