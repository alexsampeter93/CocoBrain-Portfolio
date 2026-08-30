import { useEffect, useRef } from 'react'
import { journey } from '../../journey/clock'
import { atmosphereAt, descent, foreground, portalAt, ramp } from '../../journey/stages'
import { getVisualAsset } from '../../data/visualAssets'

/**
 * LO QUE PASA ALREDEDOR DE LA CÁMARA.
 *
 * Tres momentos del recorrido en los que el visitante ATRAVIESA algo: el
 * corredor del entorno de la portada, la corteza al entrar y la corteza al
 * salir. Más la atmósfera que los tiñe.
 *
 * Los tres son el mismo mecanismo con otra imagen y otro tiempo, y por eso
 * viven juntos: una ilustración, una máscara que le vacía el centro, y una
 * escala que crece mientras se pasa. Escribirlo tres veces habría dejado tres
 * copias de las mismas veinte líneas.
 *
 * ## Por qué en los BORDES y no encima
 *
 * El primer intento fue lo evidente: la ilustración superpuesta al cruce,
 * fundida en `screen`. Se retiró midiéndola contra la captura aprobada de la
 * fase 4.5. En `screen` una imagen clara LEVANTA los negros, y el plano del
 * cruce perdía el contraste que costó media fase recuperar; ni al 8% ni
 * recortada en óvalo se salvaba. El problema no era la cantidad: la corteza de
 * cristal vista de cerca ya es una maraña de capas rosadas, y sumarle otra
 * maraña de capas rosadas es pedirle al ojo que separe dos cosas iguales.
 *
 * Aquí se hace lo contrario. La imagen se pinta en modo normal —cubre, nunca
 * aclara— y una máscara le VACÍA EL CENTRO. Se ve por los bordes, creciendo y
 * saliendo de cuadro, mientras el centro se queda tal cual estaba.
 *
 * Y no recarga el plano, lo ordena: los instantes de paso son los más ruidosos
 * de la web, y lo que hace el velo es TAPAR la periferia y dejar un solo sitio
 * donde mirar. Un plano de túnel funciona por las paredes, no por el fondo.
 *
 * ## Las dos curvas
 *
 * `presence` decide cuándo se ve. `pass` es una rampa que no vuelve atrás:
 * mueve la escala y abre el hueco.
 *
 * Montar las dos cosas sobre la misma campana fue el primer error de este
 * componente, y se vio en las capturas: el túnel estaba más abierto justo
 * cuando era más visible, así que las dos curvas se anulaban y no se veía
 * nada. Con la rampa, las capas crecen y se quedan detrás.
 *
 * ## Va DELANTE del canvas, y eso importa
 *
 * `z-[5]`, entre la escena (`z-0`) y el contenido (`z-10`). El corredor estuvo
 * un momento en `Backdrops`, o sea DETRÁS del canvas, y ahí no podía funcionar:
 * el telón del interior es una esfera OPACA que se enciende en 0,115, así que
 * habría tapado las paredes justo cuando más falta hacían. Y además es lo
 * correcto físicamente —lo que te pasa por los lados está delante de lo que
 * tienes al fondo—.
 *
 * OJO: `pointer-events-none` no es opcional. Es una capa fija a pantalla
 * completa por encima del canvas, y sin esa línea se quedaría todos los clics
 * de los nodos exactamente igual que hizo la pista en su día, sin un solo error
 * en consola.
 */

/** Opacidad máxima de un velo, en su momento de máxima presencia. */
const PEAK = 0.92

function mix(a, b, t) {
  return a + (b - a) * t
}

/**
 * LOS TRES PASOS.
 *
 * `signal` devuelve `{ pass, presence }` o `null`. Sale de `stages.js` en los
 * tres casos: ninguno tiene reloj propio.
 */
