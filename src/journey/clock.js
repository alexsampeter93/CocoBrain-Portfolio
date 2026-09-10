/**
 * El reloj del recorrido.
 *
 * Dos números, y la diferencia entre ellos es la que quita los tirones.
 *
 * `target` es lo que escribe el scroll. `progress` es lo que lee el mundo, y
 * persigue al primero con amortiguación.
 *
 * Por qué hacen falta los dos: GSAP y el motor de render tienen cada uno su
 * propio `requestAnimationFrame`. Los dos corren en el mismo frame, pero no
 * hay garantía de en qué orden. Cuando el render iba primero, dibujaba con el
 * valor del frame anterior; cuando iba después, con el de este. Ese orden
 * cambia solo, así que el retraso oscilaba entre cero y un frame y el
 * movimiento se veía a trompicones —aunque el contador marcase 140 fps, que es
 * justo lo que despistaba.
 *
 * Persiguiendo el valor en vez de copiarlo, el desorden desaparece: da igual
 * si el dato llega un frame tarde, la posición dibujada es continua.
 *
 * Todo esto vive fuera de React a propósito. React es bueno decidiendo QUÉ hay
 * en pantalla; es el sitio equivocado para un número que cambia sesenta veces
 * por segundo.
 */
import { spinEase } from './stages.js'

export const journey = {
  /** Lo que escribe el scroll. Salta. */
  target: 0,
  /** Lo que lee el mundo. Persigue a `target` y siempre es continuo. */
  progress: 0,

  /**
   * EL COMPÁS. Es el reloj de las animaciones de la escena, y NO avanza con el
   * tiempo: avanza con el scroll.
   *
   * ## Por qué existe
   *
   * Todo lo que se movía en la escena leía `state.clock.elapsedTime`: el giro
   * del cerebro, el latido de los nodos, los pulsos que recorren las
   * conexiones, la respiración de Olaz. Eso significa que **la misma posición
   * de scroll daba imágenes distintas** según cuánto rato llevaras ahí, y que
   * con el usuario quieto la escena seguía encendiéndose y apagándose sola.
   *
   * Con el bloom de por medio eso no se ve como "vida", se ve como un
   * destello: un nodo emisivo que crece un 26% cruza el umbral de floración y
   * PARPADEA.
   *
   * ## Qué cambia
   *
   * Sustituyendo `elapsedTime` por esto, la escena es una FUNCIÓN del
   * recorrido: el mismo `progress` da siempre el mismo cuadro, y parado no se
   * mueve nada. El movimiento no desaparece —el cerebro sigue girando, los
   * pulsos siguen recorriendo la red— pero lo mueve el dedo del visitante.
   *
   * El factor convierte el recorrido entero en cuarenta "segundos" de
   * animación, que es lo que hacía que los mismos números de velocidad
   * siguieran leyéndose bien sin tocarlos uno a uno.
   */
  beat: 0,

  /**
   * EL COMPÁS DE LA ARQUITECTURA, que es el mismo pero se PARA al entrar.
   *
   * El cerebro gira despacio mientras se ve como objeto: es lo que le da la
   * lectura de joya suspendida. Dentro no puede seguir girando —las cinco
   * áreas están ancladas a la cavidad, y una pared que rota mientras ellas
   * están quietas acabaría empujándolas fuera del casco— y además una
   * habitación que gira sola no se lee como una habitación.
   *
   * No se puede apagar multiplicando por `1 - insideness`: el ángulo es
   * `beat · 0,14`, así que bajar el resultado haría girar el cerebro HACIA
   * ATRÁS durante el cruce. Lo que hay que frenar es el compás, no el ángulo,
   * y de eso se encarga `spinEase` en `stages.js`.
   *
   * Sigue siendo una función del scroll: parado no se mueve, y volviendo al
   * mismo punto sale el mismo cuadro.
   */
  spin: 0,

  /**
   * El SEGUNDO tramo: la lectura.
   *
   * Va de 0 a 1 a lo largo del contenido editorial, igual que `progress` va de
   * 0 a 1 a lo largo del recorrido 3D. Son dos canales del mismo reloj y no
   * dos relojes: se amortiguan en la misma función, en el mismo frame y con la
   * misma constante.
   *
   * Hace falta separarlos porque miden cosas distintas —uno la coreografía de
   * la cámara, otro cuánto llevas leído— pero no puede haber dos sistemas de
   * scroll compitiendo: eso es exactamente lo que hacía que las transiciones
   * parecieran sucias antes de que existiera este archivo.
   *
   * De aquí salen tres cosas: el color de la atmósfera, cuánto se atenúa la
   * escena que sigue viva por detrás, y qué área marca la navegación.
   */
  readingTarget: 0,
  reading: 0,

  /**
   * EL RELEVO: cuánto se lleva recorrido del UMBRAL.
   *
   * Va de 0 a 1 mientras `ReadingThreshold` cruza la ventana, de abajo del
   * todo a fuera por arriba. Es el tercer canal del mismo reloj y existe por
   * una razón medida:
   *
   * La retirada de la escena colgaba de `reading`, que está normalizado sobre
   * el editorial ENTERO. Cuando se escribió, el editorial eran huecos
   * pendientes y su 15% era "una pantalla larga" — así está documentado en
   * `World.jsx`. Con el contenido real dentro, el mismo 15% pasó a ser tres
   * pantallas: medido contra el build, el umbral ocupa el **6,8%** de `main` a
   * 1920 y el **5,8%** a 1366, o sea menos de la mitad de la ventana en la que
   * la escena se estaba retirando. Resultado: el canvas llegaba al titular de
   * Sobre mí al 27% y al primer párrafo al 11%.
   *
   * El fallo no es el número: es de qué depende. Una fracción del editorial
   * cambia cada vez que Alex escribe un párrafo. El umbral, en cambio, mide
   * 140vh, así que sobre ÉL las mismas cifras valen en todas las pantallas —
   * comprobado: su reparto interno sale idéntico (0,417 y 0,583) en 1920, 1366
   * y 390. Es la regla de siempre: si un dato depende de la geometría, se mide
   * contra la geometría que lo describe.
   *
   * No es un reloj nuevo: se amortigua en la misma función, en el mismo frame
   * y con la misma constante que los otros dos, y no mueve nada por su cuenta.
   */
  thresholdTarget: 0,
  threshold: 0,
}

