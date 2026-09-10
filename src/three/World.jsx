import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, PerformanceMonitor, useProgress } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping, Box3, FogExp2, Raycaster, Vector3 } from 'three'
import { advance, journey } from '../journey/clock'
import { markWarmed } from '../state/warmup'
import { useViewportAspect } from '../layout/useViewportAspect'
import {
  cameraPath,
  crossing,
  handoff,
  insideness,
  ramp,
  layerOpacity,
  sampleCamera,
  sceneRetreat,
} from '../journey/stages'
import Corridor from './Corridor'
import MascotStage from './MascotStage'
import MindStage from './MindStage'

/**
 * El mundo. Un solo canvas, una sola escena, montada una vez.
 *
 * La regla que ordena todo esto: NADA se monta ni se desmonta mientras se hace
 * scroll. Antes había dos escenas que se intercambiaban a mitad de recorrido y
 * de ahí venían el parpadeo y los tirones —montar una malla obliga a compilar
 * su shader, y eso son varios frames perdidos justo en el peor momento.
 *
 * Aquí todo está siempre presente y lo único que cambia son opacidades y
 * posiciones, que es trabajo que la GPU ya estaba haciendo de todos modos.
 */

const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/**
 * Presupuesto de píxeles por frame, no de `dpr`.
 *
 * Fijar `dpr = 2` parece un límite razonable hasta que alguien abre la web en
 * una pantalla grande: a 1900 × 1100 de ventana son 8,4 MILLONES de píxeles
 * que hay que sombrear en cada frame. Con iluminación HDRI y materiales PBR,
 * eso solo ya se come el presupuesto entero.
 *
 * El error es que `dpr` no dice cuánto trabajo hay: dice cuánto trabajo hay
 * POR PÍXEL DE CSS. El trabajo real es el área, y el área depende del tamaño
 * de la ventana, que no controlamos. Así que se fija el área y se deduce el
 * `dpr`, que es al revés de como suele hacerse pero es el orden correcto.
 */
const PIXEL_BUDGET = IS_COARSE_POINTER ? 1_800_000 : 3_200_000

function pickDpr() {
  if (typeof window === 'undefined') return 1

  const ceiling = Math.min(window.devicePixelRatio || 1, IS_COARSE_POINTER ? 1.5 : 2)
  const area = window.innerWidth * window.innerHeight
  if (!area) return ceiling

  // El `dpr` escala el área al cuadrado, de ahí la raíz.
  const affordable = Math.sqrt(PIXEL_BUDGET / area)
  return Math.max(1, Math.min(ceiling, affordable))
}

/**
 * Adelanta el reloj antes que nada.
 *
 * La prioridad negativa es lo importante: `useFrame` ejecuta primero los
 * números más bajos, así que el progreso queda actualizado antes de que
 * ninguna otra pieza lo lea. Sin ese orden, unas piezas leerían el valor de
 * este frame y otras el del anterior, y esa mezcla se ve como vibración.
 */
function JourneyClock() {
  useFrame((_, delta) => advance(delta), -100)
  return null
}

/**
 * Cuanto bloom, ajustable con `?bloom=0`.
 *
 * Mismo motivo que el del cristal: es el efecto mas caro que se puede meter y
 * hay que poder compararlo con y sin el, en una maquina de verdad, sin tocar
 * codigo. El peor frame ya iba en 41 ms antes de esto.
 */
function readBloom() {
  if (typeof window === 'undefined') return 1
  const raw = new URLSearchParams(window.location.search).get('bloom')
  if (raw === null) return 1
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(2, Math.max(0, value)) : 1
}

/**
 * El resplandor.
 *
 * `mipmapBlur` en vez del desenfoque clasico: consigue el mismo radio ancho
 * reduciendo la imagen por pasos en lugar de recorrer un kernel grande, y
 * cuesta bastante menos. Con un presupuesto ya justo, es la diferencia entre
 * poder ponerlo y no.
 *
 * El umbral alto es a proposito: solo florece lo que ya es luz —los nodos
 * emisivos y los surcos del cerebro—. Bajarlo hace que empiece a brillar todo,
 * y ahi el efecto deja de dirigir la mirada y solo ensucia.
 */
