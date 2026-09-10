import { CatmullRomCurve3, Vector3 } from 'three'
import { fitDistance } from './framing.js'
import { spreadFor, nodePositions } from '../data/nodeLayout.js'
import { knowledgeClusters } from '../three/networkLayout.js'

/** El arriba del mundo. Solo sirve para deducir los ejes de la cámara final. */
const WORLD_UP = new Vector3(0, 1, 0)

/**
 * LA TABLA. Toda la coreografía del recorrido vive en este archivo.
 *
 * El problema de la versión anterior no era ningún efecto concreto: era que
 * "qué se ve y dónde está la cámara en cada momento" estaba repartido en
 * condicionales por cinco archivos distintos. Cada arreglo rompía otra cosa
 * porque nadie tenía la foto completa.
 *
 * Aquí el recorrido es un solo número, `progress`, de 0 a 1. De él sale todo:
 * la posición de la cámara, hacia dónde mira y qué está visible. Para cambiar
 * cuándo pasa algo se toca una fila.
 *
 * Nada se monta ni se desmonta durante el recorrido. Solo cambian números.
 */

/**
 * Los tramos, para nombrarlos. No controlan nada: son las etiquetas que
 * aparecen en el indicador de desarrollo y las que usa la navegación para
 * saber a qué altura del scroll saltar.
 *
 * ## HUBO UN MOMENTO SIN TRAMO DE SALIDA, Y CONVIENE SABER POR QUÉ
 *
 * Hasta ahora la tabla llevaba un tramo `exit` (0,60 → 0,75) cuya función era
 * sacar la cámara del cerebro para descubrir una constelación de nodos
 * flotando ALREDEDOR de él. Sobre el papel sonaba a revelación; en pantalla
 * hacía tres cosas mal a la vez, y las tres se veían:
 *
 * - al salir, el casco deja de estar delante de la cámara y lo único que queda
 *   detrás de los nodos es el telón: un campo marrón liso, sin arquitectura;
 * - el cerebro volvía a verse como OBJETO después de haberlo habitado, que es
 *   deshacer lo único que el recorrido tiene que conseguir;
 * - los cinco nodos vivían a más de tres radios del centro, o sea en un sitio
 *   que no es el cerebro ni es la sala: un exterior sin identidad.
 *
 * Durante un checkpoint la respuesta fue la contraria —se entra y no se sale,
 * con las cinco áreas dentro de la cavidad— y esa dirección se descartó: dentro
 * del cerebro va el conocimiento, no el portfolio. Los tres problemas de arriba
 * eran reales, y están resueltos uno a uno en la nota siguiente.
 */
/**
 * ── Y LA SALIDA VUELVE, PERO NO ES LA QUE SE QUITÓ ────────────────────────
 *
 * La nota de arriba describe por qué se retiró el tramo de salida, y los tres
 * motivos eran ciertos. Lo que estaba mal no era salir: era CÓMO se salía.
 *
 *   - se salía a un sitio sin nada detrás. Ahora el espacio exterior tiene
 *     cuerpo propio —`three/OuterSpace.jsx`, la lámina de la constelación a
 *     doce cerebros de distancia— y el cerebro se recorta contra él;
 *   - el cerebro volvía a ser un objeto DESPUÉS de haberlo habitado, y eso se
 *     leía como deshacer el viaje. Ahora es al revés y es el remate: se sale
 *     habiendo visto lo que hay dentro, y por eso el objeto significa algo
 *     distinto que en el descenso;
 *   - los nodos vivían a más de tres radios, en un exterior sin identidad.
 *     Ahora están entre 1,12 y 1,42 CEREBROS del centro, dentro del alcance de
 *     la luz del propio cerebro: los ilumina él.
 *
 * La arquitectura definitiva, y no se vuelve a discutir:
 *
 *     DENTRO   conocimiento · lenguajes · tecnologías · herramientas
 *     FUERA    portfolio · las cinco áreas editoriales · navegación
 *
 * Se cruza la corteza DOS veces, así que `insideness` recupera su ventana de
 * salida y `crossing` vuelve a ser dos campanas.
 */
/**
 * ── EL REPARTO DEL SCROLL ─────────────────────────────────────────────────
 *
 * Cuánto SCROLL se le da a cada tramo del recorrido. Es la única pieza de la
 * tabla que no habla de la escena: traduce "por dónde va el dedo" a "por dónde
 * va el viaje".
 *
 * ## Por qué existe, y por qué no es reescribir las ventanas
 *
 * El problema medido: el descenso se llevaba el 40% del recorrido para la
 * cantidad de información nueva que aporta, y el hub —que es el DESTINO de todo
 * el viaje— tenía el 16%, de los cuales solo cinco centésimas con la
 * composición montada. Una pantalla y cuarto de scroll para mirar lo que se ha
 * tardado veinte en alcanzar.
 *
 * La forma obvia de arreglarlo sería mover las ventanas: comprimir el descenso
 * en el espacio de `progress` y estirar el final. Sería un error, y grande.
 * De `progress` cuelgan más de treinta ventanas —capas, luces, revelados,
 * cruces, campanas— calibradas contra la GEOMETRÍA de la curva de cámara: la
 * membrana está en 0,40 porque ahí es donde la cámara toca la corteza, y el
 * relevo casco/sala salta en 0,805 porque ahí cruza de vuelta. Reescalar el
 * progreso desplaza todas esas ventanas respecto de la geometría que las
 * justifica.
 *
 * Así que no se toca el progreso: se toca **cuánto scroll cuesta recorrerlo.**
 * Una función monótona de scroll a progreso, con su inversa exacta. La escena
 * no se entera de que existe —sigue siendo una función pura de `progress`— y
 * ninguna ventana cambia de sitio. Lo único que cambia es a qué velocidad se
 * atraviesan.
 *
 * ## El reparto, en pantallas de scroll
 *
 * La pista mide `JOURNEY_SCREENS` pantallas y una se la lleva el elemento
 * fijado, así que quedan 29 de recorrido real. Con el reparto de abajo:
 *
 *     tramo                progreso    antes    ahora
 *     descenso y paso      0 → 0,40     10,0      7,8
 *     cruce de la corteza  0,40 → 0,50   2,5      2,3
 *     interior y red       0,50 → 0,74   6,0      7,5
 *     salida               0,74 → 0,84   2,5      2,9
 *     HUB                  0,84 → 1,00   4,0      8,4
 *
 * El hub pasa de cuatro pantallas a ocho y media, y la parte con la
 * composición ya montada de una y cuarto a más de cinco. El descenso pierde
 * dos, y sigue por encima del mínimo que este manual le exige: `DESCENT` ocupa
 * 0,03 → 0,34 del progreso, o sea 6,0 de esas 7,8 pantallas, contra las cinco
 * que hicieron falta para que la caída de luz no se leyera como un interruptor.
 *
 * ## Las pendientes, que es lo que de verdad se nota
 *
 * Un cambio de pendiente entre dos tramos se siente como un cambio de
 * velocidad de la cámara con el dedo yendo igual. Por eso los puntos no están
 * elegidos por el reparto sino por la pendiente que dejan:
 *
 *     1,48 · 1,25 · 1,00 · 1,00 · 0,55
 *
 * Baja de forma monótona y sin saltos bruscos hasta el último, que cae a la
 * mitad justo al salir del cerebro. Ese sí es deliberado: es la llegada.
 */
const BUDGET = [
  { scroll: 0.0, progress: 0.0 },
  { scroll: 0.27, progress: 0.4 }, // descenso y paso
  { scroll: 0.35, progress: 0.5 }, // el cruce de la corteza
  { scroll: 0.61, progress: 0.74 }, // el interior y la red
  { scroll: 0.71, progress: 0.84 }, // la salida
  { scroll: 1.0, progress: 1.0 }, // el hub, a la mitad de velocidad
]

/**
 * De scroll a recorrido. Lo llama el ScrollTrigger de la pista, y es lo ÚNICO
 * que lo llama: a partir de ahí todo el mundo lee `journey.progress`.
 */
export function warp(scroll) {
  const s = Math.min(1, Math.max(0, scroll))

  let i = 0
  while (i < BUDGET.length - 2 && s >= BUDGET[i + 1].scroll) i += 1

  const from = BUDGET[i]
  const to = BUDGET[i + 1]
  const span = to.scroll - from.scroll || 1

  return from.progress + ((s - from.scroll) / span) * (to.progress - from.progress)
}

/**
 * Y la vuelta: dónde hay que dejar el scroll para estar en un punto del
 * recorrido. La usa `scrollToProgress`, que es la única forma que tiene la
 * interfaz de mover el viaje.
 *
 * Es la inversa EXACTA, no una aproximación: el reparto es lineal por tramos y
 * estrictamente creciente, así que invertirlo es cambiar las dos columnas de
 * sitio. Que las dos direcciones salgan de la misma tabla es lo que impide que
 * se desincronicen —el error que ya costó que "Volver a la red" aterrizara en
 * 1,13, o sea pasado el final del recorrido—.
 */
export function unwarp(progress) {
  const p = Math.min(1, Math.max(0, progress))

  let i = 0
  while (i < BUDGET.length - 2 && p >= BUDGET[i + 1].progress) i += 1

  const from = BUDGET[i]
  const to = BUDGET[i + 1]
  const span = to.progress - from.progress || 1

  return from.scroll + ((p - from.progress) / span) * (to.scroll - from.scroll)
}

export const STAGES = [
  { id: 'hero', label: 'Portada', from: 0.0, to: 0.03 },
  { id: 'approach', label: 'Acercamiento', from: 0.03, to: 0.105 },
  { id: 'passage', label: 'El paso', from: 0.105, to: 0.24 },
  { id: 'portal', label: 'Umbral', from: 0.24, to: 0.4 },
  { id: 'membrane', label: 'Membrana', from: 0.4, to: 0.5 },
  { id: 'cavity', label: 'La cavidad', from: 0.5, to: 0.545 },
  { id: 'network', label: 'La red', from: 0.545, to: 0.74 },
  { id: 'ascent', label: 'La salida', from: 0.74, to: 0.79 },
  { id: 'breach', label: 'Atravesar', from: 0.79, to: 0.84 },
  { id: 'orbit', label: 'El espacio', from: 0.84, to: 0.94 },
  { id: 'focus', label: 'El enfoque', from: 0.94, to: 1.0 },
]

/**
 * Si la cámara para delante de cada área editorial, una a una. Ver la nota de
 * dentro de `nodeFocusAt`: no lo hace.
 */
const AREA_TOUR = false

/**
 * En que nodo estamos y cuanto de "dentro" de el.
 *
 * Devuelve `null` fuera del recorrido. `focus` va de 0 a 1 y solo llega a 1
 * en la parte central del tramo: es lo que hace que el contenido aparezca al
 * llegar y se vaya al salir, sin que haya dos paneles a la vez.
 */
export function nodeFocusAt(progress, count) {
  /**
   * ── NO HAY GIRA POR ÁREAS, Y ES UNA DECISIÓN ────────────────────────────
   *
   * Esto devolvía un área enfocada por tramo de scroll, y la cámara paraba
   * delante de cada una. Con las áreas otra vez fuera, esa gira volvería a
   * caber… y sigue sin ser lo que hace falta: el recorrido termina cuando la
   * composición está montada —cerebro en el centro, cinco nodos alrededor— y
   * a partir de ahí lo que manda es el visitante, no el scroll. Los nodos son
   * NAVEGACIÓN, no cinco paradas más.
   *
   * Así que devuelve null siempre y `NodePanel` se queda montado y en
   * silencio. La identidad de cada nodo la pone su propia etiqueta, que es DOM
   * real y está siempre a la vista desde que el nodo aparece.
   */
  if (!AREA_TOUR) return null
  if (progress < TOUR_START || count === 0) return null

  const index = Math.min(count - 1, Math.floor((progress - TOUR_START) / NODE_SPAN))
  const start = TOUR_START + index * NODE_SPAN

  const appearing = ramp(progress, start + NODE_SPAN * 0.12, start + NODE_SPAN * 0.42)
  const leaving = ramp(progress, start + NODE_HOLD, start + NODE_SPAN)

  return { index, focus: appearing * (1 - leaving) }
}

/** Donde hay que dejar el scroll para ver un nodo concreto. */
export function progressForNode(index) {
  return TOUR_START + index * NODE_SPAN + NODE_SPAN * 0.3
}

export function stageAt(progress) {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (progress >= STAGES[i].from) return STAGES[i]
  }
  return STAGES[0]
}

/**
 * Visibilidad de cada capa, en fracción de recorrido.
 *
 * `in` es cuándo aparece, `out` cuándo se va. `null` significa "no se va".
 * Los tramos se solapan a propósito: el interior ya está apareciendo mientras
 * la mascota todavía se desvanece, y ese solape es lo que evita el parpadeo
 * de negro entre una cosa y otra.
 */
