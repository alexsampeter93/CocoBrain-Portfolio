import { Vector3 } from 'three'

/**
 * Donde se coloca cada area del portfolio ALREDEDOR del cerebro.
 *
 * ## Fuera, y esta vez con un exterior que existe
 *
 * Estas cinco posiciones han estado en tres sitios, y conviene tener los tres
 * escritos porque cada mudanza corrigio algo real:
 *
 *   1. **fuera, a 0,94-1,26 del radio de la CONSTELACION** (3,4 unidades), o
 *      sea entre 3,4 y 4,3 de mundo con el cerebro midiendo 2,1: las areas
 *      flotaban a dos cuerpos del casco, en un sitio sin identidad y fuera del
 *      alcance de cualquier luz;
 *   2. **dentro de la cavidad, a 0,165-0,195 del cerebro.** Corregia lo
 *      anterior y rompia la arquitectura: dentro solo hay conocimiento;
 *   3. **fuera otra vez, a 1,00-1,10 del CEREBRO.** Que es esto.
 *
 * La diferencia con el primer intento no es el numero, es contra que se mide.
 * A un cerebro del centro un area esta a medio cerebro de la SUPERFICIE, o sea
 * dentro del alcance de la luz que sale del propio cerebro (`distance = size x
 * 3,4` en `FloatingBrain`): **los ilumina el.** Eso es lo que hace que la
 * constelacion y el cerebro se lean como una sola escena y no como cinco bolas
 * pegadas delante de un objeto.
 *
 * ## Se colocan sobre la PANTALLA, no con direcciones del mundo
 *
 * Los cinco eran vectores en coordenadas de mundo elegidos a mano. Con el
 * recorrido terminando dentro del cerebro daba igual hacia donde apuntaran; con
 * el acto 7 no da igual, porque la camara acaba mirando el cerebro desde el EJE
 * DE SALIDA. Medidos contra el, dos de los cinco caian casi encima de ese eje
 * —uno a 13 grados por delante y otro a 19 por detras—: un nodo tapado por el
 * cerebro y otro pegado encima, con sus dos etiquetas sobre los pliegues.
 *
 * Asi que un nodo se declara con un ANGULO alrededor del eje de salida —cero
 * arriba, creciendo hacia la derecha— y una inclinacion hacia delante o hacia
 * atras. Los cinco quedan repartidos alrededor del cerebro pase lo que pase.
 *
 * ## Y los cinco tienen que leerse como UN sistema
 *
 * Esta es la correccion del refinamiento, y salio de una captura: con los
 * angulos en 42, 118, 208, 250 y 300 los huecos entre vecinos eran 76, 90, 42,
 * 50 y 102 grados. O sea CV y Experiencia casi pegados abajo a la izquierda,
 * dos huecos enormes arriba, y **Experiencia descolgada** —era ademas el de
 * radio mayor (1,44) y el que mas bajaba, asi que caia solo en la esquina de
 * abajo mientras los otros cuatro se agrupaban—.
 *
 * Ahora los huecos son 72, 58, 68, 76 y 86: rodean el cerebro por los cuatro
 * lados, ninguno queda aislado y ningun par se junta. Siguen siendo irregulares
 * a proposito —un reparto exacto de 72 grados se lee como un reloj, no como una
 * mente— pero la irregularidad es de ritmo, no de agrupamiento.
 *
 * Y los RADIOS se han igualado: de 1,16-1,44 a 1,00-1,10. Dos cosas a la vez:
 *
 * - proyectados en pantalla, los cinco quedan entre 1,10 y 1,31 del centro, o
 *   sea que se leen como un anillo y no como cinco distancias distintas;
 * - el hueco entre la superficie del cerebro (0,5) y el nodo mas cercano baja
 *   de casi un cerebro a medio, que es la mitad del "campo vacio" del acto 7.
 *   La otra mitad la arregla la camara, que se acerca en consecuencia.
 *
 * `tilt` es lo que impide que se lean como las horas de un reloj: los separa en
 * PROFUNDIDAD, asi que unos pasan por delante del cerebro y otros por detras.
 * No se toca al ajustar la composicion plana.
 *
 * ## El orden angular ES el orden de las conexiones
 *
 * Recorridos por angulo son 03 (28) - 04 (100) - 05 (158) - 02 (226) - 01
 * (302), y `nodeConnections` une exactamente esos vecinos. El resultado es un
 * pentagono cerrado alrededor del cerebro: ninguna cuerda lo cruza, y ninguno
 * de los cinco tiene menos de dos conexiones. Que Experiencia parezca parte del
 * sistema no es solo cuestion de donde esta: es de con quien esta unida.
 */
const RAW = {
  node_01: { angle: 302, radius: 1.04, tilt: 0.1 },
  node_02: { angle: 226, radius: 1.06, tilt: -0.14 },
  node_03: { angle: 28, radius: 1.1, tilt: 0.2 },
  node_04: { angle: 100, radius: 1.0, tilt: -0.22 },
  node_05: { angle: 158, radius: 1.08, tilt: 0.28 },
}

/**
 * ── LA CONSTELACION SE ESTIRA O SE ESTRECHA CON LA PANTALLA ───────────────
 *
 * Un anillo circular en el mundo se proyecta como un circulo en pantalla, y una
 * pantalla no es un circulo. En 16:9 eso deja los nodos de arriba y de abajo
 * pegados al borde mientras a los lados sobran mil pixeles; en vertical pasa lo
 * contrario, y con la misma nube la camara tenia que irse a mas de ocho
 * cerebros para que cupieran los laterales — con el cerebro quedandose en el
 * 19% del alto, o sea en un punto.
 *
 * Este factor multiplica solo la componente HORIZONTAL, asi que el anillo se
 * convierte en la elipse que le corresponde a cada ventana. La composicion se
 * conserva: mismos angulos, mismos vecinos, misma lectura.
 *
 * Sustituye a `flattenFor`, que solo sabia comprimir. Comprimir arreglaba el
 * movil y no hacia nada por el escritorio, donde el problema es el contrario.
 */
