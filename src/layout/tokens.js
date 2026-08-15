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
    /**
     * Dónde se planta la mascota, cuánto mide de alto y qué fracción del ancho
     * visible puede ocupar como mucho. En una pantalla apaisada manda la
     * altura; en una estrecha, el ancho.
     */
    /**
     * `fill` es la fracción del encuadre que puede ocupar. Es la única
     * decisión de composición que queda a mano; la distancia de cámara sale de
     * ella por geometría, en `journey/framing.js`.
     */
    mascot: { position: [1.75, -0.15, 0], height: 3.1, fill: 0.78 },

    /**
     * El cerebro que sostiene en la mano. Es la puerta por la que entra la
     * cámara.
     *
     * Estas coordenadas son solo el punto de partida: en cuanto el modelo
     * carga, la mascota MIDE dónde ha quedado el cerebro de verdad y lo
     * reporta. Un número escrito a mano aquí se desajustaría en cuanto
     * cambiase el encuadre.
     */
    handBrain: { position: [0.95, 0.4, 0.85], size: 0.44 },

    /** El universo neuronal, detrás de la portada. */
    mind: { center: [0, 0, -11], radius: 3.4, fill: 0.86 },
  },

  compact: {
    /**
     * Centrado en horizontal y subido: en vertical el texto ocupa el tercio
     * inferior, y con el personaje en el medio los dos se solapaban.
     *
     * `fill` es menor que en escritorio porque en vertical el ancho es el
     * límite, y llenarlo del todo deja al personaje tocando los bordes.
     */
    mascot: { position: [0, 0.92, 0], height: 1.85, fill: 0.62 },
    handBrain: { position: [-0.52, 0.95, 0.6], size: 0.36 },
    /**
     * Radio menor y `fill` menor que en escritorio. La constelación es
     * esférica y una pantalla vertical es estrecha: aquí manda el ancho, y sin
     * bajar los dos números los nodos de los lados se quedaban fuera de cuadro.
     */
    mind: { center: [0, 0, -11], radius: 1.9, fill: 0.72 },
  },
}

export function tokensFor(compact) {
  return compact ? tokens.compact : tokens.regular
}