export const LAYERS = {
  // El titular se va mucho antes que el personaje: si aguanta hasta que la
  // cámara ya está encima del cerebro, se lee encima del modelo y ensucia.
  heroCopy: { in: null, out: [0.01, 0.042] },
  // Se va justo cuando la cámara le pasa por delante. Antes seguía visible
  // después de cruzar y se veía el modelo por dentro.
  /**
   * Olaz se queda ATRÁS, no se desvanece pronto. Con el vuelo repartido por
   * distancia la cámara le pasa por al lado en 0,10 y le atraviesa el cerebro
   * de la mano en 0,13: su salida acompaña ese paso en vez de adelantarse.
   */
  mascot: { in: null, out: [0.072, 0.12] },
  // El halo aguanta un poco más: es lo último que se ve al atravesarlo.
  /**
   * ── Y AGUANTA HASTA QUE EL PASO LO RELEVA ─────────────────────────────
   *
   * Estaba en [0,088 · 0,14] y dejaba un HUECO. Medido sobre la captura de
   * 0,11: Olaz ya se ha ido, el cerebro de la mano está al 69% —o sea unos
   * restos translúcidos—, el paso todavía no ha entrado (0,112) y el cerebro
   * grande vale 0,016. El cuadro entero era el bodegón desenfocado con unas
   * manchas encima. Y eso pasaba justo en el frame en el que la cámara está
   * ATRAVESANDO el cerebro de la mano, que es uno de los golpes del viaje.
   *
   * Con [0,098 · 0,15] ese cerebro llena el cuadro hasta 0,12 —al 88% en 0,11—
   * y para cuando se va, el paso ya está al 72%. El relevo es continuo: en
   * ningún frame hay menos de una cosa dominando la imagen.
   *
   * Y `handoff` se mueve con él, porque sale de esta misma ventana: su campana
   * pasa a centrarse en 0,124, que es donde de verdad se cruza.
   */
  handBrain: { in: null, out: [0.098, 0.15] },
  /**
   * El telón del interior tarda 0,15 en llegar, no 0,10.
   *
   * Con la ventana corta, la luminancia del cuadro caía de 178 a 86 en 0,036 de
   * recorrido —medido a pasos de 0,006—: eso no se lee como "voy entrando", se
   * lee como que alguien apaga la luz. Repartido hasta 0,25 la caída queda por
   * debajo de 12 puntos por paso durante todo el tramo, que es el mismo ritmo
   * que ya tenía el resto del descenso.
   */
  /**
   * El cerebro nace en la APROXIMACIÓN y domina en el umbral. Empieza pronto
   * —0,105— porque la fase B pide que ya haya algo hacia lo que ir, y termina
   * en 0,28 para que la caída de luz quede repartida (ver la nota de 5E).
   */
  /*
    Empieza en 0,095 y sobre todo TERMINA antes: la rampa es un smoothstep, así
    que arranca muy plana —en 0,14 solo valía 0,11— y eso era la otra mitad del
    hueco del relevo. Acortando el tramo, el destino ya se intuye mientras el
    paso se abre.
  */
  mind: { in: [0.095, 0.26], out: null },
  /**
   * Las cinco áreas nacen DENTRO, y por eso su ventana se ha movido.
   *
   * Estaba en [0,60 · 0,72], que era el tramo de salida: aparecían justo
   * cuando la cámara abandonaba el cerebro, así que se leían como una
   * constelación rodeando un objeto. Ahora aparecen con la cámara ya en la
   * cavidad y la red de conocimiento a la vista.
   *
   * El orden importa: primero el sitio, después la red, y solo entonces las
   * cinco áreas que hay en ella. Encendiéndolas antes compiten con la red; a la
   * vez, el interior se llena de golpe y no se entiende qué es cada cosa.
   */
  /**
   * ── LAS CINCO ÁREAS, OTRA VEZ FUERA Y DESPUÉS DE SALIR ─────────────────
   *
   * Estuvieron aparcadas en [2 · 2,1] —o sea fuera del recorrido— mientras el
   * viaje terminaba dentro del cerebro. Vuelven, y vuelven a su sitio: el
   * espacio exterior.
   *
   * La ventana es lo que hay INMEDIATAMENTE después de atravesar la corteza
   * de vuelta (0,86) y termina antes del final, para que el último tramo del
   * scroll sea la composición ya montada y no su montaje.
   *
   * Esto solo enciende el GRUPO —las conexiones y los pulsos—. Cada nodo
   * aparece por su cuenta y escalonado; lo hace `NeuralNodes` creciendo en
   * escala, que es lo que se lee como encenderse. Un desvanecido de opacidad
   * en cinco cosas a la vez se lee como una interfaz apareciendo.
   */
  nodes: { in: [0.855, 0.895], out: null },
}

