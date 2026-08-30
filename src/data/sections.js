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
