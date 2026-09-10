import { nodeCoord } from './nodeLayout.js'

/**
 * Única fuente de verdad de las ÁREAS del portfolio: su identidad y nada más.
 *
 * Cinco, y no las siete del plan original: Formación vive dentro de Sobre mí y
 * el contacto ya no es un área. Siete nodos en una sola constelación se leen
 * como una lista, no como una mente.
 *
 * El quinto era Contacto y ahora es CV. El contacto no desaparece: deja de
 * ser una parada del recorrido y pasa a ser el CIERRE de la página. Es la
 * conversión, lo último que se lee, y ponerlo como un nodo más lo dejaba a la
 * misma altura que Habilidades —una parada intermedia que se visita y se
 * abandona— cuando es justo lo contrario.
 *
 * Aquí NO hay textos. Los títulos y párrafos de cada área viven en
 * `portfolio.js`, que la escena 3D no lee.
 *
 * `nodeName` coincidirá con el Empty del GLB cuando exista; hasta entonces
 * las posiciones están en `nodeLayout.js`.
 *
 * ## Los acentos
 *
 * Son el color DIFUSO del nodo de cada área en la constelación —el emisivo lo
 * pone `NeuralNodes` y es común—, así que aquí se decide de qué está hecho
 * cada nodo, no cuánto brilla.
 *
 * Siguen el mismo reparto por actos que el editorial: Sobre mí y Proyectos en
 * los tonos cálidos del acto 3, Experiencia y Habilidades en añil —son el acto
 * 4—, y CV vuelve al coco para cerrar. Que los cinco nodos de la escena lleven
 * los colores de las cinco secciones que representan es lo que hace que la
 * constelación y el texto se sientan la misma web.
 *
 * El añil va en un tono medio y no en el `#2C4A73` de la interfaz: un nodo es
 * una esfera pequeña iluminada por una ambiental tenue, y el añil de los
 * filetes de CSS ahí saldría negro.
 */
/**
 * ── QUÉ ÁREAS SE LEEN SOBRE SUELO OSCURO (fase 10D) ─────────────────────────
 *
 * Una, y aquí. Lo leen DOS sitios que no comparten árbol —`PortfolioSection`,
 * que pinta la superficie, y `App`, que se lo cuenta al documento para que el
 * HUD fijo voltee su tinta— y un dato con dos lectores no puede estar escrito
 * dos veces: es la regla de esta casa desde que el sello de coordenadas dejó
 * de copiarse a mano.
 *
 * Y es un conjunto de UNO a propósito. Dos áreas oscuras dejarían de ser un
 * paréntesis y pasarían a ser el tono de la web, que es lo que la proporción
 * 70/20/10 prohíbe. Ver §7.
 */
export const DARK_GROUND_AREAS = new Set(['experience'])

export const sections = [
  {
    id: 'about',
    nodeName: 'node_01',
    label: 'Sobre mí',
    accent: '#C99B6E',
  },
  {
    id: 'experience',
    nodeName: 'node_02',
    label: 'Experiencia',
    accent: '#7B93BC',
  },
  {
    id: 'work',
    nodeName: 'node_03',
    label: 'Proyectos',
    accent: '#F2939E',
  },
  {
    id: 'skills',
    nodeName: 'node_04',
    label: 'Habilidades',
    accent: '#9FB2D2',
  },
  {
    id: 'cv',
    nodeName: 'node_05',
    label: 'CV',
    accent: '#B98A62',
  },
]

/**
 * ── EL NÚMERO DE UN ÁREA, EN UN SOLO SITIO ──────────────────────────────────
 *
 * Estaba escrito a mano en `App.jsx` —`index="01"`, `index="03"`…— y además en
 * el nombre del nodo de cada área, que es `node_01`. Dos copias del mismo dato,
 * y la web tiene ya escrito lo que pasa con eso: tarde o temprano dejan de
 * coincidir.
 *
 * El número ES el del nodo, porque el número que se lee al llegar a un área es
 * el del punto de luz del que se viene. Se deriva, no se repite.
 */
export const areaIndex = Object.fromEntries(
  sections.map((section) => [section.id, section.nodeName.slice(-2)]),
)

/**
 * ── EL SELLO DE CADA AREA ───────────────────────────────────────────────────
 *
 * El numero, el angulo y el radio con los que el area esta colocada alrededor
 * del cerebro. Los tres salen de `nodeLayout`, o sea del MISMO dato que pone
 * el nodo en su sitio: no hay una segunda copia que se pueda desfasar.
 *
 * El angulo se redondea a grados enteros y el radio a dos decimales porque un
 * sello es una marca, no una medicion: "28° · r1,10" se lee de un vistazo y
 * "28,0000° · r1,1000" no se lee.
 */
export const areaStamp = Object.fromEntries(
  sections.map((section) => {
    const coord = nodeCoord(section.nodeName)
    return [
      section.id,
      {
        index: section.nodeName.slice(-2),
        angle: coord ? Math.round(coord.angle) : null,
        radius: coord ? coord.radius.toFixed(2) : null,
      },
    ]
  }),
)