const PASSES = [
  {
    /**
     * ── EL PRIMER TÉRMINO DE LA PORTADA ──────────────────────────────────
     *
     * Las piedras de los bordes del bodegón, muy ampliadas y recortadas a su
     * lado, DELANTE del canvas. Es lo único que hay entre el visitante y Olaz,
     * y por eso es lo que hace que Olaz esté dentro de un sitio en vez de estar
     * pegado sobre una foto.
     *
     * Existe ya con la página quieta —`REST` en `foreground()`— y al bajar se
     * separa hacia fuera y crece. La profundidad no sale de que el fondo se
     * mueva mucho: sale de que se mueva MENOS que lo que tienes cerca. Aquí el
     * primer término crece un 95% y el fondo un 34%.
     *
     * Cada copia se ancla a SU borde (`object-position`), así que la izquierda
     * enseña las piedras de la izquierda del archivo y la derecha las suyas. Es
     * la misma imagen y la misma petición: cambia dónde se mira.
     */
    id: 'hero',
    asset: 'hero.near',
    sides: true,
    signal: (p) => foreground(p),
    shape: (pass, side) => {
      /**
       * Hasta dónde llega cada masa hacia el centro, en porcentaje del ancho.
       *
       * Va en `pass²` a propósito: mientras Olaz está en el cuadro apenas se
       * mueve —30% en reposo— y se abre después, que es el tramo en el que el
       * centro se quedaba vacío.
       */
      /**
       * ── LAS DOS MASAS SE APOYAN EN EL SUELO DEL CUADRO ─────────────────
       *
       * El primer intento llevaba bandas de altura completa a los dos lados, y
       * las dos capturas lo tumbaron: la izquierda se comía el titular —"Alex ·
       * desarrollo web" sobre piedras oscuras, ilegible— y la derecha se comía
       * la navegación y el interruptor de "cabeza despejada".
       *
       * La corrección no es estrechar las bandas, es ponerlas donde de verdad
       * están las piedras: **en el suelo.** Un degradado diagonal por esquina
       * deja las masas apoyadas abajo y el aire de arriba libre. Es lo que hay
       * en la lámina —piedras, no columnas— y de paso resuelve las dos
       * legibilidades sin añadir ni una sombra debajo del texto.
       *
       * El principio se mantiene: el primer término enmarca, no tapa.
       */
      const corner = mix(48, 82, pass * pass)
      const diagonal = side === 'left' ? 'to top right' : 'to top left'
      return `linear-gradient(${diagonal}, #000 0%, #000 ${(corner * 0.42).toFixed(1)}%,` +
        ` transparent ${corner.toFixed(1)}%)`
    },
    drift: (pass, side) => ({ x: (side === 'left' ? -1 : 1) * pass * 30, y: pass * 7 }),
    travel: 0.95,
    // Entra CASI NÍTIDO y se emborrona al pasar, no al revés. Iba de 5 a 9 px,
    // y a 5 px lo que hay delante de Olaz no son piedras: son manchas. La
    // lámina ya trae su propia profundidad de campo del render, así que el
    // desenfoque de aquí no tiene que separar planos —eso está hecho— sino
    // acompañar al movimiento: lo que te adelanta muy de cerca se arrastra.
    blur: (pass) => mix(1.5, 8, pass),
    // Lo cercano se apaga al entrar en la sombra del descenso.
    tone: (pass) => mix(1, 0.6, pass),
    opacity: 0.98,
  },
  /*
    ── AQUÍ ESTABA EL CORREDOR DE CSS, Y HA SALIDO ────────────────────────

    Eran dos copias de la misma fotografía a pantalla completa que crecían y se
    separaban. Nunca produjo perspectiva, y el motivo no era el ajuste sino el
    medio: ampliar una foto mantiene la posición relativa de todo lo que hay
    dentro, así que se lee como una imagen acercándose. Cinco fases de máscaras,
    desenfoques, viñetas y topes no lo arreglaron porque el problema estaba en
    el movimiento, no en el acabado.

    Lo sustituye `three/Corridor.jsx`: anillos de geometría colocados sobre la
    MISMA curva que recorre la cámara. Ahí la perspectiva no hay que fingirla.

    Y de paso se van las dos capas de pantalla completa más caras que tenía la
    web —eran el 57% del coste del descenso antes de la fase 5D.6— sin sustituto
    en CSS: los anillos son unos cientos de triángulos.
  */

  {
    /** ENTRAR en la corteza. Un túnel que se cierra hacia lo oscuro. */
    id: 'enter',
    asset: 'transitions.enter',
    signal: (p) => {
      const state = portalAt(p)
      return state && state.which === 'enter' ? state : null
    },
    shape: (pass) => {
      const hole = mix(8, 100, pass)
      return `radial-gradient(circle at 50% 50%, transparent ${hole * 0.5}%, #000 ${hole}%)`
    },
    travel: 0.9,
    blur: () => 5,
    /**
     * ── EN EL CRUCE SE RESTA LUZ, Y ESTE VELO ESTABA SUMÁNDOLA ────────────
     *
     * Iba a `0,88` de brillo y `PEAK` (0,92) de opacidad, o sea una lámina
     * clara a pantalla completa en el momento más brillante que le queda al
     * descenso. Medido a lo largo del tramo, la luminancia media hacía esto:
     *
     *     0,38 → 37     0,42 → 42     0,46 → 91     0,50 → 14
     *
     * Cuarenta y nueve puntos de subida y setenta y siete de bajada en dos
     * pasos. Eso no es entrar en algo, es un fogonazo, y contradice de frente
     * la regla que este propio manual ya tenía escrita: en el cruce de la
     * corteza coinciden la transmisión, los reflejos, los surcos emisivos y el
     * bloom, así que lo que hay que hacer ahí es RESTAR luz.
     *
     * A 0,34 de brillo y 0,58 de opacidad el velo hace lo que tiene que hacer
     * —una membrana OSCURA que se cierra alrededor de la cámara mientras se
     * atraviesa— y la curva de luz sigue bajando en vez de dar un salto.
     */
    tone: () => 0.34,
    opacity: 0.58,
  },
  /*
    ── Y AQUÍ ESTABA EL VELO DE SALIDA ─────────────────────────────────────

    Era la misma membrana cruzada al revés: se entraba en el cerebro por un
    túnel que se cierra y se salía por una arcada que se abre a la luz.

    Ha salido porque ya no se sale. El recorrido entra en la cavidad y se queda
    dentro —ver la cabecera de `STAGES`—, así que `portalAt` solo puede
    devolver `enter` y este paso no llegaba a dispararse nunca: código muerto
    que además sugería una coreografía que no existe.

    La lámina `transitions.leave` sigue en `visualAssets.js` y ahora mismo no
    la usa nadie. No es un hueco declarado ni un descuido: es una ilustración
    disponible que la escenografía actual no necesita.
  */
]

