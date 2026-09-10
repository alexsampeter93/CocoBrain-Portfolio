import { useEffect, useRef } from 'react'
import { journey } from '../../journey/clock'
import { descent, layerOpacity } from '../../journey/stages'
import { getVisualAsset } from '../../data/visualAssets'
import { getCalmMode } from '../../state/calmMode'
import { isDarkTheme, subscribeTheme } from '../../state/theme'

/**
 * El fondo de toda la web: las ilustraciones y el clima cromático.
 *
 * ## Por qué van en el DOM y no en la escena
 *
 * Podrían ser planos o texturas dentro de WebGL, y sería lo "natural". Pero son
 * imágenes fijas que no necesitan ni perspectiva ni luz ni profundidad: meterlas
 * en la escena las convertiría en píxeles que la tarjeta tiene que sombrear en
 * cada frame, y el presupuesto está justo —el cerebro de cristal ya obliga a
 * dibujar la escena dos veces—.
 *
 * Como capas del navegador cuestan prácticamente cero: se componen una vez y el
 * fundido es una propiedad que la GPU resuelve sola.
 *
 * Van con `position: fixed`, nunca con `background-attachment: fixed`, que
 * obliga a repintar la ventana entera en cada frame de scroll.
 *
 * ## Las capas, de atrás a delante
 *
 *     clima         un color plano que se interpola con el scroll
 *     portada       la ilustración cálida del acto 1
 *     mente         la del interior, que entra al cruzar
 *     editorial     la del tramo de lectura, con parallax
 *
 * Ninguna sabe qué archivo está pintando: se lo pregunta a `visualAssets`.
 */

/** Se cruzan con el mismo reloj que mueve la cámara: entran cuando entra la mente. */
const LAYER = 'mind'

/**
 * ## El clima
 *
 * Un color plano que se INTERPOLA a lo largo de toda la lectura. Es lo que hace
 * que el contenido editorial no se sienta como una web pegada debajo de una
 * escena 3D: no hay ningún punto en el que una cosa acabe y empiece otra, hay
 * un fondo que va cambiando de temperatura mientras se lee.
 *
 * Se interpola un solo color en un solo elemento a propósito. Animar las
 * variables de `:root` habría permitido mover también los acentos, pero cada
 * escritura invalida el estilo del documento entero, y con una página larga eso
 * se paga en cada frame de scroll. Los acentos se quedan estáticos por acto en
 * `index.css` —son filetes y metadatos, nadie nota el salto— y lo continuo es
 * lo único que de verdad se ve continuo: el suelo.
 *
 * El recorrido va del interior de la cabeza al marfil, y esa es la transición
 * que cuenta la web entera: **se sale de la mente a la luz**.
 */
const CLIMATE = [
  { at: 0.0, color: [0x10, 0x0c, 0x0a] }, // el interior, de donde vienes
  { at: 0.5, color: [0xf4, 0xed, 0xe3] }, // marfil: el trabajo, a plena luz
  { at: 1.0, color: [0xf7, 0xf1, 0xe8] }, // y un punto más cálido en el cierre
]