/** Interpolación suave (smoothstep) entre dos límites. */
export function ramp(value, start, end) {
  if (end === start) return value >= end ? 1 : 0
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/** Opacidad de una capa en un punto del recorrido. */
export function layerOpacity(name, progress) {
  const layer = LAYERS[name]
  if (!layer) return 1

  const appeared = layer.in ? ramp(progress, layer.in[0], layer.in[1]) : 1
  const left = layer.out ? ramp(progress, layer.out[0], layer.out[1]) : 0

  return appeared * (1 - left)
}

/**
 * Cuánto estamos DENTRO del cerebro. 0 fuera, 1 en el corazón de la red.
 *
 * Es el segundo valor derivado del reloj, y hace falta porque "dentro" no es
 * un booleano: la corteza tiene que abrirse mientras se atraviesa, no
 * desaparecer de golpe en un fotograma concreto.
 *
 * De aquí salen tres cosas, todas en sitios distintos pero con la misma
 * fuente: el casco del cerebro se desvanece para dejar pasar a la cámara, la
 * red de dentro sube de presencia, y las etiquetas de los conocimientos
 * empiezan a aparecer. Sin este número cada una lo habría deducido por su
 * cuenta a partir del progreso, que es exactamente el error del que salió esta
 * arquitectura.
 *
 * ## La ventana es estrecha, y esa es la corrección importante
 *
 * El primer reparto abría la corteza entre 0,30 y 0,42, o sea durante dos
 * pantallas y media de scroll. El resultado se pudo ver en las capturas y es el
 * error que ya estaba escrito en el manual: una pared de pliegues rosas medio
 * transparentes llenando la pantalla, que no se lee como un sitio sino como un
 * fallo. La corteza se estaba abriendo mientras el cerebro todavía se veía
 * entero, y cerrándose cuando ya se estaba dentro.
 *
 * Ahora la apertura se concentra en el instante del cruce: la cámara llega a la
 * piel en 0,395 y para entonces está al 79%. Antes de eso el cerebro es sólido
 * —que es el plano bueno—, y después ya no estorba.
 */
/**
 * La membrana pasa a ser su propio tramo: 0,29 → 0,38.
 *
 * Antes el cruce estaba en [0,35 · 0,415], pegado al final del descenso. Ahora
 * la corteza domina el cuadro durante el umbral (0,17–0,29) y el paso a través
 * ocupa dos pantallas y media enteras, que es lo que hace falta para que se
 * lea como atravesar algo y no como un corte.
 */
/**
 * ── Y NO HAY VENTANA DE SALIDA ────────────────────────────────────────────
 *
 * `leave` estaba en [0,59 · 0,645] y era lo que sacaba la cámara del cerebro
 * para enseñar la constelación exterior. Se ha ido entera: una vez dentro,
 * `insideness` vale uno para siempre.
 *
 * No es solo quitar un número. De aquí cuelgan el desvanecido del casco, la
 * presencia de la red, la campana del cruce, la niebla de la cavidad y la
 * puerta del puntero sobre los nodos interiores; con la ventana de salida
 * puesta, todas esas señales se DESHACÍAN a mitad del recorrido —la pared se
 * volvía a solidificar por fuera, el puntero dejaba de alcanzar la red—, y eso
 * es justo lo que hacía que el tramo final se sintiera fuera del cerebro.
 *
 * El límite se mueve a [0,315 · 0,385] para que su punto medio (0,35) coincida
 * con el cruce GEOMÉTRICO: medido sobre la curva reparametrizada por longitud
 * de arco, la cámara atraviesa el casco en p≈0,349.
 */
/**
 * Y empieza en 0,38, no en 0,43.
 *
 * La cámara llega a la superficie de la corteza antes de que esta ventana se
 * abriera, así que durante cinco centésimas el cerebro llenaba el cuadro
 * ENTERO y opaco sin que ninguna señal lo supiera: ni bajaba la exposición, ni
 * se abría el casco. Medido en móvil —donde la cámara llega antes— la
 * luminancia hacía 39 · **87** · 30 entre 0,40 y 0,48.
 *
 * `crossing` es una campana sobre esta ventana, así que adelantarla mueve el
 * momento en que se resta luz a donde de verdad hace falta: cuando la corteza
 * es lo único que hay en pantalla.
 */
/**
 * ── Y LA VENTANA DE SALIDA VUELVE ─────────────────────────────────────────
 *
 * `leave` estuvo en [0,59 · 0,645] cuando la salida era otra cosa, y se retiró
 * entera. Vuelve en [0,76 · 0,86], que es el tramo en el que la cámara deja la
 * red, se acerca a la corteza por dentro y la atraviesa.
 *
 * De aquí cuelgan, en los dos sentidos: la niebla de la cavidad —que se
 * disipa al salir—, la luz del cerebro —que se recupera—, la campana del cruce
 * —que baja el bloom otra vez— y la luz rasante de la corteza, que vuelve a
 * encenderse para revelar la pared por la que se sale.
 *
 * El punto medio de la ventana, 0,81, es donde el recorrido cruza la
 * superficie GEOMÉTRICA: la clave de la cámara está en `along(0,52)` y el
 * relevo casco/sala salta exactamente en 1,04 · radio. Las dos cosas tienen
 * que coincidir o la luz baja donde no se cruza nada.
 */
const INSIDE = { enter: [0.38, 0.5], leave: [0.75, 0.81] }

/**
 * CUÁNTO HA DEJADO DE SER CRISTAL Y ES YA TEJIDO. 0 lejos, 1 pegado.
 *
 * El cerebro es una pieza de vidrio oscuro mientras se ve como OBJETO —de
 * lejos, eso es lo que le da la lectura de joya— y tiene que ser materia opaca
 * cuando se convierte en SITIO.
 *
 * No es un capricho: medido, el casco desaparecía justo al acercarse. Su
 * transmisión se ataba a la misma señal que su aparición, así que a 1,9
 * unidades de la corteza el material estaba al 90% de transmisión: un cristal
 * casi perfecto, sin nada opaco que refractar, es invisible. En 0,21 el cerebro
 * se veía entero; en 0,29 —cuando tenía que llenar el cuadro— quedaban los
 * nodos flotando en un campo marrón.
 *
 * Es también la regla que pidió Alex para la fase 5E: dentro no puede haber
 * aspecto de cristal ni paredes invisibles. Lo que se atraviesa es tejido.
 *
 * ## Y tiene que llegar a CERO, no a "casi cero"
 *
 * La ventana termina en 0,26 y no en 0,31 por un motivo que se comprobó
 * comparando con `?glass=0`: three mete el material en su pase de transmisión
 * mientras el valor sea mayor que cero, y en ese pase la superficie se dibuja
 * refractando el búfer del fondo en vez de recibir las luces. Con 0,14 de
 * transmisión la corteza seguía siendo invisible; con 0 aparece entera, con sus
 * pliegues y su relieve. No es un ajuste fino: es un interruptor.
 */
/**
 * Y la ventana se adelanta a [0,15 · 0,26], que es cuando el cerebro pasa a ser
 * el SUJETO del cuadro.
 *
 * Comprobado con `?glass=0`: en p=0,27, con la transmisión al 45%, el frame
 * daba contraste 3,6; apagándola, 14,3. Un material transmisivo refracta lo que
 * tiene detrás, y a partir de 0,25 lo que tiene detrás es el telón del interior,
 * que es marrón muy oscuro. Refractar un fondo oscuro es borrarse.
 *
 * De lejos y pequeño el vidrio es lo que le da la lectura de joya, así que ahí
 * se queda. En cuanto llena el cuadro tiene que ser materia.
 */
/**
 * Y se adelanta otra vez, a [0,11 · 0,20], desde que el paso rodea al cerebro.
 *
 * El argumento de arriba sigue siendo correcto y se queda corto: no hace falta
 * que el cerebro LLENE el cuadro para que refractar lo borre, basta con que sea
 * el sujeto. Medido en 0,22 —con el túnel ya puesto y el cerebro centrado al
 * final— quedaba un 13% de transmisión, y con eso el objeto salía como un
 * fantasma pálido: sin volumen, sin surcos y sin poder recibir la luz, porque
 * un material transmisivo se dibuja en su propio pase y las luces de la escena
 * no le llegan.
 *
 * Cerrándola en 0,20, el cerebro es materia desde el momento en que se
 * convierte en el destino visible del túnel, que es exactamente lo que pide el
 * guion: aparecer pequeño, crecer y ser SIEMPRE el mismo objeto.
 */
const CORTEX = [0.11, 0.2]

export function cortex(progress) {
  return ramp(progress, CORTEX[0], CORTEX[1])
}

export function insideness(progress) {
  const entered = ramp(progress, INSIDE.enter[0], INSIDE.enter[1])
  const left = ramp(progress, INSIDE.leave[0], INSIDE.leave[1])
  return entered * (1 - left)
}

/**
 * CUÁNTO ESPACIO EXTERIOR SE HA RECUPERADO. Cero mientras se está dentro, uno
 * con la composición final montada.
 *
 * No es `1 − insideness`, y la diferencia importa: `insideness` vuelve a cero
 * en el instante en que se atraviesa la corteza, y en ese instante todavía no
 * hay espacio ninguno —la corteza llena el cuadro a bocajarro—. El espacio
 * aparece DESPUÉS, mientras la cámara se retira y el cerebro vuelve a caber.
 *
 * De aquí cuelgan la lámina del exterior y el clima del último tramo. Los
 * nodos NO: ellos tienen su propia ventana en `LAYERS`, porque su aparición es
 * escalonada y no continua.
 */
const EMERGENCE = [0.815, 0.925]

export function emergence(progress) {
  return ramp(progress, EMERGENCE[0], EMERGENCE[1])
}

/**
 * ── LAS DOS FASES DEL HUB ─────────────────────────────────────────────────
 *
 * El acto 7 no es un estado, son dos, y son dos puntos del MISMO recorrido:
 *
 *     hubReveal   la composición montándose: los nodos nacen, se unen, se
 *                 entiende que son cinco y que forman una red
 *     hubFocus    el enfoque: la cámara entra, el nodo elegido domina y los
 *                 demás se retiran sin desaparecer
 *
 * Las dos salen de `progress` y nada más. Es lo que permite que pulsar un nodo
 * no sea una animación: pulsar lleva el scroll a la fase B —`scrollToProgress`,
 * una sola llamada— y a partir de ahí la cámara se acerca porque el recorrido
 * pasa por ahí, no porque alguien la haya movido. Subir con la rueda deshace
 * exactamente lo mismo, y la misma posición de scroll da siempre el mismo
 * cuadro.
 *
 * ## Y por eso la SELECCIÓN no entra aquí
 *
 * `hubFocus` dice CUÁNTO se está enfocando, no QUÉ. Qué nodo domina es estado
 * de la interfaz y solo puede tocar opacidades y escalas, nunca la cámara: en
 * cuanto la cámara dependiera de lo que hay pulsado, el recorrido dejaría de
 * ser una función del scroll y con él se irían el determinismo y la ida y
 * vuelta, que han costado tres checkpoints.
 */
const HUB = { reveal: [0.855, 0.935], focus: [0.945, 0.998] }

/**
 * Cuánto AIRE tiene la composición en la fase de descubrimiento, en múltiplos
 * del encuadre pleno.
 *
 * acercándose un 22%— y la captura lo tumbó: el encuadre del acto 7 ya deja la
 * acercándose un 22%— y la captura lo tumbó:  ya deja la
 * constelación ocupando el 94% del cuadro, así que cualquier acercamiento saca
 * nodos por los bordes. En la prueba se perdieron Proyectos y CV, que es
 * justamente lo que este checkpoint prohíbe: un nodo sin sus vecinos deja de
 * ser parte de una red.
 *
 * Así que el movimiento es el mismo pero desplazado: la fase A se mira desde
 * más lejos —la composición al 77% del cuadro, con aire alrededor, que además
 * es lo que pide un descubrimiento— y la fase B cierra hasta el encuadre pleno.
 * Se acerca un 22% igual y no se cae nada fuera.
 */
const HUB_WIDE = 1.22

export function hubReveal(progress) {
  return ramp(progress, HUB.reveal[0], HUB.reveal[1])
}

export function hubFocus(progress) {
  return ramp(progress, HUB.focus[0], HUB.focus[1])
}

/** Dónde hay que dejar el recorrido para cada fase del hub. */
/**
 * ── LA RETIRADA DE LA ESCENA, Y POR QUÉ VIVE AQUÍ ─────────────────────────
 *
 * Cuánta PRESENCIA le queda al mundo 3D durante la lectura editorial. Uno
 * mientras se explora, casi cero cuando ya se está leyendo.
 *
 * Sale del segundo canal del reloj —`reading`— y no del progreso, porque
 * describe otra cosa: el recorrido ha terminado y lo que manda ahora es cuánto
 * texto se lleva leído.
 *
 * ## Estuvo escrita en un solo sitio, y ese sitio no era suficiente
 *
 * La retirada se aplicaba escribiendo la opacidad del CANVAS. Y el canvas no es
 * toda la escena: las etiquetas de los cinco nodos y la ficha del área son
 * `Html` de drei, o sea DOM real en un portal HERMANO del canvas. Bajando la
 * opacidad del canvas se apagaba el 3D y ellas se quedaban, opacas y encima del
 * texto — medido sobre el build, en el área "Sobre mí" las cinco seguían con
 * `display: flex`, opacidad 1 y **`tabIndex` 0**, así que además se colaban en
 * el orden de tabulación por delante del contenido que el visitante está
 * leyendo. Era el fallo de accesibilidad más visible que quedaba.
 *
 * No se arregla en el canvas ni en las etiquetas: se arregla reconociendo que
 * "cuánto queda de la escena" es UNA señal con tres lectores. Es la regla de
 * siempre —un dato que necesitan tres archivos y conoce uno solo está mal
 * colocado— y por eso está en la tabla.
 *
 * `FLOOR` es lo que queda encendido: el 6% de la escena sigue vivo detrás del
 * editorial a propósito, para que el fondo no sea una superficie plana. Lo que
 * no puede quedar es un solo píxel de INTERFAZ.
 *
 * ## Y SE MEDÍA CONTRA EL SITIO EQUIVOCADO
 *
 * Colgaba de `reading`, o sea de una fracción del editorial ENTERO, con la
 * ventana en 0,15. Cuando se escribió eso era "una pantalla larga" porque el
 * editorial eran huecos pendientes. Con el contenido real dentro, medido
 * contra el build:
 *
 *     el umbral ocupa   6,8% de `main` a 1920 · 5,8% a 1366 · 6,0% a 390
 *     la retirada duraba          15% de `main`, o sea más del doble
 *
 * Así que la escena seguía retirándose mucho después de haber entrado en Sobre
 * mí: **27% de canvas sobre el titular y 11% sobre el primer párrafo** a 1920;
 * 38% y 25% a 1366. Eso es el "mundo 3D encima de una página editorial".
 *
 * Ahora cuelga de `journey.threshold`, que mide el cruce del propio umbral. El
 * tramo son 140vh, así que su reparto interno es el mismo en toda pantalla
 * —comprobado: el umbral llena el cuadro en 0,417 y Sobre mí asoma en 0,583 en
 * 1920, 1366 y 390— y las cifras de abajo dejan de depender de cuánto escriba
 * Alex.
 *
 * ## Las etapas del cruce
 *
 *     0,00 – 0,22   la escena manda todavía. Nada se ha ido
 *     0,08 – 0,34   se retira su INTERFAZ: etiquetas y ficha, del todo
 *     0,16 – 0,62   la constelación se aleja hacia el fondo
 *     0,22 – 0,58   el canvas baja hasta su 6%
 *     0,58 – 1,00   LA RESPIRACIÓN: solo terreno, casi una pantalla entera
 *     1,00          Sobre mí llega arriba, con el texto limpio
 *
 * La respiración es una etapa declarada y no lo que sobra al final: el canvas
 * termina de retirarse en 0,58, que es exactamente cuando el borde de Sobre mí
 * asoma por abajo. Lo que queda hasta que su titular llega arriba es terreno
 * solo — el instante en el que el mundo ya se ha depositado y todavía no hay
 * nada que leer.
 */
const RETREAT = { from: 0.22, to: 0.58, floor: 0.06 }

export function sceneRetreat(threshold) {
  return 1 - ramp(threshold, RETREAT.from, RETREAT.to) * (1 - RETREAT.floor)
}

/**
 * Y la constelación no se apaga: se ALEJA.
 *
 * Bajar la opacidad y ya está deja el mismo cuadro cada vez más tenue, que se
 * lee como que alguien ha bajado un interruptor. Contrayendo el anillo hacia
 * el cerebro mientras se atenúa, lo que se ve es que el conjunto se va al
 * fondo: primero deja de rodearte y después deja de estar.
 *
 * Es una escala, no una deformación de la geometría ni una cámara nueva —la
 * cámara está aparcada durante la lectura y moverla sería un segundo dueño—.
 * Y empieza antes que el desvanecido del canvas y termina después, para que el
 * gesto no coincida exactamente con él: si las dos curvas fueran la misma, se
 * leerían como una sola cosa.
 */
const RECEDE = { from: 0.16, to: 0.62, depth: 0.78 }

export function hubRecede(threshold) {
  return 1 - ramp(threshold, RECEDE.from, RECEDE.to) * (1 - RECEDE.depth)
}

/**
 * Y lo mismo para lo que es DOM: llega a cero de verdad y llega ANTES.
 *
 * Un texto a media opacidad sobre otro texto no es una transición, es un
 * estorbo: mientras la etiqueta de un nodo se lea, compite con el titular que
 * tiene debajo. Así que la interfaz de la escena se va primero y se va del
 * todo, con el umbral todavía llenando el cuadro — para cuando Sobre mí asoma
 * (0,58) hace rato que no queda ni un píxel de ella.
 */
const OVERLAY = { from: 0.08, to: 0.34 }

export function overlayRetreat(threshold) {
  return 1 - ramp(threshold, OVERLAY.from, OVERLAY.to)
}

/**
 * Dónde hay que dejar el recorrido para cada fase del hub.
 *
 * `discover` es el FINAL de la fase A y no su mitad. Estuvo en 0,895 y la
 * comprobación del DOM lo tumbó: ahí los cinco nodos todavía están naciendo
 * —el tercero al 0,02% de opacidad y el quinto sin montar—, así que "volver a
 * la red" aterrizaba en mitad del montaje. Se vuelve a la composición hecha.
 */
export const HUB_AT = { discover: 0.941, focus: 0.985 }

/**
 * CUÁNTO ENVUELVE LA CORTEZA A LA CÁMARA. Cero fuera, uno rodeado de tejido.
 *
 * Se parece a `insideness` y no puede ser la misma señal, aunque las dos valgan
 * uno en el mismo sitio. La diferencia está en la SALIDA:
 *
 *     insideness   baja entre 0,76 y 0,86 — el cruce de la membrana
 *     enclosure    baja entre 0,84 y 0,96 — cuando ya hay espacio alrededor
 *
 * Y ahí está el problema que resuelve. Lo que decide cuánta luz hace falta no
 * es haber cruzado la superficie: es tener corteza a un palmo. Entre 0,79 y
 * 0,86 la cámara ya ha cruzado —`insideness` va cayendo— pero sigue con los
 * pliegues llenando el cuadro. Con la luz rasante colgada de `1 − insideness`,
 * esa luz volvía a su intensidad plena justo ahí: una puntual con caída
 * cuadrática contra un pliegue a medio palmo, o sea la pantalla entera en rosa
 * quemado en mitad del cruce.
 *
 * Colgándola de esto, la luz se queda cerrada mientras hay tejido cerca y se
 * recupera cuando el cerebro vuelve a ser un objeto que se mira de lejos.
 */
export function enclosure(progress) {
  return ramp(progress, INSIDE.enter[0], INSIDE.enter[1]) * (1 - emergence(progress))
}

/**
 * CUÁNTO SE ESTÁ HABITANDO EL INTERIOR. Cero en los dos cruces, uno mientras se
 * recorre la red.
 *
 * Es la tercera señal de la familia, y hace falta porque las otras dos no
 * distinguen ATRAVESAR de ESTAR:
 *
 *     insideness   sube al entrar y baja al salir — el cruce de la membrana
 *     enclosure    cuánta corteza rodea a la cámara — la luz que cabe
 *     dwell        cuánto tiempo se lleva DENTRO, con sitio alrededor
 *
 * La diferencia importa para las luces. Atravesando, la cámara tiene pliegues a
 * un palmo y una fuente con caída cuadrática es lo correcto: cae rápido, no
 * lava el plano y deja ver materia. Habitando, la cámara está a 0,36 del centro
 * y la pared a 1,0, así que esa misma caída entrega veinte veces más a lo que
 * roza que a lo que hay al fondo — y lo que sale es un foco quemado sobre un
 * campo negro, que es exactamente la "cueva" que este tramo tenía que dejar de
 * ser.
 *
 * Con esto, la luz rasante puede cambiar de carácter según lo que esté
 * haciendo: foco al atravesar, luz de sala al recorrer.
 */
/*
  Empieza en 0,465 —al cruzar, no despues— para que el foco del cruce se
  convierta en luz de sala en cuanto hay sala. Y termina en 0,79, que es donde
  se atraviesa de vuelta: si se apagara antes, la corteza se oscureceria justo
  en el tramo en el que vuelve a llenar el cuadro.
*/
const DWELL = { in: [0.45, 0.505], out: [0.745, 0.79] }

export function dwell(progress) {
  return ramp(progress, DWELL.in[0], DWELL.in[1]) * (1 - ramp(progress, DWELL.out[0], DWELL.out[1]))
}

/**
 * Cuánto se lleva DESCUBIERTO del interior. Empieza en cero cuando ya se está
 * dentro y sube a lo largo de la deriva.
 *
 * Es una señal distinta de `insideness` y hace falta que lo sea. "Estar dentro"
 * llega a uno en cuanto se cruza la corteza y ahí se queda: sirve para decidir
 * qué se dibuja, pero no sirve para contar nada, porque no distingue el primer
 * segundo dentro del último.
 *
 * Con las dos separadas, la red se puede ver PRIMERO sin una sola palabra
 * encima —que es lo que hace que se lea como una red y no como un listado— y
 * los nombres aparecen después, según se recorre. Los pilares primero, los
 * secundarios más tarde y más tenues.
 */
const DISCOVERY = [0.545, 0.665]

export function discovery(progress) {
  return ramp(progress, DISCOVERY[0], DISCOVERY[1])
}

/**
 * ── CÓMO SE DESCUBRE LA RED, POR CAPAS ────────────────────────────────────
 *
 * La red no puede encenderse de golpe al cruzar: entrar en un sitio y que el
 * sitio ya esté lleno no se lee como llegar, se lee como un corte. Y tampoco
 * puede ser un solo desvanecido, porque entonces todo aparece a la vez y no
 * hay orden que leer.
 *
 * Son tres capas con tres tiempos, y el orden es el que cuenta la escena:
 *
 *     enlaces   primero la ESTRUCTURA: se ve que hay algo tejido ahí dentro
 *     nodos     después los puntos, que es lo que la estructura conecta
 *     etiquetas y solo al final los nombres, que es información y va después
 *               de la forma
 *
 * Los tres salen del mismo progreso y se solapan a propósito: en ningún
 * momento hay un frame en el que una capa haya terminado y la siguiente no
 * haya empezado.
 */
/*
  ── Y PRIMERO SE VE EL SITIO ──────────────────────────────────────────────

  Los enlaces empezaban en 0,46, o sea en el mismo frame en el que la camara
  acaba de atravesar la corteza. Eso pone la red delante antes de que se haya
  entendido DONDE se esta, y el orden que cuenta la escena es el contrario:
  materia cerebral, profundidad del espacio, y solo entonces lo que hay dentro.

  Con la entrada en 0,495 hay media pantalla de scroll —de 0,46 a 0,50— en la
  que lo unico que hay es el interior del cerebro iluminado. Es poco tiempo y
  es suficiente: es el frame que contesta "estoy dentro de algo".
*/
const REVEAL = {
  links: [0.495, 0.565],
  nodes: [0.525, 0.6],
}

/**
 * ── Y CÓMO SE DEJA ATRÁS ──────────────────────────────────────────────────
 *
 * La red se apaga al salir, y las tres capas no se apagan a la vez.
 *
 * Las ETIQUETAS primero, y no por gusto: van con `depthTest: false` —es lo que
 * las hace legibles entre los pliegues— así que se dibujan encima de todo,
 * corteza incluida. Con la cámara fuera del cerebro seguirían viéndose a
 * través de él, que es exactamente el error que este manual llama "una capa
 * que dice estar encendida y dibuja donde no debe".
 *
 * Los NODOS y los ENLACES aguantan hasta el cruce, porque lo que tiene que
 * verse en ese momento es la corteza cerrándose SOBRE la red. Si la red ya se
 * ha ido, lo que se cierra no cierra nada.
 */
const FADE = {
  labels: [0.725, 0.775],
  network: [0.74, 0.795],
}

export function reveal(progress) {
  const gone = ramp(progress, FADE.network[0], FADE.network[1])

  return {
    links: ramp(progress, REVEAL.links[0], REVEAL.links[1]) * (1 - gone),
    nodes: ramp(progress, REVEAL.nodes[0], REVEAL.nodes[1]) * (1 - gone),
    labels: discovery(progress) * (1 - ramp(progress, FADE.labels[0], FADE.labels[1])),
  }
}

/**
 * ── LA CÁMARA CORTICAL ────────────────────────────────────────────────────
 *
 * Cuánto se está DENTRO de la sala, que no es lo mismo que `insideness`.
 *
 * `insideness` mide el cruce de la membrana y de ella cuelgan la niebla, el
 * puntero y la retirada del casco. Esto mide otra cosa: cuándo existe la sala
 * en la que se acaba. La cámara entra en ella ANTES de atravesar la corteza
 * —la sala es una copia ampliada del mismo cerebro, así que su pared queda por
 * fuera de la superficie que se cruza— y esa décima de solape es justo lo que
 * evita el fundido a negro: cuando la corteza se abre, detrás ya hay sitio.
 */
/*
  Aqui estaba `chamber(progress)`, una rampa [0,375 · 0,45] que decidia cuando
  se encendia la sala cortical. Ya no la lee nadie: desde el checkpoint 2.5 el
  relevo casco/sala lo hace una condicion GEOMETRICA —la distancia de la camara
  al centro contra 1,04 veces el radio del cerebro— y no una ventana de scroll.

  Se va entera por la regla de siempre: una senal declarada y no usada MIENTE,
  porque describe un comportamiento que ya no existe.
*/

/**
 * ── ATRAVESAR, QUE NO ES DESVANECER ───────────────────────────────────────
 *
 * Cuánto se lleva atravesado del casco del cerebro. Mueve el plano de corte
 * que va pegado a la cámara: la malla no se apaga, se ABRE por donde pasa el
 * visitante y se queda abierta.
 *
 * Que sea una rampa y no una campana es deliberado. Un corte que se abre y se
 * vuelve a cerrar es un efecto; uno que se abre y se queda abierto es haber
 * entrado.
 */
const PIERCE = [0.4, 0.5]

export function pierce(progress) {
  return ramp(progress, PIERCE[0], PIERCE[1])
}

/**
 * Cuánto se está ATRAVESANDO la corteza ahora mismo. Cero fuera y cero dentro;
 * uno en el instante exacto de la membrana, tanto al entrar como al salir.
 *
 * Sale de `insideness` sin señal nueva: una campana vale uno justo donde el
 * paso va por la mitad. Y como `insideness` sube al entrar y vuelve a bajar al
 * salir, la campana se abre DOS veces sin que haya que escribir nada: la misma
 * fórmula sirve para las dos membranas.
 *
 * De ella cuelgan el bloom, el emisivo de los surcos, la exposición general y
 * —desde el checkpoint 3— el plano de corte del casco, que antes colgaba de
 * `pierce` y por eso se apagaba para siempre en 0,5.
 *
 * ## Para qué
 *
 * Ese medio segundo era el peor plano de la web. Se juntaban todas las cosas
 * caras a la vez —el cristal refractando, los reflejos del HDRI sobre una
 * superficie casi pulida, los surcos emisivos al máximo y el bloom encima— y el
 * resultado era una pantalla lavada de blanco y rosa en la que no se distinguía
 * ni la forma del cerebro ni dónde estaba la cámara. Justo en el momento que
 * tiene que ser el más importante del recorrido.
 *
 * La respuesta no es quitar el cristal, que funciona. Es que en ese instante
 * concreto bajen a la vez el bloom, el brillo de los surcos y la exposición
 * general. Como un ojo que se cierra un poco al pasar de la luz a la sombra: se
 * recupera el contraste, y con el contraste vuelve la profundidad.
 */
export function crossing(progress) {
  const i = insideness(progress)
  return 4 * i * (1 - i)
}

/**
 * EL RELEVO. El instante en que la cámara ATRAVIESA el cerebro de la mano.
 *
 * Una campana sobre la ventana en la que ese cerebro se desvanece: cero antes,
 * uno cuando la cámara está justo dentro, cero después.
 *
 * ## Qué arregla
 *
 * Ese frame era el más claro de toda la web, y con diferencia. Medido en las
 * capturas: la portada da 170 de luminancia media, el interior da 40, y en el
 * paso por la mano se disparaba a **214** para caerse a 40 en la siguiente
 * parada. Eso no es una transición, es un fogonazo seguido de un corte.
 *
 * La causa es la de siempre en esta web: tres cosas claras coincidiendo. El
 * cerebro de la mano al máximo de emisivo, su halo aditivo llenando el cuadro,
 * y el telón del interior —que es OPACO— encendiéndose todavía en crema.
 *
 * La respuesta es la misma que en la corteza y está escrita en el manual:
 * **restar luz, no sumarla.** Como un ojo que se cierra al pasar de la sombra
 * a la luz. Sin esto, subir el contraste del resto del descenso solo hace el
 * fogonazo más evidente.
 *
 * Sale de `LAYERS.handBrain`, no de una ventana nueva: si algún día el
 * personaje se va antes o después, esto se mueve con él.
 */
/**
 * ── Y TIENE VENTANA PROPIA, ANCLADA AL CRUCE GEOMÉTRICO ───────────────────
 *
 * Salía de `LAYERS.handBrain.out` con este argumento: "si algún día el
 * personaje se va antes o después, esto se mueve con él". Sonaba a buena
 * dependencia y era la equivocada, y se vio en cuanto hubo que mover esa
 * ventana para cerrar el hueco del relevo: al retrasar el desvanecido a
 * [0,098 · 0,15], la campana se fue con él y **dejó de restar luz donde hacía
 * falta**. Medido en el build, apareció un pico en mitad del descenso —154 en
 * 0,06, 172 en 0,10, 125 en 0,12— que es justo lo que este manual prohíbe.
 *
 * Lo que decide cuándo se atraviesa el cerebro de la mano no es cuándo deja de
 * verse: es dónde está la CÁMARA. La clave 2 del vuelo —`hand + 0,1`— cae en
 * 0,105, así que la campana se centra ahí y ya no depende de una opacidad.
 */
const HANDOFF = [0.078, 0.132]

export function handoff(progress) {
  const t = ramp(progress, HANDOFF[0], HANDOFF[1])
  return 4 * t * (1 - t)
}

/**
 * EL DESCENSO. Cuánto se ha dejado atrás el mundo de la portada.
 *
 * Va de cero en la portada a uno cuando la cámara ya está pegada al cerebro, y
 * gobierna lo que le pasa al entorno de Olaz: se oscurece, pierde color y se
 * agranda como si la cámara lo atravesara.
 *
 * ## Por qué ocupa tanto
 *
 * Empieza en 0,03 y termina en 0,28: **la cuarta parte del recorrido, cinco
 * pantallas de scroll.** No es un exceso, es el mínimo para que se vea.
 *
 * La versión anterior cruzaba de la portada al interior con la ventana de la
 * capa `mind`, que dura 0,095 —menos de dos pantallas— y además lo hacía como
 * un fundido entre dos imágenes. Dos cosas fallaban a la vez: era corto, y un
 * fundido cruzado no cuenta un viaje. Cuando A baja y B sube a la vez, en el
 * punto medio hay dos imágenes al 50% y el ojo no lee "me estoy moviendo", lee
 * "algo ha parpadeado".
 *
 * Lo que sí lo cuenta es que UNA sola imagen se transforme mientras la cámara
 * avanza: si el sitio donde estás se apaga, pierde color y te pasa por los
 * lados, te estás yendo de él. El fondo del interior sube por debajo de eso, y
 * para cuando se ve ya no hay nada con qué compararlo.
 *
 * Termina antes que la corteza (0,35) a propósito. Lo que separa la portada de
 * la mente tiene que estar resuelto ANTES de empezar a atravesar nada: si las
 * dos cosas se solapan, el momento de cruzar compite con el de llegar.
 */
const DESCENT = [0.03, 0.34]

/**
 * Un tramo LINEAL de 0 a 1. Sin suavizar, a diferencia de `ramp`.
 *
 * Hace falta para el descenso y la explicación es la razón por la que este
 * tramo se rehízo entero. Con `ramp` —que es un smoothstep— el valor va a la
 * mitad de lo que debería durante toda la primera parte: en el 20% del tramo
 * vale 0,10, en el 40% vale 0,35. Sumado a que cada efecto era lineal sobre él,
 * el resultado medido era que la luminancia bajaba de 170 a 136 en las tres
 * primeras pantallas y de 136 a 38 en la última. Toda la transición ocurría al
 * final, que es exactamente de lo que no se trataba.
 *
 * Ahora el maestro es honesto —dice cuánto llevas— y cada efecto se suaviza en
 * su propio subtramo. Así se puede repartir el trabajo por el recorrido en vez
 * de amontonarlo, que es lo que hace que se vea.
 */
export function span(value, start, end) {
  if (end === start) return value >= end ? 1 : 0
  return Math.min(1, Math.max(0, (value - start) / (end - start)))
}

export function descent(progress) {
  return span(progress, DESCENT[0], DESCENT[1])
}

/**
 * EL PRIMER TÉRMINO DE LA PORTADA. Cuánto se está atravesando el bodegón.
 *
 * Devuelve dos curvas, y hacen falta las dos:
 *
 *     pass      una RAMPA. Cuánto se lleva recorrido. Mueve y agranda
 *     presence  una MESETA. Cuánto se ve. Entra, se queda, y se va
 *
 * ## Y AHORA NACE EN CERO. `REST` valía 0,74 y era un error de concepto
 *
 * Estaba puesto para corregir el "Olaz pegado sobre una foto": la portada
 * quieta tenía UNA capa —una imagen y un personaje encima— y sin nada delante
 * de él no hay dentro. La corrección era buena para la fotografía de sala, que
 * no tenía primer término ninguno.
 *
 * La lámina de ahora SÍ lo tiene. Es un bodegón: las piedras de coco, los
 * acentos añil y las ramas ya están a distintas profundidades dentro del
 * archivo, y vienen con su propia profundidad de campo del render. Duplicarlas
 * encima, desenfocadas y al 73%, no añade un plano: enturbia el que ya hay. Es
 * la web reconstruyendo a mano una composición que el asset ya trae hecha.
 *
 * Con `REST` en cero, la portada quieta es exactamente la lámina —nítida, tal
 * cual— y el primer término entra al empezar a bajar, que es cuando de verdad
 * tiene un trabajo: adelantar a la cámara y salirse por los lados. Además
 * quita de en medio la única capa que aparecía sin que nadie la llamara, que
 * es la mitad del destello del arranque.
 */
const FOREGROUND = { from: 0.0, to: 0.2, settle: 0.06, fall: 0.05 }

/**
 * Cuánta presencia tiene el marco con la portada quieta. **Cero**: en reposo
 * manda la lámina y nada se pinta encima de ella.
 */
const REST = 0

export function foreground(progress) {
  const pass = span(progress, FOREGROUND.from, FOREGROUND.to)
  if (pass >= 1) return null

  const settling = ramp(progress, FOREGROUND.from, FOREGROUND.from + FOREGROUND.settle)
  const leaving = ramp(progress, FOREGROUND.to - FOREGROUND.fall, FOREGROUND.to)

  return { pass, presence: (REST + (1 - REST) * settling) * (1 - leaving) }
}

/*
  ── AQUÍ ESTABA `corridor()`, Y HA SALIDO ─────────────────────────────────

  Devolvía la presencia y el avance del corredor de CSS: dos copias de la
  fotografía de la sala, a pantalla completa, que crecían y se separaban.

  Lo sustituyó `three/Corridor.jsx` —anillos de geometría colocados sobre la
  misma curva que recorre la cámara— y desde entonces esta señal no la leía
  nadie. Se va con sus dos constantes, `CORRIDOR` y `REST`, por la regla de
  siempre: una señal declarada y no usada MIENTE, porque describe un
  comportamiento que ya no existe.
*/

/**
 * EL CRUCE, DESGLOSADO. Cuánto se ve la membrana y cuánto se lleva recorrido
 * de ella.
 *
 * ## Por qué hacen falta dos números y no uno
 *
 * `crossing` vale uno en la membrana de entrada y otra vez en la de salida, y
 * para bajar el bloom eso está perfecto —es el mismo umbral cruzado al revés—.
 * Para la escenografía no llega, y el primer intento lo demostró: montando la
 * apertura del velo sobre la misma campana, las dos curvas se cancelaban. El
 * túnel solo estaba abierto del todo en el instante en que era más visible, y
 * el resultado era que no se veía nunca.
 *
 * Son dos cosas distintas y se comportan distinto:
 *
 *     presence  una CAMPANA. Cero fuera, uno en la membrana. Cuánto se ve
 *     pass      una RAMPA. De cero a uno atravesando. Cuánto se lleva hecho
 *
 * Lo que da la sensación de paso es la rampa: la imagen crece y se abre sin
 * volver atrás, como unas paredes que se quedan detrás. La campana solo decide
 * cuándo aparece y cuándo se va.
 *
 * `which` sigue valiendo siempre `enter`, y ahora que el recorrido SÍ cruza dos
 * veces conviene decir por qué: la segunda travesía no lleva lámina. El cruce
 * de vuelta es geometría —la corteza cerrándose sobre la red mientras la cámara
 * se retira— y ponerle encima una imagen clara a pantalla completa sería el
 * mismo error medido en la entrada: en el cruce hay que RESTAR luz, no sumarla.
 * `portal-exit.webp` sigue sin usarse por eso.
 *
 * No hay ni un número nuevo aquí, a propósito: todo sale de `INSIDE`. Si algún
 * día se mueve esa ventana, la transición se mueve con ella sin que nadie
 * tenga que acordarse de nada.
 */

/**
 * ── EL AIRE DEL DESCENSO ──────────────────────────────────────────────────
 *
 * De qué color es el espacio en cada momento de la bajada, en función de
 * `descent(progress)`.
 *
 * Vivía en `components/ui/PortalVeil.jsx` y ha subido aquí porque tiene DOS
 * lectores: la viñeta del DOM que envuelve a la cámara y el telón de la escena
 * —`three/MindBackdrop.jsx`—, que es lo que de verdad llena el cuadro entre
 * 0,17 y 0,34. Mientras solo lo sabía el velo, el telón usaba el negro del
 * interior desde el primer momento y el paso caía a una luminancia de 10 sobre
 * 255 dos pantallas antes de tiempo: un campo negro con unos aros encima.
 *
 * Es una señal derivada del progreso, así que su sitio es la tabla. Misma
 * regla que `insideness` o `crossing`: un dato que necesitan dos archivos y
 * conoce uno solo está mal colocado.
 */
const ATMOSPHERE = [
  { at: 0.0, color: [0xf5, 0xe6, 0xd3] }, // marfil: el mundo de Olaz
  { at: 0.28, color: [0x8a, 0x5a, 0x3c] }, // coco: la estructura
  /**
   * ESTA PARADA EXISTE PARA NO PASAR POR GRIS, y no es un capricho.
   *
   * De coco a añil en línea recta por RGB, el punto medio es `#584E4E`: un
   * gris con un 11% de saturación y un punto de malva. En pantalla se veía —el
   * cuadro en 0,17 era un campo plano sin color ni textura— y encima roza
   * justo el tono que la identidad prohíbe.
   *
   * Dos colores cálido y frío no se pueden cruzar por el camino corto. Bajando
   * primero a un coco oscuro, la transición va de marrón claro a marrón oscuro
   * y solo entonces al azul: nunca se queda sin identidad por el camino.
   */
  { at: 0.46, color: [0x6b, 0x4c, 0x38] }, // coco oscuro: el desvío que evita el gris
  /**
   * ── EL AÑIL SALE DE LA RAMPA, Y ES LA TERCERA VEZ QUE DA PROBLEMAS ──────
   *
   * Aquí había una parada de añil `#25415F` en 0,58, con esta explicación:
   * "el añil es un paso, no un destino; su ventana es corta a propósito".
   * Antes había estado en 0,72 y se midió que en el progreso 0,23 el 73% del
   * cuadro era azul y el 21% caía en el rango del lila. Adelantarla a 0,58
   * arregló aquello… mientras esta rampa tuvo UN SOLO LECTOR.
   *
   * Ahora tiene dos, y el segundo la usa de otra manera. La viñeta del DOM la
   * pinta como un halo en los BORDES y al 55% como mucho; el telón de la
   * escena la pinta como el COLOR DEL ESPACIO, a pantalla completa. Con el
   * añil dentro, la primera captura del paso volvió a dar exactamente el mismo
   * cuadro que se había corregido dos veces: en 0,22, un campo azul con un 80%
   * de saturación media. La ventana corta no salva nada cuando lo que pinta es
   * la pantalla entera.
   *
   * La corrección no es mover la parada otra vez. Es aceptar lo que ya decía
   * la propia nota anterior —"cuando el interior manda, la atmósfera que queda
   * encima es oscuridad caliente, no azul"— y quitar el azul del AIRE.
   *
   * **El añil del descenso no desaparece de la web: cambia de sitio.** Lo
   * ponen las dos cosas que ya lo tenían y que además son las que hay que
   * mirar: el núcleo azul de las láminas del paso —que es el punto de fuga— y
   * el `uDeep` del interior. Un color de acento que es el 10% de la paleta no
   * puede ser también el color del cielo durante cinco pantallas.
   *
   * `#3A322D` es el punto más frío que queda: un coco al que se le ha ido el
   * rojo, 22% de saturación y tono 23°. Sigue estando en la familia cálida
   * —lejos del `#584E4E` malva que costó la parada de 0,46— pero se lee frío
   * al lado del coco de arriba, que es lo único que hacía falta.
   */
  { at: 0.62, color: [0x40, 0x38, 0x2f] }, // el punto más frío del descenso
  { at: 0.8, color: [0x2a, 0x24, 0x20] }, // ya casi neutro
  { at: 1.0, color: [0x12, 0x0d, 0x0b] }, // negro cálido: la mente
]

export function atmosphereAt(t) {
  let i = 0
  while (i < ATMOSPHERE.length - 2 && t >= ATMOSPHERE[i + 1].at) i += 1

  const from = ATMOSPHERE[i]
  const to = ATMOSPHERE[i + 1]
  const span = to.at - from.at || 1
  const k = Math.min(1, Math.max(0, (t - from.at) / span))

  return [0, 1, 2].map((j) => from.color[j] + (to.color[j] - from.color[j]) * k)
}

export function portalAt(progress) {
  const presence = crossing(progress)
  if (presence <= 0.001) return null

  return {
    which: 'enter',
    presence,
    pass: ramp(progress, INSIDE.enter[0], INSIDE.enter[1]),
  }
}

/**
 * El recorrido por las cinco áreas, DENTRO de la cavidad.
 *
 * Llegar a un área, leerla, seguir bajando y llegar a la siguiente. Esto
 * sustituye al panel fijo de abajo, y de paso arregla el problema de encuadre
 * en movil: si se viaja de una a otra, las cinco no tienen que caber a la vez
 * y la camara puede acercarse de verdad a cada una.
 *
 * Cada área tiene dos claves y no una: una de LLEGADA y otra de SALIDA casi en
 * el mismo sitio. El hueco entre las dos es el tiempo de lectura. Con una sola
 * clave la camara pasaria de largo sin detenerse, porque una curva no se para
 * nunca por si sola.
 */
export const TOUR_START = 0.68
/**
 * Lo que ocupa cada área del recorrido total. Cinco llenan hasta el 1.
 */
const NODE_SPAN = 0.064
/**
 * De ese hueco, cuanto se pasa QUIETO delante del área.
 *
 * Baja de 0,036/0,05 —siete décimas del tramo— a 0,040/0,084, o sea menos de
 * la mitad, y el motivo es geométrico. Fuera del cerebro las áreas estaban a
 * más de tres radios del centro y la cámara las miraba desde muy lejos: podía
 * saltar de una a otra recorriendo mucho mundo sin que el ENCUADRE se moviera
 * apenas. Dentro de la cavidad la distancia a lo que se mira es de medio metro,
 * así que el mismo salto se percibe cuatro veces más rápido.
 *
 * Medido con la métrica de siempre —avance dividido por la distancia a lo
 * mirado—: con el reparto antiguo el trayecto entre dos áreas daba 0,72, el
 * doble que el golpe más fuerte del viaje. Con este da 0,35.
 */
const NODE_HOLD = 0.032

/**
 * ── EL COMPÁS DEL CEREBRO, QUE SE DETIENE AL ENTRAR ───────────────────────
 *
 * El cerebro gira despacio mientras se ve como objeto: es lo que le da la
 * lectura de joya suspendida. Dentro no puede seguir girando, y no por gusto:
 * las cinco áreas están ancladas a la cavidad, así que una pared que rota
 * mientras ellas se quedan quietas acabaría empujándolas fuera del casco —y
 * una habitación que gira sola no se lee como una habitación—.
 *
 * Apagarlo con `1 - insideness` no sirve: el ángulo es `beat · 0,14`, así que
 * multiplicar el resultado haría al cerebro girar HACIA ATRÁS durante el
 * cruce. Lo que hay que frenar es el compás, no el ángulo.
 *
 * Esto devuelve un progreso equivalente cuya derivada vale uno hasta 0,29,
 * cae linealmente hasta cero en 0,40 y se queda ahí. Es la integral de esa
 * rampa, en forma cerrada: continua, con velocidad continua, sin estado y sin
 * reloj. Parado no se mueve; volviendo al mismo punto, el mismo cuadro.
 */
const SPIN_STOP = [0.4, 0.5]

export function spinEase(progress) {
  const [from, to] = SPIN_STOP
  const width = to - from
  const before = Math.min(Math.max(progress, 0), from)
  const inside = Math.max(0, Math.min(progress, to) - from)
  return before + inside - (inside * inside) / (2 * width)
}

/**
 * ── POR DÓNDE SE ENTRA EN EL CEREBRO ──────────────────────────────────────
 *
 * Ya no es una dirección escrita a mano: **es la recta que va del centro de la
 * mente al cerebro que Olaz tiene en la mano.** Se calcula en `cameraPath` a
 * partir de la posición medida de ese cerebro; esta constante solo queda como
 * respaldo para el primer frame, antes de que el modelo haya cargado y dicho
 * dónde está su mano.
 *
 * ## Por qué cambia, y qué argumento sustituye
 *
 * Antes era `(0,28 · 0,15 · 1)` con este razonamiento: "entrar de frente y en
 * línea recta es indistinguible de un zoom; sin componente lateral no hay
 * paralaje". El razonamiento era correcto cuando en el descenso no había nada
 * más que el cerebro creciendo. Ha dejado de serlo: ahora el paralaje lo pone
 * el paso —doce anillos que la cámara adelanta uno a uno—, y lo pone mucho
 * mejor que una diagonal de quince grados.
 *
 * Y esa diagonal tenía un coste que solo se ve cuando hay un túnel. La cámara
 * salía del cerebro de la mano en una dirección y llegaba a la parada del
 * umbral en otra, así que **el recorrido del paso era una curva**: los anillos,
 * que se colocan sobre esa curva, quedaban con su eje apuntando a la tangente
 * y no al destino. Medido en 0,15, la cámara pasaba a 1,98 unidades del eje
 * de entrada con un hueco de anillo de 1,26: iba POR FUERA del túnel, mirándolo
 * de lado. En pantalla eso era un aro luminoso arriba a la derecha y el cerebro
 * asomando por su borde, en vez de un cerebro al final de un túnel.
 *
 * Con el eje anclado a la mano, el tramo entre el cerebro pequeño y el grande
 * es una RECTA. La cámara atraviesa el primero y sigue en línea hasta el
 * segundo, los anillos se colocan sobre esa recta y su punto de fuga es el
 * destino. Que es, literalmente, lo que cuenta la web: se entra por el cerebro
 * de la mano.
 */
const ENTRY = new Vector3(0.28, 0.15, 1).normalize()

/**
 * ── LA DERIVA DE DENTRO Y POR DÓNDE SE SALE ───────────────────────────────
 *
 * Las tres claves del vuelo alrededor de la red de conocimiento, en fracciones
 * del cerebro desde su centro. Están MEDIDAS, no elegidas: `window.__cocobrain
 * .cavity` lanza rayos desde el centro de la sala y estas tres direcciones
 * tienen la primera pared por encima de 0,80 del cerebro, o sea el doble de
 * lejos que la cámara.
 *
 *     clave   azimut  elevación   primera pared
 *       1       15°       6°          0,80
 *       2       45°       6°          0,87
 *       3       75°      19°          0,90
 *
 * Y la última es además POR DONDE SE SALE: el eje de salida es su prolongación
 * hacia fuera, así que la salida continúa el movimiento que ya trae la cámara
 * en vez de empezar uno nuevo. Vive aquí arriba, y no dentro de `cameraPath`,
 * porque la lámina del espacio exterior necesita el mismo eje para colocarse
 * detrás del cerebro.
 */
/**
 * ── LA DERIVA DE DENTRO: SE ACERCA Y SE SEPARA ────────────────────────────
 *
 * Cada clave se declara por DIRECCIÓN y RADIO, no por coordenadas. Antes eran
 * tres puntos escritos en x·y·z y las tres estaban al mismo radio —0,359,
 * 0,358 y 0,360— así que la cámara barría noventa grados de azimut a distancia
 * constante: los nodos cambiaban de sitio y ninguno llegaba nunca a tener
 * presencia. Orbitar no es explorar.
 *
 * Escrito por dirección y radio, la distancia pasa a ser un parámetro y se
 * puede modular. El recorrido de dentro es ahora:
 *
 *     llegada · APROXIMACIÓN · separación · APROXIMACIÓN · conjunto y salida
 *
 * ## Las direcciones siguen siendo las MEDIDAS, y eso no es negociable
 *
 * La sala es anatomía, no una esfera: en unas direcciones a 0,36 del centro hay
 * aire y en otras hay un pliegue. `window.__cocobrain.cavity` lanzó rayos desde
 * el centro cada 15° de azimut y 13° de elevación, y de ahí salieron cinco
 * direcciones con la primera pared por encima de 0,73. Son estas cinco, en el
 * orden en que se barren, y el radio de aproximación —0,225— está muy por
 * dentro de la más cerrada de ellas.
 *
 *     clave   azimut  elevación   primera pared   radio
 *       1      105°       32°         0,88        0,400
 *       2       90°       32°         0,73        0,225   ← aproximación
 *       3       75°       19°         0,90        0,395
 *       4       45°        6°         0,87        0,225   ← aproximación
 *       5       15°       19°         0,80        0,360   ← y es el eje de salida
 *
 * La última se deja EXACTAMENTE donde estaba: de ella sale `EXIT_AXIS`, y con
 * él la orientación de toda la constelación exterior y la colocación de la
 * lámina del espacio. Moverla habría rotado el acto 7 entero.
 *
 * ## Y a qué se mira lo decide la RED
 *
 * En las dos aproximaciones la cámara no mira al centro de la nube: mira al
 * centroide de una REGIÓN del grafo —un conocimiento muy conectado y su
 * vecindad, ver `knowledgeClusters`—. Eso es lo que convierte el acercamiento
 * en lectura: el grupo pasa del borde al centro del cuadro y crece un 60%,
 * mientras el resto de la nube se abre por los lados con la perspectiva.
 *
 * `region` es un ÍNDICE en esa lista ordenada por peso, no un nombre. La
 * coreografía dice "acércate a la región más importante"; cuál es esa región lo
 * contesta el grafo. Si mañana entra un conocimiento nuevo en `knowledge.js`,
 * la cámara se acerca a otro sitio sin que nadie toque este archivo — y al
 * revés: aquí no puede aparecer nunca el nombre de una tecnología, porque eso
 * sería contenido dentro de la tabla del recorrido.
 */
const DRIFT = [
  { at: 0.545, az: 105, el: 32, radius: 0.4, region: null },
  { at: 0.6, az: 90, el: 32, radius: 0.28, region: 0 },
  { at: 0.65, az: 75, el: 19, radius: 0.395, region: null },
  { at: 0.7, az: 45, el: 6, radius: 0.28, region: 1 },
  { at: 0.74, az: 15, el: 19, radius: 0.36, region: null },
]

/**
 * ── EL RADIO DE UNA APROXIMACIÓN NO ES UNA CONSTANTE ──────────────────────
 *
 * Estuvo escrito a mano —0,225 para las dos claves de aproximación— y funcionó
 * exactamente en una pantalla. En 390 vertical la misma cifra dejaba los nodos
 * a doscientos píxeles, con el icosaedro contándose los lados y la mitad de la
 * región desbordando por los costados: la aproximación pasaba de acercar a
 * atropellar.
 *
 * La causa es la de siempre en esta web: el `fov` vertical es el mismo en
 * todas las pantallas, pero el HORIZONTAL sale de multiplicarlo por la
 * proporción. En vertical la proporción es 0,46, así que a la misma distancia
 * cabe menos de un tercio del ancho. Una distancia constante no puede encuadrar
 * dos cuadros de proporción distinta — es el mismo error que ya costó el apoyo
 * de Olaz sobre el podio.
 *
 * Así que se deduce. La región mide `span` de radio, y se pide la distancia a
 * la que ocupa `FILL` del cuadro, con `fitDistance`, que es la función que ya
 * hace esa cuenta para el encuadre de la portada y para el del acto 7.
 *
 * El tope de 0,34 es lo que impide que la corrección se coma la aproximación
 * entera: en vertical la cuenta pide 0,51 —más lejos que el crucero, o sea no
 * acercarse— y ahí manda el tope. En vertical el acercamiento es menor y no hay
 * forma de que no lo sea; lo que sí se conserva entero es la otra mitad del
 * efecto, que es mirar al centroide de la región y ponerla en el centro.
 */
const APPROACH = { fill: 0.62, near: 0.2, far: 0.34 }

/**
 * Cuánto se desplaza la MIRADA hacia la región, entre el centro de la nube y su
 * centroide.
 *
 * No es uno, y la captura explica por qué. Apuntando al centroide exacto, la
 * región queda centrada y el resto de la nube se va hacia un lado: en p=0,70 la
 * red entera se subió al tercio superior y el inferior quedaba en pared vacía.
 * Una región es seis nodos de dieciocho, así que su centro de masa no es el de
 * lo que hay que encuadrar.
 *
 * Con 0,65 la región sigue ganando el centro —que es lo que la hace legible— y
 * la nube no se descuelga del cuadro.
 */
const AT_REGION = 0.65

function approachRadius(span, { fov, aspect }) {
  const fitted = fitDistance({
    halfWidth: span,
    halfHeight: span,
    fov,
    aspect,
    fill: APPROACH.fill,
  })

  return Math.min(APPROACH.far, Math.max(APPROACH.near, fitted))
}

/** Una dirección de la cavidad, de azimut y elevación en grados a x·y·z. */
function cavityDirection(az, el) {
  const a = (az * Math.PI) / 180
  const e = (el * Math.PI) / 180
  return new Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a))
}