function Glow({ compact }) {
  const bloomRef = useRef(null)
  const max = compact ? 0 : readBloom()

  /**
   * El bloom solo existe DENTRO del cerebro.
   *
   * Aplicado a toda la web se comia la portada: las zapatillas y los guantes
   * de Olaz son casi blancos, pasaban el umbral y el personaje entero salia
   * resplandeciendo como si estuviera en una discoteca. Ese no es el efecto,
   * y ademas contradice la portada, que es calida y luminosa por si sola.
   *
   * Ligandolo al mismo valor que hace aparecer la mente, la portada se ve
   * limpia y el resplandor entra justo cuando hay algo que deba brillar. De
   * paso deja de costar en el tramo en el que no aporta nada.
   */
  /**
   * Dentro sube un poco, y en la membrana BAJA bastante.
   *
   * Las dos cosas son el mismo efecto con otro valor, no efectos nuevos. Dentro
   * de la cabeza las únicas fuentes de luz que quedan son los propios nodos, y
   * están a medio metro: que desborden algo más es lo que hace que el interior
   * se sienta iluminado POR la red.
   *
   * Pero justo en el cruce hay que quitarlo. Ahí coinciden la corteza llenando
   * la pantalla, sus reflejos y sus surcos, y sumarles el resplandor dejaba el
   * plano lavado de blanco: se perdía la forma del cerebro y con ella la
   * noción de dónde está la cámara. El resplandor sirve para dirigir la mirada;
   * cuando lo cubre todo, ya no dirige nada.
   */
  useFrame(() => {
    if (bloomRef.current) {
      const p = journey.progress
      const glow =
        (1 + insideness(p) * 0.2) * (1 - crossing(p) * 0.55) * (1 - journey.reading)
      bloomRef.current.intensity = max * layerOpacity('mind', p) * glow
    }
  })

  if (max <= 0) return null

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom
        ref={bloomRef}
        intensity={0}
        luminanceThreshold={0.32}
        luminanceSmoothing={0.3}
        mipmapBlur
        radius={0.4}
      />
      {/*
        ── EL MAPEO DE TONOS VUELVE, PORQUE EL COMPOSITOR SE LO HABÍA COMIDO ──

        Este es el fallo más caro que había abierto en el descenso, y llevaba
        escondido desde que existe el bloom.

        `EffectComposer` de @react-three/postprocessing hace esto al montarse
        (`dist/EffectComposer.js`):

            const currentTonemapping = gl.toneMapping
            gl.toneMapping = NoToneMapping

        O sea que **en escritorio no había curva de tonos NINGUNA**. La escena
        salía lineal y recortada a 1: todo lo que pasaba de blanco se quedaba en
        blanco plano, sin comprimir. Y con ella se iba también
        `gl.toneMappingExposure`, que es de quien cuelga toda la coreografía de
        luz del recorrido —`crossing`, `handoff`, el plano corto—. El
        componente `Exposure` escribía un número que nadie leía.

        No era una sospecha. Medido en el mismo punto del recorrido, con y sin
        compositor (`?bloom=0`, que devuelve `null` y no monta nada):

            p=0,10   con compositor   165,2      sin compositor   135,2

        Treinta puntos de luminancia de diferencia, con la exposición puesta en
        0,375 en los dos casos. Y explica de golpe tres quejas distintas: el
        cerebro de la mano quemándose a blanco plano, el destello del cruce de
        la corteza, y que en móvil —donde no hay bloom, así que no hay
        compositor— la misma escena se viera más contrastada que en escritorio.
        Se estaban comparando dos pipelines diferentes.

        `ToneMappingEffect` lo devuelve dentro del compositor: usa la MISMA
        función ACES de three (`ACESFilmicToneMapping`, del chunk
        `tonemapping_pars_fragment`) y el mismo uniforme `toneMappingExposure`,
        que el renderizador sigue empujando en cada frame. Así las dos rutas
        —con bloom y sin él— vuelven a dar la misma imagen.

        Va DESPUÉS del bloom, y el orden importa: el resplandor se suma en
        lineal y la curva se aplica al resultado. Al revés, el bloom florecería
        sobre valores ya comprimidos.
      */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * ── LA NIEBLA DE LA CAVIDAD ───────────────────────────────────────────────
 *
 * Existe por una razón concreta y medible: dentro del cerebro todo está a la
 * misma distancia. La cavidad mide dos unidades de ancho, la cámara se mueve
 * por un hueco de medio metro, y sin ninguna señal de profundidad la pared del
 * fondo se dibuja con el mismo brillo que la que tienes al lado. El resultado
 * es que la red y las áreas parecen pegadas a la pantalla: hay tres capas en
 * el espacio y una sola en la imagen.
 *
 * La niebla las separa. Lo cercano llega entero, lo lejano se hunde en el
 * color del aire, y ese color es el mismo negro cálido del telón —así la pared
 * no termina en un borde, se disuelve—.
 *
 * ## Por qué se puede poner sin romper nada
 *
 * La niebla es de la escena, no de un objeto, así que en principio afecta a
 * todo: a Olaz, a la sala, al corredor. La densidad sale de `insideness`, que
 * vale CERO en todo el primer acto, y una niebla de densidad cero es
 * exactamente lo mismo que no tener niebla. Cuando empieza a subir, la portada
 * hace rato que no está.
 *
 * Lo que sí hay que declarar objeto a objeto es lo que NO debe recibirla: la
 * red de conocimiento, sus etiquetas y los halos, porque son luz y no materia,
 * y la niebla sobre un material aditivo suma el color del aire en vez de
 * restar. Van con `fog={false}`.
 */
/**
 * ── Y EL AIRE DE DENTRO ES COCO, NO NEGRO ─────────────────────────────────
 *
 * Era `#150E0B`, prácticamente negro, y con la densidad al 0,72 eso no
 * separaba planos: los borraba. Medido sobre la captura de 0,50, la pared de
 * la sala está a 1,3 unidades de la cámara, así que la niebla sustituía el
 * **58%** de su color por ese negro — y lo que quedaba en pantalla era una
 * cueva de manchas oscuras sin arquitectura ninguna, con zonas de negro
 * absoluto donde la luz rasante no llegaba.
 *
 * Un cerebro por dentro no es un sitio sin aire: es un sitio con aire cálido.
 * Este es el coco oscuro de la paleta, el mismo que ya usa el descenso, y hace
 * lo que tiene que hacer una niebla — hundir el fondo sin apagarlo.
 */
const FOG_COLOR = '#2A1E1B'
/**
 * Y la densidad baja de 0,72 a 0,30.
 *
 * El argumento de 0,72 era correcto —sin niebla, la pared del fondo llega con
 * el mismo brillo que la de al lado y las tres capas del interior se leen como
 * una sola— y el valor estaba pasado. Con 0,72, a la unidad y media ya no
 * quedaba nada: la sala entera desaparecía y con ella los pliegues, los surcos
 * y cualquier cosa que se pudiera leer como anatomía. Se estaba usando una
 * señal de PROFUNDIDAD para tapar un problema de LUZ.
 *
 * Con 0,30 la pared cercana llega al 92% y la del fondo al 55%: hay gradiente
 * —que es lo que se quería— y sigue habiendo pared.
 */
const FOG_PEAK = 0.36

function CavityFog() {
  const scene = useThree((state) => state.scene)
  const fog = useMemo(() => new FogExp2(FOG_COLOR, 0), [])

  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])

  useFrame(() => {
    fog.density = FOG_PEAK * insideness(journey.progress)
  })

  return null
}

