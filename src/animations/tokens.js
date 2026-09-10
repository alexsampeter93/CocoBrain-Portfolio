/**
 * ── LOS NÚMEROS DEL MOVIMIENTO, Y EL ORDEN DE LAS CAPAS ─────────────────────
 *
 * Tres tablas y ninguna lógica. Están juntas porque las tres contestan la misma
 * clase de pregunta —"¿cuánto?" y "¿delante o detrás?"— y porque un valor que
 * vive en dos sitios deja de coincidir el día que cambia uno.
 *
 * `MOTION` estaba en `animations/motion.js` desde la fase 6 y se muda aquí sin
 * cambiar ni un número: ahora lo leen también las primitivas nuevas, y un
 * módulo de gestos no puede ser la fuente de los valores que usan los demás.
 */

/**
 * Los números del sistema. Son pocos a propósito: con treinta valores no hay
 * lenguaje, hay una colección de efectos.
 *
 * `RISE` está en píxeles y no en `rem` porque es un desplazamiento óptico, no
 * tipográfico: tiene que valer lo mismo en un titular que en una línea de
 * metadatos.
 */
export const MOTION = {
  /**
   * Cuánto sube un bloque al entrar. Un gesto, no un viaje — pero eran 20 px
   * sobre una ventana de 1262, o sea el 1,6%: por debajo del umbral en el
   * que se percibe que algo se ha movido. Es la observación que abre 10E, y
   * la fase entera sale de corregirla: el techo no lo pone GSAP —ya está
   * instalado entero, con SplitText incluido y sin usar— lo pone la AMPLITUD.
   * 42 px son el 3,3%: se sigue leyendo como un gesto, no como un viaje, y ya
   * se nota sin cronómetro.
   */
  RISE: 42,
  /** Y cuánto sube una imagen, que pesa más y por eso se mueve menos que el
   *  texto — pero más que antes: 54 px, el 4,3% de esa misma ventana. */
  RISE_MEDIA: 54,
  /**
   * De cuánto parte la escala de una imagen. Termina SIEMPRE en 1: el estado
   * en reposo es el encuadre que se eligió en la fase 5E, sin recortar. Solo
   * cambia el ORIGEN del asentamiento —1,075 en vez de 1,045— así que la
   * imagen recorre más camino para llegar al mismo sitio exacto.
   */
  SETTLE: 1.075,
  /** El retraso entre hermanos, en unidades de la propia línea de tiempo. */
  STAGGER: 0.22,
  /**
   * La suavización del scrub, en segundos de amortiguación. Es el único número
   * con unidad de tiempo de todo el módulo y no es una duración: es cuánto
   * tarda la animación en alcanzar al scroll. El mismo papel que la constante
   * del reloj del recorrido.
   */
  SCRUB: 0.55,
  /**
   * La ventana de scroll en la que ocurre una entrada: empieza cuando el
   * elemento asoma y termina cuando tiene la cabeza a dos tercios de pantalla.
   *
   * El número sale de una medición y de una sospecha que resultó FALSA, que
   * conviene dejar escrita. Al aterrizar en Proyectos desde "Explorar", la
   * captura principal se quedaba al 28% de opacidad y parecía un fallo de
   * carga. Medido dónde cae de verdad esa figura tras el salto:
   *
   *     1920   su borde superior al  77% del alto
   *     1366   al  94%
   *      390   al  87%
   *
   * O sea que no estaba a media opacidad DENTRO del cuadro: estaba fuera, o
   * asomando por el canto inferior. La opacidad era correcta.
   *
   * La ventana se acortó igualmente —de [88% · 55%] a [92% · 68%]— porque a
   * esta página se puede llegar por un enlace y quedarse quieta, y en ese caso
   * conviene que todo lo que se vea esté entero cuanto antes. Pero la razón es
   * esa y no la que parecía.
   */
  START: 'top 92%',
  END: 'top 68%',
  /** Y la de un desplazamiento largo, que dura toda la travesía del elemento. */
  DRIFT_START: 'top bottom',
  DRIFT_END: 'bottom top',
  /**
   * Cuánto se desplaza un plano respecto de otro durante su travesía
   * completa. Era 26; sube a 40 en 10E, con la misma reserva que llevaba
   * escrita: sigue siendo un plano de PROFUNDIDAD —la ilustración del umbral,
   * el hero de un capítulo— no la lectura principal.
   */
  DRIFT: 40,
}

