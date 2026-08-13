/**
 * Montaje de la mascota a partir de las cinco piezas sueltas.
 *
 * Aquí NO se escriben pivotes ni rotaciones: se deducen de la geometría de
 * cada pieza en `src/utils/autoRig.js`. Lo único que se declara es lo que no
 * se puede deducir — dónde se engancha cada extremidad en el cuerpo, hacia
 * dónde apunta en reposo, y cuánto mide respecto al radio del cuerpo.
 *
 * Todo en múltiplos del radio del cuerpo, así que cambiar de modelo de coco
 * no obliga a recalcular nada.
 */
export const RIG_PARTS = [
  {
    id: 'arm_R',
    label: 'Brazo derecho',
    url: '/preview/part-arm-r.glb',
    // Punto del cuerpo donde nace, en radios del cuerpo.
    attach: [0.78, 0.05, 0.12],
    // Dirección en reposo: hacia abajo y algo separado del cuerpo.
    aim: [0.62, -0.78, 0.1],
    // Largo respecto al radio del cuerpo.
    length: 1.0,
  },
  {
    id: 'arm_L',
    label: 'Brazo izquierdo',
    url: '/preview/part-arm-l.glb',
    attach: [-0.78, 0.05, 0.12],
    aim: [-0.62, -0.78, 0.1],
    length: 1.0,
  },
  {
    id: 'leg_R',
    label: 'Pierna derecha',
    url: '/preview/part-leg-r.glb',
    attach: [0.34, -0.82, 0],
    aim: [0.1, -1, 0],
    length: 0.92,
  },
  {
    id: 'leg_L',
    label: 'Pierna izquierda',
    url: '/preview/part-leg-l.glb',
    attach: [-0.34, -0.82, 0],
    aim: [-0.1, -1, 0],
    length: 0.92,
  },
]

export const RIG_BODY = {
  id: 'body',
  label: 'Cuerpo',
  url: '/preview/part-body.glb',
}
