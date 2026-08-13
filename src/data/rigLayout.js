/**
 * Montaje de la mascota a partir de las cinco piezas sueltas.
 *
 * Cada pieza vive dentro de dos grupos anidados:
 *
 *   grupo articulación   → `position` + `rotation`. Es lo que se anima.
 *     grupo malla        → desplazado por `-pivot`, escalado por `scale`.
 *
 * `pivot` es el punto de la malla que tiene que caer en la articulación. Al
 * desplazar la malla por su negativo, el origen del grupo exterior queda
 * exactamente en el hombro o la cadera, y rotarlo mueve el brazo como un
 * brazo. Es el mismo resultado que colocar el origen en Blender, sin Blender.
 *
 * Los valores se ajustan con el panel de montaje (`/?rig` en desarrollo) y se
 * fijan aquí cuando están bien.
 */
export const RIG_PARTS = [
  {
    id: 'body',
    label: 'Cuerpo',
    url: '/preview/part-body.glb',
    pivot: [0, 0, 0],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
  {
    id: 'arm_R',
    label: 'Brazo derecho',
    url: '/preview/part-arm-r.glb',
    // La pieza es alargada en X, así que el extremo del hombro está en un
    // extremo de ese eje.
    pivot: [-0.9, 0, 0],
    position: [0.72, 0.05, 0.1],
    rotation: [0, 0, -0.35],
    scale: 0.62,
  },
  {
    id: 'arm_L',
    label: 'Brazo izquierdo',
    url: '/preview/part-arm-l.glb',
    // Esta viene alargada en Z, no en X.
    pivot: [0, 0, -0.9],
    position: [-0.72, 0.05, 0.1],
    rotation: [0, 1.57, 0.35],
    scale: 0.62,
  },
  {
    id: 'leg_R',
    label: 'Pierna derecha',
    url: '/preview/part-leg-r.glb',
    pivot: [0, 0.9, 0],
    position: [0.3, -0.78, 0],
    rotation: [0, 0, 0],
    scale: 0.62,
  },
  {
    id: 'leg_L',
    label: 'Pierna izquierda',
    url: '/preview/part-leg-l.glb',
    pivot: [0, 0.9, 0],
    position: [-0.3, -0.78, 0],
    rotation: [0, 0, 0],
    scale: 0.62,
  },
]

const STORAGE_KEY = 'cb_rig_layout'

export function readRigLayout() {
  if (typeof window === 'undefined') return RIG_PARTS
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return RIG_PARTS
    const parsed = JSON.parse(stored)
    // Se fusiona por id en vez de sustituir: si mañana se añade una pieza
    // nueva, los ajustes guardados no la borran.
    return RIG_PARTS.map((part) => ({ ...part, ...(parsed[part.id] ?? {}) }))
  } catch {
    return RIG_PARTS
  }
}

export function writeRigLayout(parts) {
  try {
    const byId = Object.fromEntries(
      parts.map(({ id, pivot, position, rotation, scale }) => [
        id,
        { pivot, position, rotation, scale },
      ]),
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byId))
  } catch {
    // Modo incógnito: no es motivo para romper nada.
  }
}
