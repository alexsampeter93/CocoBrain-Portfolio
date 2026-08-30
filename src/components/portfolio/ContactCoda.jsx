import AreaArt from './AreaArt'
import { SectionHeading } from './PortfolioSection'
import { PendingList } from './Pending'
import { contact } from '../../data/portfolio'

/**
 * EL CIERRE — la conversión.
 *
 * ## Por qué no es un área con nodo
 *
 * Porque no es un sitio que se visita: es donde acabas. Ponerlo como sexta
 * parada lo dejaba a la misma altura que "Habilidades" —algo que se mira y se
 * abandona para seguir bajando— cuando es lo único de la página que pide una
 * acción.
 *
 * Sin formulario, a propósito. Nadie rellena un formulario en un portfolio, y
 * un campo de texto con su botón de enviar es justo la estética de plantilla
 * que el proyecto prohíbe. Un correo que se puede copiar y dos enlaces hacen el
 * mismo trabajo sin fingir un producto.
 *
 * Y aquí el eslogan cierra el círculo. Es lo primero que se lee en la portada y
 * lo último antes de irse: la web empieza y termina diciendo lo mismo.
 */
export default function ContactCoda() {
  const hasEmail = Boolean(contact.email)

  return (
    <section id="contacto" data-act="5" className="relative scroll-mt-24 px-gutter py-area">
      {/*
        La única ilustración cálida del tramo de lectura, y va aquí por eso: la
        coda tiene que sonar a la portada. Se entra por un crema y se sale con
        el mismo crema, después de haber pasado por la oscuridad de la mente.
      */}
      <AreaArt area="contacto" />

      <div className="relative mx-auto max-w-editorial">
        <SectionHeading label="Contacto" />

        <h2 className="mt-block max-w-editorial text-display font-display font-semibold text-ink">
          Hablemos
        </h2>

        <div className="mt-area grid gap-block lg:grid-cols-12">
          <div className="lg:col-span-6">
            {hasEmail ? (
              <a href={`mailto:${contact.email}`} className="link-quiet text-lead normal-case">
                {contact.email}
              </a>
            ) : (
              <PendingList
                label="correo y enlaces"
                note="Un correo y los perfiles que importen. Nada más."
              />
            )}

            {contact.links.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                {contact.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="link-quiet" target="_blank" rel="noreferrer">
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <p className="max-w-read text-lead font-light text-ink-soft">
              Nuestra mayor <em className="not-italic text-accent">inspiración</em> fue una vez
              nuestra mayor <em className="not-italic text-accent">debilidad</em>.
            </p>
          </div>
        </div>

        <p className="mt-area border-t border-rule pt-8 font-meta text-meta uppercase text-ink-faint">
          CocoBrain — Alex
        </p>
      </div>
    </section>
  )
}
