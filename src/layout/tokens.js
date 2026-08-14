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
    mascot: { position: [1.75, -0.15, 0], height: 3.1, widthFill: 0.5 },

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
    mind: { center: [0, 0, -11], radius: 3.4 },

    /**
     * Distancia de la cámara en la portada.
     *
     * A 6,4 el personaje ocupaba el 77% del alto visible y le quedaban 0,17
     * unidades hasta el borde inferior —o sea, nada—. A 7,0 respira y las
     * zapatillas están dentro con margen por arriba y por abajo.
     */
    heroDistance: 7.0,
  },

  compact: {
    /**
     * Más arriba y algo más pequeño que en escritorio: en vertical el texto
     * ocupa el tercio inferior, y con el personaje centrado los dos se
     * solapaban. En móvil no compiten por el espacio, se reparten la pantalla.
     */
    mascot: { position: [0, 0.92, 0], height: 1.85, widthFill: 0.86 },
    handBrain: { position: [-0.52, 0.95, 0.6], size: 0.36 },
    mind: { center: [0, 0, -11], radius: 2.5 },
    heroDistance: 6.6,
  },
}

export function tokensFor(compact) {
  return compact ? tokens.compact : tokens.regular
}
