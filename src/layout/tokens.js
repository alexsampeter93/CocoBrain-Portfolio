/**
 * Geometría del mundo, por tamaño de pantalla.
 *
 * Esto existe porque el móvil nunca ha estado bien: había un `compact ? a : b`
 * suelto en cada archivo, con números elegidos a ojo y sin relación entre
 * ellos. Cambiar el encuadre significaba buscar por medio proyecto.
 *
 * Aquí no se decide cómo se ve nada. Se decide DÓNDE está cada cosa. La
 * cámara, los desvanecidos y los nodos salen todos de estos números, así que
 * mover a Olaz medio metro ya no puede descuadrar el resto.
 *
 * Unidades de mundo de three. Olaz mide ~3 de alto en escritorio.
 */

/** Por debajo de esto se usa el juego `compact`. */
export const COMPACT_QUERY = '(max-width: 1023px)'

/**
 * Escritorio: Olaz a la derecha, el texto respira a la izquierda.
 * Móvil: Olaz centrado y algo más alto, con el texto debajo.
 */
export const tokens = {
  regular: {
    /** Dónde se planta la mascota y cuánto ocupa de alto. */
    mascot: { position: [1.75, -0.15, 0], height: 3.1 },

    /**
     * El cerebro que sostiene en la mano. Es la puerta: la cámara entra por
     * aquí, así que su posición manda sobre todo el tramo de acercamiento.
     */
    handBrain: { position: [0.95, 0.4, 0.85], size: 0.44 },

    /** El universo neuronal, detrás de la portada. */
    mind: { center: [0, 0, -11], radius: 3.4 },

    /** Distancia de la cámara al sujeto en la portada. */
    heroDistance: 6.4,
  },

  compact: {
    mascot: { position: [0, 0.55, 0], height: 2.5 },
    handBrain: { position: [-0.52, 0.95, 0.6], size: 0.36 },
    mind: { center: [0, 0, -11], radius: 2.5 },
    heroDistance: 5.6,
  },
}

export function tokensFor(compact) {
  return compact ? tokens.compact : tokens.regular
}