/**
 * La escena se RETIRA durante la lectura, no se apaga.
 *
 * Es la diferencia entre las dos formas de montar esto. Apagar el canvas —que
 * es lo barato— crea un antes y un después: hay un punto exacto en el que la
 * experiencia termina y empieza una página normal. Dejándolo vivo por detrás,
 * muy tenue, el universo no desaparece: se aparta para dejar leer.
 *
 * Se paga la GPU durante toda la lectura, y por eso se recorta lo que se puede
 * sin que se note: el bloom se va del todo —es el efecto más caro y a un 12%
 * de opacidad no aporta nada— y el postproceso deja de componerse.
 *
 * La opacidad se escribe en el canvas y no en un envoltorio: el navegador lo
 * trata como una capa compuesta, así que cambiarla no obliga a repintar nada.
 */
function SceneRetreat() {
  const gl = useThree((state) => state.gl)
  const last = useRef(-1)

  useFrame(() => {
    /**
     * La retirada ocurre en el UMBRAL, no a lo largo de toda la lectura.
     *
     * Repartida por el editorial entero, en la primera área la escena seguía
     * al 85% y los nodos pasaban por encima del texto: ilegible, y encima daba
     * la impresión contraria a la buscada —no es que el universo acompañe, es
     * que estorba—. Concentrada en el umbral, la escena se aparta justo
     * mientras se cruza el tramo vacío que separa explorar de leer, que es
     * exactamente lo que ese tramo está ahí para hacer.
     *
     * ## El tramo híbrido
     *
     * Ese razonamiento seguía siendo correcto, pero la ventana era demasiado
     * corta: el 7,5% del editorial son 0,45 pantallas, y la escena pasaba del
     * 100% al 6% en menos de media ventana de scroll. No se percibía una
     * retirada, se percibía que el 3D se había apagado.
     *
     * Ahora ocupa el 15% —una pantalla larga, con el umbral a 140vh—, y esa
     * pantalla es el tramo híbrido: la escena sigue ahí, cada vez más tenue,
     * mientras el fondo se aclara y el texto entra. Se ve cómo una cosa deja
     * paso a la otra.
     *
     * Es intencionadamente MÁS CORTO que el amanecer del fondo (20%). Cuando
     * la primera área aparece, la escena tiene que estar ya apartada —si no,
     * los nodos pasan por encima del titular—, pero el color puede seguir
     * moviéndose un poco más. Ese desfase es lo que hace que el cambio no
     * termine de golpe en un punto identificable.
     */
    const value = sceneRetreat(journey.threshold)
    if (Math.abs(value - last.current) < 0.004) return
    last.current = value
    gl.domElement.style.opacity = value
    // Y deja de atender al puntero cuando ya no se ve: sin esto, el cursor
    // seguiría cambiando a mano sobre nodos invisibles detrás del texto.
    gl.domElement.style.pointerEvents = value > 0.5 ? 'auto' : 'none'
  })

  return null
}