/** El eje de salida: la prolongación de la última clave interior. */
export const EXIT_AXIS = cavityDirection(DRIFT[DRIFT.length - 1].az, DRIFT[DRIFT.length - 1].el)

/**
 * Las regiones del grafo, calculadas UNA vez por reparto de nube.
 *
 * `cameraPath` se reconstruye cada vez que cambia la proporción de la ventana,
 * y `knowledgeClusters` corre noventa pasadas de relajación: no es caro, pero
 * tampoco hay ningún motivo para repetirlo. La semilla es fija, así que para un
 * mismo `spread` la respuesta es siempre la misma.
 */
const clusterCache = new Map()

function regionsFor(spread) {
  const key = String(spread)
  if (!clusterCache.has(key)) clusterCache.set(key, knowledgeClusters(spread))
  return clusterCache.get(key)
}

/**
 * EL ENCUADRE DEL ACTO 7, deducido de dónde han quedado los nodos.
 *
 * No es un número escrito a mano: se proyectan las cinco posiciones exteriores
 * sobre los ejes de la cámara final —su derecha y su arriba, que salen del eje
 * de salida— y se pide la distancia a la que ese rectángulo ocupa el 86% del
 * cuadro. Así la composición sale igual en 1920, en 1366 y en un móvil en
 * vertical, que es donde un número a ojo siempre falla.
 *
 * Lo leen dos sitios: la última clave de la cámara y `three/OuterSpace.jsx`,
 * que dimensiona su lámina contra este mismo encuadre. Un dato que necesitan
 * dos archivos y conoce uno solo está mal colocado.
 */
