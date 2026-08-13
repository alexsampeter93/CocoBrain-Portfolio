/**
 * Única fuente de verdad de los proyectos.
 * Cada entrada genera un nodo en la sub-constelación de "Proyectos" y una
 * tarjeta en la lista HTML accesible.
 *
 * Forma de una entrada:
 * {
 *   id: 'slug-del-proyecto',
 *   title: '',
 *   tagline: '',          // una línea, lo que se lee al hacer hover
 *   description: '',      // 2-4 frases, el panel abierto
 *   stack: [],            // ['React', 'Node', 'Postgres']
 *   role: '',             // 'Full-stack', 'Frontend', ...
 *   year: 2026,
 *   links: { live: '', repo: '' },
 *   cover: '/img/projects/slug-del-proyecto.jpg',
 *   accent: '#C97B4A',
 * }
 */
export const projects = []