/**
 * Constante de tiempo de la persecución, en segundos: cuánto tarda en
 * recorrer el 63% de lo que le falta.
 *
 * Más bajo y vuelve el temblor; más alto y la cámara se despega del dedo.
 */
const TAU = 0.05

/**
 * Un paso de amortiguación, independiente de los fps.
 *
 * La forma ingenua (`progress += (target - progress) * 0.15`) parece que
 * funciona, pero avanza por frame en vez de por tiempo: a 144 Hz va casi el
 * doble de rápido que a 60. Con la exponencial, el recorrido tarda lo mismo en
 * cualquier pantalla.
 */
/** Cuántos "segundos" de animación dura el recorrido entero. Ver `beat`. */
const BEAT = 40

export function advance(delta) {
  const k = 1 - Math.exp(-Math.min(delta, 0.1) / TAU)
  journey.progress += (journey.target - journey.progress) * k
  journey.reading += (journey.readingTarget - journey.reading) * k
  journey.threshold += (journey.thresholdTarget - journey.threshold) * k
  journey.beat = journey.progress * BEAT
  journey.spin = spinEase(journey.progress) * BEAT
}

/**
 * Suscripción para la interfaz, que sí quiere enterarse —pero solo cuando
 * cambia el TRAMO, no en cada frame.
 */
const listeners = new Set()
let lastStageId = null

export function subscribeStage(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStageId() {
  return lastStageId
}

export function setTarget(value, stageId) {
  journey.target = value

  if (stageId !== lastStageId) {
    lastStageId = stageId
    listeners.forEach((listener) => listener())
  }
}

/**
 * El progreso de la lectura, escrito por su propio ScrollTrigger.
 *
 * No avisa a los suscriptores: nada de la interfaz necesita reaccionar a un
 * cambio de tramo aquí, y lo que sí lo necesita lo lee del reloj en su propio
 * bucle.
 */
export function setReadingTarget(value) {
  journey.readingTarget = value
}

/** El relevo del umbral, escrito por su propio ScrollTrigger. Ver `threshold`. */
export function setThresholdTarget(value) {
  journey.thresholdTarget = value
}