/**
 * LOS EJES DE LA COMPOSICIÓN FINAL: la derecha y el arriba de la cámara cuando
 * mira al cerebro desde el eje de salida.
 *
 * Es lo que convierte "el nodo está a 300 grados" en una posición de mundo, y
 * por eso vive aquí: la orientación de la constelación exterior depende de por
 * dónde se sale, que es un dato del RECORRIDO. `nodeLayout` declara ángulos;
 * este archivo dice contra qué se miden.
 */
export function orbitBasis() {
  const forward = EXIT_AXIS.clone().negate()
  const right = new Vector3().crossVectors(forward, WORLD_UP).normalize()
  const up = new Vector3().crossVectors(right, forward).normalize()

  /* `forward` para `nodePositions` es hacia la cámara: el eje de salida. */
  return { right, up, forward: EXIT_AXIS.clone() }
}

export function orbitFraming(t, { fov = 35, aspect = 1.6 } = {}) {
  const brain = t.mind.radius * t.mind.brain

  const { right, up } = orbitBasis()

  const orbit = nodePositions(brain, { ...orbitBasis(), spread: spreadFor(aspect) })
  let halfWide = brain * 0.5
  let halfTall = brain * 0.5
  for (const spot of Object.values(orbit)) {
    halfWide = Math.max(halfWide, Math.abs(spot.dot(right)))
    halfTall = Math.max(halfTall, Math.abs(spot.dot(up)))
  }

  /**
   * El aire, y es el mismo en los dos ejes.
   *
   * Estuvo asimétrico —0,34 a lo ancho contra 0,16 a lo alto— porque la
   * etiqueta sale al LADO del nodo, mide unos 130 píxeles y no se encoge con la
   * distancia: en vertical, que es donde manda el ancho, las de la derecha se
   * salían del cuadro. El precio era caro: ese margen extra se llevaba la mitad
   * del ancho útil en un móvil y empujaba la cámara hasta dejar el cerebro en
   * un quinto del alto.
   *
   * Se arregla donde nace. En vertical la etiqueta pasa a ir DEBAJO del nodo
   * —ver `NeuralNodes`— así que ya no pide ancho, y el margen vuelve a ser el
   * mismo en los dos ejes.
   */
  const margin = brain * 0.16

  /**
   * En vertical hace falta AIRE ARRIBA Y ABAJO, y no es composición: es que
   * ahí está el HUD. El logotipo y "cabeza despejada" ocupan la banda superior
   * y el marco la inferior, entre las dos unos 110 píxeles sobre 844 — el 13%
   * del alto. Sin este margen, el nodo más alto de la constelación aterriza
   * justo debajo del logotipo y sus dos textos se pisan.
   *
   * En apaisado no hace falta: el HUD vive en las esquinas y la constelación
   * es más ancha que alta, así que nunca llega.
   */
  const room = margin + (aspect < 1.2 ? brain * 0.24 : 0)

  return {
    brain,
    distance: fitDistance({
      halfWidth: halfWide + margin,
      halfHeight: halfTall + room,
      fov,
      aspect,
      fill: 0.94,
    }),
  }
}