/**
 * La exposición general, que se cierra un poco al atravesar la corteza.
 *
 * Es el tercer ajuste del mismo problema, y el más barato de todos: una
 * propiedad del renderizador, sin postproceso ni material de por medio. Hace lo
 * que hace un ojo al pasar de la luz a la sombra, y es lo que devuelve el
 * contraste —y con el contraste, la profundidad— en el único plano donde se
 * había perdido.
 *
 * Solo actúa en la membrana. Fuera y dentro la exposición es la de siempre: no
 * es una corrección de color de la web, es un gesto de medio segundo.
 */
function Exposure() {
  const gl = useThree((state) => state.gl)
  const last = useRef(-1)

  useFrame(() => {
    /**
     * DOS momentos, no uno. El paso por el cerebro de la mano y el paso por la
     * corteza son el mismo suceso —la cámara atraviesa algo que brilla— y los
     * dos necesitan que el diafragma se cierre.
     *
     * El de la mano cierra más (0,46 contra 0,22) porque ahí no hay nada más
     * que ayude: en la corteza el bloom y el emisivo bajan a la vez, y aquí la
     * exposición trabaja sola contra un halo aditivo a pantalla completa.
     */
    const p = journey.progress
    /**
     * TRES momentos, y el nuevo es el plano corto del cerebro de la mano.
     *
     * Entre 0,08 y 0,16 la cámara lo tiene a un palmo: es el objeto más claro
     * de la escena, iluminado por el HDRI y por la direccional, y salía con dos
     * manchas de blanco puro. No se arregla en el material —es el modelo de
     * Olaz, intocable— sino cerrando el diafragma, que es lo que hace un ojo al
     * acercarse a una luz. Restar luz, no sumarla.
     */
    /*
      Sin el 4 de delante. Estaba copiado de la forma de campana `4·t·(1−t)`,
      que sí necesita el factor para llegar a uno; aquí son dos rampas
      multiplicadas y el producto YA vale uno en la meseta. Con el 4, la
      exposición se iba a −0,38: en negativo, ACES no oscurece, hace otra cosa,
      y el término no servía para nada sin dar ningún error.
    */
    const closeUp = ramp(p, 0.05, 0.105) * (1 - ramp(p, 0.13, 0.21))
    /**
     * 0,3 y no 0,16, y la ventana empieza antes.
     *
     * Medido a pasos de 0,008: el cuadro SUBÍA de 164 a 181 entre 0,06 y 0,116
     * —el cerebro de la mano llenando la pantalla— y a continuación caía 32
     * puntos de golpe al atravesarlo. El escalón no era el descenso: era la
     * altura del bulto que lo precedía. Bajando el bulto, la caída se reparte.
     *
     * ## Y ahora 0,42, con la causa ya arreglada por debajo
     *
     * Con la bombilla fuera de la malla —ver `GlowingBrain`— el cuadro de 0,10
     * bajó de 181 a 165, pero la secuencia seguía siendo una MESETA: 182 · 161
     * · 166 · 165 · 155. El descenso tiene que bajar de forma monótona desde la
     * portada, y ahí se quedaba parado cuatro pantallas.
     *
     * Este término es el único que puede corregir eso sin tocar el objeto:
     * apaga el plano corto, no el cerebro. Restar luz, no sumarla.
     */
    /**
     * ── Y EL TÉRMINO DEL CRUCE BAJA DE 0,40 A 0,16 ────────────────────────
     *
     * Subió a 0,40 para matar un destello concreto: en la membrana la corteza
     * era una maraña de capas TRANSLÚCIDAS que se lavaban entre sí, y en móvil
     * el cuadro llegaba a 87 de luminancia partiendo de 39.
     *
     * Ese destello ya no existe. La corteza es materia opaca y la sala que hay
     * detrás también, así que ahí no queda nada que lavar. Lo que quedaba era
     * el remedio: medido con la sonda, la exposición caía a **0,62 entre 0,43 y
     * 0,45**, justo en los frames en los que la cámara está dentro de la masa y
     * la única luz es la rasante. El cuadro se iba a negro.
     *
     * Restar sigue siendo la regla en el cruce; lo que cambia es cuánto, y
     * ahora el número corresponde a lo que de verdad hay ahí.
     */
    const value = 1 - crossing(p) * 0.16 - handoff(p) * 0.46 - closeUp * 0.42
    if (Math.abs(value - last.current) < 0.002) return
    last.current = value
    gl.toneMappingExposure = value
  })

  return null
}