/**
 * ── LA COORDENADA DE UN AREA ────────────────────────────────────────────────
 *
 * El angulo y el radio con los que un area esta colocada en la constelacion,
 * en crudo y sin proyectar. Lo lee el editorial para escribir su sello.
 *
 * No es un dato nuevo: es EL MISMO que coloca el nodo en la escena, leido
 * desde el otro lado. Por eso puede aparecer impreso al lado del titulo sin
 * inventarse nada — cuando alguien lee "03 · 28° · r1,10" al llegar a
 * Proyectos, ese 28 es literalmente donde esta el punto de luz del que acaba
 * de salir. Si algun dia se mueve el nodo, el sello se mueve con el.
 *
 * Es la traduccion a CocoBrain de un recurso que TBWAHAKUHODO usa como
 * senal de identidad: repetir por toda la web las coordenadas de su oficina.
 * Alli el sello dice DONDE ESTAN; aqui dice de que parte de la mente viene lo
 * que se esta leyendo. Mismo mecanismo, contenido propio.
 */
export const nodeCoord = (nodeName) => RAW[nodeName] ?? null

export function spreadFor(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1
  return Math.min(1.35, Math.max(0.5, aspect / 1.35))
}

/**
 * ── EL DESPEJE: NINGUN NODO PUEDE CAER SOBRE EL CEREBRO ───────────────────
 *
 * A cuanto tiene que quedar como minimo un nodo del eje de la camara, en
 * fracciones del cerebro. El cerebro mide 0,5 de radio, asi que 0,86 deja algo
 * mas de un tercio de cerebro de aire entre su silueta y el nodo mas cercano.
 *
 * Hace falta por la compresion de vertical. Comprimir la nube en horizontal es
 * lo que permite que la camara no se vaya lejisimos en un movil, pero acerca al
 * EJE justo a los nodos que estan mas cerca de la horizontal: con el factor en
 * 0,42, Habilidades —que esta a 100 grados, casi horizontal puro— quedaba a
 * 0,45 del centro, o sea encima de la corteza, con su etiqueta escrita sobre
 * los pliegues.
 *
 * Y se aparta por el eje que TIENE SITIO, no escalando el vector entero. Es la
 * diferencia entre una composicion y un apano: escalando, el nodo se va hacia
 * el lado —que en vertical es justo lo que no sobra— y obliga a la camara a
 * retroceder hasta dejar el cerebro en el 22% del alto. Subiendolo o bajandolo,
 * el ancho no se toca y el cerebro se queda en su tercio.
 *
 * En apaisado no se activa nunca: ahi la nube se ESTIRA y los cinco quedan de
 * sobra por fuera.
 */
const CLEAR = 0.86

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)

/**
 * @param brain   el tamano del cerebro en unidades de mundo
 *                (`tokens.mind.radius x tokens.mind.brain`).
 * @param options `spread` estira o comprime la nube en horizontal; `right`,
 *                `up` y `forward` son los ejes contra los que se leen los
 *                angulos. Por defecto, los del mundo.
 * @returns { node_01: Vector3, ... } en coordenadas locales de la mente.
 */
export function nodePositions(brain, options = {}) {
  const spread = typeof options === 'number' ? options : (options.spread ?? 1)
  const right = options.right ?? X
  const up = options.up ?? Y
  const forward = options.forward ?? Z

  const out = {}

  const clear = brain * CLEAR

  for (const [name, { angle, radius, tilt }] of Object.entries(RAW)) {
    const radians = (angle * Math.PI) / 180
    const reach = brain * radius

    const across = Math.sin(radians) * reach * spread
    let along = Math.cos(radians) * reach

    /*
      El despeje. Se conserva la componente lateral —que en vertical es la
      escasa— y se estira la vertical hasta que el nodo queda por fuera del
      cerebro. Si el nodo ya esta lo bastante lejos de lado, no hay nada que
      hacer y se queda como esta.
    */
    const gap = clear * clear - across * across
    if (gap > 0 && Math.hypot(across, along) < clear) {
      along = Math.sign(along || 1) * Math.sqrt(gap)
    }

    out[name] = new Vector3()
      .addScaledVector(right, across)
      .addScaledVector(up, along)
      .addScaledVector(forward, tilt * reach)
  }

  return out
}

/**
 * Que areas se unen: **cada una con sus dos vecinas en el anillo.**
 *
 * No es un grafo completo a proposito —unir todo con todo da una marana que
 * cruza por delante del cerebro en vez de rodearlo— y no es tampoco una
 * seleccion caprichosa: recorridas por angulo, estas cinco aristas son
 * exactamente el perimetro. De ahi que ninguna cuerda pase por el centro y que
 * ningun nodo pueda quedar colgando de una sola linea.
 *
 * Y los arcos se comban hacia FUERA del centro —lo hace `NeuralNodes`— para
 * que ninguna cuerda pase por delante del cerebro. La constelacion tiene que
 * enmarcarlo, no taparlo.
 */
export const nodeConnections = [
  ['node_03', 'node_04'],
  ['node_04', 'node_05'],
  ['node_05', 'node_02'],
  ['node_02', 'node_01'],
  ['node_01', 'node_03'],
]