/**
 * ── AQUÍ ESTABAN `UP`, `FRONT`, `ORBIT`, `SWING` y `AIM` ────────────────────
 *
 * Eran los cinco números que colocaban la cámara frente a cada ÁREA EDITORIAL
 * dentro de la cavidad: a qué distancia del centro, cuánto girada sobre la
 * tangente y a qué altura del radio miraba. Se van con la gira que describían.
 *
 * Las cinco áreas no viven dentro del cerebro —ver `LAYERS.nodes`— y lo que
 * hay ahora en su lugar es una deriva continua alrededor de la red de
 * conocimiento, escrita como cinco claves en fracciones del cerebro dentro de
 * `cameraPath`. No hace falta deducir nada: son cinco puntos y un tiempo.
 *
 * Una constante declarada y no usada miente, así que salen enteras.
 */

export function cameraPath(
  t,
  { handBrain = null, mascotWidth = null, fov = 35, aspect = 1.6, nodeOrder = [] } = {},
) {
  const mascot = new Vector3(...t.mascot.position)
  // La posición medida sobre el modelo manda sobre la del token: el token es
  // solo el valor con el que se trabaja hasta que el GLB carga.
  const hand = handBrain ? handBrain.clone() : new Vector3(...t.handBrain.position)
  const mind = new Vector3(...t.mind.center)

  /**
   * El cerebro grande, en unidades de mundo. Es la escala con la que se mide
   * TODO el acto 2: el casco, la red de dentro y cada parada de la cámara.
   *
   * Su malla mide 1,998 × 1,834 × 1,971 y se normaliza por el lado mayor, así
   * que el casco es casi una esfera de semiejes 0,500 · 0,459 · 0,493 veces
   * este número. Medido con `gltf-transform inspect`, no estimado: de ahí sale
   * saber si una parada de la cámara cae dentro o fuera del cerebro.
   */
  const brain = t.mind.radius * t.mind.brain

  /**
   * Las distancias de cámara salen de la geometría, no de probar valores.
   *
   * En la portada hay que abarcar al personaje MÁS el hueco que ocupa a un
   * lado del centro: si está desplazado a la derecha para dejar sitio al
   * texto, la cámara tiene que retroceder lo suficiente para que quepan los
   * dos.
   */
  const halfHeight = t.mascot.height / 2
  const halfWidth = (mascotWidth ?? t.mascot.height * 0.95) / 2

  const heroDistance = fitDistance({
    halfWidth: halfWidth + Math.abs(mascot.x),
    halfHeight,
    fov,
    aspect,
    fill: t.mascot.fill,
  })

  /**
   * El plano en el que el cerebro entero cabe en el encuadre. Es el último
   * momento en el que se ve como un objeto: a partir de ahí ya no cabe, y esa
   * es justo la sensación que hace falta antes de entrar.
   */
  const brainViewDistance = fitDistance({
    halfWidth: brain * 0.62,
    halfHeight: brain * 0.62,
    fov,
    aspect,
    fill: 0.8,
  })

  /**
   * La cámara de la portada mira a la ALTURA del personaje, no a su pecho.
   *
   * Apuntar al pecho inclinaba la cámara hacia arriba unos tres grados, y esa
   * inclinación sube el borde inferior del encuadre un tercio de unidad. Como
   * los pies quedaban a solo 0,17 del borde, el resultado era que a Olaz se le
   * cortaban las zapatillas por la mitad.
   *
   * La lección: inclinar la cámara no solo gira la imagen, mueve los cuatro
   * bordes del encuadre. Si un elemento está justo al filo, se pierde.
   */
  /**
   * ── DÓNDE SE MIRA EN LA PORTADA: LO DECIDE EL PEDESTAL ─────────────────
   *
   * Esto era `mascot.y + 0,12`, un número ajustado mirando una captura de
   * 1920. Ajustado a ojo sirve para una pantalla y falla en las demás, y aquí
   * falla de la peor manera posible: el podio es una IMAGEN servida con
   * `object-cover`, así que su altura en pantalla es siempre la misma fracción
   * —`stage.ground`— mientras que el tamaño de Olaz sale de `fill`, que en
   * pantalla apaisada lo decide el ANCHO. Dos cosas que dependen de
   * magnitudes distintas no pueden encajar con una constante: medido, para
   * apoyarlo en 1920 hacía falta un desplazamiento de 0,16 y en 1440 uno de
   * 0,35.
   *
   * Ahora el punto de mira se DESPEJA de la condición "los pies caen en
   * `ground`", que es la única que importa:
   *
   *     los pies y el punto de mira están en la misma vertical, a `reach` de
   *     la cámara. La fracción de pantalla entre dos puntos de esa vertical es
   *     tan(ángulo entre sus rayos) / tan(fov/2), así que
   *
   *         y = cámara.y + reach · tan( atan(−medioAlto/reach) + caída )
   *         caída = atan( 2 · (ground − 0,5) · tan(fov/2) )
   *
   * Sale el mismo apoyo en 1920, 1440, 1366 y 390 sin tocar nada más, y —lo
   * que importa de verdad— vuelve a salir solo el día que cambie `fill`, el
   * `fov` o la lámina.
   *
   * Y de paso desaparece el otro medio problema: en vertical Olaz flotaba en
   * mitad del cuadro con el podio fuera de plano por abajo. No estaba mal
   * colocado, es que nadie le había dicho dónde estaba el suelo.
   */
  const ground = t.stage?.ground ?? 0.5
  const reach = Math.hypot(mascot.x * (1 - 0.18), heroDistance - mascot.z)
  const tanHalfFov = Math.tan((fov * Math.PI) / 360)
  const drop = Math.atan(2 * (ground - 0.5) * tanHalfFov)
  const heroLook = new Vector3(
    mascot.x,
    mascot.y + reach * Math.tan(Math.atan(-halfHeight / reach) + drop),
    mascot.z,
  )

  /**
   * EL EJE DE ENTRADA, deducido de dónde está el cerebro de la mano.
   *
   * Ver la cabecera de ENTRY. Con esto, la parada del umbral, el paso y las
   * paradas de dentro caen todas sobre la MISMA recta que atraviesa el cerebro
   * pequeño: el descenso deja de ser una curva y pasa a ser un viaje en línea
   * hacia el destino.
   */
  const entry = hand.clone().sub(mind)
  if (entry.lengthSq() < 1e-6) entry.copy(ENTRY)
  entry.normalize()

  /** Un punto del acto 2, en fracciones del cerebro desde su centro. */
  const at = (x, y, z) => mind.clone().add(new Vector3(x * brain, y * brain, z * brain))
  /** Un punto sobre el eje de entrada, a tantas fracciones del centro. */
  const along = (fraction) => mind.clone().addScaledVector(entry, brain * fraction)

  /**
   * ── UNA PARADA POR ÁREA, TODAS DENTRO DE LA CAVIDAD ────────────────────
   *
   * Antes la cámara se colocaba POR FUERA del nodo y hacia el espectador, a
   * `nodeViewDistance` —una distancia calculada para abarcar la constelación
   * entera—. Eso solo tiene sentido si los nodos están sueltos en el vacío.
   * Ahora están en el hueco entre la red de conocimiento y la pared de la
   * corteza, así que la cámara tiene que quedarse en ese mismo hueco.
   *
   * El encuadre lo hacen tres decisiones, y las tres son geometría:
   *
   * - la cámara se pone a `ORBIT` del centro EN LA MISMA DIRECCIÓN que el área,
   *   así que está a su altura y a su lado del cerebro;
   * - y girada `SWING` sobre la tangente, que es lo que la aparta del eje: sin
   *   ese giro el área quedaría exactamente en el centro del cuadro, tapando la
   *   red que tiene detrás. Con él queda unos diez grados a un lado;
   * - mira a un punto entre el área y el centro (`AIM`), de modo que en el
   *   mismo encuadre entran las tres capas: el área en primer término, la red
   *   detrás y la pared de la corteza cerrando el fondo.
   *
   * Comprobado contra el casco medido —semiejes 0,500 · 0,459 · 0,493 del
   * cerebro—: las cinco posiciones caen entre 0,74 y 0,79 del elipsoide, o sea
   * dentro y con margen. Ninguna atraviesa la pared.
   */
  const tourPositions = []
  const tourTargets = []
  const tourTiming = []

  /**
   * ── LA DERIVA DE DENTRO ────────────────────────────────────────────────
   *
   * Aquí había una parada por ÁREA EDITORIAL: la cámara visitaba las cinco de
   * una en una dentro de la cavidad. Esa era la dirección rechazada. Las áreas
   * viven fuera del cerebro y su recorrido es el siguiente checkpoint; dentro
   * solo hay conocimiento.
   *
   * Lo que queda es un vuelo continuo alrededor de la red, sin paradas
   * nominales: se entra por delante, se rodea la nube por abajo, se sube por el
   * otro lado y se ASIENTA. Las dos últimas claves están muy juntas —0,16 del
   * cerebro en siete centésimas de recorrido— para que el final no sea un
   * frenazo sino una llegada.
   *
   * Los cinco puntos caen entre 0,32 y 0,40 del cerebro desde el centro: por
   * fuera de la nube de conocimiento (0,115) y muy por dentro de la pared de la
   * sala (0,90). El hueco entre esas dos superficies es el sitio donde se puede
   * estar dentro y ver.
   */
  /**
   * ── Y LAS CINCO CLAVES NO ESTÁN ELEGIDAS: ESTÁN MEDIDAS ────────────────
   *
   * La sala es la anatomía del cerebro, no una esfera, así que "a 0,36 del
   * centro" no significa nada por sí solo: en unas direcciones ahí hay aire y
   * en otras hay un pliegue. Con las claves puestas a ojo, dos de las cinco
   * caían detrás de un giro y la red se veía por la mitad, con un muro liso
   * ocupando dos tercios del cuadro.
   *
   * Así que se miden. `window.__cocobrain.cavity` lanza rayos desde el centro
   * de la sala y devuelve a qué fracción del cerebro está la primera pared en
   * cada dirección. Barrido en azimut cada 15° y en elevación cada 13°, la
   * mediana sale en 0,405 y el percentil 10 en 0,135: la mitad del cielo está
   * cerrada.
   *
   * Estas cinco direcciones tienen todas la primera pared **por encima de
   * 0,73**, o sea el doble de lejos que la cámara. La línea entre la cámara y
   * la red está limpia en las cinco, y el recorrido entre ellas es un barrido
   * continuo de azimut 15° a 105° subiendo de 6° a 32° de elevación: se rodea
   * la red por un lado y se sube, sin volver atrás.
   *
   *     clave   azimut  elevación   primera pared
   *       1       15°       6°          0,80
   *       2       45°       6°          0,87
   *       3       75°      19°          0,90
   *       4       90°      32°          0,73
   *       5      105°      32°          0,88
   */
  /**
   * Las regiones del grafo a las que se acerca la cámara. Ver `DRIFT`: el
   * índice es una posición en la lista ordenada por peso, nunca un nombre.
   */
  const regions = regionsFor(t.mind.core ?? 1)

  DRIFT.forEach((step) => {
    const direction = cavityDirection(step.az, step.el)

    /* En las aproximaciones el radio lo decide el ENCUADRE de la región, no la
       tabla: ver approachRadius. En el resto manda el radio declarado. */
    const region = step.region === null ? null : (regions[step.region] ?? null)
    const radius = region ? approachRadius(region.span, { fov, aspect }) : step.radius

    tourPositions.push(mind.clone().addScaledVector(direction, brain * radius))

    /*
      En las aproximaciones se mira al centroide de la región; en el resto, al
      centro de la nube. El desvío es pequeño en unidades —los centroides caen
      entre 0,027 y 0,059 del cerebro— y es justo el que hace falta: acercada,
      lo que estaba en el borde del cuadro pasa a estar en medio.
    */
    const middle = at(-0.02, 0.005, -0.02)
    tourTargets.push(
      region
        ? middle.lerp(at(region.center.x, region.center.y, region.center.z), AT_REGION)
        : middle,
    )
    tourTiming.push(step.at)
  })

  /**
   * ── LA SALIDA ───────────────────────────────────────────────────────────
   *
   * Se sale por la PROLONGACIÓN de la última clave interior, no por una
   * dirección nueva. La cámara ya está en (0,329 · 0,117 · 0,088) mirando al
   * centro: seguir hacia fuera por ahí es continuar el movimiento que trae,
   * y eso es lo que hace que la salida no se lea como un salto de plano.
   *
   * Es además una dirección MEDIDA como abierta —azimut 75°, elevación 19°, la
   * primera pared de la sala a 0,90 del cerebro— así que entre la cámara y el
   * exterior no hay más pliegue que el del propio casco, que es justo el que
   * hay que atravesar.
   *
   * Y no coincide con el eje de entrada: se entra por el cerebro de la mano
   * —casi de frente en +Z— y se sale por un costado, a unos 75° de aquello. Se
   * sale del cerebro, no se deshace el camino.
   *
   * ## Se sale MIRANDO AL CENTRO, y esa es la decisión que lo resuelve todo
   *
   * Lo intuitivo sería salir mirando hacia fuera, para ver lo que hay al otro
   * lado. Eso obliga a girar la cámara media vuelta después de cruzar —el
   * cerebro se queda a la espalda— y este manual ya tiene escrito lo que pasa
   * con un giro así: se lee como un tirón de cabeza.
   *
   * Saliendo de espaldas y mirando al centro, la corteza se CIERRA sobre la
   * red mientras la cámara se retira. Se lee exactamente como lo que es —el
   * cerebro se cierra detrás de ti— el cerebro no se pierde de vista ni un
   * frame, y no hay ningún giro que hacer: la composición final es la misma
   * mirada, solo que desde más lejos.
   *
   * Las cuatro claves, en fracciones del cerebro desde su centro:
   *
   *     0,76   0,47   la red se aleja, la pared se acerca
   *     0,81   0,52   EL CRUCE. Es exactamente donde el relevo casco/sala salta
   *     0,86   0,80   fuera, con la corteza todavía llenando el cuadro
   *     0,92   1,75   el cerebro vuelve a caber: otra vez un objeto
   *     1,00   fitted la composición: cerebro en el centro, los cinco alrededor
   */
  const exit = EXIT_AXIS
  const orbitDistance = orbitFraming(t, { fov, aspect }).distance

  const outward = (fraction) => mind.clone().addScaledVector(exit, brain * fraction)

  /**
   * ── Y LA BANDA DEL CRUCE SE PASA DEPRISA, A PROPÓSITO ──────────────────
   *
   * El primer reparto ponía las claves en 0,47 y 0,52: la cámara tardaba cinco
   * centésimas de recorrido en cruzar cinco centésimas de cerebro, o sea se
   * quedaba a unos SEIS CENTÍMETROS de mundo de la superficie del casco
   * durante decenas de frames. El plano cercano de la cámara está en 0,1, así
   * que a esa distancia el propio near plane recorta la corteza y por el
   * agujero se ve el fondo: la pared que hay que atravesar desaparece justo
   * mientras se atraviesa.
   *
   * Con 0,44 y 0,60 la banda crítica —de 0,49 a 0,55, que es donde la cámara
   * está más cerca de la superficie que su plano cercano— se cruza en unas
   * tres centésimas, y el relevo casco/sala cae dentro de ella. Sale lo mismo
   * que en la entrada: unos pocos frames de materia a bocajarro, no un hueco.
   */
  /**
   * ── EL HUB, EN DOS FASES DEL MISMO RECORRIDO ──────────────────────────
   *
   * El acto 7 terminaba con UNA clave: la cámara llegaba a `orbitDistance` en
   * el progreso 1 y ahí se acababa el viaje. Eso dejaba el destino de toda la
   * web en cinco centésimas de composición montada, y además no dejaba sitio
   * para lo que un hub necesita: que seleccionar algo signifique algo.
   *
   *     FASE A · descubrimiento   0,84 → 0,94
   *     el cerebro vuelve a caber, los cinco nodos nacen uno a uno, las
   *     conexiones los unen. La respuesta a "estas son las cinco áreas".
   *
   *     FASE B · enfoque          0,94 → 1,00
   *     la cámara entra un 22% hacia la composición. El nodo elegido domina y
   *     los demás se atenúan, pero siguen ahí: el contexto es la mitad de lo
   *     que significa un nodo dentro de una red.
   *
   * **La cámara de la fase B es la misma para los cinco nodos, y eso es una
   * decisión.** Lo intuitivo sería volar hacia el nodo seleccionado; sería
   * también meter la selección —que es estado de la interfaz— dentro de la
   * autoridad del scroll, y a partir de ahí la misma posición de scroll daría
   * dos cámaras distintas según lo que estuviera pulsado. El recorrido dejaría
   * de ser determinista y subir con la rueda dejaría de deshacer lo que bajar
   * hizo. Así que el acercamiento es del CONJUNTO y el protagonismo lo pone la
   * atenuación, que sí puede depender de la selección porque no mueve nada.
   */
  const leaving = [
    { at: 0.72, from: outward(0.4) },
    { at: 0.78, from: outward(0.5) },
    { at: 0.805, from: outward(1.0) },
    { at: 0.85, from: outward(1.7) },
    { at: 0.89, from: outward(2.6) },
    /* FASE A: la composición entera, con aire alrededor. */
    { at: 0.94, from: mind.clone().addScaledVector(exit, orbitDistance * HUB_WIDE) },
    /* FASE B: el enfoque cierra hasta el encuadre pleno. */
    { at: 1.0, from: mind.clone().addScaledVector(exit, orbitDistance) },
  ]

  leaving.forEach((step) => {
    tourPositions.push(step.from)
    tourTargets.push(mind.clone())
    tourTiming.push(step.at)
  })

  /**
   * ## Las doce paradas del vuelo, en orden
   *
   * Que un punto esté dentro o fuera del cerebro NO está puesto a ojo: sale
   * del casco medido con `gltf-transform inspect`. En fracciones del cerebro,
   * el punto está dentro si `(x/0,500)² + (y/0,459)² + (z/0,493)² < 1`.
   *
   * | # | qué es | casco |
   * |---|---|---|
   * | 3 | el cerebro entero en el encuadre | fuera, lejos |
   * | 4 | el umbral: la corteza llena la pantalla | fuera (3,39) |
   * | 5 | la piel, el instante de atravesarla | justo encima (1,01) |
   * | 6 | dentro, con la red delante | dentro (0,73) |
   * | 7 | la cavidad se abre: amplitud hacia un lado | dentro (0,75) |
   * | 8 | la red entera, desde el fondo de la cavidad | dentro (0,74) |
   *
   * **Ninguna clave sale del casco a partir de la 6.** Antes las claves 9, 10 y
   * 11 llevaban la cámara fuera —hasta 1,40 del casco y después a la distancia
   * de la vista general— y eso es lo que hacía que, después de entrar, el
   * cerebro volviera a verse como un objeto.
   *
   * ## Por qué la deriva ORBITA la red y no la atraviesa
   *
   * La primera versión llevaba la cámara al centro de la nube, que parecía lo
   * lógico —estar dentro de la mente— y en pantalla era un desastre: dos nodos
   * pegados a la cara, el resto a la espalda y medio encuadre vacío. Estar en
   * el centro de una nube es el único sitio desde el que no se puede ver.
   *
   * Así que la cámara se queda en el hueco entre la red y el casco, y se mueve
   * por ahí. La red se ve entera, desbordando un poco por los bordes, y son los
   * nodos los que pasan al girar. Ese hueco no existía: hay que fabricarlo
   * encogiendo la nube, y de eso se encarga `mind.core` en los tokens.
   */
  const positions = [
    new Vector3(mascot.x * 0.18, mascot.y, heroDistance),
    // Encuadre cerrado sobre el cerebro de la mano.
    hand.clone().add(new Vector3(0.02, 0.06, 1.3)),
    // Justo delante: el momento de cruzar el umbral entre los dos actos.
    hand.clone().add(new Vector3(0, 0, 0.1)),
    // El cerebro grande, entero, todavía como objeto.
    // Sobre el eje, sin desplazamiento: el tramo entre los dos cerebros tiene
    // que ser una recta, y una décima de subida ya la rompe.
    mind.clone().addScaledVector(entry, brainViewDistance),
    // El umbral: ya no cabe en pantalla, solo se ve corteza.
    along(0.9),
    // La piel. Es la clave más lenta de todo el recorrido, a propósito.
    along(0.5),
    /**
     * Dentro, en el hueco entre la red y la pared. La red llena el encuadre.
     *
     * 0,34 y no 0,40: a 0,40 la nube abarca 16 grados de medio ángulo contra
     * los 17,5 de la cámara, así que el primer plano de dentro salía con la red
     * pequeña en el centro y el resto pared vacía. A 0,34 abarca 18,6 y llena
     * el alto del cuadro, que es lo que tiene que hacer el frame en el que se
     * descubre dónde estás.
     */
    along(0.34),
    /**
     * LA CAVIDAD SE ABRE, Y SE ABRE HACIA DENTRO.
     *
     * Aquí estaba la marcha atrás. La cámara subía por la parte de arriba del
     * cerebro, salía a 1,40 del casco y terminaba a la distancia de la vista
     * general: el cerebro pasaba de ser el sitio donde estabas a ser otra vez
     * un objeto a media pantalla, con los nodos flotando alrededor sobre un
     * campo liso.
     *
     * La amplitud que hacía falta se gana igual, pero sin cruzar la pared: la
     * cámara se descuelga hacia un lado de la cavidad y después baja al fondo,
     * y desde ahí la red se ve entera con la corteza cerrando por detrás. Es
     * la misma sensación de "esto es más grande de lo que parecía" y no hay
     * que salir para conseguirla.
     */
    /*
      Aquí había dos paradas más —`at(-0,27 · 0,14 · 0,23)` y
      `at(-0,29 · −0,11 · −0,21)`— que abrían la cavidad hacia un lado y bajaban
      al fondo. Medidas contra la sala de verdad, las dos caen en direcciones
      CERRADAS: la primera tiene la pared a 0,38 del centro y la segunda a 0,20,
      con la cámara a 0,36. Estaban dentro de un pliegue.

      La amplitud que daban la da ahora la deriva, que barre noventa grados de
      azimut por direcciones medidas como abiertas.
    */
    ...tourPositions,
  ]

  /**
   * Hacia dónde mira.
   *
   * Dentro del cerebro la mirada se queda SIEMPRE cerca del centro de la nube.
   * La primera versión miraba "hacia donde va la cámara", y en la deriva eso
   * suponía girar la vista casi media vuelta en dos décimas de recorrido: se
   * leía como un tirón de cabeza. El viaje ya se percibe por el paralaje de los
   * nodos, que están a medio metro; no hace falta además mover el encuadre.
   */
  const targets = [
    heroLook,
    hand.clone(),
    // La mirada se abre hacia el fondo justo al cruzar, no antes: mirar al
    // interior desde el primer píxel era lo que hacía que la cámara pasara de
    // largo sin llegar a apuntar nunca al cerebro.
    hand.clone().lerp(mind, 0.35),
    mind.clone(),
    at(-0.05, -0.03, -0.08),
    at(-0.06, -0.03, -0.1),
    /**
     * Se mira casi AL CENTRO de la red, no más allá.
     *
     * Estaba apuntando entre cinco y seis centésimas por detrás del centro, con
     * la idea de que la red quedara entre la cámara y la pared. La red ya queda
     * entre las dos por geometría —la pared es una cáscara cerrada— y lo único
     * que conseguía ese desvío era descentrarla: medido en la captura de 0,40,
     * el grupo quedaba noventa píxeles a la derecha y ciento treinta por encima
     * del centro, con la mitad izquierda del cuadro vacía.
     */
    at(-0.02, 0.015, -0.02),
    ...tourTargets,
  ]

  /**
   * Cuándo pasa la cámara por cada punto.
   *
   * Los números NO están repartidos por distancia en unidades de mundo, y esta
   * vez es una decisión y no un descuido. La velocidad que se percibe no es
   * cuántas unidades avanza la cámara: es cuánto se desplaza el encuadre, y eso
   * depende de la distancia a lo que se está mirando. Recorrer setenta
   * centímetros por dentro de una nube que tienes a medio metro se ve igual de
   * rápido que retirarse quince unidades de un cerebro que está a diez.
   *
   * Repartidos así —distancia dividida por la distancia a lo mirado— el
   * recorrido va entre 7 y 41, y los dos picos son los dos golpes que se
   * buscan: cruzar el cerebro de la mano y ser expulsado del cerebro grande. El
   * valle está en la clave 5, la piel de la corteza, que es el plano que hay
   * que mirar.
   */
  /**
   * ── EL RITMO DEL VIAJE ─────────────────────────────────────────────────
   *
   * Ahora que `sampleCamera` reparte por longitud de arco dentro de cada tramo,
   * estos números son lo ÚNICO que decide la velocidad. Largos medidos sobre la
   * curva real, en unidades de mundo:
   *
   *     0→1  sala → primer plano del cerebro de la mano   4,50
   *     1→2  atravesarlo                                  1,20
   *     2→3  vuelo hasta ver el cerebro entero            7,29
   *     3→4  hasta el umbral: la corteza llena el cuadro  3,32
   *     4→5  hasta la piel                                0,84
   *     5→6  atravesar la piel                            0,17
   *
   * ## Velocidad de mundo NO es velocidad percibida
   *
   * Y esta es la parte que hay que tener a mano para no volver a equivocarse:
   * lo que se percibe no son unidades por segundo, es cuánto se desplaza el
   * ENCUADRE, y eso es la velocidad dividida por la distancia a lo que miras.
   * Avanzar 0,84 unidades con la corteza a un metro se ve mucho más rápido que
   * avanzar 7 con el cerebro a diez.
   *
   * Con este reparto:
   *
   *     tramo   mundo   dist. a lo mirado   percibida
   *     0→1     0,60          6             0,10
   *     1→2     0,22          0,6           0,36   ← el primer golpe
   *     2→3     0,86          8             0,11
   *     3→4     0,44          3,5           0,13
   *     4→5     0,15          1,6           0,09   ← la piel, el plano lento
   *     5→6     0,38          1,0           0,09   ← atravesarla
   *     6→7     0,14          1,0           0,14   ← la cavidad se abre
   *     7→8     0,17          0,98          0,18   ← la red, entera
   *     8→9     0,11          0,6           0,19   ← primera área
   *
   * O sea: arranca lento, acelera hacia el cerebro, frena en la piel y vuelve
   * a soltarse dentro. Ningún tramo por debajo de 0,09 percibido, que es donde
   * empezaba a leerse como parada, y ninguno por encima de 0,36.
   *
   * ## Y por qué el interior ocupa ahora la mitad del viaje
   *
   * La membrana termina en 0,40 y el recorrido por las áreas empieza en 0,58:
   * quedan casi dos décimas —cuatro pantallas y media de scroll— para el tramo
   * en el que la única información nueva es DÓNDE estás. Antes ese tramo eran
   * 0,38 → 0,42 (una pantalla) porque el grueso del recorrido se lo llevaba
   * salir y descubrir la constelación. Ese presupuesto es el que se ha movido.
   */
  /**
   * ── EL VUELO AL CEREBRO GRANDE ERA EL TRAMO MÁS CORTO, Y ES EL VIAJE ────
   *
   * El reparto anterior le daba 0,085 de recorrido —menos de dos pantallas— a
   * las 7,29 unidades que separan el cerebro de la mano del cerebro grande. Es
   * el tramo MÁS LARGO del vuelo en unidades de mundo y el más corto en tiempo,
   * y por eso se sentía como un salto entre dos escenas en vez de como un
   * viaje: apenas daba tiempo a ver nada entre una cosa y la otra.
   *
   * Medido con la sonda, además, tenía una consecuencia que se veía: los siete
   * planos del paso se reparten por DISTANCIA, así que la cámara se los comía
   * todos entre 0,115 y 0,20 y a partir de ahí no quedaba ninguno por delante.
   * Ese era el campo vacío.
   *
   * Ahora ese tramo ocupa 0,105 → 0,30, casi cinco pantallas de scroll, que es
   * lo que pide el guion: "aparece el cerebro grande a distancia · me estoy
   * acercando · la escala crece". Lo que había antes no cabía en esas tres
   * frases.
   */
  const timing = [
    0.0, 0.06, 0.105, 0.3, 0.4, 0.45, 0.5,
    ...tourTiming,
  ]

  /**
   * Cierre: la cámara sigue derivando después de la última área. Sin esta clave
   * el recorrido se queda congelado en el tramo final.
   *
   * Antes era `+ radius·0,5` hacia atrás, o sea 1,7 unidades de mundo: con la
   * cavidad midiendo dos, eso sacaba la cámara por la pared en el último
   * fotograma del viaje. Ahora es una deriva de 0,05 del cerebro hacia el
   * centro, que se lee como que la mente sigue ahí cuando empieza el editorial.
   */
  /**
   * La curva necesita un punto MÁS ALLÁ del último para que Catmull-Rom tenga
   * tangente al final. Se pone en la prolongación de la deriva y con el mismo
   * tiempo que el final, así que nunca se llega a él: solo endereza la salida
   * de la última clave.
   */
  const last = positions[positions.length - 1]
  const before = positions[positions.length - 2] ?? mind
  positions.push(last.clone().addScaledVector(last.clone().sub(before).normalize(), brain * 0.06))
  targets.push(targets[targets.length - 1].clone())
  timing.push(1.0001)

  const position = new CatmullRomCurve3(positions, false, 'centripetal')

  return {
    timing,
    position,
    target: new CatmullRomCurve3(targets, false, 'centripetal'),
    arc: measureArc(position, positions.length),
  }
}

