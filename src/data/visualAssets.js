/**
 * EL MAPA DE LAS ILUSTRACIONES. La única fuente de verdad de qué archivo es
 * cada cosa, y —lo que se corrigió en la fase 5D— de qué FUNCIÓN cumple.
 *
 * ## El error que corrige esta versión
 *
 * La primera versión de este mapa tenía dos grupos: "la mente" y "el
 * editorial". En la práctica eso significaba que casi todas las ilustraciones
 * acababan siendo fondos de secciones HTML, porque era el único sitio donde
 * cabían. El recorrido —la parte que de verdad es esta web— se quedaba sin una
 * sola imagen, y las que había se leían como una galería de fondos bonitos.
 *
 * Ahora el mapa está ordenado por MOMENTO DEL RECORRIDO, no por tecnología:
 *
 *     hero        la portada. Olaz manda, el fondo acompaña
 *     mind        la mente. Casi vacío a propósito: ahí manda Three.js
 *     transitions los dos cruces de la corteza. La escenografía de verdad
 *     editorial   el tramo de lectura
 *     icons       todavía no existe
 *
 * La pregunta que decide si una imagen entra no es "¿dónde la pongo?" sino
 * "¿qué función narrativa cumple?". Si no cumple ninguna, se queda fuera aunque
 * sea buena —y varias de las que se han quedado fuera son buenas—.
 *
 * ## La regla que no cambia
 *
 * **Ningún componente sabe qué archivo está usando.** Se pide una función
 * —`getVisualAsset('transitions.enter')`— y este mapa decide cuál es. Sustituir
 * una ilustración es cambiar una línea de aquí.
 *
 * ## Los nombres describen la función, no el origen
 *
 * Los originales salen de un generador y se llaman `Gemini_Generated_Image_
 * ft6bbbft6bbbft6b.jpg`, que no significa nada. Los derivados se llaman por el
 * trabajo que hacen —`portal-enter`— para que el nombre siga diciendo algo
 * dentro de seis meses y para que cambiar el archivo por otro mejor no obligue
 * a renombrar nada.
 *
 * ## Una sola copia por imagen
 *
 * Si una ilustración vale para dos sitios se referencia dos veces; **nunca se
 * duplica el archivo**. La misma imagen con otra opacidad, otra escala u otro
 * recorte se lee distinta, y eso es justamente lo que hace que todo pertenezca
 * a la misma familia visual en vez de parecer siete plantillas.
 *
 * ## Originales y derivados
 *
 * Los originales viven en `fotos web/`, fuera de git, igual que `Assets/`. Aquí
 * solo se nombran los derivados de `public/img/art/`: WebP en dos anchos, 380 KB
 * los siete frente a los 11 MB de los originales.
 */

/**
 * Marca de asset que todavía no existe.
 *
 * **No se sustituye una ausencia por una imagen genérica.** Un hueco declarado
 * se puede buscar con `grep`, se ve en el informe y se rellena el día que llegue
 * el archivo; un hueco tapado con la imagen más parecida que había a mano se
 * queda ahí para siempre porque nadie recuerda que era provisional.
 */
export const MISSING_ASSET = null

/**
 * Una ilustración: los dos anchos y el color que la representa.
 *
 * `tint` no es decorativo: es el color plano que se pinta DEBAJO. Si el archivo
 * tarda o no llega, el hueco no se queda en blanco ni rompe la composición —se
 * ve ese color, que es la media real de la imagen, medida y no elegida a ojo—.
 * Es el fallback, y por eso vive junto a la ruta y no en una hoja de estilos.
 *
 * `treatment` es cómo se PRESENTA sin tocar el archivo: opacidad, escala,
 * encuadre, desenfoque, brillo. Que esté aquí y no en el componente es lo que
 * permite cambiar una imagen por otra de encuadre distinto y corregirla en el
 * mismo sitio en el que se cambió.
 */
function art(name, tint, treatment = {}) {
  return {
    src: `/img/art/${name}.webp`,
    small: `/img/art/${name}-sm.webp`,
    srcSet: `/img/art/${name}-sm.webp 900w, /img/art/${name}.webp 1600w`,
    tint,
    treatment,
  }
}