/**
 * PRECALENTAMIENTO. Dibuja la mente una vez, detrás del preloader.
 *
 * ## El problema
 *
 * La primera vez que la cámara llega a la corteza había un frame de 217 ms
 * —medido con `perf.mjs`; el resto del recorrido no pasa de 17—. No es un
 * problema de coste por frame: es que en ese instante se compilan por primera
 * vez los sombreadores de la mente, se reservan los búferes del postproceso y
 * se suben sus texturas a la tarjeta. Todo eso pasa UNA vez, y pasa en el peor
 * momento posible.
 *
 * ## Por qué así y no de otra forma
 *
 * `gl.compile()` no vale: recorre la escena con `traverseVisible` y la mente
 * está apagada hasta que el recorrido la enciende, así que no compilaría nada.
 * Y mantener una segunda escena viva sería pagar GPU todo el rato para
 * ahorrarse un frame.
 *
 * Lo que sí vale es DIBUJARLA de verdad, tres frames, en tres puntos distintos
 * del recorrido —la corteza, la red interior y los nodos—, porque en cada uno
 * se enciende material distinto. Se hace moviendo el reloj, que es el mismo
 * mecanismo que usa el scroll: no hay un camino nuevo por el que la escena
 * pueda montarse.
 *
 * Cuándo: en cuanto `useProgress` dice que ha terminado de cargar todo. El
 * preloader tiene un mínimo de 2,6 segundos en pantalla desde que monta, así
 * que esos tres frames caen SIEMPRE por detrás de una capa opaca.
 *
 * Prioridad −200: por debajo de la del reloj (−100), así que escribe el
 * progreso antes de que el reloj lo lea y ninguna pieza ve un valor a medias.
 */
/**
 * Los cuatro puntos que hay que dibujar, y el primero salió de una medición.
 *
 * Con [0,2 · 0,5 · 0,85] quedaba un frame de 167 ms en p=0,137. Comparado con
 * `?glass=0` bajaba a 67, así que lo caro es el CRISTAL: un material con
 * transmisión compila su variante pesada y reserva su propio búfer la primera
 * vez que se dibuja, y en 0,2 el casco ya está prácticamente apagado —así que
 * el precalentamiento pasaba de largo por el único frame que importaba—.
 *
 * ## Y por qué es un BARRIDO y no una lista de puntos
 *
 * La primera versión llevaba tres puntos elegidos a mano, y al medir el
 * recorrido entero fueron apareciendo tirones en sitios distintos —0,60 · 0,75
 * en 1920, 0,24 en 1440, 0,12 en 1366, 0,96 en móvil— porque cada material se
 * compila cuando se dibuja por primera vez y a lo largo del viaje se van
 * encendiendo cosas distintas: el casco transmisivo, los materiales de Olaz al
 * volverse transparentes, la membrana, las etiquetas, las fichas de los nodos.
 * Cazarlos uno a uno es una lista que se desfasa al primer cambio de la tabla.
 *
 * Diecisiete puntos repartidos por todo el recorrido lo cubren entero y no hay
 * nada que mantener: si mañana aparece un material nuevo en 0,63, ya está
 * dentro.
 */
const WARM_STOPS = [
  ...Array.from({ length: 17 }, (_, i) => i / 16),
  /**
   * Y CUATRO PUNTOS EXTRA EN LA MEMBRANA.
   *
   * El barrido regular no bastaba desde que la corteza cambia de material al
   * llegar: three recompila el sombreador cuando `transmission` cruza el cero,
   * así que hay tres estados distintos —cristal, mixto, tejido— y cada uno se
   * compila la primera vez que se dibuja. Medido en el build: 183 ms en p=0,125
   * y 167 ms en p=0,213 hasta que se añadieron estas paradas.
   */
  0.18, 0.22, 0.27, 0.33,
  /**
   * Y TRES MÁS EN LA ENTRADA DEL PASO, por el mismo motivo.
   *
   * Los anillos aparecen entre 0,112 y 0,168, y cada uno lleva DOS materiales
   * —las dos láminas superpuestas para poder mezclarlas—. El barrido regular
   * solo tocaba 0,125 y 0,1875, y entre esos dos puntos entran en escena
   * anillos que no se habían dibujado nunca. Medido con `journey.mjs` contra el
   * build: 83 ms en 0,119, 100 ms en 0,122 y 133 ms en 0,131.
   */
  0.12, 0.128, 0.14,
].sort((a, b) => a - b)