/**
 * ── LA TABLA DE LONGITUDES ────────────────────────────────────────────────
 *
 * Recorre la curva a pasos muy pequeños y anota cuánta distancia REAL lleva
 * acumulada en cada uno. Es lo que permite después preguntar "¿en qué `u` he
 * recorrido el 40% de este tramo?" en vez de "¿cuál es el 40% del parámetro?",
 * que no es lo mismo ni de lejos.
 *
 * Se calcula una vez por curva. Doscientos pasos por tramo dan un error por
 * debajo del milímetro a la escala de esta escena.
 */
function measureArc(curve, count) {
  const steps = (count - 1) * 200
  const lengths = new Float64Array(steps + 1)
  const previous = new Vector3()
  const current = new Vector3()

  curve.getPoint(0, previous)
  for (let i = 1; i <= steps; i += 1) {
    curve.getPoint(i / steps, current)
    lengths[i] = lengths[i - 1] + current.distanceTo(previous)
    previous.copy(current)
  }

  return { steps, lengths, segments: count - 1 }
}

/** El `u` en el que la curva lleva recorrida `distance`. Búsqueda binaria. */
function uAtLength(arc, distance) {
  const { lengths, steps } = arc
  let low = 0
  let high = steps

  while (low < high) {
    const middle = (low + high) >> 1
    if (lengths[middle] < distance) low = middle + 1
    else high = middle
  }

  if (low === 0) return 0
  const before = lengths[low - 1]
  const span = lengths[low] - before
  const inner = span <= 0 ? 0 : (distance - before) / span
  return (low - 1 + inner) / steps
}

