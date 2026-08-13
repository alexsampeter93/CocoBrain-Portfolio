/**
 * Única fuente de verdad de las secciones.
 * `nodeName` tiene que coincidir con el nombre del Empty dentro de cocobrain.glb:
 * las posiciones se leen del modelo, nunca se escriben a mano aquí.
 */
export const sections = [
  {
    id: 'about',
    nodeName: 'node_01',
    label: 'Sobre mí',
    accent: '#C99B6E',
  },
  {
    id: 'work',
    nodeName: 'node_02',
    label: 'Proyectos',
    accent: '#F2939E',
  },
  {
    id: 'stack',
    nodeName: 'node_03',
    label: 'Stack',
    accent: '#6B4530',
  },
  {
    id: 'contact',
    nodeName: 'node_04',
    label: 'Contacto',
    accent: '#FF6B85',
  },
  // node_05 queda de reserva hasta decidir qué va ahí.
]