/**
 * ── LA JERARQUÍA DE COMPOSICIÓN DEL EDITORIAL ───────────────────────────────
 *
 * Hasta esta fase el orden de pintado dentro de un área editorial no lo decidía
 * nadie: lo decidía el ORDEN DEL DOM y qué elementos resultaban estar
 * posicionados. Y eso produjo el fallo que abre la fase 7A —medido, no
 * intuido—: en Proyectos, la lista de tecnologías, que es `lg:sticky` y por
 * tanto un elemento POSICIONADO, se pintaba encima de las láminas del abanico.
 * Hasta 4.048 px² de nombres de tecnología escritos sobre una captura.
 *
 * Nadie lo decidió. Simplemente `position: sticky` convierte un elemento en
 * posicionado, los posicionados se pintan después del contenido en flujo, y la
 * columna del texto viene después del escenario en el DOM.
 *
 * Así que el orden se declara, y se declara UNA vez:
 *
 *     ART       la ilustración del área. Detrás de todo, siempre
 *     MEDIA     capturas, vídeo, el abanico
 *     OBJECT    los objetos 3D editoriales
 *     TEXT      el texto. Por delante de la evidencia que ilustra
 *     UI        enlaces, controles, lo que se puede tocar
 *
 * Son cinco valores pequeños y consecutivos a propósito. Un `z-index: 9999` no
 * es una jerarquía: es la confesión de que no hay ninguna. Y van dentro de un
 * `isolation: isolate` en la ficha, así que la escala es LOCAL — subir una capa
 * aquí no puede colarse por delante del HUD ni del grano.
 *
 * La regla de contenido que ordena la escala: **el texto va siempre por delante
 * del medio, y el medio nunca ocupa el sitio del texto.** La segunda mitad no
 * la resuelve el `z-index` sino la composición; ver `STAGE_LAYOUTS`.
 */
export const LAYER = {
  ART: 0,
  MEDIA: 10,
  OBJECT: 20,
  TEXT: 30,
  UI: 40,
}

/**
 * ── PROFUNDIDAD, EN PLANOS ──────────────────────────────────────────────────
 *
 * Un elemento no declara "muévete 26 píxeles": declara EN QUÉ PLANO está, y el
 * desplazamiento sale de ahí. Es la diferencia entre tener paralaje y tener
 * profundidad — con números sueltos, dos elementos que deberían estar a la
 * misma distancia acaban a distancias distintas sin que nadie lo note.
 *
 *     0   el fondo: la ilustración del área. Casi no se mueve
 *     1   el plano medio: la lámina principal, el hueco del objeto
 *     2   el primer plano: las láminas del abanico, lo que se te echa encima
 *
 * El número multiplica, no sustituye: `depth(2)` se mueve el doble que
 * `depth(1)` durante la misma travesía. Y por eso el valor es la DISTANCIA y no
 * la velocidad, que es como se piensa una composición.
 */
export const DEPTH = [0.35, 1, 1.85]

/** Cuánto se mueve un plano en su travesía completa, en píxeles. */
export const depthShift = (plane = 1) => MOTION.DRIFT * (DEPTH[plane] ?? 1)

/** ¿Estamos en una pantalla en la que la profundidad aporta algo? */
export const isRoomy = () => typeof window !== 'undefined' && window.innerWidth >= 1024

/** La consulta que decide dónde hay un cursor de verdad al que responder. */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'
