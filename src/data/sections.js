/**
 * Unica fuente de verdad de las secciones.
 *
 * Cinco y no las siete del plan: CV vive dentro de Contacto y Formacion
 * dentro de Sobre mi. Siete nodos en una sola constelacion se leen como una
 * lista, no como una mente.
 *
 * `nodeName` coincidira con el Empty del GLB cuando exista; hasta entonces
 * las posiciones estan en `nodeLayout.js`.
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
    accent: '#6B4530',
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
    accent: '#C97B4A',
  },
  {
    id: 'contact',
    nodeName: 'node_05',
    label: 'Contacto',
    accent: '#FF6B85',
  },
]

/**
 * Contenido de las secciones.
 *
 * OJO: el texto de "Sobre mí" es un relleno de prueba escrito para ver como
 * queda la maquetacion. Hay que sustituirlo por el real antes de publicar.
 */
export const sectionContent = {
  about: [
    'Soy Alex, desarrollador full stack junior. Empecé por curiosidad y me quedé porque me gusta el momento en el que algo que no existía empieza a funcionar.',
    'Trabajo sobre todo con JavaScript: React en la parte de delante y Node en la de detrás. Últimamente me he metido en 3D para web, que es de donde sale esta página.',
    'CocoBrain es la marca bajo la que firmo lo que construyo. Nació de una idea sencilla: lo que durante años me costó, hoy es la forma en la que pienso.',
    'Busco un sitio donde aprender de gente mejor que yo y aportar de verdad, no hacer bulto.',
  ],
  experience: [],
  work: [],
  skills: [],
  contact: [],
}
