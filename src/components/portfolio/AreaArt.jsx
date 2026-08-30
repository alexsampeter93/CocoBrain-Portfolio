import { useState } from 'react'
import { areaArt, getVisualAsset } from '../../data/visualAssets'

/**
 * La ilustración de fondo de un área editorial.
 *
 * ## Qué sabe y qué no
 *
 * Sabe a qué ÁREA pertenece —`about`, `work`…— y nada más. Qué archivo le toca
 * y cómo se presenta lo decide `visualAssets`, así que cambiar el fondo de
 * "Proyectos" no pasa por aquí ni por el componente del área: se cambia una
 * palabra en el mapa.
 *
 * ## Muy tenue, y por qué
 *
 * Estas ilustraciones son bonitas y esa es exactamente la trampa. El área
 * editorial existe para que se lea un texto; un fondo que se mira es un fondo
 * que está robando atención al único contenido que importa. Al 20% pasa lo que
 * tiene que pasar: no se ve, se nota. Si al mirar la pantalla puedes describir
 * la ilustración sin fijarte, está demasiado fuerte.
 *
 * Va anclada al área y no a la ventana: entra y sale con su sección, así que el
 * fondo cambia cuando cambia el tema en vez de estar fijo detrás de todo.
 *
 * ## Las dos colocaciones
 *
 * Es lo que evita que seis áreas con cuatro ilustraciones se lean como seis
 * plantillas iguales, y sin necesidad de seis imágenes:
 *
 *     full  la ilustración ocupa el área. Para las secciones con masa
 *     edge  reducida a una mancha lateral que se disuelve. Para las que
 *           necesitan aire, y para las que van a recibir imágenes reales
 *
 * La misma ilustración a pantalla completa o convertida en una mancha no se lee
 * igual. Es el mismo recurso que hace que un libro con una sola familia
 * tipográfica no parezca monótono: cambia el peso, no el motivo.
 *
 * ## Las dos se disuelven por arriba y por abajo, y no es un adorno
 *
 * Sin eso se veía la COSTURA. Cada ilustración está anclada a su sección, así
 * que en el límite entre dos áreas una imagen terminaba y empezaba otra en la
 * misma fila de píxeles: un filete horizontal a lo ancho de la pantalla,
 * exactamente donde no hay ningún elemento que lo justifique. Es de esos
 * detalles que no se saben nombrar pero que hacen que una página parezca
 * montada a trozos.
 *
 * Disolviéndolas, dos áreas contiguas se solapan en una franja de nada y el
 * fondo pasa de un tema al siguiente sin que haya una línea donde ocurre.
 *
 * ## Si el archivo no llega
 *
 * Se pinta el color plano de la ilustración y ya está. Ni hueco blanco, ni
 * icono de imagen rota, ni salto de maquetación: el `tint` vive en el mapa
 * junto a la ruta justamente para esto.
 */
export default function AreaArt({ area }) {
  const entry = areaArt[area]
  const asset = entry ? getVisualAsset(entry.asset) : null
  const [failed, setFailed] = useState(false)

  if (!asset) return null

  const treatment = asset.treatment ?? {}
  const edge = entry.placement === 'edge'

  /**
   * `full` se disuelve solo por arriba y por abajo —la costura—. `edge` es una
   * elipse anclada al lateral DERECHO que se apaga en todas las direcciones a
   * la vez, así que resuelve las dos cosas de una sola pasada.
   *
   * A la derecha y no a la izquierda porque en las seis áreas el texto cae a la
   * izquierda. La ilustración se queda con la mitad que está vacía, que es la
   * forma de subirle la presencia sin que ningún párrafo se lea peor.
   *
   * Una máscara y no dos superpuestas a propósito: componer varias capas de
   * máscara necesita `mask-composite`, que no se comporta igual en todos los
   * navegadores y no aporta nada que no dé un solo degradado bien elegido.
   */
  const mask = edge
    ? 'radial-gradient(105% 80% at 96% 50%, #000 0%, rgba(0,0,0,0.4) 42%, transparent 72%)'
    : 'linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)'

  /**
   * La opacidad sale del asset y el área solo la ATENÚA. Así una ilustración
   * demasiado fuerte se corrige una vez, en el mapa, para todos los sitios en
   * los que aparece —y un área concreta puede seguir pidiendo menos sin
   * desmontar ese ajuste—.
   */
  const opacity = (treatment.opacity ?? 0.2) * (entry.intensity ?? 1)

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
      // La máscara va en la envoltura y no en la imagen: así el suelo de color
      // se disuelve con ella. Un color plano a pantalla completa deja la misma
      // costura horizontal que una fotografía, y encima más visible por ser
      // uniforme.
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {/* El suelo. Siempre presente, tape o no la imagen. */}
      <div className="absolute inset-0" style={{ backgroundColor: asset.tint, opacity: 0.16 }} />

      {!failed && (
        <img
          src={asset.src}
          srcSet={asset.srcSet}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            /**
             * La opacidad viaja como variable y la aplica `.area-art` en la
             * hoja de estilos, para que una pantalla estrecha pueda atenuarla
             * sin que este componente tenga que enterarse del tamaño.
             */
            '--art-opacity': opacity,
            // El encuadre también viaja como variable: en vertical lo ignora y
            // usa el suyo. Ver `.area-art` en `index.css`.
            '--art-position': treatment.position,
            transform: treatment.scale ? `scale(${treatment.scale})` : undefined,
            filter: treatment.blur ? `blur(${treatment.blur}px)` : undefined,
          }}
          className="area-art absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}