/**
 * Cuántos frames se pasa en cada punto del barrido.
 *
 * Era uno, y con uno no basta desde que hay piezas que NO reaccionan en el
 * mismo frame:
 *
 * - la ficha de área avisa a React de que ha cambiado el área enfocada, y React
 *   confirma ese cambio en el frame SIGUIENTE, cuando el barrido ya se ha
 *   movido. Su primer montaje real caía entonces en mitad del recorrido, con un
 *   frame de 150 ms medido en el build;
 * - las etiquetas de los conocimientos persiguen su presencia con una
 *   amortiguación de 0,14 s —para que cruzarse dos nodos no las haga
 *   parpadear—, así que en un frame suelto suben un 11% y no llegan a hacerse
 *   visibles. Una malla que no se dibuja no sube su geometría a la tarjeta, y
 *   esa subida acababa cayendo en el recorrido por las áreas: frames de 133 y
 *   217 ms repartidos por el tramo, distintos en cada pasada.
 *
 * Seis frames por punto son 0,1 s, o sea la constante de esa amortiguación: lo
 * justo para que lo que tiene que aparecer aparezca y se dibuje una vez. Son
 * unos 130 frames en total, poco más de dos segundos, y el preloader tiene un
 * mínimo de 2,6 en pantalla.
 */
const WARM_HOLD = 6

function Warmup() {
  const step = useRef(-1)
  const hold = useRef(0)
  const resume = useRef(0)

  useFrame(() => {
    if (step.current >= WARM_STOPS.length) return

    /**
     * El estado de carga se LEE, no se escucha.
     *
     * Con `useProgress()` como hook, este componente se suscribe al almacén de
     * carga de drei; y como hay piezas que disparan una carga mientras se
     * renderizan, React avisaba de un `setState` durante el render de otro
     * componente. `getState()` da el mismo dato sin suscripción, y aquí basta
     * porque se consulta en cada frame de todas formas.
     */
    const { active, progress } = useProgress.getState()
    if (active || progress < 100) return

    // Se guarda a dónde apuntaba el recorrido, no se asume que es cero: si
    // alguien ha llegado con la página ya desplazada, hay que devolverlo ahí.
    if (step.current < 0) resume.current = journey.target

    // Se aguanta en el punto para que lo que React haya pedido en este frame
    // llegue a dibujarse en el siguiente.
    if (step.current >= 0 && hold.current < WARM_HOLD - 1) {
      hold.current += 1
      return
    }
    hold.current = 0

    step.current += 1

    if (step.current < WARM_STOPS.length) {
      // El objetivo va con el progreso: si no, el reloj tiraría de vuelta y el
      // frame se dibujaría a medio camino, que es justo lo que no sirve.
      journey.progress = WARM_STOPS[step.current]
      journey.target = WARM_STOPS[step.current]
    } else {
      journey.progress = resume.current
      journey.target = resume.current

      /*
        Y se avisa de que el barrido ha TERMINADO. Lo escucha el preloader, que
        hasta ahora se retiraba por un temporizador calibrado cuando esto eran
        tres paradas: con veinticuatro, el velo se iba a mitad del barrido y lo
        que quedaba en pantalla era el interior del cerebro. Ver 'state/warmup'.
      */
      markWarmed()
    }
  }, -200)

  return null
}

/**
 * Sonda de diagnóstico. NO pinta nada en pantalla.
 *
 * Sustituye al panel de `Stats` de drei, que era un recuadro de contadores
 * encima de la portada. Dos motivos para quitarlo, y el segundo es el de peso:
 * ocupaba una esquina del encuadre que hay que poder juzgar limpio, y un
 * contador en pantalla enseña la MEDIA —el número que precisamente esconde los
 * tirones, ver `docs/diario/02-el-caso-de-los-tirones.md`—.
 *
 * Lo que deja en su lugar es el acceso al renderizador para
 * `scripts/perf.mjs`, que mide en un navegador con GPU de verdad:
 * `renderer.info` da las llamadas de dibujo y los triángulos REALES del
 * frame, que es un dato y no una impresión.
 *
 * Solo en desarrollo, y sin coste por frame: es un `useEffect`, no un bucle.
 */