/**
 * ── LA ATMÓSFERA DEL DESCENSO ─────────────────────────────────────────────
 *
 * El viaje cromático de la portada a la mente, como una viñeta que se cierra.
 *
 * ## Por qué una viñeta y no un fundido a negro
 *
 * Un fundido plano apaga la pantalla entera a la vez, incluido el protagonista,
 * y eso se lee como "se acabó la escena". Una viñeta que se cierra deja el
 * centro limpio y va comiendo por los bordes: se lee como meterse en una
 * cavidad, que es justo lo que está pasando. Olaz se queda nítido hasta que le
 * toca irse por su propia capa.
 *
 * ## El añil es el puente, no el color
 *
 * Aparece a media transición y solo en el anillo exterior, nunca en el centro.
 * Es lo que anticipa el universo neuronal sin convertir la portada en una web
 * azul: cuando llega, el visitante ya no está mirando la portada.
 */
/**
 * El color del aire, pedido a la tabla y formateado para CSS. La rampa vive en
 * `journey/stages.js` desde que el telón de la escena también la necesita.
 */
function airAt(t) {
  return atmosphereAt(t)
    .map((channel) => Math.round(channel))
    .join(',')
}

/**
 * INTERRUPTORES DE DIAGNÓSTICO. Sirven para poder comparar con y sin, en una
 * máquina de verdad, sin tocar código. Mismo motivo que `?glass=0` y
 * `?bloom=0`.
 *
 *     ?veil=0        toda la escenografía fuera
 *     ?corridor=0    solo el corredor de la portada
 *     ?cssblur=0     el desenfoque de CSS a cero, todo lo demás igual
 *
 * El tercero es el importante: un `filter: blur()` sobre una capa de pantalla
 * completa se vuelve a rasterizar entero en cada frame, y hasta que no se
 * puede medir con y sin él no se sabe cuánto cuesta.
 */