/** Una ilustración que ya vivía en `public/img/`, anterior a este mapa. */
function legacy(name, tint, width, treatment = {}) {
  return {
    src: `/img/${name}.webp`,
    small: `/img/${name}-sm.webp`,
    srcSet: `/img/${name}-sm.webp 900w, /img/${name}.webp ${width}w`,
    tint,
    treatment,
  }
}

export const visualAssets = {
  /**
   * ── ACTO 1 · LA PORTADA ────────────────────────────────────────────────
   *
   * **Olaz y el cerebro de su mano son el protagonista absoluto y no se
   * tocan.** Todo lo que hay aquí existe para que el personaje esté DENTRO de
   * un sitio, no para mirarse.
   *
   * ## La regla anterior era media verdad
   *
   * Decía que la portada no admite ilustraciones con forma reconocible porque
   * siempre le ganan la atención a un modelo quieto. Eso es cierto **de una
   * imagen plana**, y la conclusión que se sacó —desenfocarla hasta que no se
   * viera— resolvió el síntoma y creó otro: un fondo a 14 px no es una sala, es
   * una mancha, y Olaz seguía pareciendo pegado encima porque no había nada
   * delante de él.
   *
   * Lo que de verdad separa a un personaje de su decorado no es que el decorado
   * esté borroso: es que haya PLANOS. Un marco delante, una sala detrás, y las
   * dos cosas moviéndose a velocidades distintas. Con eso el fondo puede estar
   * nítido —y debe estarlo— sin robar nada.
   */
  hero: {
    /**
     * EL SUELO. Un degradado cálido sin forma, anterior a esta colección.
     *
     * Sigue estando y sigue siendo necesario: es lo que se ve por los bordes y
     * por detrás del entorno, y es lo que evita que el entorno se lea como una
     * fotografía rectangular pegada. Un rectángulo se nota cuando tiene un
     * borde; sobre un degradado del mismo calor, no lo tiene.
     */
    background: legacy('bg-hero', '#e8d5bd', 1920),

    /**
     * ── EL ENTORNO, EN DOS PROFUNDIDADES ──────────────────────────────────
     *
     * Una sala de arquitectura orgánica: bóvedas de marfil, columnas, madera de
     * coco y los huecos del fondo en añil profundo. De aquí sale el añil de toda
     * la web.
     *
     * ## Por qué son DOS archivos y no uno
     *
     * Son dos encuadres de la misma sala, y cada uno gana en una cosa distinta.
     * Medido sobre los cuatro candidatos:
     *
     *     | zona del texto (media/sd) | esquina sup-izq | añil |
     *     | `far`   218 / 42          |       86        | 7,6% |
     *     | `near`  187 / 71          |       52        | 7,9% |
     *
     * `far` tiene la pared izquierda más limpia y más clara que ninguna otra
     * —el titular se lee sobre ella sin necesidad de ponerle nada debajo—, pero
     * justamente por eso no tiene primer plano: su esquina superior es tan clara
     * como el resto y la imagen se queda plana.
     *
     * `near` es al revés: el arco de madera oscuro de la esquina y la masa de
     * marfil de abajo forman un marco natural —51 puntos de rango entre lo más
     * cerca y lo más lejos— pero esa misma variación cae justo donde va el
     * texto.
     *
     * Puestas una detrás de otra, cada una hace lo que sabe hacer: el fondo
     * limpio deja leer, y el marco recortado da la profundidad. Es lo que separa
     * "Olaz delante de una foto" de "Olaz dentro de una sala".
     *
     * ## Y ya NO van desenfocadas
     *
     * La versión anterior iba a 14 px y era la queja principal: a ese
     * desenfoque no hay arquitectura, hay manchas, y una mancha no es un sitio.
     * Ahora van a 2 y 4 px —lo justo para que no compitan en detalle con la piel
     * de Olaz— y se ven las bóvedas, la madera y el añil.
     *
     * Lo que impide que el fondo gane la atención no es borrarlo: es que esté
     * MÁS LEJOS. Eso lo dan las dos capas moviéndose a ritmos distintos, no el
     * desenfoque.
     */

    /**
     * ── LA SALA PASA A SER UN BODEGÓN, Y ES UN CAMBIO DE CONCEPTO ─────────
     *
     * `hero-far` era una fotografía de una sala de arquitectura orgánica vista
     * en perspectiva. Tenía dos problemas que ninguna corrección de encuadre
     * resolvió en cinco fases: su suelo está visto DESDE ARRIBA mientras que
     * Olaz está visto casi a la altura de sus pies —de ahí que flotara— y su
     * profundidad está en el fondo, no en los bordes, así que no hay nada que
     * pueda ponerse DELANTE del personaje.
     *
     * El bodegón resuelve las dos cosas por construcción:
     *
     * - **tiene un podio**, con su elipse vista casi de canto. Un personaje de
     *   pie encima queda plantado por la propia forma del podio, sin necesidad
     *   de ninguna sombra —que es la decisión de dirección artística vigente—;
     * - **tiene masas en los dos bordes** a distintas profundidades: piedras de
     *   coco, acentos añil y ramas secas. Eso es primer término de verdad, y es
     *   lo que se monta por delante del canvas.
     *
     * Y su paleta es exactamente la de la marca —marfil, coco, añil y un punto
     * de rosa— sin corrección de color de por medio.
     */
    /**
     * ── SIN DESENFOQUE Y SIN AMPLIACIÓN, y las dos cosas van juntas ──────
     *
     * La primera versión colocaba el podio con `scale: 1,34` más un
     * desplazamiento, y encima le ponía 2 px de desenfoque. Las dos decisiones
     * restaban nitidez y se sumaban:
     *
     * - ampliar 1,34 una lámina de 1600 px para llenar una ventana de 1920
     *   significa pedirle 2.570 px a un archivo que tiene 1.600. El navegador
     *   interpola, y eso es exactamente el aspecto lavado que se veía;
     * - y el desenfoque encima borraba lo poco que quedaba.
     *
     * Ahora **el encuadre está horneado en el archivo**: el recorte que pone el
     * podio bajo los pies de Olaz se hace en el asset, remuestreado con Lanczos
     * y con un enfoque suave, y se sirve a 2400 px. En una ventana de 1920 el
     * navegador REDUCE en vez de ampliar, que es cuando una imagen se ve
     * nítida. En 1280 entra la variante pequeña, también reducida.
     *
     * Y el desenfoque se va a cero: **la lámina ya trae su propia profundidad
     * de campo** —las ramas del fondo y las piedras de los bordes vienen
     * suaves del render— así que Olaz sigue siendo lo más nítido del cuadro sin
     * necesidad de emborronar nada.
     *
     * La ampliación que queda es la del descenso, que es movimiento y va sobre
     * una imagen que ya se está yendo.
     */
    far: art('hero-stage', '#c8b49c', { blur: 0, scale: 1 }),

    /**
     * CERCA. El marco: el arco de madera y la masa de marfil, recortados a los
     * bordes. Es lo único que hay DELANTE de Olaz, y por eso es lo que hace que
     * esté dentro de algo. Lo monta `PortalVeil`.
     */
    /**
     * Y el primer término es LA MISMA LÁMINA, muy ampliada y recortada a los
     * bordes: las piedras de los lados pasan a estar delante de Olaz.
     *
     * Que sea la misma imagen no es un ahorro, es lo correcto: son las mismas
     * piedras vistas más cerca, así que el primer término y el fondo pertenecen
     * al mismo sitio. Con dos fotografías distintas nunca terminaban de
     * encajar. Una sola petición: la segunda copia sale de la caché.
     */
    near: art('hero-stage', '#a68f76', { blur: 5, scale: 1.0 }),
  },

  /**
   * ── ACTO 2 · LA MENTE ──────────────────────────────────────────────────
   *
   * **Aquí no entra ninguna ilustración, y no es por falta de candidatas.**
   *
   * De las veintitrés hay tres que son literalmente esto: filamentos
   * neuronales, un paisaje de neuronas iluminadas, partículas flotando. Son las
   * que peor encajan justamente por eso. El interior de la mente YA ES una red
   * neuronal en 3D que responde al puntero; poner detrás una red neuronal
   * dibujada deja dos redes en pantalla, y la falsa —que está más definida,
   * más contrastada y quieta— le roba la lectura a la que sí es interactiva.
   *
   * También se probó un velo con las de portal, y se retiró midiéndolo contra
   * la captura aprobada de la fase 4.5: superpuesto en `screen`, una imagen
   * clara LEVANTA los negros, y el plano del cruce perdía el contraste que
   * costó media fase recuperar. Ni al 8% ni recortado en óvalo se salvaba,
   * porque el problema no era la cantidad —la corteza de cristal vista de cerca
   * ya es una maraña de capas rosadas, y sumarle otra maraña de capas rosadas
   * es pedirle al ojo que separe dos cosas iguales—.
   *
   * Esa lección es la que ha dado la forma de `transitions`: la imagen del
   * portal no se pone ENCIMA del cruce, se pone ALREDEDOR.
   */
  mind: {
    /**
     * El suelo del interior. Es una capa del DOM por DETRÁS del canvas, no un
     * fondo dentro de la red: la atmósfera de la escena la pone `MindBackdrop`
     * con su propio sombreador. Anterior a esta colección y validado en la
     * fase 2.
     */
    backdrop: legacy('bg-mind', '#100c0a', 1920),

    /**
     * Sin atmósfera añadida, a propósito. Ver arriba: dentro manda Three.js.
     * No es un `MISSING_ASSET` —no falta nada, es una decisión—.
     */
    atmosphere: null,
  },

  /**
   * ── LAS TRANSICIONES ───────────────────────────────────────────────────
   *
   * Los dos cruces de la corteza. Es donde estas ilustraciones valen de verdad
   * y donde llevaban toda la fase anterior sin usarse: son túneles de capas
   * concéntricas, o sea, la forma exacta de atravesar algo.
   *
   * No son fondos. Entran y salen en medio segundo cada una, montadas en los
   * bordes de la pantalla mientras el centro se queda limpio. Ver `PortalVeil`.
   */
  transitions: {
    /**
     * ENTRAR. Un túnel de capas marfil, rosa, coco y añil que se cierran hacia
     * un centro oscuro. Escalando hacia la cámara, las capas salen por los
     * bordes: eso es atravesar, no acercarse.
     *
     * Va más desenfocado y un punto más apagado que la salida. Entrar es
     * meterse en algo: el mundo se estrecha y pierde luz.
     */
    enter: art('portal-enter', '#8a786c', { blur: 5, brightness: 0.88 }),

    /**
     * ── EL PASO, EN DOS MATERIALES ────────────────────────────────────────
     *
     * Las dos láminas del túnel, y lo que las hace utilizables es una propiedad
     * que ninguna imagen anterior tenía: **punto de fuga centrado.**
     *
     * Una fotografía sin fuga, ampliada, se lee como una foto acercándose —eso
     * costó cinco fases—. Una imagen cuya geometría converge en su centro,
     * ampliada sobre el eje de avance, se lee como AVANZAR: todo se abre hacia
     * los bordes desde el punto al que vas.
     *
     * Las dos comparten además el núcleo añil del fondo y la retícula blanca de
     * nodos. Eso da continuidad cromática con el interior y anticipa el lenguaje
     * de la red antes de que la red exista.
     *
     * Y son COMPLEMENTARIAS, no intercambiables. Ese orden es la narrativa:
     *
     *     mind    retícula luminosa, marfil y rosa   dejar la sala, espacio mental
     *     tissue  pliegues de tejido, coco y rosa    acercarse al cuerpo del cerebro
     */
    passageFar: art('tunnel-mind', '#c9b0a4', { blur: 0, brightness: 1.0 }),
    passageNear: art('tunnel-tissue', '#8d6152', { blur: 0, brightness: 1.0 }),

    /**
     * SALIR. La misma arquitectura pero abierta y con luz clara al fondo, y con
     * filamentos cruzándola que recuerdan a las conexiones de la red que se
     * acaba de dejar atrás.
     *
     * Y aquí está la corrección importante de esta fase. Con el mismo trato que
     * la entrada, los dos cruces salían idénticos en las capturas: dos anillos
     * de marfil, imposibles de distinguir. Eran la misma imagen contada dos
     * veces, no una ida y una vuelta.
     *
     * Ahora la salida va más nítida, más clara y con el hueco abriéndose desde
     * mucho antes. Salir es lo contrario de entrar: el mundo se ensancha y gana
     * luz. Es la misma membrana, pero cruzada al revés tiene que SENTIRSE al
     * revés.
     */
    leave: art('portal-exit', '#958071', {
      blur: 2,
      brightness: 1.22,
      hole: { from: 0.3, to: 1.15 },
    }),
  },

  /**
   * ── ACTO 7 · EL ESPACIO EXTERIOR ───────────────────────────────────────
   *
   * Lo que hay al otro lado de la corteza cuando el recorrido vuelve a salir.
   * Una constelación de puntos de luz unidos por hilos, con el centro vacío y
   * luminoso, cruzando de añil profundo a rosa pálido.
   *
   * ## Y es la ÚNICA ilustración que entra en la escena 3D
   *
   * La regla del manual dice que los fondos van como capas del DOM: son
   * imágenes fijas sin perspectiva ni luz, y meterlas en WebGL solo añade
   * píxeles que sombrear. Esta es la excepción, y tiene un motivo geométrico,
   * no de gusto: en el acto 7 el cerebro y los cinco nodos tienen que estar
   * POR DELANTE de ella, y entre el DOM y ellos está `MindBackdrop`, que es
   * una esfera opaca a pantalla completa. Una capa del DOM quedaría detrás del
   * telón, o sea invisible.
   *
   * Puesta como plano en el mundo, a doce cerebros por detrás del centro,
   * hace tres cosas que una capa del DOM no puede: el cerebro se recorta
   * contra ella, los nodos se recortan contra ella, y tiene PARALAJE — la
   * cámara se aleja del cerebro mucho más deprisa que de un plano que está
   * tres veces más lejos, así que el fondo se abre mientras el objeto se
   * retira. Eso es profundidad, no un collage.
   *
   * ## Y se usa como ATMÓSFERA, no como red
   *
   * El plano es deliberadamente mucho mayor que el encuadre: lo que llena el
   * cuadro es su centro —el degradado limpio— y su anillo de puntos queda
   * repartido por los bordes, como luces lejanas. Poner su red dibujada justo
   * donde están los cinco nodos de verdad sería el mismo error que ya costó
   * una vuelta dentro del cerebro: dos redes en pantalla, y la falsa —más
   * definida y quieta— robándole la lectura a la que sí responde al puntero.
   */
  outside: {
    space: art('nodes-exit', '#6b5a58'),
  },

  /**
   * ── ACTO 5 · EL EDITORIAL ──────────────────────────────────────────────
   *
   * Cuatro para seis piezas. No hay una imagen por sección a propósito: seis
   * ilustraciones distintas se leen como seis plantillas, y lo que hace que un
   * portfolio parezca de una sola mano es que el fondo sea reconocible de una
   * sección a la siguiente. Lo que diferencia a las áreas es la composición, el
   * peso tipográfico y el acento del acto; la ilustración solo pone temperatura.
   */
  editorial: {
    /** El umbral. La arcada abierta: literalmente el paso de un acto al otro. */
    threshold: art('threshold', '#958273', { opacity: 0.12, position: 'center 40%' }),

    /**
     * Marfil con máximo aire, una cinta suave y un punto añil. Para lo que se
     * lee seguido.
     */
    light: art('editorial-light', '#ede9e0', { opacity: 0.24 }),

    /** Cintas orgánicas en una esquina, el resto vacío. Textura sin peso. */
    organic: art('editorial-organic', '#d7cdc1', { opacity: 0.16 }),

    /**
     * El añil del acto 4. Es otra sala de la misma familia que la portada
     * —marfil, madera y huecos de añil—, y eso es lo que hace que Experiencia
     * se sienta parte del mismo mundo en vez de una sección con otro fondo.
     *
     * Va bastante más fuerte que las demás áreas, y no es una inconsistencia.
     * Aquí el añil está solo en los huecos —será un quinto de la superficie—,
     * así que a la opacidad del resto no llegaba y la sección se veía marfil
     * como las otras cinco. Lo que se iguala entre áreas es cuánto se NOTA el
     * fondo, no qué número lleva escrito.
     */
    indigo: art('editorial-indigo', '#978b81', { opacity: 0.38, position: 'center 62%' }),

    /**
     * Neuronas de marfil sobre coco cálido. Cierra el círculo: es lo más
     * parecido a la temperatura de la portada que hay en la colección.
     */
    warm: art('editorial-warm', '#8f7e6f', { opacity: 0.18 }),
  },

  /**
   * ── LA MARCA ───────────────────────────────────────────────────────────
   *
   * El logotipo y Olaz colgado de la C, que son lo único que se ve mientras
   * carga la escena. No son ilustraciones de atmósfera: son la identidad, y
   * por eso llevan medidas propias y no un `treatment`.
   *
   * Están aquí por la misma razón que todo lo demás —que ningún componente
   * escriba una ruta— aunque estos dos no vayan a sustituirse a la ligera.
   */
  brand: {
    wordmark: {
      src: '/img/wordmark.webp',
      srcSet: '/img/wordmark-sm.webp 640w, /img/wordmark.webp 1200w',
      width: 1200,
      height: 214,
    },
    mascotHanging: {
      src: '/img/olaz-hanging.webp',
      srcSet: '/img/olaz-hanging-sm.webp 280w, /img/olaz-hanging.webp 520w',
      width: 520,
      height: 693,
    },
  },

  /**
   * ── LOS ICONOS ─────────────────────────────────────────────────────────
   *
   * MISSING_ASSET — vacío a propósito, y esta fase NO los implementa.
   *
   * En la colección hay dos láminas de iconos 3D en el material de la mascota,
   * y son buenísimas como referencia de estilo. Como interfaz no sirven, y no
   * es una cuestión de calidad:
   *
   * - llevan los rótulos quemados en el píxel, y en inglés
   * - no se traducen, no se indexan, no los lee un lector de pantalla
   * - no se pueden recolorear por CSS ni reaccionar de uno en uno
   * - dieciséis iconos en un JPG son un JPG, no dieciséis componentes
   *
   * Cuando existan de verdad entran aquí —`icons.about`, `icons.download`…— y
   * quien los pinte los pedirá por nombre. Los componentes no cambian.
   */
  icons: {},
}