/** Distancia acumulada en un `u` dado. */
function lengthAtU(arc, u) {
  const exact = Math.min(arc.steps, Math.max(0, u * arc.steps))
  const index = Math.floor(exact)
  if (index >= arc.steps) return arc.lengths[arc.steps]
  const inner = exact - index
  return arc.lengths[index] + (arc.lengths[index + 1] - arc.lengths[index]) * inner
}

/**
 * Lee la cámara en un punto del recorrido y la escribe en los vectores que se
 * le pasan. No crea objetos: se llama sesenta veces por segundo.
 *
 * No lleva suavizado propio a propósito. El scroll es el que manda el tiempo:
 * cualquier aceleración añadida aquí se sentiría como que la cámara no
 * obedece al dedo. La continuidad ya la pone la amortiguación del reloj.
 */
export function sampleCamera(path, progress, outPosition, outTarget) {
  const p = Math.min(1, Math.max(0, progress))
  const timing = path.timing

  let i = 0
  while (i < timing.length - 2 && p >= timing[i + 1]) i += 1

  const span = timing[i + 1] - timing[i]
  const local = span <= 0 ? 1 : Math.min(1, Math.max(0, (p - timing[i]) / span))

  /**
   * ── DENTRO DEL TRAMO SE REPARTE POR DISTANCIA, NO POR PARÁMETRO ─────────
   *
   * Esto era `u = (i + local) / (n)`, y ahí estaba la causa de fondo de todos
   * los tramos muertos: el parámetro de una Catmull-Rom NO avanza a distancia
   * constante. Entre dos claves juntas la curva se arrastra y entre dos
   * separadas se dispara, así que la velocidad que veía el visitante no era la
   * que decía la tabla —y cada vez que se corregía una parada a mano, se
   * desequilibraba otra.
   *
   * Con la tabla de longitudes, `local` se convierte en fracción de DISTANCIA
   * recorrida: dentro de cada tramo la cámara va a velocidad constante. El
   * ritmo cinematográfico se decide entonces donde debe decidirse —en cuánto
   * progreso se le da a cada tramo— y no queda a merced de la parametrización.
   */
  const segments = path.arc.segments
  const from = lengthAtU(path.arc, i / segments)
  const to = lengthAtU(path.arc, (i + 1) / segments)
  const u = uAtLength(path.arc, from + (to - from) * local)

  path.position.getPoint(u, outPosition)
  path.target.getPoint(u, outTarget)
}