function diagnostic(name) {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get(name) !== '0'
}

export default function PortalVeil() {
  const nodes = useRef({})
  const skyRef = useRef(null)

  /**
   * Un paso normal es un elemento; el corredor son DOS, uno por pared. `keys`
   * evita que el resto del componente tenga que saber cuál es cuál.
   */
  const showVeil = diagnostic('veil')
  const showCorridor = diagnostic('corridor')
  const softness = diagnostic('cssblur') ? 1 : 0

  const passes = (showVeil ? PASSES : [])
    .filter((pass) => showCorridor || pass.id !== 'corridor')
    .map((pass) => ({
      ...pass,
      image: getVisualAsset(pass.asset),
      keys: pass.sides ? [`${pass.id}-left`, `${pass.id}-right`] : [pass.id],
    }))
    .filter((pass) => pass.image)

  useEffect(() => {
    if (!passes.length) return

    let frame
    const last = {}

    /**
     * CADA CUÁNTO SE VUELVE A DIBUJAR LA CAPA. Medido, no elegido a ojo.
     *
     * `transform` y `opacity` las resuelve el compositor sobre una capa que ya
     * está en la tarjeta: cuestan prácticamente cero y se escriben continuas.
     * `mask-image` y `filter` NO: cambiar cualquiera de las dos obliga a
     * RASTERIZAR la capa entera otra vez, y estas capas son enormes —el
     * corredor son dos imágenes de pantalla completa ampliadas casi al triple—.
     *
     * Escribiéndolas en cada frame, el descenso costaba 3,93 ms de trabajo por
     * frame en 1920×1080 al 150%. Escribiendo la máscara una sola vez: 2,10.
     * O sea que reescribirla se llevaba 1,83 ms, casi la mitad del total, y el
     * paso entero del corredor abre su hueco del 34% al 46%: 333 rasterizados
     * para mover un degradado doce puntos.
     *
     * Con pasos de un 2% del recorrido son 50 en vez de 333, y la diferencia no
     * se ve —un 0,25% de hueco son cinco píxeles de un degradado que ya es
     * suave—. El movimiento sigue siendo continuo porque quien mueve el
     * corredor es la escala, no la máscara.
     */
    const REDRAW = 0.02

    /**
     * Si la pantalla es estrecha. Se mide una vez y en cada cambio de tamaño,
     * nunca en el bucle: leer `innerWidth` en cada frame obliga al navegador a
     * recalcular la maquetación.
     */
    let narrow = window.innerWidth < 720
    const onResize = () => {
      narrow = window.innerWidth < 720
    }
    window.addEventListener('resize', onResize)

    const tick = () => {
      const p = journey.progress

      for (const pass of passes) {
        const state = pass.signal(p)

        if (!state || state.presence <= 0.002) {
          if (last[pass.id] !== null) {
            last[pass.id] = null
            for (const key of pass.keys) {
              const node = nodes.current[key]
              if (!node) continue
              node.style.visibility = 'hidden'
              node.style.opacity = 0
            }
          }
          continue
        }

        // Solo se escribe cuando el valor se ha movido de verdad: tocar el
        // estilo obliga a recomponer, y esto vale cero casi todo el recorrido.
        if (last[pass.id] !== null && Math.abs(last[pass.id] - state.pass) < 0.003) continue
        last[pass.id] = state.pass

        /** El escalón al que van la máscara y el filtro. Ver `REDRAW`. */
        const step = Math.round(state.pass / REDRAW) * REDRAW
        const redraw = last[`${pass.id}:redraw`] !== step
        if (redraw) last[`${pass.id}:redraw`] = step

        for (const key of pass.keys) {
          const node = nodes.current[key]
          if (!node) continue
          const side = pass.sides ? (key.endsWith('-left') ? 'left' : 'right') : null
          const off = pass.drift ? pass.drift(state.pass, side, narrow) : { x: 0, y: 0 }

          // Continuas: las lleva el compositor.
          node.style.visibility = 'visible'
          node.style.opacity = state.presence * pass.opacity
          node.style.transform =
            `translate3d(${off.x}%, ${off.y}%, 0) scale(${1 + state.pass * pass.travel})`

          // A escalones: cada una de estas rasteriza la capa entera otra vez.
          if (!redraw) continue
          const mask = pass.shape(step, side, narrow)
          node.style.filter =
            `blur(${(pass.blur(step) * softness).toFixed(2)}px) brightness(${pass.tone(step).toFixed(3)})`
          node.style.maskImage = mask
          node.style.webkitMaskImage = mask
        }
      }

      /**
       * La atmósfera. Se abre despacio, aguanta cerrada mientras se atraviesa,
       * y se retira al final: para entonces el interior de la escena ya está
       * establecido y es igual de oscuro, así que el relevo no se ve.
       *
       * Ese solape es el acto que faltaba. Sin él hay un punto en el que la
       * transición "termina" y empieza otra cosa; con él, la mente ya existe
       * antes de que se acabe de entrar.
       */
      if (skyRef.current) {
        const going = descent(p)
        /**
         * ENTRA MÁS TARDE Y PESA MENOS. Medido en 0,16.
         *
         * Con `ramp(going, 0,08 · 0,5)` y un tope de 0,9, la atmósfera ya
         * estaba al 88% a mitad del descenso: es una viñeta, así que lo que
         * más oscurece son los bordes, que es exactamente donde corren las
         * paredes del corredor. El cuadro salía como un lavado marrón sin
         * arquitectura ninguna.
         *
         * Retrasada y con tope 0,78, en ese mismo punto vale 0,44: sigue
         * cerrando el plano y ya no borra lo que tiene que enmarcar. Cierra
         * igual de oscura al final, que es lo único que no puede cambiar —de
         * ahí sale el relevo con el interior—.
         */
        /**
         * ── LA ATMÓSFERA ACOMPAÑA, NO APAGA. Recalibrada con la sonda ──────
         *
         * Estos números venían de un descenso que terminaba en 0,29 y ahora
         * termina en 0,34, con el vuelo al cerebro ocupando cinco pantallas en
         * medio. Con la ventana antigua, en p=0,27 la viñeta valía 0,78 y se
         * cerraba hasta el 52% del radio: una cortina marrón sobre todo el
         * cuadro. Medido, el frame daba contraste 3,4 sobre 57 de la portada, y
         * el cerebro estaba ahí —malla visible, opacidad 1, 750 × 658 píxeles—
         * debajo de ella.
         *
         * Se buscó el fallo en el material del cerebro dos veces antes de
         * mirar aquí. La lección: cuando algo "no se ve", comprobar primero qué
         * hay ENCIMA, no qué le pasa al objeto.
         *
         * Ahora entra mucho más tarde y pesa la mitad: acompaña el último
         * tercio del descenso, que es cuando de verdad se está dejando atrás la
         * sala, y nunca llega a tapar lo que tiene que enmarcar.
         */
        const strength = ramp(going, 0.55, 1) * 0.55

        if (last.sky === undefined || Math.abs(last.sky - going) > 0.003) {
          last.sky = going
          if (strength <= 0.002) {
            skyRef.current.style.visibility = 'hidden'
          } else {
            /**
             * El anillo se cierra, pero NUNCA del todo, y esa es la corrección
             * que salvó este tramo.
             *
             * La primera versión cerraba hasta el 6% del radio, o sea cubría la
             * pantalla entera de color plano. Medido en las capturas: entre 0,18
             * y 0,22 el cuadro era un campo de añil liso con el cerebro diminuto
             * en el centro. Dos cosas mal a la vez —"no conviertas la portada en
             * azul", y un color plano no tiene textura ninguna— y encima tapaba
             * las paredes del corredor, que estaban corriendo debajo sin que se
             * vieran.
             *
             * Ahora se queda en el 52% del radio: el centro siempre enseña la
             * escena. Y el color va en `rgba`, no opaco, así que oscurece y tiñe
             * en vez de sustituir. Es una atmósfera, no una cortina.
             *
             * No hace falta que llegue a negro: cuando termina, el interior de
             * la escena ya lleva rato encendido y es igual de oscuro.
             */
            const tint = airAt(going)
            /**
             * Cierra ANTES de lo que dura el descenso: `0,72` y no `0,92`.
             *
             * En 0,17 el cuadro se queda con el cerebro todavía pequeño —el 31%
             * del alto, medido sobre la curva de cámara— y sin nada alrededor:
             * la sala ya está tapada por el telón opaco del interior y el
             * corredor solo llega a los bordes. Con la viñeta abierta al 88%
             * eso es un campo vacío.
             *
             * Cerrándola antes, el anillo encuadra al cerebro mientras se
             * acerca. No llena el hueco con nada: lo recorta, que en cine es la
             * forma de que un objeto pequeño en un plano abierto siga siendo el
             * sujeto.
             */
            /**
             * Y el anillo se queda mucho más abierto: del 150% al 78% del
             * radio, no del 135% al 52%. Por debajo del 78% la viñeta deja de
             * encuadrar y empieza a tapar.
             */
            const clear = mix(150, 78, ramp(going, 0.4, 1))
            skyRef.current.style.visibility = 'visible'
            skyRef.current.style.opacity = strength
            skyRef.current.style.background =
              `radial-gradient(circle at 50% 47%, rgba(${tint},0) ${clear * 0.42}%,` +
              ` rgba(${tint},0.42) ${clear * 0.76}%,` +
              ` rgba(${tint},0.74) ${clear}%)`
          }
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  if (!passes.length) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {/*
        LA ATMÓSFERA VA DEBAJO DE LAS PAREDES, y esto costó una medición.

        Estaba encima, con el argumento de que así teñía también al corredor.
        El problema es que es una VIÑETA: lo que más oscurece son los bordes,
        que es exactamente donde están las paredes. Medido en las capturas, la
        desviación de luminancia en las franjas laterales caía a 4 entre 0,17 y
        0,26 —bordes planos, sin textura ninguna— justo en el tramo del que
        había que quitar la sensación de vacío.

        Y es al revés de como funciona la luz: lo que tienes cerca recibe MÁS,
        no menos. Debajo, la atmósfera apaga el fondo y las paredes se quedan
        como lo más claro del cuadro, que es lo que las hace leerse como algo
        que te está pasando al lado.

        Su propio oscurecimiento lo lleva `tone`, que baja con el paso.
      */}
      <div ref={skyRef} className="absolute inset-0" style={{ visibility: 'hidden', opacity: 0 }} />

      {passes.flatMap((pass) =>
        pass.keys.map((key) => (
        <img
          key={key}
          ref={(node) => {
            nodes.current[key] = node
          }}
          src={pass.image.src}
          srcSet={pass.image.srcSet}
          sizes="100vw"
          alt=""
          /*
            Sin `lazy`, y es la excepción a la regla del resto de ilustraciones.
            Estos tres momentos son el recorrido; con carga perezosa la imagen
            empezaría a descargarse cuando ya hiciera falta y se verían a medias
            justo la primera vez, que es la que cuenta.

            El corredor no añade ninguna petición: es el MISMO archivo que el
            entorno de la portada, así que sale de la caché.
          */
          decoding="async"
          /**
           * CADA PARED ENSEÑA SU LADO DE LA SALA, y esto es lo que faltaba
           * para que el corredor se leyera como un sitio.
           *
           * `object-cover` recorta por el centro, así que las dos paredes
           * estaban enseñando la MISMA franja central de la fotografía —que
           * es justo la parte lisa, la que se despejó a propósito para que se
           * leyera el titular—. Ampliada al doble, eso es un campo sin textura:
           * medido en 0,16, el cuadro entero era un lavado sin arquitectura.
           *
           * Anclando cada copia a su borde, la pared izquierda enseña la
           * columna y el arco de la izquierda del archivo y la derecha los
           * suyos. Es la misma imagen y la misma petición: cambia dónde se
           * mira.
           */
          style={{
            backgroundColor: pass.image.tint,
            visibility: 'hidden',
            opacity: 0,
            objectPosition: key.endsWith('-left')
              ? 'left bottom'
              : key.endsWith('-right')
                ? 'right bottom'
                : 'center',
          }}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
        )),
      )}
    </div>
  )
}