/**
 * Pedir una ilustración por su función: `getVisualAsset('transitions.enter')`.
 *
 * Devuelve `null` si no existe, y eso NO es un error: es lo que pasa con todo
 * lo que está pendiente de generar. Quien lo llame tiene que saber dibujar sin
 * imagen, porque durante una parte del proyecto va a ser el caso normal.
 */
export function getVisualAsset(path) {
  return path.split('.').reduce((node, key) => (node ? node[key] : null), visualAssets) ?? null
}

/**
 * ── QUÉ ILUSTRACIÓN LLEVA CADA ÁREA ─────────────────────────────────────
 *
 * El reparto vive aquí y no en cada componente, para poder leerlo entero de una
 * vez y comprobar si la familia visual se sostiene. Cambiar qué fondo lleva
 * "Proyectos" es mover una palabra.
 *
 * `placement` es lo que evita que las seis áreas se vean iguales sin necesidad
 * de seis imágenes: la misma ilustración a pantalla completa o reducida a una
 * banda lateral no se lee igual.
 */
export const areaArt = {
  /**
   * El umbral, más bajo que el resto: su ilustración es la única con masa
   * oscura del tramo claro, y ahí el fondo todavía está cambiando de
   * temperatura. Al nivel de las demás se comía el contraste justo en el
   * momento en que hay que leer las dos únicas frases del tramo.
   */
  threshold: { asset: 'editorial.threshold', placement: 'full' },

  /** Sobre mí: lo más cálido y con más aire. Es la parte personal. */
  about: { asset: 'editorial.light', placement: 'full' },

  /**
   * Proyectos: deliberadamente lo más tenue de todo el editorial.
   *
   * Es la sección que TIENE que ser la más visual, y por eso mismo aquí no va
   * una ilustración abstracta con peso: el peso visual está reservado para las
   * capturas reales de los proyectos, que llegan en la fase 5B. Poner ahora una
   * imagen bonita en su sitio la dejaría ocupada, y la primera captura real
   * tendría que competir con el fondo de su propia sección.
   */
  work: { asset: 'editorial.organic', placement: 'edge', intensity: 0.5 },

  /**
   * Experiencia: añil, y es la única área donde la ilustración tiene masa de
   * verdad. Es la sección más estructural y la que más agradece un fondo con
   * arquitectura.
   *
   * A pantalla completa no funcionaba: se veía la sala entera —arcos, huecos,
   * suelo— y el párrafo quedaba sobre la parte con más detalle de la imagen.
   * Confinada a la derecha, el añil se lee igual de bien y el texto vuelve a
   * caer sobre marfil liso.
   */
  experience: { asset: 'editorial.indigo', placement: 'edge' },

  /**
   * Habilidades: el MISMO añil que Experiencia, a la mitad de fuerza. Son el
   * mismo acto y tienen que leerse como pareja; lo que las separa es el peso,
   * no el motivo.
   */
  skills: { asset: 'editorial.indigo', placement: 'edge', intensity: 0.35 },

  /**
   * CV: marfil limpio. Es la pieza que menos ruido admite, y con la lámina
   * común ya bajada a 0,2 esta puede bajar con ella: son las dos áreas con
   * menos tinta del editorial, así que aquí la figura del fondo se queda sola
   * en el cuadro y es donde antes más se veía.
   */
  cv: { asset: 'editorial.light', placement: 'edge', intensity: 0.45 },

  /**
   * Contacto: coco cálido. Cierra el círculo con la portada, que es de lo que
   * va el cierre. En la fase anterior no llevaba ninguna y el final quedaba
   * como un pie de página en vez de como una coda.
   */
  contacto: { asset: 'editorial.warm', placement: 'full' },
}