/**
 * EL AMANECER: lo que se tarda en pasar de la oscuridad al marfil, en fracción
 * del editorial.
 *
 * Tiene que caber dentro del umbral —el tramo de "Has recorrido la mente"— y
 * terminar antes de que empiece la primera área, porque el titular de "Sobre
 * mí" no puede leerse sobre un fondo a medio camino.
 *
 * ## Por qué ya no es 0,075
 *
 * Porque en 0,075 no se veía, y eso se puede medir en vez de opinarlo. El
 * editorial medía unas seis pantallas, así que el 7,5% eran **0,45 pantallas de
 * scroll**: el fondo terminaba de cambiar de negro a marfil en menos de media
 * ventana. Da igual que la curva sea suave; a esa velocidad no es una
 * transición, es un corte con las esquinas limadas.
 *
 * La solución tenía dos partes y las dos hacían falta. Esta constante sube al
 * 30%, y el umbral pasa de 70vh a 140vh —ver `ReadingThreshold`—. Lo segundo
 * es lo que de verdad lo arregla: subir solo el porcentaje habría metido el
 * cambio dentro de la primera área.
 *
 * ## Dónde cae, medido
 *
 * El canal de lectura NO empieza donde empieza el editorial: su disparador es
 * `top bottom`, así que arranca una ventana entera antes, cuando el umbral
 * asoma por abajo. Eso hay que tenerlo en cuenta o los números engañan —la
 * primera vez que se midió esto, el amanecer ya estaba al 75% en el momento en
 * que el umbral llegaba arriba y parecía que no había transición—.
 *
 * Con el umbral a 140vh, ese tramo cubre desde `reading` 0 hasta 0,36 en
 * escritorio y 0,33 en móvil. El amanecer al 30% termina dentro de él en los
 * dos casos, y dura **2,0 pantallas de scroll** en escritorio y 2,2 en móvil.
 * Cuatro veces más que antes, y sigue acabando antes del primer titular.
 *
 * ── Y ESE 0,36 CADUCÓ ────────────────────────────────────────────────────
 *
 * Era cierto cuando se midió y ha dejado de serlo, por el motivo que este
 * manual ya tiene escrito: **un número copiado a mano de una medición caduca
 * cuando cambia lo medido.** Lo que se midió entonces fue un editorial de
 * "unas seis pantallas" —lo dice el párrafo de arriba— y hoy, con el contenido
 * real dentro, mide QUINCE.
 *
 * `reading` está normalizado sobre el editorial entero, así que al crecer el
 * texto el umbral se queda con una fracción cada vez menor. Medido contra el
 * build: el umbral acaba en `reading` 0,157 en escritorio y 0,112 en móvil, no
 * en 0,36. Con el amanecer fijado en 0,30, el clima llegaba al 52% cuando
 * empezaba "Sobre mí" — o sea que la primera área se leía sobre el fondo de la
 * mente, con tinta oscura sobre un fondo oscuro.
 *
 * No es una regresión de esta fase: antes de tocar nada salía 0,175, también
 * muy por debajo de 0,30. Lo que ha cambiado es que ahora hay contenido real
 * que leer ahí, así que se ve.
 *
 * La constante se queda como RESPALDO —si no se puede medir, algo es mejor que
 * nada— y el valor de verdad se deduce de la geometría en `useDawn`. Es la
 * regla de siempre: si un dato depende de la geometría, se mide.
 */
const DAWN = 0.3

/**
 * Hasta dónde llega el amanecer, deducido del documento.
 *
 * El disparador de la lectura va de `top bottom` a `bottom bottom`, así que su
 * recorrido es la altura del editorial y arranca una ventana ANTES de que el
 * umbral llegue arriba. El amanecer tiene que terminar justo cuando termina el
 * umbral, o sea cuando la primera área toca el borde superior:
 *
 *     dawn = (alto del umbral + una ventana) / alto del editorial
 *
 * Se remide al cambiar el tamaño porque las dos alturas dependen de la ventana.
 * Y se acota: sin el tope, un editorial muy corto —o un fallo de medición—
 * pondría el amanecer más allá del final del recorrido.
 */