function Probe() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    /**
     * `project` devuelve en PÍXELES la caja que ocupa un objeto en pantalla.
     *
     * Es lo que hace falta para saber si el titular choca con Olaz. A ojo se
     * falla: el modelo tiene brazos y pelo que salen del cuerpo, y lo que tapa
     * el texto no es su silueta sino su caja proyectada.
     */
    /**
     * La caja de un objeto proyectada a píxeles.
     *
     * Solo cuenta MALLAS, y salta los `sprite`. `Box3.setFromObject` mete
     * dentro todo lo que cuelgue del objeto, y del grupo de la mascota cuelga
     * el halo del cerebro de la mano: un sprite de 2,2 unidades que no es el
     * personaje ni se ve como tal. Con él dentro, la caja de Olaz salía del 90%
     * del alto en 1920 y del 79% en 1440 —la misma escena midiendo dos cosas
     * distintas— y cualquier cuenta hecha con ese número estaba mal desde el
     * principio. La silueta que tapa el texto y que se apoya en el pedestal es
     * la malla, no su resplandor.
     */
    const project = (name) => {
      const object = scene.getObjectByName(name)
      if (!object) return null
      const box = new Box3()
      const bounds = new Box3()
      object.updateWorldMatrix(true, true)
      object.traverse((child) => {
        if (!child.isMesh || !child.geometry) return
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
        bounds.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
        box.union(bounds)
      })
      if (box.isEmpty()) return null
      const width = gl.domElement.clientWidth
      const height = gl.domElement.clientHeight
      const corner = new Vector3()
      let left = Infinity
      let right = -Infinity
      let top = Infinity
      let bottom = -Infinity
      for (let i = 0; i < 8; i += 1) {
        corner
          .set(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
          )
          .project(camera)
        const x = ((corner.x + 1) / 2) * width
        const y = ((1 - corner.y) / 2) * height
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
      /**
       * `sole` es la línea de apoyo, y NO es `bottom`.
       *
       * `bottom` es la esquina más baja de la caja proyectada, o sea la PUNTA
       * del zapato: el punto más bajo y a la vez el más cercano a la cámara,
       * que por perspectiva cae 71 píxeles por debajo del talón. Comparar eso
       * con la superficie del podio decía que Olaz estaba hundido cuando en la
       * captura se apoyaba bien.
       *
       * Lo que hay que comparar con el podio es dónde cae su plano de apoyo a
       * SU profundidad: el punto más bajo, al centro de la caja en x y en z.
       */
      corner.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2)
      corner.project(camera)
      return {
        left: Math.round(left),
        right: Math.round(right),
        top: Math.round(top),
        bottom: Math.round(bottom),
        sole: Math.round(((1 - corner.y) / 2) * height),
        screen: { width, height },
      }
    }

    /**
     * ── EL HUECO REAL, MEDIDO CON RAYOS ────────────────────────────────
     *
     * Existe porque la caja envolvente MIENTE sobre el interior. `inspect`
     * dice que el casco mide 1,998 × 1,834 × 1,971, y con eso se dedujo un
     * elipsoide de semiejes 0,500 · 0,459 · 0,493 para decidir qué parada de
     * cámara cae dentro. Pero un cerebro no es una cáscara hueca: es una
     * superficie con surcos profundos, y en muchas direcciones la primera
     * pared que hay está mucho antes que el borde exterior.
     *
     * Costó una vuelta entera: las cinco áreas se colocaron dentro del
     * elipsoide, la sonda confirmó que estaban en el cuadro, visibles y con
     * opacidad uno… y no se veían. Estaban DETRÁS de un pliegue. Lo único que
     * seguía viéndose era lo que lleva `depthTest: false`.
     *
     * Esto lanza rayos desde el centro y devuelve a qué fracción del cerebro
     * está la primera pared en cada dirección. Ese número es el hueco de
     * verdad, y es el que manda sobre dónde puede ponerse nada.
     */
    const cavity = (directions, size) => {
      const wall = scene.getObjectByName('brain-wall')
      if (!wall) return null
      const origin = new Vector3()
      wall.getWorldPosition(origin)
      const raycaster = new Raycaster()
      // Hay que verlo aunque el recorrido lo tenga apagado.
      const was = wall.visible
      wall.visible = true
      const out = directions.map((d) => {
        raycaster.set(origin, new Vector3(...d).normalize())
        const hits = raycaster.intersectObject(wall, true)
        return hits.length ? +(hits[0].distance / size).toFixed(4) : null
      })
      wall.visible = was
      return out
    }

    window.__cocobrain = { gl, scene, camera, project, cavity }
    return () => {
      delete window.__cocobrain
    }
  }, [gl, scene, camera])

  return null
}

/**
 * Mueve la cámara leyendo la tabla. No tiene lógica propia: si el recorrido
 * está mal, se corrige en `stages.js`, no aquí.
 */