/**
 * ── LO QUE SE HA QUEDADO FUERA, Y POR QUÉ ───────────────────────────────
 *
 * De veintitrés ilustraciones se usan siete. Las demás siguen en `fotos web/`;
 * conviene que conste el motivo para no volver a evaluarlas desde cero:
 *
 * - **Las dos láminas de iconos** (`4xhuq0…`, `lpjs4h…`) llevan los rótulos
 *   "About Me", "Experience", "Skills"… quemados en el píxel y en inglés. Ver
 *   `icons` arriba. Se guardan como referencia de estilo, no se publican.
 * - **Los filamentos neuronales** (`yzuq1h…`) y **el paisaje de neuronas**
 *   (`mu0ovl…`) son redes neuronales dibujadas. Puestas donde tendrían sentido
 *   —dentro de la mente— habría dos redes a la vez y ganaría la falsa.
 * - **Las de partículas** (`3rpu4h…`, `9vmerf…`) hacen el mismo trabajo que los
 *   `Sparkles` que ya están en la escena, pero quietas.
 * - **El marco flotante** (`me5333…`) es una maqueta de pantalla. Un proyecto se
 *   enseña con su captura dentro de un marco de CSS, no con un marco pintado.
 * - **El portal carnoso** (`p1wt9d…`) tiene un núcleo rosa salmón que se lee
 *   como una imagen médica. La identidad es "mente", no "tejido".
 * - **La sala clara** (`iyn1gl…`) es casi la misma que `editorial-indigo` sin el
 *   añil, y el añil es justo lo que aportaba.
 * - **El resto** (`2km109…`, `kt6609…`, `6n80y9…`, `iu0d2o…`, `510wpm…`,
 *   `4fs8l8…`, `5guclk…`) son variaciones de las elegidas. Buenas, pero meter
 *   dos versiones del mismo motivo es lo que convierte una dirección artística
 *   en una galería.
 */
