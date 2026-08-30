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
     * ── DÓNDE ESTÁ EL PEDESTAL, MEDIDO EN EL ARCHIVO ──────────────────────
     *
     * `ground` es la fracción del ALTO de `art/hero-stage.webp` en la que
     * cae la superficie del podio. Sale de recorrer el píxel del archivo, no
     * de mirar la captura: a x=50% el suelo claro (255,243,234) se corta en
     * 0,827 y empieza el canto oscuro del podio (146,104,71) en 0,897. La
     * elipse de arriba vive entre esos dos, y su centro está en 0,861.
     *
     * Se planta a Olaz un pelo por delante del centro —0,868— porque el podio
     * se ve LIGERAMENTE desde arriba: en el centro exacto los pies quedan en
     * la mitad de atrás y la suela se despega del canto.
     *
     * Esto no es una preferencia, es la única manera de que los pies caigan en
     * el mismo sitio en las cuatro pantallas. El asset se sirve con
     * `object-cover` y su proporción es 16:9, así que en cualquier ventana más
     * estrecha que eso se ve entero de alto y RECORTADO de ancho: la fracción
     * vertical se conserva y la horizontal no. Por eso el encuadre se calcula
     * contra el alto —ver `cameraPath`— y por eso este número vive aquí y no
     * dentro de un componente.
     *
     * Si se cambia la lámina de la portada, este número se vuelve a medir.
     */
    stage: { ground: 0.868 },

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

    /**
     * La mente, detrás de la portada.
     *
     * `brain` es lo que mide el cerebro respecto al radio de la escena. Hacen
     * falta los dos números —el que dibuja y el que vuela— desde que la cámara
     * ENTRA en él: un dato que dos archivos necesitan y solo uno conoce es la
     * definición de dato mal colocado.
     *
     * `core` es cuánto de ese cerebro ocupa la red de dentro, y baja de 0,70 a
     * 0,44. El motivo es que la cavidad tiene ahora tres inquilinos y no dos:
     * la nube de conocimiento, las cinco áreas y la cámara, y las tres cosas
     * tienen que caber entre el centro y una pared que está a 0,49.
     *
     * El reparto que sale: nube hasta 0,115, áreas entre 0,165 y 0,195, cámara a
     * 0,369, pared a 0,54. Con 0,70 la nube llegaba a 0,252 y desbordaba el
     * encuadre desde la parada interior —31 grados de medio ángulo contra los
     * 17,5 de la cámara—; con 0,32 mide 17,3 y cabe justa, que es lo que se
     * quiere: la red llena el cuadro sin salirse.
     *
     * Y de paso arregla un pendiente que ya estaba escrito: desde la parada
     * interior la nube DESBORDABA el encuadre —medio ángulo 31° contra los 27°
     * de la cámara—, así que la red no se leía como red sino como discos
     * enormes. Ahora cabe.
     *
     * `fill` y `reach` se han ido: eran la vista general de la constelación
     * exterior, y ya no existe ninguna vista general desde fuera.
     */
    mind: { center: [0, 0, -11], radius: 3.4, brain: 0.62, core: 0.32 },
  },

  compact: {
    /**
     * Centrado en horizontal y subido: en vertical el texto ocupa el tercio
     * inferior, y con el personaje en el medio los dos se solapaban.
     *
     * `fill` es menor que en escritorio porque en vertical el ancho es el
     * límite, y llenarlo del todo deja al personaje tocando los bordes.
     */
    /**
     * `fill` vuelve a 0,62, y el motivo por el que había bajado a 0,52 ya no
     * existe.
     *
     * Bajó porque el titular vivía DEBAJO del personaje y se apoyaba en sus
     * suelas. Con el bodegón, Olaz se planta en el podio —que en vertical cae
     * en el 87% del alto— y el texto pasa a la mitad de arriba, que es la
     * parte lisa de la lámina. Encima y debajo dejan de disputarse el mismo
     * sitio, así que el personaje puede volver a ocupar lo que le toca.
     */
    mascot: { position: [0, 0.92, 0], height: 1.85, fill: 0.62 },
    handBrain: { position: [-0.52, 0.95, 0.6], size: 0.36 },

    /** El mismo podio de la misma lámina: la fracción no depende del ancho. */
    stage: { ground: 0.868 },
    /**
     * La red interior se encoge MÁS que en escritorio, en vez de alejar la
     * cámara.
     *
     * Alejarla fue lo primero que se probó, y no cabe: el casco está a 0,49 del
     * cerebro y la parada interior ya está en 0,42, así que retroceder lo justo
     * para compensar un encuadre vertical dejaba la cámara FUERA del cerebro
     * —es decir, arreglaba el encuadre rompiendo lo único que había que
     * conseguir—. Encogiendo la nube, la red cabe de alto y la cámara se queda
     * dentro.
     */
    mind: { center: [0, 0, -11], radius: 1.9, brain: 0.62, core: 0.28 },
  },
}

export function tokensFor(compact) {
  return compact ? tokens.compact : tokens.regular
}