function CameraDirector({ tokens, measure, nodeOrder, children }) {
  const camera = useThree((state) => state.camera)
  const aspect = useViewportAspect()

  const path = useMemo(
    () =>
      cameraPath(tokens, {
        handBrain: measure?.anchor ?? null,
        mascotWidth: measure?.width ?? null,
        fov: camera.fov,
        aspect,
        nodeOrder,
      }),
    [tokens, measure, camera.fov, aspect, nodeOrder],
  )

  const position = useRef(new Vector3())
  const target = useRef(new Vector3())

  useFrame(() => {
    sampleCamera(path, journey.progress, position.current, target.current)
    camera.position.copy(position.current)
    camera.lookAt(target.current)
  })

  /**
   * El paso cuelga de aquí porque necesita LA MISMA curva que la cámara.
   * Recalculársela por su cuenta sería tener dos versiones del recorrido, y la
   * primera vez que alguien tocara una parada dejarían de coincidir.
   */
  return typeof children === 'function' ? children(path) : null
}

export default function World({
  tokens,
  sections,
  model,
  compact = false,
  reaction,
  onPoke,
  activeSection,
  onSelectSection,
  onOpenSection,
  onCloseSection,
}) {
  const [dpr, setDpr] = useState(pickDpr)

  // El orden de las paradas del recorrido sale de los datos, no de una lista
  // aparte que hubiera que mantener en paralelo.
  const nodeOrder = useMemo(() => sections.map((section) => section.nodeName), [sections])

  /**
   * Lo que la mascota mide de sí misma al cargar: su ancho ya escalado y dónde
   * ha quedado el cerebro de la mano. Son los dos datos del mundo que no se
   * pueden escribir a mano porque dependen de la malla.
   */
  const [measure, setMeasure] = useState(null)

  const onMeasure = useCallback((next) => {
    // Solo se acepta si de verdad ha cambiado. Sin esta guarda, cualquier
    // remedida devolvía un objeto nuevo, React lo veía como un cambio y
    // reconstruía el recorrido de la cámara sin motivo.
    setMeasure((current) => {
      if (!current) return next
      const sameWidth = Math.abs(current.width - next.width) < 1e-4
      const sameAnchor =
        !current.anchor || !next.anchor || current.anchor.distanceToSquared(next.anchor) < 1e-6
      return sameWidth && sameAnchor ? current : next
    })
  }, [])

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 60 }}
      gl={{
        // El suavizado por multimuestreo cuesta, y por encima de 1,3 de `dpr`
        // ya está suavizando la propia resolución. Se paga solo si hace falta.
        antialias: dpr < 1.3,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
        /**
         * EL RECORTE POR MATERIAL, que es como se atraviesa la corteza.
         *
         * `localClippingEnabled` no recorta nada por sí solo: habilita que un
         * material pueda llevar sus propios planos. Lo usa `FloatingBrain` para
         * ABRIR el casco por el plano de la cámara mientras se entra, en vez de
         * desvanecerlo. Sin esta línea el plano se declara y no hace nada.
         */
        localClippingEnabled: true,
      }}
    >
      {/*
        La bajada de resolución es de ida y sin vuelta, a propósito.

        Con `onIncline` devolviendo el valor alto, en cuanto los fps rondaban
        el umbral el monitor rebotaba: subía, bajaba, subía. Y cada cambio de
        `dpr` obliga a redimensionar el búfer de dibujo del canvas, que es una
        operación cara. El propio mecanismo que debía proteger el rendimiento
        se convertía en una fuente de parones periódicos.

        `flipflops` es la red de seguridad de la librería: tras tres dudas se
        queda abajo y deja de medir.
      */}
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onFallback={() => setDpr(1)}
      />

      <Warmup />
      <JourneyClock />
      <CavityFog />
      <Exposure />
      <SceneRetreat />
      <CameraDirector tokens={tokens} measure={measure} nodeOrder={nodeOrder}>
        {(path) => (
          <Suspense fallback={null}>
            <Corridor path={path} brain={tokens.mind.radius * tokens.mind.brain} />
          </Suspense>
        )}
      </CameraDirector>

      {/* HDRI de estudio (Poly Haven, CC0). De aquí sale casi toda la luz: es
          la diferencia entre un visor de modelos y una escena dirigida. */}
      <Environment files="/hdri/studio.hdr" environmentIntensity={1} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} color="#FFF6EA" />

      <Suspense fallback={null}>
        <MascotStage
          tokens={tokens}
          model={model}
          compact={compact}
          onMeasure={onMeasure}
          reaction={reaction}
          onPoke={onPoke}
        />
      </Suspense>

      <MindStage
        tokens={tokens}
        sections={sections}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        onOpenSection={onOpenSection}
        onCloseSection={onCloseSection}
        compact={compact}
      />

      {/* Va al final: el postproceso se aplica sobre todo lo anterior. */}
      <Glow compact={compact} />

      {import.meta.env.DEV && <Probe />}
    </Canvas>
  )
}