function useDawn() {
  const dawn = useRef(DAWN)

  useEffect(() => {
    const medir = () => {
      const main = document.querySelector('main')
      const umbral = main?.firstElementChild
      if (!main || !umbral || !main.offsetHeight) return
      const hasta = (umbral.offsetHeight + window.innerHeight) / main.offsetHeight
      dawn.current = Math.min(0.5, Math.max(0.05, hasta))
    }

    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  return dawn
}



/**
 * La misma paleta en modo noche (fase 11D).
 *
 * La primera parada NO cambia: de donde vienes es la mente, y la mente es la
 * misma en los dos temas. Lo que cambia es a donde llegas: en vez de salir al
 * marfil, sales al anil noche.
 *
 * Y el cierre sigue subiendo un punto, igual que en claro: es el mismo gesto
 * -el anochecer de Contacto- leido en el otro registro.
 *
 * **El precio, aceptado con los ojos abiertos**: en modo noche el recorrido ya
 * no va de la luz a la luz, que es lo que la seccion 7 dice que cierra el
 * circulo. Es el coste real del modo oscuro y no hay forma de tenerlo sin
 * pagarlo.
 */
const CLIMATE_NIGHT = [
  { at: 0.0, color: [0x10, 0x0c, 0x0a] }, // la mente, sin cambios
  { at: 0.5, color: [0x16, 0x23, 0x3a] }, // el anil noche: el trabajo
  { at: 1.0, color: [0x1a, 0x28, 0x42] }, // un punto mas alto en el cierre
]

function climateAt(t, night) {
  const table = night ? CLIMATE_NIGHT : CLIMATE
  let i = 0
  while (i < table.length - 2 && t >= table[i + 1].at) i += 1

  const from = table[i]
  const to = table[i + 1]
  const span = to.at - from.at
  const k = span <= 0 ? 1 : Math.min(1, Math.max(0, (t - from.at) / span))

  const r = Math.round(from.color[0] + (to.color[0] - from.color[0]) * k)
  const g = Math.round(from.color[1] + (to.color[1] - from.color[1]) * k)
  const b = Math.round(from.color[2] + (to.color[2] - from.color[2]) * k)

  return `rgb(${r},${g},${b})`
}

/**
 * ── LA LÁMINA COMÚN DEL EDITORIAL SALIÓ EN LA FASE 9B ───────────────────────
 *
 * Aquí iba una ilustración a pantalla completa al 20% con seis puntos de
 * parallax: la base común de todo el tramo de lectura. Ha salido con las seis
 * de área, y por el mismo motivo.
 *
 * No sobraba por estar mal puesta —estaba medida, y su 0,2 salió de comparar
 * capturas con y sin— sino porque el editorial ha dejado de tener fondo de
 * imagen. Lo que hay debajo del texto es ahora un TERRENO: curvas de nivel con
 * profundidad, altura de vuelo y luz. Ver `Ambient.jsx`.
 *
 * Y mientras esta lámina estuvo puesta el terreno no podía ganar: medido en la
 * primera captura de 9B, con las de área ya retiradas, la mancha del render
 * seguía siendo lo más visible del cuadro en Sobre mí. Un fondo no puede tener
 * dos fondos.
 *
 * El clima cromático —el color que cubre la ilustración de la mente durante el
 * umbral— se queda: eso no es una imagen, es la transición entre el recorrido y
 * la lectura, y sigue haciendo falta.
 */

/** Un tramo de 0 a 1 dentro de otro valor de 0 a 1. Sin suavizado: ya lo trae. */
function ramp01(value, start, end) {
  return Math.min(1, Math.max(0, (value - start) / (end - start)))
}

export default function Backdrops() {
  // Hasta dónde llega el amanecer. Se deduce del documento, no se escribe.
  const dawn = useDawn()

  /**
   * Las tres ilustraciones fijas, pedidas por FUNCIÓN. Ninguna ruta vive en
   * este archivo: sustituir cualquiera de las tres es tocar `visualAssets`.
   */
  const hero = getVisualAsset('hero.background')
  const environment = getVisualAsset('hero.far')
  const mind = getVisualAsset('mind.backdrop')

  const heroRef = useRef(null)
  const worldRef = useRef(null)
  const washRef = useRef(null)
  const navWashRef = useRef(null)
  const mindRef = useRef(null)
  const climateRef = useRef(null)

  /**
   * El tema, por una REF y no por estado.
   *
   * El clima se escribe dentro de un bucle de `requestAnimationFrame` que se
   * monta una vez; una variable capturada en el render se quedaria congelada
   * en el valor del primer frame -es el mismo fallo que costo una vuelta con
   * el `darkRef` del HUD en 10D-. Y pasar el tema por estado volveria a
   * renderizar este componente, que es lo que su bucle evita.
   *
   * Se suscribe al almacen: el tema cambia una vez cada mucho, no por frame.
   */
  const nightRef = useRef(isDarkTheme())
  const repaintRef = useRef(null)
  useEffect(
    () =>
      subscribeTheme(() => {
        nightRef.current = isDarkTheme()
        // Y se repinta YA: el bucle solo escribe cuando la lectura se mueve,
        // asi que con el scroll quieto el cambio de tema no llegaria nunca.
        repaintRef.current?.()
      }),
    [],
  )

  useEffect(() => {
    const treatment = environment?.treatment ?? {}
    /**
     * `?cssblur=0` deja el desenfoque a cero sin tocar nada más.
     *
     * Un `filter: blur()` sobre una imagen de pantalla completa obliga al
     * navegador a rasterizar la capa entera otra vez, y aquí además el radio
     * CAMBIA en cada frame del descenso, así que no hay nada que se pueda
     * guardar en caché. Hasta que no se puede comparar con y sin, el coste es
     * una suposición.
     */
    const softness =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('cssblur') === '0'
        ? 0
        : 1
    const baseBlur = (treatment.blur ?? 0) * softness
    const baseScale = treatment.scale ?? 1
    /**
     * EL ENCUADRE BASE, en porcentaje del ancho y del alto.
     *
     * Hasta ahora la lámina se centraba y punto, y eso obligaba a elegir
     * imágenes cuya composición ya cayera donde hacía falta. Con el bodegón el
     * problema es concreto y medible: su podio está en el 48% del ancho y en el
     * 88% del alto, y Olaz se planta en el 35% del ancho a media altura. O se
     * mueve el personaje —y entonces choca con el titular— o se mueve la
     * lámina.
     *
     * Se mueve la lámina. Es encuadre, no contenido: la misma imagen colocada
     * donde la composición la necesita. Y vive en `visualAssets` con el resto
     * del tratamiento, para que cambiar la ilustración por otra de encuadre
     * distinto se corrija en el mismo sitio en el que se cambió.
     */
    const baseX = treatment.x ?? 0
    const baseY = treatment.y ?? 0

    /**
     * El estado del fondo lejano, en un solo sitio.
     *
     * Dos cosas lo mueven —el descenso y la deriva en reposo— y las dos
     * escriben `transform`. Si cada una escribiera la propiedad entera, la
     * última en llegar borraría a la otra. Se acumulan aquí y se pinta una vez.
     */
    /** Quien no quiere movimiento no lo tiene. Se consulta en cada frame: el
     *  interruptor de "cabeza despejada" puede pulsarse en cualquier momento. */
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const drift = { scale: baseScale, x: baseX, y: baseY, dx: 0, dy: 0 }
    const write = () => {
      if (!worldRef.current) return
      worldRef.current.style.transform =
        `translate3d(${drift.x + drift.dx}%, ${drift.y + drift.dy}%, 0) scale(${drift.scale})`
    }

    /**
     * CADA CUÁNTO SE VUELVE A DIBUJAR LA CAPA. Ver la nota larga en
     * `PortalVeil`, que es donde se midió: `transform` y `opacity` las lleva
     * el compositor y son continuas; `filter` obliga a RASTERIZAR la imagen
     * entera otra vez, y esta ocupa la pantalla.
     *
     * Con pasos del 2% del descenso son 50 rasterizados en vez de 500, y no se
     * distingue: el desenfoque avanza 0,1 px por escalón y el brillo un 1%.
     */
    const REDRAW = 0.02

    let frame
    let lastGoing = -1
    let lastRedraw = -99
    let lastReading = -1
    let lastDrift = -99

    /*
      El cambio de tema tiene que poder forzar un repintado. El bucle solo
      escribe el clima cuando la lectura se ha movido, asi que con el scroll
      quieto -que es exactamente cuando alguien pulsa el interruptor- el
      color nuevo no llegaria hasta el siguiente movimiento del dedo.
    */
    repaintRef.current = () => {
      lastReading = -1
    }

    const tick = (now) => {
      /**
       * EL DESCENSO. Una sola señal mueve las tres capas de la portada, y por
       * eso se leen como una sola cosa que cambia en vez de como tres cosas
       * que se cruzan.
       */
      const going = descent(journey.progress)

      // Solo se escribe cuando cambia de verdad. Tocar el estilo obliga al
      // navegador a recomponer, y el valor está quieto casi todo el recorrido.
      if (Math.abs(going - lastGoing) > 0.002) {
        lastGoing = going

        if (worldRef.current) {
          /**
           * EL FONDO LEJANO. Se mueve POCO, y esa es toda la idea.
           *
           * La profundidad no sale de que el fondo se mueva mucho: sale de que
           * se mueva MENOS que lo que tienes cerca. Las paredes del corredor
           * —`PortalVeil`, delante del canvas— crecen un 240%; esto crece un
           * 26%. Esa diferencia es el paralaje, y es lo que convierte una imagen
           * plana en un sitio con fondo.
           *
           * Además se desliza en diagonal, en sentido contrario al eje de
           * entrada de la cámara (`ENTRY` en `stages.js`): si la cámara avanza
           * hacia arriba y a la derecha, el mundo tiene que correrse hacia abajo
           * y a la izquierda. Es poco recorrido a propósito; un fondo que se
           * desplaza mucho deja de ser fondo.
           *
           * `saturate` baja con el brillo. Sin eso, un azul oscuro y saturado
           * es literalmente un morado, y aparecería un lila justo en el sitio
           * del que se acaba de quitar.
           *
           * El apagado aquí es SUAVE —del 100% al 45%—: el viaje cromático de
           * verdad lo hace la atmósfera de `PortalVeil`, que va por delante y
           * tiñe también a Olaz y a las paredes. Si las dos capas oscurecieran a
           * la vez, la suma llegaría a negro a mitad de camino.
           */
          /**
           * 0,34 y 5,5, no 0,26 y 3,5.
           *
           * La proporción con el primer plano sigue siendo de uno a siete —la
           * pared crece un 240%— que es lo que da el paralaje. Pero en absoluto
           * el fondo se movía tan poco que se leía como quieto, y un fondo
           * quieto detrás de una pared que corre parece un telón pintado, no
           * una sala.
           */
          const scale = baseScale * (1 + going * 0.34)
          const slide = going * 5.5
          drift.scale = scale
          drift.x = baseX - slide
          drift.y = baseY + slide * 0.55
          write()

          // A escalones: cada escritura de `filter` rasteriza la capa entera.
          const step = Math.round(going / REDRAW) * REDRAW
          if (step !== lastRedraw) {
            lastRedraw = step
            worldRef.current.style.filter =
              `blur(${(baseBlur + step * 5 * softness).toFixed(2)}px) ` +
              `brightness(${(1 - step * 0.55).toFixed(3)}) ` +
              `saturate(${(1 - step * 0.5).toFixed(3)})`
          }
          // Se retira al final, cuando ya está casi negro: para entonces no hay
          // nada que "desaparezca", solo deja de haber algo que ya no se veía.
          worldRef.current.style.opacity = 1 - ramp01(going, 0.78, 1)
        }

        // El suelo cálido se apaga con él, un poco por detrás.
        if (heroRef.current) heroRef.current.style.opacity = 1 - going * 0.9
        // La luz de la izquierda se va con la portada: en cuanto no hay
        // titular no hay nada que iluminar.
        if (washRef.current) washRef.current.style.opacity = 1 - ramp01(going, 0, 0.28)
        if (navWashRef.current) navWashRef.current.style.opacity = 1 - ramp01(going, 0, 0.28)

        /**
         * El fondo del interior sube por DEBAJO, con su propia ventana y no
         * con esta. Cuando llega a ser visible, lo que tenía delante ya está
         * apagado: nunca hay dos imágenes reconocibles a la vez, que es lo que
         * delata un fundido cruzado.
         */
        if (mindRef.current) {
          mindRef.current.style.opacity = layerOpacity(LAYER, journey.progress)
        }
      }

      /*
        ── AQUÍ HABÍA LA DERIVA EN REPOSO ──────────────────────────────────

        El fondo se movía medio punto porcentual en un ciclo de 26 segundos,
        con el argumento de que en reposo no hay scroll del que salir. Era lo
        único de la web que no salía del scroll, y estaba documentado como
        deliberado.

        Sale en la fase 5E, y la regla que la sustituye es más fuerte que el
        motivo que la puso: **con el scroll quieto, la imagen quieta**. Volver
        al mismo punto del recorrido tiene que devolver el mismo cuadro, y una
        deriva con reloj propio lo impide por definición.

        Lo que da vida a la portada ya no es que el fondo respire: es que Olaz
        sigue al cursor, y eso responde a una acción del visitante.
      */

      const reading = journey.reading

      if (Math.abs(reading - lastReading) > 0.003) {
        lastReading = reading

        if (climateRef.current) {
          /**
           * ── EL COLOR TAMBIÉN SE REPARTE POR GEOMETRÍA ──────────────────
           *
           * `CLIMATE` pone el marfil en 0,5. Eso significaba "a mitad del
           * editorial", y con seis pantallas de texto caía justo después del
           * umbral. Con quince, 0,5 son SIETE pantallas: las dos primeras áreas
           * se leían sobre un fondo a medio camino entre la mente y el papel.
           *
           * Es exactamente el mismo número caducado que `DAWN`, en la otra
           * tabla — y da la misma cara: "Sobre mí" sobre un gris pardo.
           *
           * La tabla no se toca: es una PALETA y dice lo que tiene que decir
           * —de dónde vienes, dónde estás y cómo cierras—. Lo que se corrige es
           * CUÁNDO ocurre cada parada. El tramo oscuro→marfil se comprime
           * dentro del umbral, que es el sitio donde este manual ya dice que
           * pasa la transición, y el marfil→cálido se reparte por todo el resto
           * de la lectura.
           */
          const d = dawn.current
          const t =
            reading <= d
              ? (reading / d) * 0.5
              : 0.5 + ((reading - d) / Math.max(0.001, 1 - d)) * 0.5

          climateRef.current.style.backgroundColor = climateAt(t, nightRef.current)
          /**
           * El clima cubre la ilustración de la mente durante el umbral, al
           * mismo ritmo al que la escena se retira. Al empezar es transparente
           * —se sigue viendo el fondo del interior, que es de donde vienes— y
           * para cuando empieza la primera área ya lo ha cubierto.
           *
           * Ese solape es la transición: no hay ningún punto en el que la
           * escena "termine" y empiece la página.
           */
          climateRef.current.style.opacity = Math.min(1, reading / dawn.current)
        }

      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-20" aria-hidden="true">
      {/*
        El color plano va DEBAJO de todo y nunca es transparente del todo. Es el
        suelo: si una ilustración tarda en llegar o no llega, lo que se ve es un
        color de la paleta, no un hueco blanco ni una imagen rota.
      */}
      <div className="absolute inset-0 bg-cream" />

      {/*
        LA PORTADA. Sale del mapa, y de `hero.backgroundFinal` si existe.

        Esa alternativa es la que deja el sitio preparado para el fondo
        definitivo, todavía pendiente de generar: cuando llegue, se cambia una
        línea de `visualAssets` y aparece aquí. Ni este componente ni ningún
        otro se entera.

        Sin `lazy` y sin `async`: es lo primero que se ve.
      */}
      <img
        ref={heroRef}
        src={hero.src}
        srcSet={hero.srcSet}
        sizes="100vw"
        alt=""
        style={{ backgroundColor: hero.tint }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/*
        EL MUNDO DONDE ESTÁ OLAZ.

        ── LA MÁSCARA RADIAL HA SALIDO, Y SE LLEVABA LOS PIES ───────────────

        Estaba puesta para disolver los cuatro bordes rectos de una fotografía
        de sala, y su centro caía en el 46%/22% del cuadro: hacia abajo la
        imagen se desvanecía hasta desaparecer. Con la sala aquello era
        correcto —abajo solo había pavimento— pero la lámina que hay ahora
        tiene ahí el PODIO, que es justo lo que sostiene al personaje.

        Medido sobre la propia máscara: a la altura de la superficie del podio
        —el 86,8% del alto— el degradado ya solo dejaba pasar un 40%, y en el
        borde inferior un 4%. Olaz se apoyaba sobre un pedestal medio borrado,
        y de ahí las dos quejas a la vez: que flota y que se le difuminan los
        pies. No era la falta de sombra —eso está decidido y se queda— ni el
        encuadre: era una capa escondiendo el suelo.

        Y ya no hace falta ninguna. El motivo por el que se puso —que no se
        note dónde empieza la imagen— no puede darse: la lámina se sirve con
        `object-cover`, así que cubre la ventana entera en cualquier proporción
        y no hay un solo borde que ver. Una máscara que no tapa ningún borde y
        sí tapa el contenido no es una decisión de composición.

        Sin `lazy`: es de lo primero que se ve.
      */}
      {environment && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            ref={worldRef}
            src={environment.src}
            srcSet={environment.srcSet}
            sizes="100vw"
            alt=""
            decoding="async"
            style={{
              filter: `blur(${environment.treatment.blur}px)`,
              transform: `scale(${environment.treatment.scale})`,
              backgroundColor: environment.tint,
            }}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
        </div>
      )}

      {/*
        ── LA LUZ DE LA IZQUIERDA ────────────────────────────────────────────

        Lo único que se añade a la lámina, y existe por una razón medible: el
        titular no se leía.

        El bodegón tiene sus piedras de coco en el tercio izquierdo, que es
        justo donde vive la columna de texto. Medido sobre la captura de 1920 en
        una rejilla de 6×4: ese tercio da una luminancia media de 77–85 con una
        desviación de 47, y la tinta de la marca (`#2B211C`) tiene 35. Tinta
        oscura sobre piedra oscura no es una cuestión de gusto, es texto que no
        está ahí. Antes se leía por accidente: la máscara radial que se acaba de
        retirar apagaba esa esquina de paso.

        Así que en lugar de devolver una máscara que tapaba medio bodegón, entra
        una luz LATERAL en el marfil del acto 1, anclada al borde izquierdo y
        apagada del todo antes de la mitad del cuadro. No toca el podio —que
        empieza en el 26%— ni a Olaz, porque esta capa va por detrás del canvas.

        Y no es un parche de accesibilidad disfrazado: un bodegón de estudio se
        ilumina, y una luz que entra por el lado del texto es exactamente lo que
        haría un fotógrafo con esta composición.

        Solo en apaisado. En vertical el texto vive en la pared lisa de arriba,
        donde la luminancia es 213 con una desviación de 11, y no hace falta
        nada.
      */}
      <div
        ref={washRef}
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(95deg, rgba(245,230,211,0.70) 0%,' +
            ' rgba(245,230,211,0.64) 18%,' +
            ' rgba(245,230,211,0.30) 34%,' +
            ' rgba(245,230,211,0) 48%)',
          /*
            Y se apaga hacia abajo. La luz tiene que caer sobre el texto, no
            sobre el suelo: sin este corte, el podio y la base del bodegón
            —que empiezan en el 74% del alto— perdían densidad justo donde
            acaba de recuperarse el apoyo de Olaz.
          */
          /*
            El macizo llega al 66% y no al 52% (fase 11E). Medido a 1440, la
            columna de texto acaba mas abajo de lo que esta mascara suponia:
            "Baja para entrar" cae en el 59% del alto, o sea DENTRO del
            desvanecido, y daba 2,86 : 1 sobre la piedra. El podio empieza en
            el 74%, asi que hasta el 66% no se le quita densidad a nada.
          */
          maskImage:
            'linear-gradient(to bottom, #000 0%, #000 66%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.12) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, #000 0%, #000 66%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.12) 100%)',
        }}
      />

      {/*
        Y UNA SEGUNDA, MÁS PEQUEÑA, EN LA ESQUINA DE LA NAVEGACIÓN.

        Mismo problema y misma solución que la de la izquierda, en el otro lado:
        las cinco secciones caen sobre la piedra de coco del borde derecho, que
        mide unos 85 de luminancia contra los 35 de la tinta. Subida la tinta al
        100% se lee "CV" —que cae sobre el suelo claro— y las cuatro de encima
        no.

        Va anclada a la esquina y muere antes del podio. Un bodegón de estudio
        con luz por los dos lados es lo normal; lo que no es normal es una
        navegación que no se lee.
      */}
      <div
        ref={navWashRef}
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            'radial-gradient(30% 30% at 100% 100%, rgba(245,230,211,0.62) 0%,' +
            ' rgba(245,230,211,0.34) 42%,' +
            ' rgba(245,230,211,0) 78%)',
        }}
      />

      {/*
        EL SUELO DEL INTERIOR. Va por DETRÁS del canvas: la atmósfera de la
        escena la pone `MindBackdrop` con su propio sombreador, y dentro de la
        mente manda Three.js. Esto solo evita que se vea el crema de la portada
        por los bordes mientras se cruza.
      */}
      <img
        ref={mindRef}
        src={mind.src}
        srcSet={mind.srcSet}
        sizes="100vw"
        alt=""
        style={{ backgroundColor: mind.tint }}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
      />

      <div ref={climateRef} className="absolute inset-0 opacity-0" />

    </div>
  )
}
